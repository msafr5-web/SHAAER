"use server";

import { db } from "@/lib/db";
import { audit, notify } from "@/lib/audit";
import { clientIp, requestOtp, requireUser, verifyOtp } from "@/lib/auth";
import { referenceNumber, verifyCode } from "@/lib/crypto";
import { fromRiyadhLocal } from "@/lib/dates";
import {
  EVENT_LEVELS, EVENT_TYPES, MEDIA_RIGHTS, PARTY_KINDS, SAUDI_CITIES, SEAT_ROLES,
  canTransitionEvent, type EventState, type SeatRole,
} from "@/lib/domain";
import { back, bool, num, str } from "@/lib/forms";
import { formatSAR, sarToHalala, vatOn } from "@/lib/money";
import {
  absenceFine, attendanceStatus, canMakeOffer, classifyCancellation, isLateApology, lateApologyFine,
  negotiationDeadline, objectionDeadline, organizerCancellationDeduction, partyCancellationFine,
} from "@/lib/rules";
import {
  adminUserIds, buildContractBody, contractTemplateFor, expireNegotiations, hashContent, heldFor, partyLicensedFor, payout,
} from "@/lib/services";

const ev = (id: string) => `/organizer/events/${id}`;

async function organizerEvent(eventId: string) {
  const user = await requireUser();
  const event = await db.event.findUnique({ where: { id: eventId }, include: { organizer: true, venue: true } });
  if (!event || event.organizer.userId !== user.id) back("/organizer/events", { error: "الفعالية غير موجودة" });
  return { user, event };
}

async function moveEvent(eventId: string, to: EventState, actorUserId: string, detail?: string) {
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  if (!canTransitionEvent(event.status as EventState, to)) back(ev(eventId), { error: "انتقال غير مسموح في حالة الفعالية الحالية (المادة 25)" });
  await db.event.update({ where: { id: eventId }, data: { status: to } });
  await audit({ actorUserId, action: `event.${to.toLowerCase()}`, entity: "event", entityId: eventId, detail });
}

// ───────── إنشاء الفعالية (المادة 24) ─────────

export async function createEventAction(form: FormData) {
  const user = await requireUser();
  const organizer = user.parties.find((p) => p.kind === "ORGANIZER");
  if (!organizer) back("/dashboard", { error: "إنشاء الفعاليات للجهة المنظمة فقط" });

  const type = str(form, "type");
  const level = str(form, "level") || "STANDARD";
  const city = str(form, "city");
  const startsRaw = str(form, "startsAt");
  const duration = num(form, "durationHours");
  const attendance = num(form, "expectedAttendance");
  const venueId = str(form, "venueId") || null;
  const errors: string[] = [];
  if (str(form, "name").length < 3) errors.push("اسم الفعالية");
  if (!(type in EVENT_TYPES)) errors.push("نوع الفعالية");
  if (!(level in EVENT_LEVELS)) errors.push("تصنيف الفعالية");
  if (!(SAUDI_CITIES as readonly string[]).includes(city)) errors.push("المدينة");
  if (!startsRaw) errors.push("التاريخ والوقت");
  if (!duration || duration < 1 || duration > 24) errors.push("المدة بالساعات");
  if (!attendance || attendance < 1) errors.push("الحضور المتوقع");
  if (!venueId && !str(form, "venueText")) errors.push("الموقع");
  if (!str(form, "contact")) errors.push("بيانات التواصل");
  if (errors.length) back("/organizer/events/new", { error: `أكمل البيانات الإلزامية (المادة 24): ${errors.join("، ")}` });

  const startsAt = fromRiyadhLocal(startsRaw);
  if (startsAt < new Date()) back("/organizer/events/new", { error: "تاريخ الفعالية في الماضي" });
  if (venueId) {
    const venue = await db.venue.findUnique({ where: { id: venueId } });
    if (!venue || venue.status !== "LICENSED") back("/organizer/events/new", { error: "الموقع غير مرخّص (المادة 21)" });
    if (attendance! > venue.capacity) back("/organizer/events/new", { error: `الحضور المتوقع يتجاوز سعة الموقع (${venue.capacity})` });
  }

  const event = await db.event.create({ data: {
    number: referenceNumber("E"), organizerId: organizer.id, name: str(form, "name"), type, level, startsAt,
    durationHours: duration!, city, venueId, venueText: venueId ? null : str(form, "venueText"),
    expectedAttendance: attendance!, filming: bool(form, "filming"), broadcast: bool(form, "broadcast"),
    prizes: str(form, "prizes") || null, contact: str(form, "contact"), status: "DRAFT",
  } });
  await audit({ actorUserId: user.id, action: "event.create", entity: "event", entityId: event.id });
  back(ev(event.id), { ok: "أُنشئت الفعالية مسودةً. أضف المشاركين ثم أرسلها للمراجعة" });
}

