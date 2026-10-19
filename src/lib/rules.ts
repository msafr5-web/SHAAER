// محرك القواعد: كل قاعدة دالة نقية تحمل رقم مادتها.
// القيم الافتراضية من اللائحة، والقيم الفعلية معاملات مؤرخة في قاعدة البيانات (جدول Parameter).
// ما عليه سؤال مفتوح لصاحب المبادرة يُعاد معه pending: true ورقم السؤال، ولا يُخفى.

import { percentOf } from "./money";

export type RuleResult = {
  ratePercent: number;
  fineHalala: number;
  ruleKey: string;
  article: string;
  pending: boolean;
  question?: string;
  explanation: string;
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// ───────── التفاوض (المواد 26 إلى 28) ─────────

export const NEGOTIATION = {
  maxRounds: 3, // المادة 28 (السؤال ج2: ما الذي يُعد جولة)
  maxWorkingHours: 48, // المادة 27 (السؤال ج1: تعريف ساعات العمل)
  workdayStartHour: 8,
  workdayEndHour: 17,
  weekendDays: [5, 6] as number[], // الجمعة والسبت، افتراض معلّق على السؤال ج1
};

/**
 * يضيف ساعات عمل إلى تاريخ (المادة 27).
 * الافتراض الحالي: من 8 صباحاً إلى 5 مساءً، الأحد إلى الخميس، بتوقيت الرياض (UTC+3).
 */
export function addWorkingHours(start: Date, hours: number, cfg = NEGOTIATION): Date {
  const OFFSET = 3 * HOUR; // الرياض بلا توقيت صيفي
  let t = start.getTime() + OFFSET; // نعمل بالتوقيت المحلي ممثَّلاً بـ UTC
  let remaining = hours * HOUR;
  while (remaining > 0) {
    const d = new Date(t);
    const day = d.getUTCDay();
    const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), cfg.workdayStartHour);
    const dayEnd = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), cfg.workdayEndHour);
    if (cfg.weekendDays.includes(day) || t >= dayEnd) {
      t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, cfg.workdayStartHour);
      continue;
    }
    if (t < dayStart) t = dayStart;
    const chunk = Math.min(remaining, dayEnd - t);
    t += chunk;
    remaining -= chunk;
  }
  return new Date(t - OFFSET);
}

export function negotiationDeadline(openedAt: Date): Date {
  return addWorkingHours(openedAt, NEGOTIATION.maxWorkingHours);
}

export function canMakeOffer(roundsSoFar: number, deadline: Date | null, now = new Date()) {
  if (roundsSoFar >= NEGOTIATION.maxRounds)
    return { ok: false as const, reason: "بلغ التفاوض حده الأقصى: ثلاث جولات (المادة 28)" };
  if (deadline && now > deadline)
    return { ok: false as const, reason: "انتهت مهلة التفاوض: 48 ساعة عمل (المادة 27)" };
  return { ok: true as const };
}

// ───────── الإلغاء (المادة 33) ─────────

export const CANCELLATION = {
  earlyThresholdDays: 7,
  organizerEarlyPct: 10,
  organizerLatePct: 30,
  organizerNoncompliancePctMax: 50,
  objectionDays: 15,
};

export type CancelKind = "EARLY_CANCEL" | "LATE_CANCEL" | "EMERGENCY_CANCEL" | "NONCOMPLIANCE";

/** يصنّف الإلغاء حسب توقيته (المادة 33): 7 أيام فأكثر مبكر، وأقل متأخر. */
export function classifyCancellation(eventStart: Date, at: Date, forceMajeure: boolean): CancelKind {
  if (forceMajeure) return "EMERGENCY_CANCEL";
  return eventStart.getTime() - at.getTime() >= CANCELLATION.earlyThresholdDays * DAY
    ? "EARLY_CANCEL"
    : "LATE_CANCEL";
}

