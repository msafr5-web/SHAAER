import "server-only";
import { createHash } from "node:crypto";
import { db } from "./db";
import { audit, notify } from "./audit";
import { MEDIA_RIGHTS, SEAT_ROLES, type SeatRole } from "./domain";
import { formatSAR } from "./money";
import { formatDateTime } from "./dates";

/** المهلة المنتهية تُغلق التفاوض آلياً (المادة 27). تُستدعى عند تحميل الصفحات المعنية. */
export async function expireNegotiations(where: { eventId?: string; partyId?: string } = {}) {
  const now = new Date();
  const stale = await db.participation.findMany({
    where: { ...where, status: "NEGOTIATING", negotiationDeadline: { lt: now } },
    select: { id: true },
  });
  for (const p of stale) {
    await db.offer.updateMany({ where: { participationId: p.id, status: "PENDING" }, data: { status: "EXPIRED" } });
    await db.participation.update({ where: { id: p.id }, data: { status: "EXPIRED" } });
    await audit({ action: "negotiation.expired", entity: "participation", entityId: p.id, detail: "انتهت مهلة 48 ساعة عمل (المادة 27)" });
  }
}

/**
 * الحالة التي انقضت مهلة الاعتراض عليها دون تظلم مفتوح تصبح نهائية،
 * وتُقيَّد غرامتها في الدفتر إلا إن كانت قاعدتها معلّقة على سؤال لصاحب المبادرة.
 */
