import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { hmac, otpCode, randomToken, safeEqual, sha256 } from "./crypto";
import type { PartyKind } from "./domain";

// الدخول برمز على البريد الإلكتروني مؤقتاً لتجربة النظام (المادة 62، قرار المالك 2026-10-09).
// يُستبدل بالنفاذ الوطني الموحد قبل الإطلاق العام.

const SESSION_COOKIE = "shaaer_session";
const PENDING_COOKIE = "shaaer_pending_email";
const SESSION_DAYS = 30;
const OTP_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_PER_HOUR = 5;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function requestOtp(rawEmail: string): Promise<{ ok: true; devCode?: string } | { ok: false; error: string }> {
  const email = normalizeEmail(rawEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "البريد الإلكتروني غير صحيح" };

  const hourAgo = new Date(Date.now() - 3_600_000);
  const recent = await db.otpCode.count({ where: { email, createdAt: { gte: hourAgo } } });
  if (recent >= OTP_MAX_PER_HOUR) return { ok: false, error: "طلبات كثيرة. حاول بعد ساعة" };

  const code = otpCode();
  await db.otpCode.create({
    data: { email, codeHash: hmac(`${email}:${code}`), expiresAt: new Date(Date.now() + OTP_MINUTES * 60_000) },
  });

  // لا مزود بريد بعد: يُسجَّل الرمز في سجل الخادم، ويظهر على الشاشة في التطوير فقط.
  console.info(`[OTP] ${email}: ${code}`);
  const devCode = process.env.AUTH_DEV_SHOW_CODE === "true" && process.env.NODE_ENV !== "production" ? code : undefined;
  return { ok: true, devCode };
}

export async function verifyOtp(rawEmail: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = normalizeEmail(rawEmail);
  const otp = await db.otpCode.findFirst({
    where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return { ok: false, error: "الرمز منتهٍ أو غير موجود. اطلب رمزاً جديداً" };
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: "تجاوزت عدد المحاولات. اطلب رمزاً جديداً" };

  if (!safeEqual(otp.codeHash, hmac(`${email}:${code.trim()}`))) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: "الرمز غير صحيح" };
  }
  await db.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}

async function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function createSession(userId: string) {
  const token = randomToken();
  await db.session.create({
    data: { id: sha256(token), userId, expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) },
  });
  (await cookies()).set(SESSION_COOKIE, token, await cookieOptions(SESSION_DAYS * 86_400));
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

/** بريد تحقق صاحبه برمز ولم يكمل التسجيل بعد: كوكي موقّع لمدة 30 دقيقة */
export async function setPendingEmail(email: string) {
  const value = `${email}|${Date.now() + 30 * 60_000}`;
  (await cookies()).set(PENDING_COOKIE, `${value}|${hmac(value)}`, await cookieOptions(30 * 60));
}

export async function getPendingEmail(): Promise<string | null> {
  const raw = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!raw) return null;
  const [email, exp, sig] = raw.split("|");
  if (!email || !exp || !sig) return null;
  if (!safeEqual(sig, hmac(`${email}|${exp}`)) || Number(exp) < Date.now()) return null;
  return email;
}

export async function clearPendingEmail() {
  (await cookies()).delete(PENDING_COOKIE);
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: sha256(token) },
    include: { user: { include: { parties: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status === "SUSPENDED" && (!user.suspendedUntil || user.suspendedUntil > new Date())) {
    redirect("/login?error=suspended");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/dashboard");
  return user;
}

/** يعيد صفة الطرف المطلوبة للمستخدم الحالي، أو يحوّله إلى لوحته */
export async function requireParty(kinds: PartyKind[]) {
  const user = await requireUser();
  const party = user.parties.find((p) => kinds.includes(p.kind as PartyKind));
  if (!party) redirect("/dashboard?error=no-role");
  return { user, party };
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
}
