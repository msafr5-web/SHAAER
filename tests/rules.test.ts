// كل اختبار يحمل رقم مادته في اللائحة (مبدأ الخطة 1: كل قاعدة لها مادة واختبار باسمها).
import { describe, expect, it } from "vitest";
import {
  absenceFine, addWorkingHours, attendanceStatus, canMakeOffer, canPayout, classifyCancellation, isLateApology, isMinor,
  lateApologyFine, objectionDeadline, organizerCancellationDeduction, partyCancellationFine, rowMemberAbsenceFine, scoreEvaluation,
} from "@/lib/rules";
import { canTransitionEvent, EVENT_STATES } from "@/lib/domain";
import { formatSAR, sarToHalala, vatOn } from "@/lib/money";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
// الأحد 18 أكتوبر 2026، 9 صباحاً بتوقيت الرياض
const sundayNine = new Date("2026-10-18T09:00:00+03:00");

describe("المادة 27: 48 ساعة عمل", () => {
  it("تُحسب ساعات العمل من الأحد إلى الخميس، 8 ص إلى 5 م", () => {
    // 9 ساعات عمل يومياً: الأحد 8 ساعات ثم 9 يومياً، فتنتهي 48 ساعة ظهر الأحد التالي
    const end = addWorkingHours(sundayNine, 48);
    expect(end.toISOString()).toBe(new Date("2026-10-25T12:00:00+03:00").toISOString());
  });
  it("تتخطى عطلة الجمعة والسبت", () => {
    const thursdayFour = new Date("2026-10-22T16:00:00+03:00");
    const end = addWorkingHours(thursdayFour, 2);
    expect(end.toISOString()).toBe(new Date("2026-10-25T09:00:00+03:00").toISOString());
  });
});

describe("المادة 28: ثلاث جولات تفاوض", () => {
  it("تُقبل الجولة الثالثة وتُرفض الرابعة", () => {
    expect(canMakeOffer(2, null).ok).toBe(true);
    expect(canMakeOffer(3, null).ok).toBe(false);
  });
  it("المادة 27: لا عرض بعد انقضاء المهلة", () => {
    expect(canMakeOffer(1, new Date(Date.now() - 1000)).ok).toBe(false);
  });
});

describe("المادة 33: الإلغاء", () => {
  const start = new Date("2026-11-20T20:00:00+03:00");
  it("7 أيام فأكثر إلغاء مبكر، وأقل منها متأخر", () => {
    expect(classifyCancellation(start, new Date(start.getTime() - 7 * DAY), false)).toBe("EARLY_CANCEL");
    expect(classifyCancellation(start, new Date(start.getTime() - 6 * DAY), false)).toBe("LATE_CANCEL");
    expect(classifyCancellation(start, new Date(start.getTime() - 30 * DAY), true)).toBe("EMERGENCY_CANCEL");
  });
  it("اقتطاع المنظّم 10% مبكراً و30% متأخراً وحتى 50% لعدم الالتزام", () => {
    expect(organizerCancellationDeduction("EARLY_CANCEL", 1_000_000).fineHalala).toBe(100_000);
    expect(organizerCancellationDeduction("LATE_CANCEL", 1_000_000).fineHalala).toBe(300_000);
    expect(organizerCancellationDeduction("NONCOMPLIANCE", 1_000_000, 80).ratePercent).toBe(50);
    expect(organizerCancellationDeduction("NONCOMPLIANCE", 1_000_000, 20).fineHalala).toBe(200_000);
  });
  it("غرامة الشاعر في الإلغاء غير محددة: معلّقة على السؤال هـ3", () => {
    const r = partyCancellationFine("LATE_CANCEL");
    expect(r.pending).toBe(true);
    expect(r.question).toBe("هـ3");
  });
  it("مهلة الاعتراض 15 يوماً", () => {
    const t = new Date("2026-10-01T00:00:00Z");
    expect(objectionDeadline(t).getTime() - t.getTime()).toBe(15 * DAY);
  });
});

describe("المادة 43: غياب الشاعر", () => {
  it("25% قبل أقل من 48 ساعة، و50% بعد بدء الفعالية، وكلاهما معلّق لتعارضه مع الملحق ج", () => {
    expect(absenceFine(1_000_000, false).fineHalala).toBe(250_000);
    expect(absenceFine(1_000_000, true).fineHalala).toBe(500_000);
    expect(absenceFine(1_000_000, true).pending).toBe(true);
  });
});

