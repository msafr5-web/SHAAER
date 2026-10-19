// المصدر الوحيد لأسماء الحالات والأنواع وانتقالاتها.
// لا تُكتب أسماء الحالات في الشاشات: تُقرأ من هنا (مهارة التصميم).

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "gold";

type Labelled = { label: string; tone: Tone };

// ───────── حالات الفعالية: نص المادة 25 حرفياً ─────────
export const EVENT_STATES = {
  DRAFT: { label: "مسودة", tone: "neutral" },
  UNDER_REVIEW: { label: "قيد المراجعة", tone: "info" },
  PRELIM_APPROVED: { label: "معتمدة مبدئياً", tone: "info" },
  NEGOTIATING: { label: "قيد التفاوض", tone: "warning" },
  AWAITING_PAYMENT: { label: "قيد الدفع", tone: "warning" },
  CONFIRMED: { label: "مؤكدة", tone: "success" },
  IN_EXECUTION: { label: "قيد التنفيذ", tone: "gold" },
  COMPLETED: { label: "مكتملة", tone: "success" },
  FINANCIALLY_CLOSED: { label: "مغلقة مالياً", tone: "neutral" },
  CANCELLED: { label: "ملغاة", tone: "danger" },
} as const satisfies Record<string, Labelled>;
export type EventState = keyof typeof EVENT_STATES;

// الانتقالات المسموحة. الإلغاء متاح من كل حالة قبل الإغلاق المالي.
export const EVENT_TRANSITIONS: Record<EventState, EventState[]> = {
  DRAFT: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["PRELIM_APPROVED", "DRAFT", "CANCELLED"],
  PRELIM_APPROVED: ["NEGOTIATING", "CANCELLED"],
  NEGOTIATING: ["AWAITING_PAYMENT", "CANCELLED"],
  AWAITING_PAYMENT: ["CONFIRMED", "NEGOTIATING", "CANCELLED"],
  CONFIRMED: ["IN_EXECUTION", "CANCELLED"],
  IN_EXECUTION: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["FINANCIALLY_CLOSED"],
  FINANCIALLY_CLOSED: [],
  CANCELLED: [],
};

export function canTransitionEvent(from: EventState, to: EventState): boolean {
  return EVENT_TRANSITIONS[from].includes(to);
}

// موضع كل حالة في رحلة الملحق (هـ) بخطواتها الثلاث عشرة
export const JOURNEY_STEPS = [
  "إنشاء الفعالية",
  "اعتماد بيانات الفعالية",
  "إضافة المشاركين",
  "التفاوض الإلكتروني",
  "اعتماد العقود",
  "الحجز أو الدفع المالي",
  "إصدار التراخيص اللازمة",
  "تنفيذ الفعالية",
  "التحقق من الحضور",
  "اعتماد التنفيذ",
  "صرف المستحقات",
  "التقييم والأرشفة",
  "إغلاق الفعالية مالياً وتشغيلياً",
] as const;

export const EVENT_STATE_STEP: Record<EventState, number> = {
  DRAFT: 1,
  UNDER_REVIEW: 2,
  PRELIM_APPROVED: 3,
  NEGOTIATING: 4,
  AWAITING_PAYMENT: 6,
  CONFIRMED: 7,
  IN_EXECUTION: 9,
  COMPLETED: 12,
  FINANCIALLY_CLOSED: 13,
  CANCELLED: 0,
};

// ───────── التراخيص ─────────
export const LICENSE_STATES = {
  UNDER_REVIEW: { label: "قيد المراجعة", tone: "info" },
  AWAITING_PAYMENT: { label: "بانتظار الدفع", tone: "warning" },
  ACTIVE: { label: "ساري", tone: "success" },
  EXPIRED: { label: "منتهٍ", tone: "neutral" },
  SUSPENDED: { label: "معلّق", tone: "danger" },
  CANCELLED: { label: "ملغى", tone: "danger" },
  REJECTED: { label: "مرفوض", tone: "danger" },
} as const satisfies Record<string, Labelled>;
export type LicenseState = keyof typeof LICENSE_STATES;

// ───────── مقعد المشاركة والتفاوض ─────────
export const PARTICIPATION_STATES = {
  INVITED: { label: "مدعو", tone: "info" },
  NEGOTIATING: { label: "قيد التفاوض", tone: "warning" },
  AGREED: { label: "متفق عليه", tone: "success" },
  REJECTED: { label: "مرفوض", tone: "danger" },
  EXPIRED: { label: "انتهت المهلة", tone: "neutral" },
  CONTRACTED: { label: "متعاقد", tone: "success" },
  EXECUTED: { label: "منفَّذ", tone: "success" },
  CANCELLED: { label: "ملغى", tone: "danger" },
} as const satisfies Record<string, Labelled>;
export type ParticipationState = keyof typeof PARTICIPATION_STATES;