export async function submitEventAction(form: FormData) {
  const { user, event } = await organizerEvent(str(form, "eventId"));
  await moveEvent(event.id, "UNDER_REVIEW", user.id);
  for (const id of await adminUserIds()) await notify(id, "فعالية بانتظار المراجعة", event.name, `/admin/events/${event.id}`);
  back(ev(event.id), { ok: "أُرسلت الفعالية إلى إدارة التشغيل للمراجعة" });
}

// ───────── المقاعد والمشاركون ─────────

export async function addSeatAction(form: FormData) {
  const { user, event } = await organizerEvent(str(form, "eventId"));
  if (["COMPLETED", "FINANCIALLY_CLOSED", "CANCELLED", "IN_EXECUTION"].includes(event.status)) back(ev(event.id), { error: "لا تُضاف مشاركات في هذه الحالة" });
  const role = str(form, "role") as SeatRole;
  if (!(role in SEAT_ROLES)) back(ev(event.id), { error: "اختر دور المشاركة" });
  const partyId = str(form, "partyId");
  const party = await db.party.findUnique({ where: { id: partyId } });
  if (!party || !(SEAT_ROLES[role].partyKinds as readonly string[]).includes(party.kind)) back(ev(event.id), { error: "الطرف لا يطابق الدور" });
  if (!(await partyLicensedFor(party.id, event.id))) back(ev(event.id), { error: "الطرف لا يحمل ترخيصاً سارياً، فلا يستقبل العروض (المادة 9)" });
  const dup = await db.participation.findFirst({ where: { eventId: event.id, partyId: party.id, status: { notIn: ["REJECTED", "EXPIRED", "CANCELLED"] } } });
  if (dup) back(ev(event.id), { error: "الطرف مضاف مسبقاً" });

  const honorary = bool(form, "honorary");
  const start = event.startsAt;
  const seat = await db.participation.create({ data: {
    eventId: event.id, role, partyId: party.id, honorary, status: honorary ? "AGREED" : "INVITED", agreedHalala: honorary ? 0 : null,
    attendStart: new Date(start.getTime() - 3_600_000), readyAt: new Date(start.getTime() - 1_800_000),
    performStart: start, performEnd: new Date(start.getTime() + event.durationHours * 3_600_000), requiredHours: event.durationHours,
  } });
  if (event.status === "PRELIM_APPROVED") await moveEvent(event.id, "NEGOTIATING", user.id);
  await notify(party.userId, honorary ? "دعوة لمشاركة شرفية" : "دعوة لفعالية", `${event.name} في ${event.city}`, "/poet/offers");
  await audit({ actorUserId: user.id, action: "seat.add", entity: "participation", entityId: seat.id, detail: { role, honorary } });
  back(ev(event.id), { ok: honorary ? "أُضيفت مشاركة شرفية بلا مقابل (المادة 23)" : "أُضيف المشارك. ابدأ التفاوض بعرض" });
}

/**
 * خيار «إضافة شاعر غير مستمر» (المادة 10): المنظّم يُدخل الشاعر ويدفع ترخيصه المؤقت لهذه الفعالية،
 * ويصل الشاعرَ إشعار ليقبل أو يرفض أو يفاوض بعد دخوله ببريده.
 */
export async function addNonContinuousPoetAction(form: FormData) {
  const { user, event } = await organizerEvent(str(form, "eventId"));
  const email = str(form, "email").toLowerCase();
  const name = str(form, "name");
  if (!email || name.length < 3) back(ev(event.id), { error: "اسم الشاعر وبريده مطلوبان" });
  let poetUser = await db.user.findUnique({ where: { email }, include: { parties: true } });
  if (!poetUser) poetUser = await db.user.create({ data: { email, name }, include: { parties: true } });
  const poet = poetUser.parties.find((p) => p.kind === "POET")
    ?? await db.party.create({ data: { userId: poetUser.id, kind: "POET", displayName: name, city: event.city } });

  const type = await db.licenseType.findUniqueOrThrow({ where: { code: "POET_NONCONT" } });
  const license = await db.license.create({ data: {
    number: referenceNumber("L"), typeCode: type.code, partyId: poet.id, scopeEventId: event.id, paidByPartyId: event.organizerId,
    status: "ACTIVE", issuedAt: new Date(), expiresAt: new Date(event.startsAt.getTime() + (event.durationHours + 24) * 3_600_000),
    feeHalala: type.feeHalala, vatHalala: vatOn(type.feeHalala), verifyCode: verifyCode(),
  } });
  await db.ledgerEntry.createMany({ data: [
    { kind: "LICENSE_FEE", amountHalala: license.feeHalala, direction: "IN", partyId: event.organizerId, eventId: event.id, licenseId: license.id, memo: `ترخيص شاعر غير مستمر ${license.number}` },
    { kind: "VAT", amountHalala: license.vatHalala, direction: "IN", partyId: event.organizerId, eventId: event.id, licenseId: license.id, memo: `ضريبة ${license.number}` },
  ] });
  const start = event.startsAt;
  await db.participation.create({ data: {
    eventId: event.id, role: "POET", partyId: poet.id, nonContinuous: true, status: "INVITED",
    attendStart: new Date(start.getTime() - 3_600_000), readyAt: new Date(start.getTime() - 1_800_000),
    performStart: start, performEnd: new Date(start.getTime() + event.durationHours * 3_600_000), requiredHours: event.durationHours,
  } });
  if (event.status === "PRELIM_APPROVED") await moveEvent(event.id, "NEGOTIATING", user.id);
  await notify(poetUser.id, "دعوة لفعالية", `أضافك ${event.organizer.displayName} شاعراً في ${event.name}. لك القبول أو الرفض أو التفاوض.`, "/poet/offers");
  await audit({ actorUserId: user.id, action: "seat.add_noncontinuous", entity: "license", entityId: license.id });
  back(ev(event.id), { ok: `أُضيف ${name} بترخيص مؤقت لهذه الفعالية (300 ريال + الضريبة على المنظّم)` });
}