describe("المادة 44: الاعتذار المتأخر", () => {
  it("أقل من 48 ساعة اعتذار متأخر", () => {
    const start = new Date("2026-11-20T20:00:00+03:00");
    expect(isLateApology(start, new Date(start.getTime() - 47 * HOUR))).toBe(true);
    expect(isLateApology(start, new Date(start.getTime() - 49 * HOUR))).toBe(false);
  });
  it("20% مع بديل، و35% مع الإرباك", () => {
    expect(lateApologyFine(600_000, true).fineHalala).toBe(120_000);
    expect(lateApologyFine(600_000, false).fineHalala).toBe(210_000);
  });
});

describe("المادة 45: غياب عضو الصف", () => {
  it("20% على العضو، ونصفها على القائد", () => {
    const r = rowMemberAbsenceFine(200_000);
    expect(r.member.fineHalala).toBe(40_000);
    expect(r.leader.fineHalala).toBe(20_000);
  });
});

describe("المادة 40: التحقق من الحضور", () => {
  it("التعارض يجمّد المستحقات", () => {
    expect(attendanceStatus({ organizerSaysPresent: true, partySaysPresent: false })).toEqual({ status: "CONFLICT", frozen: true });
    expect(attendanceStatus({ organizerSaysPresent: true, partySaysPresent: true }).status).toBe("CONFIRMED");
    expect(attendanceStatus({ organizerSaysPresent: true, partySaysPresent: null }).status).toBe("PARTIAL");
  });
});

describe("المادة 36: الصرف", () => {
  it("لا صرف قبل اعتماد التنفيذ، ولا مع تجميد، ولا بلا آيبان معتمد", () => {
    expect(canPayout({ executionApproved: false, frozen: false, ibanVerified: true }).ok).toBe(false);
    expect(canPayout({ executionApproved: true, frozen: true, ibanVerified: true }).ok).toBe(false);
    expect(canPayout({ executionApproved: true, frozen: false, ibanVerified: false }).ok).toBe(false);
    expect(canPayout({ executionApproved: true, frozen: false, ibanVerified: true }).ok).toBe(true);
  });
});

describe("المادة 25: حالات الفعالية", () => {
  it("عشر حالات بنص المادة", () => {
    expect(Object.values(EVENT_STATES).map((s) => s.label)).toEqual([
      "مسودة", "قيد المراجعة", "معتمدة مبدئياً", "قيد التفاوض", "قيد الدفع", "مؤكدة", "قيد التنفيذ", "مكتملة", "مغلقة مالياً", "ملغاة",
    ]);
  });
  it("لا قفز فوق الحالات، ولا إلغاء بعد الإغلاق المالي", () => {
    expect(canTransitionEvent("DRAFT", "CONFIRMED")).toBe(false);
    expect(canTransitionEvent("AWAITING_PAYMENT", "CONFIRMED")).toBe(true);
    expect(canTransitionEvent("FINANCIALLY_CLOSED", "CANCELLED")).toBe(false);
  });
});

describe("الملحق أ: نماذج التقييم", () => {
  it("مجموع أوزان الشاعر 100، ويرفض الدرجة فوق الحد", () => {
    expect(scoreEvaluation("POET", { attendance: 20, performance: 25, professionalism: 20, audience: 15, instructions: 20 })).toBe(100);
    expect(() => scoreEvaluation("POET", { attendance: 21, performance: 0, professionalism: 0, audience: 0, instructions: 0 })).toThrow();
  });
});

describe("المال بالهللة والضريبة (المادتان 38 و71)", () => {
  it("5,000 ريال = 500000 هللة، وضريبتها 750 ريالاً", () => {
    expect(sarToHalala(5000)).toBe(500_000);
    expect(vatOn(500_000)).toBe(75_000);
    expect(formatSAR(500_000)).toBe("5,000.00 ر.س");
  });
});

describe("الملحق ذ ذ: القُصّر", () => {
  it("دون 18 عاماً قاصر حتى يُحسم السؤال هـ18", () => {
    expect(isMinor(new Date().getFullYear() - 17)).toBe(true);
    expect(isMinor(new Date().getFullYear() - 30)).toBe(false);
  });
});