/** ما يُقتطع من المنظّم عند إلغائه (المادة 33). */
export function organizerCancellationDeduction(
  kind: CancelKind,
  heldHalala: number,
  noncompliancePct = CANCELLATION.organizerNoncompliancePctMax,
): RuleResult {
  const base = { article: "33", pending: false };
  switch (kind) {
    case "EARLY_CANCEL":
      return { ...base, ruleKey: "cancel.organizer.early", ratePercent: CANCELLATION.organizerEarlyPct,
        fineHalala: percentOf(heldHalala, CANCELLATION.organizerEarlyPct),
        explanation: "إلغاء مبكر من المنظّم: اقتطاع 10% من المبالغ المحجوزة" };
    case "LATE_CANCEL":
      return { ...base, ruleKey: "cancel.organizer.late", ratePercent: CANCELLATION.organizerLatePct,
        fineHalala: percentOf(heldHalala, CANCELLATION.organizerLatePct),
        explanation: "إلغاء متأخر من المنظّم: اقتطاع 30%، ويجوز زيادته بضرر موثّق" };
    case "NONCOMPLIANCE": {
      const pct = Math.min(Math.max(noncompliancePct, 0), CANCELLATION.organizerNoncompliancePctMax);
      return { ...base, ruleKey: "cancel.organizer.noncompliance", ratePercent: pct,
        fineHalala: percentOf(heldHalala, pct),
        explanation: "إلغاء لعدم الالتزام: اقتطاع حتى 50% حسب حجم الضرر" };
    }
    case "EMERGENCY_CANCEL":
      return { ...base, article: "33 و46", ruleKey: "cancel.emergency", ratePercent: 0, fineHalala: 0,
        pending: true, question: "ب8",
        explanation: "إلغاء طارئ: استرداد كامل بعد خصم التكاليف الفعلية غير القابلة للاسترداد" };
  }
}

/** غرامة الشاعر أو الصف عند إلغائه: اللائحة لا تحدد قيمة (السؤال هـ3). */
export function partyCancellationFine(kind: CancelKind): RuleResult {
  return {
    ruleKey: `cancel.party.${kind.toLowerCase()}`,
    article: "33",
    ratePercent: 0,
    fineHalala: 0,
    pending: kind !== "EMERGENCY_CANCEL",
    question: kind === "EMERGENCY_CANCEL" ? undefined : "هـ3",
    explanation:
      kind === "EMERGENCY_CANCEL"
        ? "إلغاء طارئ: لا غرامة"
        : "غرامة تشغيلية «وفق السياسة» بلا قيمة في اللائحة: تُسجَّل الحالة وتُحدد الغرامة بعد الحسم",
  };
}

// ───────── الغياب والاعتذار (المادتان 43 و44) ─────────

/**
 * غياب الشاعر (المادة 43).
 * 25% إن كان قبل أقل من 48 ساعة، و50% بعد بدء الفعالية أو موعد الحضور.
 * معلّقة: الملحق (ج) يجعل 50% للتكرار (السؤالان هـ1 و هـ2).
 */
export function absenceFine(contractHalala: number, afterStart: boolean): RuleResult {
  const pct = afterStart ? 50 : 25;
  return {
    ruleKey: afterStart ? "absence.after_start" : "absence.within_48h",
    article: "43",
    ratePercent: pct,
    fineHalala: percentOf(contractHalala, pct),
    pending: true,
    question: afterStart ? "هـ1" : "هـ2",
    explanation: afterStart
      ? "غياب بعد بدء الفعالية أو موعد الحضور: 50% من قيمة العقد"
      : "غياب قبل أقل من 48 ساعة: 25% من قيمة العقد",
  };
}

/**
 * الاعتذار المتأخر خلال أقل من 48 ساعة (المادة 44).
 * 20% مع بديل مناسب، و35% مع إرباك أو تعذّر البديل. معلّقة: الملحق (ج) يجعل 35% للتكرار (هـ1).
 */
export function lateApologyFine(contractHalala: number, substituteProvided: boolean): RuleResult {
  const pct = substituteProvided ? 20 : 35;
  return {
    ruleKey: substituteProvided ? "apology.late.with_substitute" : "apology.late.disruptive",
    article: "44",
    ratePercent: pct,
    fineHalala: percentOf(contractHalala, pct),
    pending: !substituteProvided,
    question: substituteProvided ? undefined : "هـ1",
    explanation: substituteProvided
      ? "اعتذار متأخر مع بديل مناسب: 20% من قيمة العقد"
      : "اعتذار متأخر مع إرباك أو تعذّر البديل: 35% من قيمة العقد",
  };
}

/** هل الاعتذار متأخر: خلال أقل من 48 ساعة من موعد الفعالية (المادة 44). */
export function isLateApology(eventStart: Date, at: Date): boolean {
  return eventStart.getTime() - at.getTime() < 48 * HOUR;
}

// ───────── غياب عضو الصف (المادة 45) ─────────

/**
 * 20% من قيمة مشاركة العضو، ويتحمل القائد نصف الغرامة المقررة على العضو.
 * معلّقة: كيف تُحدد قيمة مشاركة العضو في عقد صف جماعي (السؤال هـ12).
 */