export const OFFER_STATES = {
  PENDING: { label: "بانتظار الرد", tone: "warning" },
  COUNTERED: { label: "رُدّ بعرض مضاد", tone: "info" },
  ACCEPTED: { label: "مقبول", tone: "success" },
  REJECTED: { label: "مرفوض", tone: "danger" },
  EXPIRED: { label: "انتهت مهلته", tone: "neutral" },
} as const satisfies Record<string, Labelled>;

// ───────── العقود ─────────
export const CONTRACT_STATES = {
  AWAITING_SIGNATURES: { label: "بانتظار التوقيعات", tone: "warning" },
  ACTIVE: { label: "نافذ", tone: "success" },
  EXECUTED: { label: "منفَّذ", tone: "success" },
  CANCELLED: { label: "ملغى", tone: "danger" },
} as const satisfies Record<string, Labelled>;

export const MEDIA_RIGHTS = {
  FILMING: "التصوير",
  BROADCAST: "البث",
  CLIPS: "المقاطع",
  ARCHIVE: "الأرشفة",
  REUSE: "إعادة الاستخدام",
} as const;

// ───────── الحضور (المادة 40) ─────────
export const ATTENDANCE_STATES = {
  EXPECTED: { label: "متوقع", tone: "neutral" },
  PARTIAL: { label: "مسجّل من طرف واحد", tone: "info" },
  CONFIRMED: { label: "مؤكَّد", tone: "success" },
  CONFLICT: { label: "متعارض: المستحقات مجمّدة", tone: "danger" },
  RESOLVED: { label: "محسوم", tone: "success" },
} as const satisfies Record<string, Labelled>;

// ───────── الحالات التشغيلية والتظلمات ─────────
export const CASE_KINDS = {
  ABSENCE: "غياب",
  LATE_APOLOGY: "اعتذار متأخر",
  EARLY_CANCEL: "إلغاء مبكر",
  LATE_CANCEL: "إلغاء متأخر",
  EMERGENCY_CANCEL: "إلغاء طارئ",
  NONCOMPLIANCE: "إلغاء لعدم الالتزام",
  ROW_SHORTAGE: "نقص في الصف",
} as const;

export const CASE_STATES = {
  OBJECTION_WINDOW: { label: "مهلة الاعتراض", tone: "warning" },
  FINAL: { label: "نهائية", tone: "neutral" },
  AMENDED: { label: "معدّلة بقرار تظلم", tone: "info" },
} as const satisfies Record<string, Labelled>;

export const GRIEVANCE_CATEGORIES = {
  FINE: "الاعتراض على غرامة",
  EVALUATION: "الاعتراض على التقييم",
  VIOLATION: "الاعتراض على تسجيل مخالفة",
  VERIFICATION: "الاعتراض على نتيجة التحقق",
  PENALTY: "الاعتراض على عقوبة أو تعليق",
  OPERATIONAL: "الاعتراض على إجراء تشغيلي",
} as const;

export const GRIEVANCE_STATES = {
  SUBMITTED: { label: "مقدَّم", tone: "info" },
  UNDER_REVIEW: { label: "قيد المراجعة", tone: "warning" },
  NEEDS_INFO: { label: "بانتظار معلومات", tone: "warning" },
  ACCEPTED: { label: "مقبول", tone: "success" },
  PARTIAL: { label: "مقبول جزئياً", tone: "success" },
  REJECTED: { label: "مرفوض", tone: "danger" },
} as const satisfies Record<string, Labelled>;

// ───────── الأطراف والأنواع ─────────
export const PARTY_KINDS = {
  POET: "شاعر",
  ROW_LEADER: "قائد صف",
  ROW_MEMBER: "عضو صف",
  EVALUATOR: "مقيّم",
  COMMITTEE: "عضو لجنة",
  CRITIC: "ناقد إعلامي",
  MEDIA_CHANNEL: "قناة أو منصة إعلامية",
  PHOTOGRAPHY: "جهة تصوير",
  BROADCAST: "جهة بث أو نقل",
  ORGANIZER: "جهة منظمة",
  VENUE_HOST: "موقع فعاليات",
} as const;
export type PartyKind = keyof typeof PARTY_KINDS;