// ───────── التفاوض (المواد 26 إلى 29) ─────────

async function seatForUser(participationId: string) {
  const user = await requireUser();
  const seat = await db.participation.findUnique({
    where: { id: participationId },
    include: { event: { include: { organizer: true } }, party: true, offers: { orderBy: { round: "asc" } } },
  });
  if (!seat) back("/dashboard", { error: "المشاركة غير موجودة" });
  const isOrganizer = seat.event.organizer.userId === user.id;
  const isParty = seat.party?.userId === user.id;
  if (!isOrganizer && !isParty) back("/dashboard", { error: "لا صلاحية لك على هذه المشاركة" });
  return { user, seat, side: isOrganizer ? ("ORGANIZER" as const) : ("PARTY" as const) };
}

const seatPath = (side: "ORGANIZER" | "PARTY", eventId: string) => (side === "ORGANIZER" ? ev(eventId) : "/poet/offers");

export async function makeOfferAction(form: FormData) {
  const { user, seat, side } = await seatForUser(str(form, "participationId"));
  const path = seatPath(side, seat.eventId);
  await expireNegotiations({ eventId: seat.eventId });
  if (!["INVITED", "NEGOTIATING"].includes(seat.status)) back(path, { error: "التفاوض مغلق على هذه المشاركة" });
  const amount = num(form, "amount");
  if (!amount || amount <= 0) back(path, { error: "أدخل مبلغ العرض" });
  const last = seat.offers.at(-1);
  if (last?.status === "PENDING" && last.fromSide === side) back(path, { error: "عرضك الأخير بانتظار رد الطرف الآخر" });
  const check = canMakeOffer(seat.offers.length, seat.negotiationDeadline);
  if (!check.ok) back(path, { error: check.reason });

  const now = new Date();
  if (last?.status === "PENDING") await db.offer.update({ where: { id: last.id }, data: { status: "COUNTERED" } });
  await db.offer.create({ data: { participationId: seat.id, fromSide: side, amountHalala: sarToHalala(amount), terms: str(form, "terms") || null, round: seat.offers.length + 1 } });
  await db.participation.update({ where: { id: seat.id }, data: {
    status: "NEGOTIATING",
    negotiationOpenedAt: seat.negotiationOpenedAt ?? now,
    negotiationDeadline: seat.negotiationDeadline ?? negotiationDeadline(now),
  } });
  const otherUserId = side === "ORGANIZER" ? seat.party?.userId : seat.event.organizer.userId;
  if (otherUserId) await notify(otherUserId, last ? "عرض مضاد جديد" : "عرض جديد", `${seat.event.name}: ${formatSAR(sarToHalala(amount))}`, side === "ORGANIZER" ? "/poet/offers" : ev(seat.eventId));
  await audit({ actorUserId: user.id, action: "offer.create", entity: "participation", entityId: seat.id, detail: { side, amount: sarToHalala(amount), round: seat.offers.length + 1 } });
  back(path, { ok: `أُرسل العرض (الجولة ${seat.offers.length + 1} من 3)` });
}

