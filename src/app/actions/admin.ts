"use server";

import { db } from "@/lib/db";
import { audit, notify } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { BADGES } from "@/lib/domain";
import { back, str } from "@/lib/forms";
import { sarToHalala } from "@/lib/money";
import { absenceFine, objectionDeadline } from "@/lib/rules";
import { payout } from "@/lib/services";

/** مراجعة طلب ترخيص (إدارة التراخيص، المادة 61) */
export async function reviewLicenseAction(form: FormData) {
  const admin = await requireAdmin();
  const license = await db.license.findUnique({ where: { id: str(form, "licenseId") }, include: { party: true, type: true } });
  if (!license || license.status !== "UNDER_REVIEW") back("/admin/licenses", { error: "الطلب غير متاح للمراجعة" });
  const approve = str(form, "decision") === "approve";
  const note = str(form, "note") || null;
  await db.license.update({ where: { id: license.id }, data: { status: approve ? "AWAITING_PAYMENT" : "REJECTED", reviewNote: note } });
  if (approve && license.party.badge === "UNDER_REVIEW") await db.party.update({ where: { id: license.partyId }, data: { badge: "VERIFIED" } });
  await notify(license.party.userId, approve ? "اعتُمد طلب الترخيص" : "رُفض طلب الترخيص", approve ? `${license.type.nameAr}: ادفع الرسم لإصداره` : note ?? license.type.nameAr, "/poet/licenses");
  await audit({ actorUserId: admin.id, action: approve ? "license.approve" : "license.reject", entity: "license", entityId: license.id, detail: note ?? undefined });
  back("/admin/licenses", { ok: approve ? "اعتُمد الطلب وأُشعر الطالب بالدفع" : "رُفض الطلب" });
}

export async function suspendLicenseAction(form: FormData) {
  const admin = await requireAdmin();
  const license = await db.license.findUnique({ where: { id: str(form, "licenseId") }, include: { party: true } });
  if (!license) back("/admin/licenses", { error: "الترخيص غير موجود" });
  const to = license.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
  await db.license.update({ where: { id: license.id }, data: { status: to, reviewNote: str(form, "note") || license.reviewNote } });
  await notify(license.party.userId, to === "SUSPENDED" ? "عُلّق ترخيصك" : "رُفع التعليق عن ترخيصك", license.number, "/poet/licenses");
  await audit({ actorUserId: admin.id, action: `license.${to.toLowerCase()}`, entity: "license", entityId: license.id });
  back("/admin/licenses?tab=all", { ok: to === "SUSPENDED" ? "عُلّق الترخيص (المادة 54)" : "رُفع التعليق" });
}

/** مراجعة الفعالية واعتمادها مبدئياً (إدارة التشغيل، المادة 25) */
export async function reviewEventAction(form: FormData) {
  const admin = await requireAdmin();
  const event = await db.event.findUnique({ where: { id: str(form, "eventId") }, include: { organizer: true } });
  if (!event || event.status !== "UNDER_REVIEW") back("/admin/events", { error: "الفعالية ليست قيد المراجعة" });
  const approve = str(form, "decision") === "approve";
  const note = str(form, "note") || null;
  const seats = await db.participation.count({ where: { eventId: event.id } });
  const to = approve ? (seats ? "NEGOTIATING" : "PRELIM_APPROVED") : "DRAFT";
  await db.event.update({ where: { id: event.id }, data: { status: to, reviewNote: note } });
  await notify(event.organizer.userId, approve ? "اعتُمدت الفعالية مبدئياً" : "أُعيدت الفعالية للتعديل", note ?? event.name, `/organizer/events/${event.id}`);
  await audit({ actorUserId: admin.id, action: approve ? "event.prelim_approve" : "event.return", entity: "event", entityId: event.id, detail: note ?? undefined });
  back("/admin/events", { ok: approve ? "اعتُمدت الفعالية مبدئياً" : "أُعيدت إلى المنظّم" });
}

export async function closeEventFinanciallyAction(form: FormData) {
  const admin = await requireAdmin();
  const event = await db.event.findUnique({ where: { id: str(form, "eventId") } });
  if (!event || event.status !== "COMPLETED") back("/admin/events", { error: "الإغلاق المالي للفعاليات المكتملة" });
  const openCases = await db.operationalCase.count({ where: { eventId: event.id, status: "OBJECTION_WINDOW" } });
  const openGrievances = await db.grievance.count({ where: { case: { eventId: event.id }, status: { in: ["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFO"] } } });
  if (openCases || openGrievances) back(`/admin/events/${event.id}`, { error: "توجد حالات في مهلة الاعتراض أو تظلمات مفتوحة" });
  await db.event.update({ where: { id: event.id }, data: { status: "FINANCIALLY_CLOSED" } });
  await audit({ actorUserId: admin.id, action: "event.financially_closed", entity: "event", entityId: event.id });
  back(`/admin/events/${event.id}`, { ok: "أُغلقت الفعالية مالياً وتشغيلياً" });
}

