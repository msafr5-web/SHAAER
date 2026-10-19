"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import {
  clearPendingEmail, createSession, destroySession, getPendingEmail, normalizeEmail,
  requestOtp, setPendingEmail, verifyOtp,
} from "@/lib/auth";
import { CHARTER_VERSION, PARTY_KINDS, REGULATION_VERSION, SAUDI_CITIES, type PartyKind } from "@/lib/domain";
import { back, bool, num, str } from "@/lib/forms";

export async function requestCodeAction(form: FormData) {
  const email = normalizeEmail(str(form, "email"));
  const res = await requestOtp(email);
  if (!res.ok) back("/login", { error: res.error });
  const q = new URLSearchParams({ email, step: "code" });
  if (res.devCode) q.set("dev", res.devCode);
  redirect(`/login?${q}`);
}

export async function verifyCodeAction(form: FormData) {
  const email = normalizeEmail(str(form, "email"));
  const res = await verifyOtp(email, str(form, "code"));
  if (!res.ok) redirect(`/login?${new URLSearchParams({ email, step: "code", error: res.error })}`);

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    await setPendingEmail(email);
    redirect("/register");
  }
  await createSession(user.id);
  await audit({ actorUserId: user.id, action: "auth.login", entity: "user", entityId: user.id, detail: { method: "email_otp" } });
  redirect(user.isAdmin ? "/admin" : "/dashboard");
}

export async function registerAction(form: FormData) {
  const email = await getPendingEmail();
  if (!email) back("/login", { error: "انتهت مهلة التحقق. أدخل بريدك من جديد" });

  const name = str(form, "name");
  const kind = str(form, "kind") as PartyKind;
  const city = str(form, "city");
  const entityType = str(form, "entityType") || "INDIVIDUAL";
  const birthYear = num(form, "birthYear");

  if (name.length < 3) back("/register", { error: "الاسم مطلوب" });
  if (!(kind in PARTY_KINDS) || kind === "ROW_MEMBER") back("/register", { error: "اختر الصفة" });
  if (!(SAUDI_CITIES as readonly string[]).includes(city)) back("/register", { error: "اختر المدينة" });
  if (!bool(form, "acceptRegulation") || !bool(form, "acceptCharter"))
    back("/register", { error: "قبول اللائحة وميثاق الشرف شرط لإنشاء الحساب (المادتان 2 و6)" });
  // حماية القُصّر (الملحق ذ ذ): يُمنع التسجيل دون 18 عاماً حتى يُحسم السؤال هـ18
  if (birthYear && new Date().getFullYear() - birthYear < 18)
    back("/register", { error: "التسجيل لمن هم دون 18 عاماً غير متاح حالياً، ويتطلب موافقة ولي الأمر (الملحق ذ ذ)" });

  const exists = await db.user.findUnique({ where: { email } });
  if (exists) back("/login", { error: "الحساب موجود. سجّل الدخول" });

  const user = await db.user.create({
    data: {
      email, name, phone: str(form, "phone") || null, birthYear,
      regulationVersion: REGULATION_VERSION, charterVersion: CHARTER_VERSION, acceptedAt: new Date(),
      parties: { create: { kind, city, displayName: str(form, "displayName") || name, entityType, commercialReg: str(form, "commercialReg") || null, badge: "UNDER_REVIEW" } },
    },
  });
  await clearPendingEmail();
  await createSession(user.id);
  await audit({ actorUserId: user.id, action: "auth.register", entity: "user", entityId: user.id, detail: { kind, regulation: REGULATION_VERSION, charter: CHARTER_VERSION } });
  redirect("/dashboard?ok=" + encodeURIComponent("أُنشئ حسابك. الخطوة التالية: طلب الترخيص المناسب لصفتك"));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