export async function respondOfferAction(form: FormData) {
  const { user, seat, side } = await seatForUser(str(form, "participationId"));
  const path = seatPath(side, seat.eventId);
  await expireNegotiations({ eventId: seat.eventId });
  const offer = seat.offers.find((o) => o.id === str(form, "offerId"));
  if (!offer || offer.status !== "PENDING") back(path, { error: "العرض غير متاح للرد" });
  if (offer.fromSide === side) back(path, { error: "لا ترد على عرضك" });
  const fresh = await db.participation.findUniqueOrThrow({ where: { id: seat.id } });
  if (fresh.status !== "NEGOTIATING") back(path, { error: "انتهى التفاوض على هذه المشاركة" });

  const accept = str(form, "decision") === "accept";
  await db.offer.update({ where: { id: offer.id }, data: { status: accept ? "ACCEPTED" : "REJECTED" } });
  await db.participation.update({ where: { id: seat.id }, data: accept ? { status: "AGREED", agreedHalala: offer.amountHalala } : { status: "REJECTED" } });
  const otherUserId = side === "ORGANIZER" ? seat.party?.userId : seat.event.organizer.userId;
  if (otherUserId) await notify(otherUserId, accept ? "قُبل العرض" : "رُفض العرض", seat.event.name, side === "ORGANIZER" ? "/poet/offers" : ev(seat.eventId));
  await audit({ actorUserId: user.id, action: accept ? "offer.accept" : "offer.reject", entity: "offer", entityId: offer.id });
  back(path, { ok: accept ? "تم الاتفاق. يُنشأ العقد الرقمي من صفحة الفعالية" : "رُفض العرض وأُغلق التفاوض" });
}

// ───────── العقود (المواد 30 و31) ─────────

export async function generateContractsAction(form: FormData) {
  const { user, event } = await organizerEvent(str(form, "eventId"));
  const seats = await db.participation.findMany({ where: { eventId: event.id, status: "AGREED", contract: null }, include: { party: true } });
  if (!seats.length) back(ev(event.id), { error: "لا مشاركات متفق عليها بلا عقد" });
  const rights = Object.keys(MEDIA_RIGHTS).filter((k) => bool(form, `right_${k}`));
  for (const s of seats) {
    if (!s.party) continue;
    const number = referenceNumber("C");
    const body = buildContractBody({
      number, organizer: event.organizer.displayName, party: s.party.displayName,
      partyRole: PARTY_KINDS[s.party.kind as keyof typeof PARTY_KINDS] ?? s.party.kind,
      event: { name: event.name, type: EVENT_TYPES[event.type as keyof typeof EVENT_TYPES], city: event.city, venue: event.venue?.name ?? event.venueText ?? "–", startsAt: event.startsAt },
      amountHalala: s.agreedHalala ?? 0, honorary: s.honorary,
      times: { attendStart: s.attendStart, performStart: s.performStart, performEnd: s.performEnd, requiredHours: s.requiredHours },
      rights,
    });
    const c = await db.contract.create({ data: {
      number, participationId: s.id, template: contractTemplateFor(s.role as SeatRole), body, contentHash: hashContent(body),
      mediaRights: rights.join(","), status: "AWAITING_SIGNATURES", verifyCode: verifyCode(),
    } });
    await notify(s.party.userId, "عقد بانتظار توقيعك", `${event.name}: ${number}`, `/contracts/${c.id}`);
    await audit({ actorUserId: user.id, action: "contract.create", entity: "contract", entityId: c.id, detail: { hash: c.contentHash } });
  }
  back(ev(event.id), { ok: `أُنشئ ${seats.length} عقد بانتظار توقيع الطرفين` });
}

async function contractForUser(contractId: string) {
  const user = await requireUser();
  const contract = await db.contract.findUnique({
    where: { id: contractId },
    include: { participation: { include: { party: true, event: { include: { organizer: true } } } } },
  });
  if (!contract) back("/dashboard", { error: "العقد غير موجود" });
  const isOrganizer = contract.participation.event.organizer.userId === user.id;
  const isParty = contract.participation.party?.userId === user.id;
  if (!isOrganizer && !isParty) back("/dashboard", { error: "لا صلاحية لك على هذا العقد" });
  return { user, contract, isOrganizer };
}

/** رمز التوقيع (المادة 31): رمز تحقق على البريد مؤقتاً، ويُستبدل بالنفاذ الوطني */
export async function requestSignCodeAction(form: FormData) {
  const { user, contract } = await contractForUser(str(form, "contractId"));
  const res = await requestOtp(user.email);
  const q = new URLSearchParams({ step: "sign" });
  if (!res.ok) q.set("error", res.error);
  else {
    q.set("ok", "أُرسل رمز التوقيع إلى بريدك");
    if (res.devCode) q.set("dev", res.devCode);
  }
  back(`/contracts/${contract.id}?${q}`, {});
}