/** حسم تعارض الحضور (المادة 40). معلّق: من يحسم وفي كم يوماً (السؤال ج6). */
export async function resolveAttendanceAction(form: FormData) {
  const admin = await requireAdmin();
  const a = await db.attendance.findUnique({ where: { id: str(form, "attendanceId") }, include: { participation: { include: { party: true, event: true } } } });
  if (!a || a.status !== "CONFLICT") back("/admin/cases", { error: "لا تعارض قائم" });
  const present = str(form, "outcome") === "present";
  const note = str(form, "note");
  if (note.length < 5) back("/admin/cases", { error: "سجّل أساس القرار والإثبات المعتمد" });
  await db.attendance.update({ where: { id: a.id }, data: { status: "RESOLVED", payoutFrozen: false, organizerSaysPresent: present, partySaysPresent: present, resolution: note } });
  if (!present && a.participation.party) {
    const rule = absenceFine(a.participation.agreedHalala ?? 0, true);
    await db.operationalCase.create({ data: {
      kind: "ABSENCE", eventId: a.participation.eventId, participationId: a.participationId, partyId: a.participation.party.id,
      ratePercent: rule.ratePercent, fineHalala: rule.fineHalala, ruleKey: rule.ruleKey, article: rule.article, pendingRule: rule.pending,
      objectionDeadline: objectionDeadline(new Date()), notes: `حُسم التعارض بعدم الحضور: ${note}`,
    } });
    await db.participation.update({ where: { id: a.participationId }, data: { status: "CANCELLED" } });
  }
  if (a.participation.party) await notify(a.participation.party.userId, "حُسم تعارض الحضور", present ? "اعتُمد حضورك" : "لم يثبت الحضور، ولك الاعتراض خلال 15 يوماً", "/poet/attendance");
  await audit({ actorUserId: admin.id, action: "attendance.resolve", entity: "attendance", entityId: a.id, detail: { present, note } });
  back("/admin/cases", { ok: "حُسم التعارض وفُك التجميد" });
}

/** البت في التظلم (المادة 55). القرار يعدّل الغرامة ويُشعر الطرف. */
export async function decideGrievanceAction(form: FormData) {
  const admin = await requireAdmin();
  const g = await db.grievance.findUnique({ where: { id: str(form, "grievanceId") }, include: { party: true, case: true } });
  if (!g || ["ACCEPTED", "PARTIAL", "REJECTED"].includes(g.status)) back("/admin/grievances", { error: "التظلم محسوم أو غير موجود" });
  const outcome = str(form, "outcome");
  const decision = str(form, "decision");
  if (!["ACCEPTED", "PARTIAL", "REJECTED", "NEEDS_INFO", "UNDER_REVIEW"].includes(outcome)) back("/admin/grievances", { error: "اختر القرار" });
  if (decision.length < 5) back("/admin/grievances", { error: "سبب القرار مطلوب" });
  const final = ["ACCEPTED", "PARTIAL", "REJECTED"].includes(outcome);
  await db.grievance.update({ where: { id: g.id }, data: { status: outcome, decision, reviewerId: admin.id, decidedAt: final ? new Date() : null } });
  if (g.case && final) {
    const newFine = outcome === "ACCEPTED" ? 0 : outcome === "PARTIAL" ? sarToHalala(Number(str(form, "newFine") || 0)) : g.case.fineHalala;
    await db.operationalCase.update({ where: { id: g.case.id }, data: { fineHalala: newFine, status: outcome === "REJECTED" ? "FINAL" : "AMENDED" } });
    if (newFine > 0 && !g.case.pendingRule) await db.ledgerEntry.create({ data: { kind: "FINE", amountHalala: newFine, direction: "IN", partyId: g.case.partyId, eventId: g.case.eventId, memo: `غرامة بعد قرار التظلم ${g.number}` } });
  }
  await notify(g.party.userId, "نتيجة التظلم", `${g.number}: ${decision}`, "/poet/record");
  await audit({ actorUserId: admin.id, action: "grievance.decide", entity: "grievance", entityId: g.id, detail: { outcome } });
  back("/admin/grievances", { ok: "سُجّل القرار وأُشعر المتظلم" });
}

/** تغيير معامل: إصدار جديد بتاريخ سريان، والقديم يبقى للحالات السابقة (المادتان 38 و71) */
export async function updateParameterAction(form: FormData) {
  const admin = await requireAdmin();
  const key = str(form, "key");
  const current = await db.parameter.findFirst({ where: { key }, orderBy: { effectiveFrom: "desc" } });
  if (!current) back("/admin/parameters", { error: "المعامل غير موجود" });
  const value = str(form, "value");
  const effectiveFrom = str(form, "effectiveFrom") ? new Date(str(form, "effectiveFrom")) : new Date();
  const confirm = str(form, "confirm") === "on";
  await db.parameter.create({ data: {
    key, value, label: current.label, article: current.article, effectiveFrom,
    status: confirm ? "CONFIRMED" : current.status, question: confirm ? null : current.question,
  } });
  await audit({ actorUserId: admin.id, action: "parameter.update", entity: "parameter", entityId: key, detail: { from: current.value, to: value, effectiveFrom } });
  back("/admin/parameters", { ok: `حُفظ إصدار جديد للمعامل يسري من ${effectiveFrom.toISOString().slice(0, 10)}` });
}

/** توصيف الحساب والتحقق البنكي (المادتان 62 و64) */
export async function verifyPartyAction(form: FormData) {
  const admin = await requireAdmin();
  const party = await db.party.findUnique({ where: { id: str(form, "partyId") } });
  if (!party) back("/admin/parties", { error: "الطرف غير موجود" });
  const badge = str(form, "badge");
  const data: { badge?: string | null; ibanVerified?: boolean } = {};
  if (badge) data.badge = badge === "NONE" ? null : badge in BADGES ? badge : party.badge;
  if (str(form, "verifyIban") === "on") {
    if (!party.iban) back("/admin/parties", { error: "لا آيبان مسجل للطرف" });
    data.ibanVerified = true;
  }
  await db.party.update({ where: { id: party.id }, data });
  await audit({ actorUserId: admin.id, action: "party.verify", entity: "party", entityId: party.id, detail: data });
  back("/admin/parties", { ok: "حُدّث الطرف" });
}

export async function retryPayoutAction(form: FormData) {
  const admin = await requireAdmin();
  const res = await payout(str(form, "participationId"), admin.id);
  back("/admin/finance", res.ok ? { ok: "صُرفت المستحقات" } : { error: res.reason });
}
