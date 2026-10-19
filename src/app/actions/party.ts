"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit, notify } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { referenceNumber, verifyCode } from "@/lib/crypto";
import { PARTY_KINDS, SAUDI_CITIES, VENUE_KINDS, type PartyKind } from "@/lib/domain";
import { back, num, str } from "@/lib/forms";
import { sarToHalala, vatOn } from "@/lib/money";
import { adminUserIds } from "@/lib/services";

async function ownedParty(partyId: string) {
  const user = await requireUser();
  const party = user.parties.find((p) => p.id === partyId);
  if (!party) back("/dashboard", { error: "الصفة غير مرتبطة بحسابك" });
  return { user, party };
}

/** طلب ترخيص (المواد 9 إلى 21). الرسم والضريبة من جدول المادة 71. */
export async function applyLicenseAction(form: FormData) {
  const returnTo = str(form, "returnTo") || "/dashboard";
  const { user, party } = await ownedParty(str(form, "partyId"));
  const type = await db.licenseType.findUnique({ where: { code: str(form, "typeCode") } });
  if (!type) back(returnTo, { error: "نوع الترخيص غير موجود" });
  if (type.partyKind !== party.kind) back(returnTo, { error: "هذا الترخيص لا يناسب صفتك" });
  if (type.entityType && type.entityType !== (party.entityType === "INDIVIDUAL" ? "INDIVIDUAL" : "ENTITY"))
    back(returnTo, { error: "الترخيص يميّز الكيان من الفرد (المادتان 17 و19): اختر النوع المطابق لصفتك" });

  const freelanceNumber = str(form, "freelanceNumber");
  const freelanceExpiry = str(form, "freelanceExpiry");
  if (type.requiresFreelance) {
    if (!freelanceNumber || !freelanceExpiry) back(returnTo, { error: "وثيقة العمل الحر السارية شرط لهذا الترخيص (المادتان 17 و19)" });
    if (new Date(freelanceExpiry) < new Date()) back(returnTo, { error: "وثيقة العمل الحر منتهية" });
    await db.party.update({ where: { id: party.id }, data: { freelanceNumber, freelanceExpiry: new Date(freelanceExpiry) } });
  }
  if (type.partyKind === "ROW_MEMBER" && !party.rowId) back(returnTo, { error: "ترخيص عضو الصف مشروط بالانضمام إلى صف معتمد (المادة 12)" });

  const open = await db.license.findFirst({ where: { partyId: party.id, typeCode: type.code, status: { in: ["UNDER_REVIEW", "AWAITING_PAYMENT", "ACTIVE"] }, scopeEventId: null } });
  if (open && !["PER_EVENT", "PER_COMPETITION", "BY_EVENT"].includes(type.durationKind))
    back(returnTo, { error: "لديك طلب أو ترخيص قائم من النوع نفسه" });

  const license = await db.license.create({ data: {
    number: referenceNumber("L"), typeCode: type.code, partyId: party.id, status: "UNDER_REVIEW",
    feeHalala: type.feeHalala, vatHalala: vatOn(type.feeHalala), verifyCode: verifyCode(),
  } });
  await audit({ actorUserId: user.id, action: "license.apply", entity: "license", entityId: license.id, detail: { type: type.code } });
  for (const id of await adminUserIds()) await notify(id, "طلب ترخيص جديد", `${party.displayName}: ${type.nameAr}`, "/admin/licenses");
  back(returnTo, { ok: `قُدِّم طلب ${type.nameAr}. يُراجَع ثم يُطلب الدفع` });
}

/**
 * دفع رسم الترخيص بعد اعتماده. بوابة الدفع لم تُربط بعد (INT-03)، فالدفع هنا تجريبي يقيّد في الدفتر فقط.
 */