export async function finalizeCases() {
  const due = await db.operationalCase.findMany({
    where: { status: "OBJECTION_WINDOW", objectionDeadline: { lt: new Date() } },
    include: { grievances: { where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFO"] } } } },
  });
  for (const c of due) {
    if (c.grievances.length) continue;
    await db.operationalCase.update({ where: { id: c.id }, data: { status: "FINAL" } });
    if (c.fineHalala > 0 && !c.pendingRule) {
      await db.ledgerEntry.create({ data: { kind: "FINE", amountHalala: c.fineHalala, direction: "IN", partyId: c.partyId, eventId: c.eventId, memo: `غرامة نهائية (المادة ${c.article})` } });
    }
    await audit({ action: "case.final", entity: "case", entityId: c.id });
  }
}

export function contractTemplateFor(role: SeatRole) {
  return SEAT_ROLES[role].template;
}

/** نص العقد الرقمي على النموذج المبسط في المادة 30 */
export function buildContractBody(input: {
  number: string; organizer: string; party: string; partyRole: string; event: { name: string; type: string; city: string; venue: string; startsAt: Date };
  amountHalala: number; honorary: boolean; times: { attendStart?: Date | null; performStart?: Date | null; performEnd?: Date | null; requiredHours?: number | null };
  rights: string[];
}) {
  const rights = input.rights.length ? input.rights.map((r) => MEDIA_RIGHTS[r as keyof typeof MEDIA_RIGHTS] ?? r).join("، ") : "لا تصوير ولا بث";
  return [
    `العقد الرقمي رقم ${input.number}`,
    "",
    `الطرف الأول: ${input.organizer} (الجهة المنظمة المعتمدة عبر منصة «شاعر»)`,
    `الطرف الثاني: ${input.party} (${input.partyRole})`,
    "",
    "موضوع العقد: المشاركة في فعالية شعر محاورة مسجلة عبر منصة «شاعر» وفق البيانات المعتمدة داخل النظام.",
    "",
    "بيانات الفعالية:",
    `اسم الفعالية: ${input.event.name} · نوعها: ${input.event.type} · المدينة: ${input.event.city} · الموقع: ${input.event.venue}`,
    `تاريخ الفعالية: ${formatDateTime(input.event.startsAt)}`,
    `وقت الحضور: ${formatDateTime(input.times.attendStart)} · وقت بدء المشاركة: ${formatDateTime(input.times.performStart)} · وقت انتهائها: ${formatDateTime(input.times.performEnd)} · الساعات المطلوبة: ${input.times.requiredHours ?? "–"}`,
    "",
    "الالتزامات: يلتزم الطرف الثاني بالحضور في الوقت المحدد، والسلوك المهني، والأنظمة والتعليمات، وميثاق الشرف، وتنفيذ المشاركة المتفق عليها.",
    `المكافآت: ${input.honorary ? "مشاركة شرفية دون مقابل مالي (المادة 23)" : `${formatSAR(input.amountHalala)} بحسب ما اتُّفق عليه عبر نظام التفاوض المعتمد`}.`,
    "الصرف: تُصرف المستحقات عبر المنصة فور إثبات تنفيذ المشاركة، وفق السياسات والإجراءات المالية المعتمدة (المادة 36).",
    `التصوير والبث: يوافق الطرف الثاني على ما يلي ضمن حدود الفعالية والعقد: ${rights} (المادة 49).`,
    "آلية التحقق: تسجيل الحضور برمز QR من الطرفين، ويُجمَّد الصرف عند التعارض حتى التحقق (المادة 40).",
    "الإلغاء والاعتذار: تُطبَّق سياسة الإلغاء والاعتذار المعتمدة بحسب توقيته وأثره (المواد 33 و43 و44).",
    "الطوارئ والقوة القاهرة: تُطبَّق الإجراءات المعتمدة في الظروف الخارجة عن الإرادة (المادة 46).",
    "المرجعية النظامية: يخضع هذا العقد للأنظمة المعمول بها في المملكة العربية السعودية وللسياسات واللوائح التشغيلية المعتمدة في منصة «شاعر».",
    "التوثيق الإلكتروني: يُعد قبول العقد إلكترونياً عبر المنصة موافقة ملزمة لجميع الأطراف (المادتان 30 و31).",
    "ويُعد أي اتفاق أو تعديل يتم خارج المنصة غير معتمد ضمن إجراءاتها التشغيلية (المادة 32).",
  ].join("\n");
}

export function hashContent(body: string) {
  return createHash("sha256").update(body).digest("hex");
}

/** هل يحمل الطرف ترخيصاً سارياً يمنحه استقبال العروض والتعاقد (المادة 9) */
export async function partyLicensedFor(partyId: string, eventId?: string) {
  const now = new Date();
  const lic = await db.license.findFirst({
    where: {
      partyId, status: "ACTIVE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      AND: [{ OR: [{ scopeEventId: null }, ...(eventId ? [{ scopeEventId: eventId }] : [])] }],
    },
  });
  return Boolean(lic);
}

/** الصرف بعد اعتماد التنفيذ: إفراج من الضمان ثم تحويل للطرف (المادة 36) */
export async function payout(participationId: string, actorUserId: string) {
  const p = await db.participation.findUnique({
    where: { id: participationId },
    include: { contract: true, party: true, attendance: true, event: true },
  });
  if (!p?.contract || !p.party || !p.agreedHalala) return { ok: false as const, reason: "لا عقد أو لا مبلغ" };
  if (p.honorary) return { ok: true as const, amount: 0 };
  if (p.attendance?.payoutFrozen) return { ok: false as const, reason: "المستحقات مجمّدة (المادة 40)" };
  if (!p.party.ibanVerified) return { ok: false as const, reason: "لا حساب بنكي معتمد للطرف (المادة 36)" };
  const already = await db.ledgerEntry.findFirst({ where: { contractId: p.contract.id, kind: "PAYOUT" } });
  if (already) return { ok: true as const, amount: already.amountHalala };
  await db.ledgerEntry.createMany({ data: [
    { kind: "ESCROW_RELEASE", amountHalala: p.agreedHalala, direction: "OUT", partyId: p.event.organizerId, eventId: p.eventId, contractId: p.contract.id, memo: `إفراج ${p.contract.number}` },
    { kind: "PAYOUT", amountHalala: p.agreedHalala, direction: "OUT", partyId: p.party.id, eventId: p.eventId, contractId: p.contract.id, memo: `صرف مستحقات ${p.contract.number}` },
  ] });
  await audit({ actorUserId, action: "payout.sent", entity: "contract", entityId: p.contract.id, detail: { amount: p.agreedHalala } });
  await notify(p.party.userId, "صُرفت مستحقاتك", `حُوِّل ${formatSAR(p.agreedHalala)} عن ${p.event.name} إلى حسابك المعتمد.`, "/poet/finance");
  return { ok: true as const, amount: p.agreedHalala };
}

/** مجموع المحجوز لعقد (لحساب الاقتطاع عند الإلغاء) */
export async function heldFor(contractId: string) {
  const rows = await db.ledgerEntry.findMany({ where: { contractId, kind: { in: ["ESCROW_HOLD", "ESCROW_RELEASE", "REFUND", "CANCEL_DEDUCTION"] } } });
  return rows.reduce((s, r) => (r.kind === "ESCROW_HOLD" ? s + r.amountHalala : s - r.amountHalala), 0);
}

export async function adminUserIds() {
  return (await db.user.findMany({ where: { isAdmin: true }, select: { id: true } })).map((u) => u.id);
}