export async function signContractAction(form: FormData) {
  const { user, contract, isOrganizer } = await contractForUser(str(form, "contractId"));
  const path = `/contracts/${contract.id}`;
  if (contract.status !== "AWAITING_SIGNATURES") back(path, { error: "العقد ليس بانتظار التوقيع" });
  if (str(form, "accept") !== "on") back(path, { error: "القبول الصريح لبنود العقد شرط للتوقيع (المادة 31)" });
  if (hashContent(contract.body) !== contract.contentHash) back(path, { error: "تغيّر نص العقد بعد إنشائه. لا يمكن التوقيع" });
  const res = await verifyOtp(user.email, str(form, "code"));
  if (!res.ok) back(`${path}?step=sign`, { error: res.error });

  const meta = JSON.stringify({ method: "email_otp", at: new Date().toISOString(), ip: await clientIp(), hash: contract.contentHash });
  const updated = await db.contract.update({
    where: { id: contract.id },
    data: isOrganizer ? { organizerSignedAt: new Date(), organizerSigMeta: meta } : { partySignedAt: new Date(), partySigMeta: meta },
  });
  await audit({ actorUserId: user.id, action: "contract.sign", entity: "contract", entityId: contract.id, detail: { side: isOrganizer ? "ORGANIZER" : "PARTY" } });

  if (updated.organizerSignedAt && updated.partySignedAt) {
    await db.contract.update({ where: { id: contract.id }, data: { status: "ACTIVE" } });
    await db.participation.update({ where: { id: contract.participationId }, data: { status: "CONTRACTED" } });
    await db.attendance.upsert({ where: { participationId: contract.participationId }, update: {}, create: { participationId: contract.participationId, token: verifyCode() } });
    const other = isOrganizer ? contract.participation.party?.userId : contract.participation.event.organizer.userId;
    if (other) await notify(other, "أصبح العقد نافذاً", contract.number, path);
    back(path, { ok: "اكتمل التوقيع وأصبح العقد نافذاً" });
  }
  back(path, { ok: "سُجّل توقيعك. العقد بانتظار توقيع الطرف الآخر" });
}

// ───────── الدفع والتأكيد (المواد 34 و35، والملحق هـ الخطوات 6 و7) ─────────

export async function toPaymentAction(form: FormData) {
  const { user, event } = await organizerEvent(str(form, "eventId"));
  const seats = await db.participation.findMany({ where: { eventId: event.id, status: { notIn: ["REJECTED", "EXPIRED", "CANCELLED"] } } });
  if (!seats.length) back(ev(event.id), { error: "لا مشاركات في الفعالية" });
  if (seats.some((s) => s.status !== "CONTRACTED")) back(ev(event.id), { error: "كل مشاركة قائمة يجب أن يكون لها عقد نافذ قبل الدفع" });
  await moveEvent(event.id, "AWAITING_PAYMENT", user.id);
  back(ev(event.id), { ok: "الفعالية قيد الدفع" });
}

/**
 * حجز مبالغ العقود ودفع ترخيص الفعالية. بوابة الدفع وحساب الضمان لم يُربطا بعد (INT-03، INT-04):
 * القيود تُسجَّل في الدفتر، والحجز الفعلي معلّق على السؤال ب1.
 */
export async function payEventAction(form: FormData) {
  const { user, event } = await organizerEvent(str(form, "eventId"));
  if (event.status !== "AWAITING_PAYMENT") back(ev(event.id), { error: "الفعالية ليست قيد الدفع" });
  const seats = await db.participation.findMany({ where: { eventId: event.id, status: "CONTRACTED" }, include: { contract: true } });
  for (const s of seats) {
    if (!s.contract || s.honorary || !s.agreedHalala) continue;
    const exists = await db.ledgerEntry.findFirst({ where: { contractId: s.contract.id, kind: "ESCROW_HOLD" } });
    if (!exists) await db.ledgerEntry.create({ data: { kind: "ESCROW_HOLD", amountHalala: s.agreedHalala, direction: "HOLD", partyId: event.organizerId, eventId: event.id, contractId: s.contract.id, memo: `حجز ${s.contract.number}` } });
  }
  // الخطوة 7: إصدار ترخيص الفعالية (المادة 21)
  const evType = await db.licenseType.findUniqueOrThrow({ where: { code: "EVENT" } });
  const hasEventLicense = await db.license.findFirst({ where: { typeCode: "EVENT", scopeEventId: event.id } });
  if (!hasEventLicense) {
    const l = await db.license.create({ data: {
      number: referenceNumber("L"), typeCode: "EVENT", partyId: event.organizerId, scopeEventId: event.id, status: "ACTIVE",
      issuedAt: new Date(), expiresAt: new Date(event.startsAt.getTime() + (event.durationHours + 24) * 3_600_000),
      feeHalala: evType.feeHalala, vatHalala: vatOn(evType.feeHalala), verifyCode: verifyCode(),
    } });
    await db.ledgerEntry.createMany({ data: [
      { kind: "LICENSE_FEE", amountHalala: l.feeHalala, direction: "IN", partyId: event.organizerId, eventId: event.id, licenseId: l.id, memo: `ترخيص فعالية ${l.number}` },
      { kind: "VAT", amountHalala: l.vatHalala, direction: "IN", partyId: event.organizerId, eventId: event.id, licenseId: l.id, memo: `ضريبة ${l.number}` },
    ] });
  }
  await moveEvent(event.id, "CONFIRMED", user.id, "دفع تجريبي: بوابة الدفع غير مربوطة بعد");
  if (event.venue) {
    const host = await db.party.findUnique({ where: { id: event.venue.hostPartyId } });
    if (host) await notify(host.userId, "فعالية مؤكدة في موقعك", `${event.name}: أكّد الحجز`, "/host/events");
  }
  back(ev(event.id), { ok: "حُجزت المبالغ وصدر ترخيص الفعالية. الفعالية مؤكدة" });
}