export async function payLicenseAction(form: FormData) {
  const returnTo = str(form, "returnTo") || "/dashboard";
  const user = await requireUser();
  const license = await db.license.findUnique({ where: { id: str(form, "licenseId") }, include: { type: true, party: true } });
  if (!license) back(returnTo, { error: "الترخيص غير موجود" });
  const payerIsMine = user.parties.some((p) => p.id === license.partyId || p.id === license.paidByPartyId);
  if (!payerIsMine) back(returnTo, { error: "لا صلاحية لك على هذا الترخيص" });
  if (license.status !== "AWAITING_PAYMENT") back(returnTo, { error: "الترخيص ليس بانتظار الدفع" });

  const now = new Date();
  let expiresAt: Date | null = null;
  if (license.type.durationYears) expiresAt = new Date(now.getFullYear() + license.type.durationYears, now.getMonth(), now.getDate());
  if (license.scopeEventId) {
    const ev = await db.event.findUnique({ where: { id: license.scopeEventId } });
    if (ev) expiresAt = new Date(ev.startsAt.getTime() + (ev.durationHours + 24) * 3_600_000);
  }
  await db.license.update({ where: { id: license.id }, data: { status: "ACTIVE", issuedAt: now, expiresAt } });
  const payer = license.paidByPartyId ?? license.partyId;
  await db.ledgerEntry.createMany({ data: [
    { kind: "LICENSE_FEE", amountHalala: license.feeHalala, direction: "IN", partyId: payer, licenseId: license.id, memo: `رسم ${license.number}` },
    { kind: "VAT", amountHalala: license.vatHalala, direction: "IN", partyId: payer, licenseId: license.id, memo: `ضريبة ${license.number}` },
  ] });
  if (license.type.code === "VENUE") await db.venue.updateMany({ where: { hostPartyId: license.partyId, status: "PENDING" }, data: { status: "LICENSED" } });
  await audit({ actorUserId: user.id, action: "license.paid", entity: "license", entityId: license.id, detail: { fee: license.feeHalala, vat: license.vatHalala, gateway: "simulated" } });
  revalidatePath("/");
  back(returnTo, { ok: `صدر الترخيص ${license.number}` });
}

/** إضافة صفة جديدة لحساب قائم (المستخدم قد يحمل أكثر من صفة، FR-002) */
export async function addRoleAction(form: FormData) {
  const user = await requireUser();
  const kind = str(form, "kind") as PartyKind;
  const city = str(form, "city");
  if (!(kind in PARTY_KINDS) || kind === "ROW_MEMBER") back("/dashboard", { error: "اختر الصفة" });
  if (!(SAUDI_CITIES as readonly string[]).includes(city)) back("/dashboard", { error: "اختر المدينة" });
  if (user.parties.some((p) => p.kind === kind)) back("/dashboard", { error: "تحمل هذه الصفة مسبقاً" });
  const party = await db.party.create({ data: {
    userId: user.id, kind, city, entityType: str(form, "entityType") || "INDIVIDUAL",
    displayName: str(form, "displayName") || user.name, commercialReg: str(form, "commercialReg") || null, badge: "UNDER_REVIEW",
  } });
  await audit({ actorUserId: user.id, action: "party.add_role", entity: "party", entityId: party.id, detail: { kind } });
  back("/dashboard", { ok: `أُضيفت صفة ${PARTY_KINDS[kind]}` });
}

/** الملف المهني وقائمة الأسعار (المادة 29) والحساب البنكي (المادتان 36 و62) */
export async function updateProfileAction(form: FormData) {
  const returnTo = str(form, "returnTo") || "/dashboard";
  const { user, party } = await ownedParty(str(form, "partyId"));
  const price = num(form, "priceBase");
  const iban = str(form, "iban").replace(/\s/g, "").toUpperCase();
  if (iban && !/^SA\d{22}$/.test(iban)) back(returnTo, { error: "رقم الآيبان السعودي يبدأ بـ SA ويتكون من 24 خانة" });
  const factors: Record<string, string> = {};
  for (const key of ["factorCity", "factorType", "factorSeason", "factorOccasion", "factorAudience", "factorBroadcast"]) {
    const v = str(form, key);
    if (v) factors[key] = v;
  }
  await db.party.update({ where: { id: party.id }, data: {
    displayName: str(form, "displayName") || party.displayName,
    bio: str(form, "bio") || null,
    priceBaseHalala: price !== null ? sarToHalala(price) : party.priceBaseHalala,
    priceFactors: Object.keys(factors).length ? JSON.stringify(factors) : party.priceFactors,
    ...(iban && iban !== party.iban ? { iban, ibanVerified: false } : {}),
  } });
  await audit({ actorUserId: user.id, action: "party.profile", entity: "party", entityId: party.id, detail: iban && iban !== party.iban ? "تغيير الآيبان: بانتظار التحقق" : undefined });
  back(returnTo, { ok: iban && iban !== party.iban ? "حُفظ الملف. الآيبان الجديد بانتظار التحقق قبل أي صرف" : "حُفظ الملف" });
}