export const ENTITY_TYPES = {
  INDIVIDUAL: "فرد",
  ENTITY: "منشأة أو كيان",
  GOVERNMENT: "جهة حكومية",
} as const;

// توصيفات الحساب (المادة 64)
export const BADGES = {
  VERIFIED: { label: "حساب موثّق", tone: "success" },
  TRUSTED: { label: "مشارك موثوق", tone: "gold" },
  VERIFIED_ORGANIZER: { label: "منظّم موثّق", tone: "success" },
  VERIFIED_MEDIA: { label: "جهة إعلامية موثقة", tone: "success" },
  UNDER_REVIEW: { label: "حساب تحت المراجعة", tone: "warning" },
  SUSPENDED: { label: "حساب موقوف مؤقتاً", tone: "danger" },
} as const satisfies Record<string, Labelled>;

// أنواع الفعاليات (المادة 22)
export const EVENT_TYPES = {
  OFFICIAL: "رسمية",
  SOCIAL: "اجتماعية",
  COMPETITION: "مسابقة",
  MEDIA: "إعلامية",
  SHOWCASE: "استعراضية",
  TRAINING: "تدريبية",
  EXPERIMENTAL: "تجريبية",
  SEASONAL: "موسمية",
  MAJOR: "كبرى",
} as const;
export type EventType = keyof typeof EVENT_TYPES;

export const EVENT_LEVELS = {
  STANDARD: "عادية",
  LARGE: "واسعة",
  MAJOR: "كبرى",
} as const;

// أنواع المواقع (المادة 21)
export const VENUE_KINDS = {
  HALL: "قاعة",
  THEATER: "مسرح",
  REST_HOUSE: "استراحة",
  PALACE: "قصر",
  SQUARE: "ساحة",
  DEDICATED: "موقع مخصص للفعاليات",
} as const;

export const VENUE_STATES = {
  PENDING: { label: "بانتظار الترخيص", tone: "warning" },
  LICENSED: { label: "مرخّص", tone: "success" },
  SUSPENDED: { label: "معلّق", tone: "danger" },
} as const satisfies Record<string, Labelled>;

// أدوار المقاعد في الفعالية
export const SEAT_ROLES = {
  POET: { label: "شاعر", template: "POET", partyKinds: ["POET"] },
  ROW: { label: "صف", template: "ROW", partyKinds: ["ROW_LEADER"] },
  EVALUATOR: { label: "مقيّم", template: "EVALUATOR", partyKinds: ["EVALUATOR"] },
  COMMITTEE: { label: "عضو لجنة", template: "EVALUATOR", partyKinds: ["COMMITTEE", "EVALUATOR"] },
  MEDIA: { label: "قناة إعلامية", template: "MEDIA", partyKinds: ["MEDIA_CHANNEL"] },
  PHOTOGRAPHY: { label: "جهة تصوير", template: "MEDIA", partyKinds: ["PHOTOGRAPHY"] },
  BROADCAST: { label: "جهة بث", template: "MEDIA", partyKinds: ["BROADCAST"] },
} as const;
export type SeatRole = keyof typeof SEAT_ROLES;

// إدارات المنصة (المادة 61، والإدارة المالية من الملحق ز)
export const ADMIN_DEPTS = {
  EXECUTIVE: "الإدارة التنفيذية",
  OPERATIONS: "إدارة التشغيل",
  LICENSES: "إدارة التراخيص",
  COMPLIANCE: "إدارة الامتثال",
  CONTENT_MEDIA: "إدارة المحتوى والإعلام",
  EVALUATION: "إدارة التقييم والمسابقات",
  DISPUTES: "إدارة النزاعات والتظلمات",
  DATA_ARCHIVE: "إدارة البيانات والأرشفة",
  TECH: "إدارة التطوير التقني",
  FINANCE: "الإدارة المالية",
} as const;

export const SAUDI_CITIES = [
  "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", "الطائف", "تبوك",
  "بريدة", "عنيزة", "حائل", "أبها", "خميس مشيط", "جازان", "نجران", "الباحة",
  "سكاكا", "عرعر", "الأحساء", "القطيف", "ينبع", "الخرج", "الدوادمي", "وادي الدواسر",
] as const;

// إصدارات اللائحة والميثاق المقبولة عند التسجيل
export const REGULATION_VERSION = "1.0-2025";
export const CHARTER_VERSION = "1.0-2025";