export async function startExecutionAction(form: FormData) {
  const { user, event } = await organizerEvent(str(form, "eventId"));
  await moveEvent(event.id, "IN_EXECUTION", user.id);
  back(ev(event.id), { ok: "بدأ تنفيذ الفعالية. سجّل الحضور بمسح رموز المشاركين" });
}

// ───────── الحضور والتنفيذ (المادتان 39 و40) ─────────

async function applyMark(attendanceId: string, side: "ORGANIZER" | "PARTY", present: boolean, actorUserId: string) {
  const a = await db.attendance.findUniqueOrThrow({ where: { id: attendanceId } });
  const marks = {
    organizerSaysPresent: side === "ORGANIZER" ? present : a.organizerSaysPresent,
    partySaysPresent: side === "PARTY" ? present : a.partySaysPresent,
  };
  const { status, frozen } = attendanceStatus(marks);
  await db.attendance.update({ where: { id: a.id }, data: {
    ...(side === "ORGANIZER" ? { organizerMarkedAt: new Date(), organizerSaysPresent: present } : { partyMarkedAt: new Date(), partySaysPresent: present }),
    status, payoutFrozen: frozen,
  } });
  await audit({ actorUserId, action: "attendance.mark", entity: "attendance", entityId: a.id, detail: { side, present, status } });
  if (status === "CONFLICT") for (const id of await adminUserIds()) await notify(id, "تعارض في تسجيل الحضور", "جُمّدت المستحقات حتى التحقق (المادة 40)", "/admin/cases");
  return status;
}

export async function organizerMarkAction(form: FormData) {
  const { user, seat, side } = await seatForUser(str(form, "participationId"));
  if (side !== "ORGANIZER") back("/dashboard", { error: "التسجيل هنا للمنظّم" });
  const a = await db.attendance.findUnique({ where: { participationId: seat.id } });
  if (!a) back(ev(seat.eventId), { error: "لا عقد نافذ لهذه المشاركة" });
  const status = await applyMark(a.id, "ORGANIZER", str(form, "present") === "yes", user.id);
  back(ev(seat.eventId), { ok: status === "CONFLICT" ? "سُجّل الحضور، ويوجد تعارض: جُمّدت المستحقات" : "سُجّل الحضور" });
}

export async function partyMarkAction(form: FormData) {
  const { user, seat, side } = await seatForUser(str(form, "participationId"));
  if (side !== "PARTY") back("/dashboard", { error: "التسجيل هنا للطرف المشارك" });
  const a = await db.attendance.findUnique({ where: { participationId: seat.id } });
  if (!a) back("/poet/attendance", { error: "لا عقد نافذ لهذه المشاركة" });
  const status = await applyMark(a.id, "PARTY", str(form, "present") === "yes", user.id);
  back("/poet/attendance", { ok: status === "CONFLICT" ? "سُجّل حضورك، ويوجد تعارض مع تسجيل المنظّم: يُراجَع" : "سُجّل حضورك" });
}

/** مسح رمز QR من جوال المنظّم في موقع الفعالية */
export async function scanTokenAction(form: FormData) {
  const user = await requireUser();
  const a = await db.attendance.findUnique({ where: { token: str(form, "token") }, include: { participation: { include: { event: { include: { organizer: true } } } } } });
  if (!a) back("/organizer", { error: "رمز غير صالح" });
  if (a.participation.event.organizer.userId !== user.id) back("/organizer", { error: "الرمز لفعالية لا تنظّمها" });
  await applyMark(a.id, "ORGANIZER", true, user.id);
  back(ev(a.participation.eventId), { ok: "سُجّل الحضور بمسح الرمز" });
}