export function rowMemberAbsenceFine(memberShareHalala: number) {
  const member = percentOf(memberShareHalala, 20);
  return {
    member: {
      ruleKey: "row.member_absence", article: "45", ratePercent: 20, fineHalala: member,
      pending: true, question: "هـ12", explanation: "غياب عضو الصف: 20% من قيمة مشاركته",
    } satisfies RuleResult,
    leader: {
      ruleKey: "row.leader_share", article: "45", ratePercent: 10, fineHalala: Math.round(member / 2),
      pending: true, question: "هـ12", explanation: "قائد الصف: نصف الغرامة المقررة على العضو",
    } satisfies RuleResult,
  };
}

// ───────── المهل ─────────

/** مهلة الاعتراض: 15 يوماً من تسجيل الحالة (المواد 33 و43 إلى 45). */
export function objectionDeadline(recordedAt: Date): Date {
  return new Date(recordedAt.getTime() + CANCELLATION.objectionDays * DAY);
}

// ───────── الصرف (المادة 36) والحضور (المادة 40) ─────────

export type AttendanceMarks = {
  organizerSaysPresent: boolean | null;
  partySaysPresent: boolean | null;
};

/** حالة الحضور من تسجيل الطرفين. التعارض يجمّد المستحقات (المادة 40). */
export function attendanceStatus(m: AttendanceMarks) {
  if (m.organizerSaysPresent === null && m.partySaysPresent === null) return { status: "EXPECTED", frozen: false };
  if (m.organizerSaysPresent === null || m.partySaysPresent === null) return { status: "PARTIAL", frozen: false };
  if (m.organizerSaysPresent === m.partySaysPresent) return { status: "CONFIRMED", frozen: false };
  return { status: "CONFLICT", frozen: true };
}

/** لا صرف إلا بعد اعتماد التنفيذ، ولا صرف مع تجميد (المادتان 36 و40). */
export function canPayout(opts: { executionApproved: boolean; frozen: boolean; ibanVerified: boolean }) {
  if (!opts.executionApproved) return { ok: false as const, reason: "لم يُعتمد التنفيذ بعد (المادة 36)" };
  if (opts.frozen) return { ok: false as const, reason: "المستحقات مجمّدة لتعارض في الحضور (المادة 40)" };
  if (!opts.ibanVerified) return { ok: false as const, reason: "لا حساب بنكي معتمد للطرف (المادة 36)" };
  return { ok: true as const };
}

// ───────── التقييم (الملحق أ) ─────────

export const EVALUATION_FORMS = {
  POET: [
    { key: "attendance", label: "الالتزام بالحضور", max: 20 },
    { key: "performance", label: "جودة الأداء", max: 25 },
    { key: "professionalism", label: "الاحترافية", max: 20 },
    { key: "audience", label: "التفاعل الجماهيري", max: 15 },
    { key: "instructions", label: "الالتزام بالتعليمات", max: 20 },
  ],
  ROW: [
    { key: "discipline", label: "الانضباط", max: 25 },
    { key: "readiness", label: "الجاهزية", max: 20 },
    { key: "interaction", label: "التفاعل", max: 20 },
    { key: "punctuality", label: "الالتزام بالمواعيد", max: 15 },
    { key: "collective", label: "جودة الأداء الجماعي", max: 20 },
  ],
  ORGANIZER: [
    { key: "organization", label: "جودة التنظيم", max: 25 },
    { key: "financial", label: "الالتزام المالي", max: 25 },
    { key: "operational", label: "الالتزام بالتشغيل", max: 20 },
    { key: "participants", label: "إدارة المشاركين", max: 15 },
    { key: "media", label: "الالتزام الإعلامي", max: 15 },
  ],
} as const;
export type EvaluationForm = keyof typeof EVALUATION_FORMS;

export function scoreEvaluation(form: EvaluationForm, scores: Record<string, number>) {
  let total = 0;
  for (const c of EVALUATION_FORMS[form]) {
    const v = scores[c.key];
    if (!Number.isFinite(v) || v < 0 || v > c.max) throw new Error(`درجة غير صالحة: ${c.label}`);
    total += Math.round(v);
  }
  return total;
}

// ───────── القُصّر (الملحق ذ ذ) ─────────

/** معلّقة على السؤال هـ18: الحد الأدنى للعمر. الافتراض: 18 عاماً حتى الحسم. */
export const MIN_AGE = 18;
export function isMinor(birthYear: number | null | undefined, now = new Date()): boolean {
  if (!birthYear) return false;
  return now.getFullYear() - birthYear < MIN_AGE;
}