/** موقع جديد يضيفه المضيف (المادة 21) */
export async function createVenueAction(form: FormData) {
  const { user, party } = await ownedParty(str(form, "partyId"));
  if (party.kind !== "VENUE_HOST") back("/host", { error: "الصفة ليست موقع فعاليات" });
  const kind = str(form, "kind");
  const capacity = num(form, "capacity");
  if (!(kind in VENUE_KINDS)) back("/host/venues", { error: "اختر نوع الموقع" });
  if (!capacity || capacity < 1) back("/host/venues", { error: "السعة مطلوبة" });
  const licensed = await db.license.findFirst({ where: { partyId: party.id, typeCode: "VENUE", status: "ACTIVE" } });
  const venue = await db.venue.create({ data: {
    hostPartyId: party.id, name: str(form, "name"), kind, city: str(form, "city") || party.city,
    address: str(form, "address"), capacity, status: licensed ? "LICENSED" : "PENDING",
  } });
  await audit({ actorUserId: user.id, action: "venue.create", entity: "venue", entityId: venue.id });
  back("/host/venues", { ok: licensed ? "أُضيف الموقع وهو مرخّص" : "أُضيف الموقع، ويحتاج ترخيص موقع ساري (1,500 ريال لثلاث سنوات)" });
}

/** تأكيد الموقع لحجز فعالية فيه */
export async function confirmVenueBookingAction(form: FormData) {
  const user = await requireUser();
  const event = await db.event.findUnique({ where: { id: str(form, "eventId") }, include: { venue: true } });
  if (!event?.venue || !user.parties.some((p) => p.id === event.venue!.hostPartyId)) back("/host/events", { error: "الفعالية ليست في مواقعك" });
  await db.event.update({ where: { id: event.id }, data: { venueConfirmedAt: new Date() } });
  const org = await db.party.findUnique({ where: { id: event.organizerId } });
  if (org) await notify(org.userId, "أكّد الموقع الحجز", `${event.venue.name} أكّد استضافة ${event.name}.`, `/organizer/events/${event.id}`);
  await audit({ actorUserId: user.id, action: "venue.confirm", entity: "event", entityId: event.id });
  back("/host/events", { ok: "أُكّد الحجز" });
}

/** قائد الصف يضيف عضواً (المادتان 13 و41). العضو يحتاج ترخيص عضو صف (المادة 12). */
export async function addRowMemberAction(form: FormData) {
  const { user, party } = await ownedParty(str(form, "partyId"));
  if (party.kind !== "ROW_LEADER") back("/poet/row", { error: "الصفة ليست قائد صف" });
  let row = await db.row.findFirst({ where: { leaderId: party.id } });
  if (!row) row = await db.row.create({ data: { name: str(form, "rowName") || `صف ${party.displayName}`, leaderId: party.id, city: party.city } });
  const email = str(form, "email").toLowerCase();
  const name = str(form, "name");
  if (!email || !name) back("/poet/row", { error: "اسم العضو وبريده مطلوبان" });
  let member = await db.user.findUnique({ where: { email }, include: { parties: true } });
  if (!member) member = await db.user.create({ data: { email, name }, include: { parties: true } });
  const existing = member.parties.find((p) => p.kind === "ROW_MEMBER");
  if (existing?.rowId && existing.rowId !== row.id) back("/poet/row", { error: "العضو منضم إلى صف آخر" });
  if (existing) await db.party.update({ where: { id: existing.id }, data: { rowId: row.id } });
  else await db.party.create({ data: { userId: member.id, kind: "ROW_MEMBER", displayName: name, city: party.city, rowId: row.id } });
  await notify(member.id, "انضممت إلى صف", `أضافك ${party.displayName} إلى ${row.name}. اطلب ترخيص عضو الصف لتشارك (المادة 12).`, "/poet/licenses");
  await audit({ actorUserId: user.id, action: "row.add_member", entity: "row", entityId: row.id, detail: { email } });
  back("/poet/row", { ok: `أُضيف ${name} إلى الصف` });
}

export async function markNotificationsReadAction() {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  back("/notifications", { ok: "عُلّمت كلها مقروءة" });
}