/** اعتماد التنفيذ ثم الصرف (المادة 36) */
export async function approveExecutionAction(form: FormData) {
  const { user, seat, side } = await seatForUser(str(form, "participationId"));
  if (side !== "ORGANIZER") back("/dashboard", { error: "الاعتماد للمنظّم" });
  const a = await db.attendance.findUnique({ where: { participationId: seat.id } });
  if (!a || !["CONFIRMED", "RESOLVED"].includes(a.status) || a.organizerSaysPresent === false)
    back(ev(seat.eventId), { error: "لا يُعتمد التنفيذ قبل تأكيد الحضور من الطرفين أو حسم التعارض" });
  await db.attendance.update({ where: { id: a.id }, data: { executionApprovedAt: new Date() } });
  await db.participation.update({ where: { id: seat.id }, data: { status: "EXECUTED" } });
  await db.contract.updateMany({ where: { participationId: seat.id }, data: { status: "EXECUTED" } });
  await audit({ actorUserId: user.id, action: "execution.approve", entity: "participation", entityId: seat.id });
  const res = await payout(seat.id, user.id);
  back(ev(seat.eventId), res.ok ? { ok: "اعتُمد التنفيذ وصُرفت المستحقات" } : { error: `اعتُمد التنفيذ، وتعذّر الصرف: ${res.reason}` });
}

export async function completeEventAction(form: FormData) {
  const { user, event } = await organizerEvent(str(form, "eventId"));
  const open = await db.participation.count({ where: { eventId: event.id, status: "CONTRACTED" } });
  if (open) back(ev(event.id), { error: `بقيت ${open} مشاركة بلا اعتماد تنفيذ أو حالة تشغيلية` });
  await moveEvent(event.id, "COMPLETED", user.id);
  back(ev(event.id), { ok: "اكتملت الفعالية. قيّم المشاركين" });
}

// ───────── الطوارئ والإلغاء (المواد 33 و43 إلى 46) ─────────

/** المنظّم يسجّل غياب طرف (المادة 43) */
export async function markAbsenceAction(form: FormData) {
  const { user, seat, side } = await seatForUser(str(form, "participationId"));
  if (side !== "ORGANIZER" || !seat.party) back("/dashboard", { error: "التسجيل للمنظّم" });
  if (seat.status !== "CONTRACTED") back(ev(seat.eventId), { error: "الغياب يُسجَّل على مشاركة متعاقد عليها" });
  const afterStart = new Date() >= (seat.attendStart ?? seat.event.startsAt);
  const rule = absenceFine(seat.agreedHalala ?? 0, afterStart);
  const c = await db.operationalCase.create({ data: {
    kind: "ABSENCE", eventId: seat.eventId, participationId: seat.id, partyId: seat.party.id, ratePercent: rule.ratePercent,
    fineHalala: rule.fineHalala, ruleKey: rule.ruleKey, article: rule.article, pendingRule: rule.pending,
    objectionDeadline: objectionDeadline(new Date()), notes: str(form, "notes") || rule.explanation,
  } });
  await db.participation.update({ where: { id: seat.id }, data: { status: "CANCELLED" } });
  await db.contract.updateMany({ where: { participationId: seat.id }, data: { status: "CANCELLED" } });
  const contract = await db.contract.findUnique({ where: { participationId: seat.id } });
  if (contract) {
    const held = await heldFor(contract.id);
    if (held > 0) await db.ledgerEntry.create({ data: { kind: "REFUND", amountHalala: held, direction: "OUT", partyId: seat.event.organizerId, eventId: seat.eventId, contractId: contract.id, memo: `استرداد للمنظّم لغياب الطرف ${contract.number}` } });
  }
  await notify(seat.party.userId, "سُجّلت حالة غياب", `${seat.event.name}: لك الاعتراض خلال 15 يوماً`, "/poet/record");
  await audit({ actorUserId: user.id, action: "case.absence", entity: "case", entityId: c.id, detail: { rule: rule.ruleKey, fine: rule.fineHalala } });
  back(ev(seat.eventId), { ok: "سُجّلت حالة الغياب، وفُتحت مهلة الاعتراض 15 يوماً" });
}

