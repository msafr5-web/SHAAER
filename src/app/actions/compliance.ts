"use server";

import { db } from "@/lib/db";
import { audit, notify } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { referenceNumber } from "@/lib/crypto";
import { GRIEVANCE_CATEGORIES } from "@/lib/domain";
import { back, str } from "@/lib/forms";
import { EVALUATION_FORMS, scoreEvaluation, type EvaluationForm } from "@/lib/rules";
import { adminUserIds } from "@/lib/services";

/** التقييم بأوزان الملحق (أ). المنظّم يقيّم الشاعر والصف، والطرف يقيّم المنظّم (معلّق: السؤال هـ7). */
export async function evaluateAction(form: FormData) {
  const user = await requireUser();
  const returnTo = str(form, "returnTo") || "/dashboard";
  const event = await db.event.findUnique({ where: { id: str(form, "eventId") }, include: { organizer: true, participations: true } });
  if (!event || !["COMPLETED", "FINANCIALLY_CLOSED"].includes(event.status)) back(returnTo, { error: "التقييم بعد اكتمال الفعالية" });
  const formKind = str(form, "form") as EvaluationForm;
  if (!(formKind in EVALUATION_FORMS)) back(returnTo, { error: "نموذج غير معروف" });
  const subjectPartyId = str(form, "subjectPartyId");

  const isOrganizer = event.organizer.userId === user.id;
  const participated = event.participations.some((p) => p.partyId && user.parties.some((up) => up.id === p.partyId) && p.status === "EXECUTED");
  if (formKind === "ORGANIZER" ? !(participated && subjectPartyId === event.organizerId) : !(isOrganizer && event.participations.some((p) => p.partyId === subjectPartyId && p.status === "EXECUTED")))
    back(returnTo, { error: "لا صلاحية لك على هذا التقييم" });

  const scores: Record<string, number> = {};
  for (const c of EVALUATION_FORMS[formKind]) scores[c.key] = Number(str(form, c.key));
  let total: number;
  try { total = scoreEvaluation(formKind, scores); } catch (e) { back(returnTo, { error: (e as Error).message }); }

  const dup = await db.evaluation.findUnique({ where: { eventId_subjectPartyId_evaluatorUserId: { eventId: event.id, subjectPartyId, evaluatorUserId: user.id } } });
  if (dup) back(returnTo, { error: "قيّمت هذا الطرف في هذه الفعالية مسبقاً" });
  const e = await db.evaluation.create({ data: { eventId: event.id, subjectPartyId, evaluatorUserId: user.id, form: formKind, scores: JSON.stringify(scores), total } });
  await audit({ actorUserId: user.id, action: "evaluation.create", entity: "evaluation", entityId: e.id, detail: { total } });
  back(returnTo, { ok: `سُجّل التقييم: ${total} من 100` });
}

/** التظلم (المادة 55، والملحق ب) */
export async function submitGrievanceAction(form: FormData) {
  const user = await requireUser();
  const category = str(form, "category");
  if (!(category in GRIEVANCE_CATEGORIES)) back("/poet/record", { error: "اختر نوع الاعتراض" });
  const reasons = str(form, "reasons");
  const requested = str(form, "requested");
  if (reasons.length < 10 || requested.length < 3) back("/poet/record", { error: "أسباب الاعتراض والطلب المطلوب إلزاميان (الملحق ب)" });

  const caseId = str(form, "caseId") || null;
  let partyId = user.parties[0]?.id;
  if (caseId) {
    const c = await db.operationalCase.findUnique({ where: { id: caseId } });
    if (!c || !user.parties.some((p) => p.id === c.partyId)) back("/poet/record", { error: "الحالة ليست لك" });
    if (c.objectionDeadline < new Date()) back("/poet/record", { error: "انقضت مهلة الاعتراض: 15 يوماً من تسجيل الحالة" });
    partyId = c.partyId;
  }
  if (!partyId) back("/poet/record", { error: "لا صفة مرتبطة بحسابك" });
  const g = await db.grievance.create({ data: { number: referenceNumber("G"), partyId, caseId, category, reasons, requested } });
  for (const id of await adminUserIds()) await notify(id, "تظلم جديد", g.number, `/admin/grievances`);
  await audit({ actorUserId: user.id, action: "grievance.submit", entity: "grievance", entityId: g.id });
  back("/poet/record", { ok: `قُدّم التظلم ${g.number}. يُشعَر بالنتيجة عبر المنصة` });
}