/** الطرف يعتذر أو يلغي مشاركته (المواد 33 و44) */
export async function partyWithdrawAction(form: FormData) {
  const { user, seat, side } = await seatForUser(str(form, "participationId"));
  if (side !== "PARTY" || !seat.party) back("/dashboard", { error: "الاعتذار للطرف المشارك" });
  if (!["CONTRACTED", "AGREED"].includes(seat.status)) back("/poet/contracts", { error: "لا التزام قائم للاعتذار عنه" });
  const now = new Date();
  const forceMajeure = bool(form, "forceMajeure");
  const contractValue = seat.agreedHalala ?? 0;
  const rule = forceMajeure
    ? partyCancellationFine("EMERGENCY_CANCEL")
    : isLateApology(seat.event.startsAt, now)
      ? lateApologyFine(contractValue, bool(form, "substitute"))
      : partyCancellationFine(classifyCancellation(seat.event.startsAt, now, false));
  const kind = forceMajeure ? "EMERGENCY_CANCEL" : isLateApology(seat.event.startsAt, now) ? "LATE_APOLOGY" : classifyCancellation(seat.event.startsAt, now, false);

  const c = await db.operationalCase.create({ data: {
    kind, eventId: seat.eventId, participationId: seat.id, partyId: seat.party.id, ratePercent: rule.ratePercent,
    fineHalala: rule.fineHalala, ruleKey: rule.ruleKey, article: rule.article, pendingRule: rule.pending,
    objectionDeadline: objectionDeadline(now), notes: str(form, "reason") || rule.explanation,
  } });
  await db.participation.update({ where: { id: seat.id }, data: { status: "CANCELLED" } });
  const contract = await db.contract.findUnique({ where: { participationId: seat.id } });
  if (contract) {
    await db.contract.update({ where: { id: contract.id }, data: { status: "CANCELLED" } });
    const held = await heldFor(contract.id);
    if (held > 0) await db.ledgerEntry.create({ data: { kind: "REFUND", amountHalala: held, direction: "OUT", partyId: seat.event.organizerId, eventId: seat.eventId, contractId: contract.id, memo: `استرداد للمنظّم: اعتذار الطرف ${contract.number}` } });
  }
  await notify(seat.event.organizer.userId, "اعتذار طرف مشارك", `${seat.party.displayName} اعتذر عن ${seat.event.name}. فعّل بديلاً.`, ev(seat.eventId));
  await audit({ actorUserId: user.id, action: `case.${kind.toLowerCase()}`, entity: "case", entityId: c.id, detail: { rule: rule.ruleKey } });
  back("/poet/record", { ok: rule.pending ? "سُجّل الاعتذار. الغرامة معلّقة حتى تحسم المنصة قاعدتها" : `سُجّل الاعتذار: ${rule.explanation}` });
}

/** المنظّم يلغي الفعالية (المادة 33) */
export async function cancelEventAction(form: FormData) {
  const { user, event } = await organizerEvent(str(form, "eventId"));
  if (!canTransitionEvent(event.status as EventState, "CANCELLED")) back(ev(event.id), { error: "لا يمكن إلغاء الفعالية في حالتها الحالية" });
  const reason = str(form, "reason");
  if (reason.length < 5) back(ev(event.id), { error: "سبب الإلغاء مطلوب" });
  const forceMajeure = bool(form, "forceMajeure");
  const kind = classifyCancellation(event.startsAt, new Date(), forceMajeure);
  const contracts = await db.contract.findMany({ where: { participation: { eventId: event.id }, status: { in: ["ACTIVE", "AWAITING_SIGNATURES"] } }, include: { participation: { include: { party: true } } } });

  let totalDeduction = 0;
  for (const c of contracts) {
    const held = await heldFor(c.id);
    const rule = organizerCancellationDeduction(kind, held);
    if (rule.fineHalala > 0) {
      await db.ledgerEntry.create({ data: { kind: "CANCEL_DEDUCTION", amountHalala: rule.fineHalala, direction: "OUT", partyId: event.organizerId, eventId: event.id, contractId: c.id, memo: `${rule.explanation} (${c.number})` } });
      totalDeduction += rule.fineHalala;
    }
    const refund = held - rule.fineHalala;
    if (refund > 0) await db.ledgerEntry.create({ data: { kind: "REFUND", amountHalala: refund, direction: "OUT", partyId: event.organizerId, eventId: event.id, contractId: c.id, memo: `استرداد للمنظّم ${c.number}` } });
    await db.contract.update({ where: { id: c.id }, data: { status: "CANCELLED" } });
    if (c.participation.party) await notify(c.participation.party.userId, "أُلغيت فعالية", `${event.name}: ${reason}`, "/poet/contracts");
  }
  await db.participation.updateMany({ where: { eventId: event.id, status: { notIn: ["EXECUTED"] } }, data: { status: "CANCELLED" } });
  const rule = organizerCancellationDeduction(kind, 0);
  await db.operationalCase.create({ data: {
    kind, eventId: event.id, partyId: event.organizerId, ratePercent: rule.ratePercent, fineHalala: totalDeduction,
    ruleKey: rule.ruleKey, article: rule.article, pendingRule: true, objectionDeadline: objectionDeadline(new Date()),
    notes: `${reason}. مستفيد الاقتطاع معلّق على السؤال ب6`,
  } });
  await db.event.update({ where: { id: event.id }, data: { status: "CANCELLED", cancelKind: kind, cancelReason: reason, cancelledBy: forceMajeure ? "FORCE_MAJEURE" : "ORGANIZER" } });
  await audit({ actorUserId: user.id, action: "event.cancel", entity: "event", entityId: event.id, detail: { kind, totalDeduction } });
  back(ev(event.id), { ok: `أُلغيت الفعالية (${rule.explanation})` });
}
