// بيانات التأسيس: أنواع التراخيص (المادة 71)، ومعاملات القواعد، والسياسات (المادة 60)،
// وبيانات تجريبية تغطي حالات الرحلة كلها. البيانات التجريبية بنطاق .test المحجوز ولا تمثل أشخاصاً حقيقيين.

import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes, randomInt } from "node:crypto";

const db = new PrismaClient();
const SAR = (v: number) => Math.round(v * 100);
const vat = (h: number) => Math.round((h * 1500) / 10000);
const DAY = 86_400_000;
const now = new Date();
const days = (n: number) => new Date(now.getTime() + n * DAY);
const ref = (p: string) => `${p}-${now.getFullYear()}-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
const code = () => randomBytes(9).toString("base64url");

const LICENSE_TYPES = [
  { code: "POET_PRO", nameAr: "ترخيص الشاعر المحترف", partyKind: "POET", fee: 5000, durationKind: "YEARS", years: 3, payer: "HOLDER", article: "9",
    grants: "المشاركة الاحترافية,استقبال العروض,التعاقد الرقمي,المشاركة الإعلامية,المشاركة في المسابقات" },
  { code: "POET_NONCONT", nameAr: "ترخيص الشاعر غير المستمر", partyKind: "POET", fee: 300, durationKind: "PER_EVENT", payer: "ORGANIZER", article: "10",
    grants: "المشاركة في فعالية واحدة,القبول والرفض والتفاوض", pending: "ج9" },
  { code: "POET_CONTESTANT", nameAr: "ترخيص شاعر متسابق", partyKind: "POET", fee: 150, durationKind: "PER_COMPETITION", payer: "HOLDER", article: "11",
    grants: "المشاركة في مراحل المسابقة الرسمية" },
  { code: "ROW_MEMBER", nameAr: "ترخيص عضو الصف", partyKind: "ROW_MEMBER", fee: 150, durationKind: "YEARS", years: 1, payer: "HOLDER", article: "12",
    grants: "المشاركة ضمن صف معتمد" },
  { code: "ROW_LEADER", nameAr: "ترخيص قائد الصف", partyKind: "ROW_LEADER", fee: 250, durationKind: "YEARS", years: 1, payer: "HOLDER", article: "13",
    grants: "قيادة الصف,التفاوض عن الصف,التعاقد الرقمي" },
  { code: "CRITIC", nameAr: "ترخيص الناقد الإعلامي", partyKind: "CRITIC", fee: 3000, durationKind: "YEARS", years: 3, payer: "HOLDER", article: "14",
    grants: "النقد والتحليل الإعلامي", pending: "هـ16" },
  { code: "EVALUATOR", nameAr: "ترخيص المقيّم", partyKind: "EVALUATOR", fee: 1000, durationKind: "BY_LICENSE", payer: "ORGANIZER", article: "15",
    grants: "تقييم الأداء,احتساب النتائج,منح الدرجات,المشاركة في التحكيم,عضوية اللجان دون ترخيص إضافي", pending: "ج3" },
  { code: "COMMITTEE", nameAr: "ترخيص عضو اللجنة", partyKind: "COMMITTEE", fee: 250, durationKind: "BY_EVENT", payer: "ORGANIZER", article: "16",
    grants: "عضوية لجان الفعالية أو المسابقة", pending: "ج3" },
  { code: "MEDIA_ENTITY", nameAr: "ترخيص القنوات والمنصات الإعلامية (كيان)", partyKind: "MEDIA_CHANNEL", entityType: "ENTITY", fee: 3000, durationKind: "YEARS", years: 3, payer: "HOLDER", article: "17",
    grants: "التغطية الإعلامية" },
  { code: "MEDIA_INDIVIDUAL", nameAr: "ترخيص القنوات والمنصات الإعلامية (فردي)", partyKind: "MEDIA_CHANNEL", entityType: "INDIVIDUAL", fee: 1000, durationKind: "YEARS", years: 3, payer: "HOLDER", article: "17",
    grants: "التغطية الإعلامية", freelance: true },
  { code: "PHOTOGRAPHY", nameAr: "ترخيص جهة التصوير", partyKind: "PHOTOGRAPHY", fee: 2500, durationKind: "YEARS", years: 3, payer: "HOLDER", article: "18",
    grants: "التصوير,الإنتاج,التغطية,الأرشفة" },
  { code: "BROADCAST_ENTITY", nameAr: "ترخيص جهة البث أو النقل (كيان)", partyKind: "BROADCAST", entityType: "ENTITY", fee: 2500, durationKind: "YEARS", years: 3, payer: "HOLDER", article: "19",
    grants: "البث المباشر,النقل الرقمي,إعادة الاستخدام,التغطية الإعلامية" },
  { code: "BROADCAST_INDIVIDUAL", nameAr: "ترخيص جهة البث أو النقل (فردي)", partyKind: "BROADCAST", entityType: "INDIVIDUAL", fee: 300, durationKind: "YEARS", years: 1, payer: "HOLDER", article: "19",
    grants: "البث المباشر,النقل الرقمي", freelance: true },
  { code: "COMPETITION", nameAr: "ترخيص المسابقات", partyKind: "ORGANIZER", fee: 10000, durationKind: "PER_COMPETITION", payer: "HOLDER", article: "20",
    grants: "إقامة مسابقة برصد جوائز مسبق" },
  { code: "EVENT", nameAr: "ترخيص الفعاليات", partyKind: "ORGANIZER", fee: 500, durationKind: "PER_EVENT", payer: "ORGANIZER", article: "21",
    grants: "إقامة فعالية واحدة", pending: "ب13" },
  { code: "VENUE", nameAr: "ترخيص المواقع المخصصة للفعاليات", partyKind: "VENUE_HOST", fee: 1500, durationKind: "YEARS", years: 3, payer: "HOLDER", article: "21",
    grants: "استضافة فعاليات المحاورة", pending: "ب13" },
];

const PARAMETERS = [
  ["negotiation.max_working_hours", "48", "مدة التفاوض بساعات العمل", "27", "PENDING", "ج1"],
  ["negotiation.max_rounds", "3", "جولات التفاوض", "28", "PENDING", "ج2"],
  ["cancel.early_threshold_days", "7", "حد الإلغاء المبكر بالأيام", "33", "CONFIRMED", null],
  ["cancel.organizer.early_pct", "10", "اقتطاع من المنظّم عند الإلغاء المبكر (%)", "33", "PENDING", "ب6"],
  ["cancel.organizer.late_pct", "30", "اقتطاع من المنظّم عند الإلغاء المتأخر (%)", "33", "PENDING", "ب6"],
  ["cancel.organizer.noncompliance_max_pct", "50", "الحد الأقصى للاقتطاع لعدم الالتزام (%)", "33", "PENDING", "ب6"],
  ["cancel.party.fine", "", "غرامة الشاعر أو الصف عند الإلغاء", "33", "PENDING", "هـ3"],
  ["absence.within_48h_pct", "25", "غياب الشاعر قبل أقل من 48 ساعة (%)", "43", "PENDING", "هـ2"],
  ["absence.after_start_pct", "50", "الغياب بعد بدء الفعالية (%)", "43 والملحق ج", "PENDING", "هـ1"],
  ["apology.late.with_substitute_pct", "20", "اعتذار متأخر مع بديل (%)", "44", "CONFIRMED", null],
  ["apology.late.disruptive_pct", "35", "اعتذار متأخر مع إرباك (%)", "44 والملحق ج", "PENDING", "هـ1"],
  ["row.member_absence_pct", "20", "غياب عضو الصف من قيمة مشاركته (%)", "45", "PENDING", "هـ12"],
  ["row.min_members", "", "الحد الأدنى لعدد أعضاء الصف", "45", "PENDING", "ج4"],
  ["objection.days", "15", "مهلة الاعتراض على الغرامة بالأيام", "33 و43 إلى 45", "CONFIRMED", null],
  ["grievance.days", "", "مهلة التظلم من العقوبات والتقييم", "54 و55", "PENDING", "هـ4"],
  ["vat.rate_bp", "1500", "ضريبة القيمة المضافة (نقاط أساس)", "38", "PENDING", "ب10"],
  ["escrow.mode", "record", "حجز مبالغ العقود: record توثيق أو escrow حجز فعلي", "35", "PENDING", "ب1"],
  ["platform.commission_pct", "0", "عمولة المنصة على العقود (%)", "36 و72", "PENDING", "ب2"],
  ["minor.min_age", "18", "الحد الأدنى للعمر", "الملحق ذ ذ", "PENDING", "هـ18"],
] as const;

const POLICIES = [
  ["REGULATION", "اللائحة التنفيذية والتنظيمية والتشغيلية الشاملة", "النسخة الإلكترونية المنشورة هي الرسمية (المادة 78)."],
  ["CHARTER", "ميثاق الشرف والسلوك المهني", "الالتزام الديني والوطني والسلوك المهني والإعلامي (المواد 6 إلى 8)."],
  ["CANCELLATION", "سياسة الإلغاء", "مدد الإلغاء والغرامات والحقوق المترتبة عليها (المادة 33)."],
  ["REFUND", "سياسة الاسترجاع", "إعادة المبالغ أو حفظها أو إعادة جدولتها (المادة 46)."],
  ["PRIVACY", "سياسة الخصوصية", "جمع البيانات واستخدامها وحفظها وحمايتها (المادة 51)."],
  ["CONTENT", "سياسة المحتوى", "المحتوى المسموح وحظر المخالف للأنظمة والذوق العام (المادة 66)."],
  ["MEDIA_USE", "سياسة الاستخدام الإعلامي", "التصوير والبث والنشر والأرشفة وإعادة الاستخدام (المادة 49)."],
  ["EVALUATION", "سياسة التقييم", "معايير التقييم وأوزانه والمؤشرات (المادتان 47 و48، والملحق أ)."],
  ["VERIFICATION", "سياسة التحقق", "التحقق من الحضور والتنفيذ واعتماد الحالات (المادة 40)."],
  ["GRIEVANCES", "سياسة الاعتراضات والتظلمات", "تقديم الاعتراضات ومددها ومراجعتها (المادة 55، والملحق ب)."],
  ["COMPLIANCE", "سياسة الامتثال والسلوك المهني", "الالتزام بالأنظمة والميثاق والذوق العام (المادتان 53 و54)."],
  ["FINANCIAL", "السياسة المالية", "الرسوم والمدفوعات والجوائز والضرائب والغرامات والصرف (المواد 34 إلى 38)."],
  ["LICENSES", "سياسة التراخيص", "أنواع التراخيص ومددها ورسومها وإصدارها وتجديدها (المواد 9 إلى 21)."],
  ["IP", "سياسة حماية الملكية الفكرية", "حماية الحقوق الفكرية والتنظيمية والإبداعية (المادة 50)."],
  ["DATA_ARCHIVE", "سياسة البيانات والأرشفة", "حفظ السجلات والعقود والمفاوضات والتسجيلات (المادة 52)."],
  ["EVENTS", "سياسة الفعاليات والمسابقات", "تشغيل الفعاليات والمسابقات ومتطلباتها (المواد 22 إلى 25)."],
  ["EMERGENCY", "سياسة الطوارئ والقوة القاهرة", "التأجيل والإلغاء وإعادة الجدولة في الظروف الطارئة (المادة 46)."],
] as const;

async function main() {
  console.log("تهيئة البيانات...");

  for (const t of LICENSE_TYPES) {
    await db.licenseType.upsert({
      where: { code: t.code },
      update: {},
      create: {
        code: t.code, nameAr: t.nameAr, partyKind: t.partyKind, entityType: t.entityType ?? null,
        feeHalala: SAR(t.fee), durationKind: t.durationKind, durationYears: t.years ?? null,
        payer: t.payer, article: t.article, requiresFreelance: t.freelance ?? false,
        grants: t.grants, pendingQuestion: t.pending ?? null, effectiveFrom: new Date("2025-01-01"),
      },
    });
  }

  for (const [key, value, label, article, status, question] of PARAMETERS) {
    await db.parameter.upsert({
      where: { key_effectiveFrom: { key, effectiveFrom: new Date("2025-01-01") } },
      update: {},
      create: { key, value, label, article, status, question, effectiveFrom: new Date("2025-01-01") },
    });
  }

  for (const [c, title, summary] of POLICIES) {
    await db.policy.upsert({
      where: { code_version: { code: c, version: "1.0" } },
      update: {},
      create: { code: c, title, version: "1.0", summary, effectiveFrom: new Date("2025-01-01") },
    });
  }

  // البيانات المرجعية أعلاه تُزرع دائماً. البيانات التجريبية فقط في التطوير، أو بطلب صريح SEED_DEMO=true.
  const wantDemo = process.env.SEED_DEMO === "true" || process.env.NODE_ENV !== "production";
  if (!wantDemo) {
    console.log("البيانات المرجعية جاهزة. لا بيانات تجريبية (SEED_DEMO غير مفعّل).");
    return;
  }
  if (await db.user.count()) {
    console.log("البيانات التجريبية موجودة، تخطّيت إنشاءها.");
    return;
  }

  const accepted = { regulationVersion: "1.0-2025", charterVersion: "1.0-2025", acceptedAt: now };
  const mkUser = (email: string, name: string, extra: object = {}) =>
    db.user.create({ data: { email, name, ...accepted, ...extra } });

  // الإدارة
  const admin = await mkUser("admin@shaaer.test", "مدير المنصة", { isAdmin: true, adminDept: "EXECUTIVE" });
  await mkUser("licenses@shaaer.test", "موظف التراخيص", { isAdmin: true, adminDept: "LICENSES" });

  // المنظّم
  const orgUser = await mkUser("organizer@shaaer.test", "مؤسسة الأمسيات الثقافية");
  const organizer = await db.party.create({ data: {
    userId: orgUser.id, kind: "ORGANIZER", entityType: "ENTITY", displayName: "مؤسسة الأمسيات الثقافية",
    city: "الرياض", commercialReg: "1010000000", badge: "VERIFIED_ORGANIZER", iban: "SA0000000000000000000000", ibanVerified: true,
  } });

  // الشعراء
  const poetUser = await mkUser("poet@shaaer.test", "الشاعر سالم");
  const poet = await db.party.create({ data: {
    userId: poetUser.id, kind: "POET", displayName: "الشاعر سالم", city: "الرياض",
    bio: "شاعر محاورة، مشارك في الأمسيات الرسمية والاجتماعية.", badge: "TRUSTED",
    iban: "SA1100000000000000000001", ibanVerified: true, priceBaseHalala: SAR(8000),
    priceFactors: JSON.stringify({ "الفعاليات الرسمية": "+25%", "موسم الصيف": "+15%", "حضور أكثر من 1000": "+20%", "البث المباشر": "+10%" }),
  } });
  const poet2User = await mkUser("poet2@shaaer.test", "الشاعر فهد");
  const poet2 = await db.party.create({ data: {
    userId: poet2User.id, kind: "POET", displayName: "الشاعر فهد", city: "القصيم", badge: "VERIFIED",
    iban: "SA1100000000000000000002", ibanVerified: true, priceBaseHalala: SAR(6500),
  } });

  // الصف
  const leaderUser = await mkUser("row@shaaer.test", "قائد صف النخيل");
  const leader = await db.party.create({ data: {
    userId: leaderUser.id, kind: "ROW_LEADER", displayName: "قائد صف النخيل", city: "الرياض", badge: "VERIFIED",
    iban: "SA1100000000000000000003", ibanVerified: true, priceBaseHalala: SAR(12000),
  } });
  const row = await db.row.create({ data: { name: "صف النخيل", leaderId: leader.id, city: "الرياض" } });
  for (let i = 1; i <= 6; i++) {
    const u = await mkUser(`member${i}@shaaer.test`, `عضو الصف ${i}`);
    const m = await db.party.create({ data: { userId: u.id, kind: "ROW_MEMBER", displayName: `عضو الصف ${i}`, city: "الرياض", rowId: row.id } });
    await db.license.create({ data: {
      number: ref("L"), typeCode: "ROW_MEMBER", partyId: m.id, status: "ACTIVE", feeHalala: SAR(150), vatHalala: vat(SAR(150)),
      issuedAt: days(-60), expiresAt: days(305), verifyCode: code(),
    } });
  }

  // المقيّم والإعلام والموقع
  const evalUser = await mkUser("evaluator@shaaer.test", "المقيّم عبدالله");
  const evaluator = await db.party.create({ data: { userId: evalUser.id, kind: "EVALUATOR", displayName: "المقيّم عبدالله", city: "الرياض", badge: "VERIFIED", iban: "SA1100000000000000000004", ibanVerified: true } });
  const bcUser = await mkUser("broadcast@shaaer.test", "قناة المحاورة المباشرة");
  const broadcaster = await db.party.create({ data: { userId: bcUser.id, kind: "BROADCAST", entityType: "ENTITY", displayName: "قناة المحاورة المباشرة", city: "الرياض", badge: "VERIFIED_MEDIA", commercialReg: "1010000001", iban: "SA1100000000000000000005", ibanVerified: true } });
  const hostUser = await mkUser("host@shaaer.test", "قاعة الديرة للمناسبات");
  const host = await db.party.create({ data: { userId: hostUser.id, kind: "VENUE_HOST", entityType: "ENTITY", displayName: "قاعة الديرة للمناسبات", city: "الرياض", commercialReg: "1010000002", badge: "VERIFIED" } });
  const venue = await db.venue.create({ data: { hostPartyId: host.id, name: "قاعة الديرة الكبرى", kind: "HALL", city: "الرياض", address: "حي الملقا، طريق أنس بن مالك", capacity: 1200, status: "LICENSED" } });
  await db.venue.create({ data: { hostPartyId: host.id, name: "استراحة الديرة", kind: "REST_HOUSE", city: "الرياض", address: "حي العارض", capacity: 300, status: "PENDING" } });

  // تراخيص الأطراف
  const lic = (typeCode: string, partyId: string, fee: number, status = "ACTIVE", years = 3) =>
    db.license.create({ data: {
      number: ref("L"), typeCode, partyId, status, feeHalala: SAR(fee), vatHalala: vat(SAR(fee)),
      issuedAt: status === "ACTIVE" ? days(-90) : null, expiresAt: status === "ACTIVE" ? days(365 * years - 90) : null, verifyCode: code(),
    } });
  await lic("POET_PRO", poet.id, 5000);
  await lic("POET_PRO", poet2.id, 5000);
  await lic("ROW_LEADER", leader.id, 250, "ACTIVE", 1);
  await lic("EVALUATOR", evaluator.id, 1000);
  await lic("BROADCAST_ENTITY", broadcaster.id, 2500);
  await lic("VENUE", host.id, 1500);
  // طلب قيد المراجعة لعرض طابور الإدارة
  const applicantUser = await mkUser("applicant@shaaer.test", "الشاعر ناصر");
  const applicant = await db.party.create({ data: { userId: applicantUser.id, kind: "POET", displayName: "الشاعر ناصر", city: "حائل", badge: "UNDER_REVIEW" } });
  await lic("POET_PRO", applicant.id, 5000, "UNDER_REVIEW");

  for (const p of [poet, poet2, leader, evaluator, broadcaster, host]) {
    const l = await db.license.findFirst({ where: { partyId: p.id } });
    if (l) await db.ledgerEntry.createMany({ data: [
      { kind: "LICENSE_FEE", amountHalala: l.feeHalala, direction: "IN", partyId: p.id, licenseId: l.id, memo: `رسم ${l.number}` },
      { kind: "VAT", amountHalala: l.vatHalala, direction: "IN", partyId: p.id, licenseId: l.id, memo: `ضريبة ${l.number}` },
    ] });
  }

  const times = (start: Date) => ({
    attendStart: new Date(start.getTime() - 60 * 60_000),
    readyAt: new Date(start.getTime() - 30 * 60_000),
    performStart: start,
    performEnd: new Date(start.getTime() + 3 * 3_600_000),
    requiredHours: 3,
  });
  const contractFor = async (participationId: string, template: string, signed: boolean, executed = false) =>
    db.contract.create({ data: {
      number: ref("C"), participationId, template, body: "نموذج العقد الرقمي المبسط (المادة 30)",
      contentHash: createHash("sha256").update(participationId).digest("hex"), mediaRights: "FILMING,BROADCAST,ARCHIVE",
      status: executed ? "EXECUTED" : signed ? "ACTIVE" : "AWAITING_SIGNATURES",
      organizerSignedAt: signed ? days(-10) : null, partySignedAt: signed ? days(-9) : null,
      organizerSigMeta: signed ? "otp:email" : null, partySigMeta: signed ? "otp:email" : null, verifyCode: code(),
    } });

  // فعالية 1: مكتملة ومصروفة (لعرض نهاية الرحلة)
  const e1Start = days(-20);
  const e1 = await db.event.create({ data: {
    number: ref("E"), organizerId: organizer.id, name: "أمسية الوفاء الشعرية", type: "OFFICIAL", level: "LARGE",
    startsAt: e1Start, durationHours: 4, city: "الرياض", venueId: venue.id, expectedAttendance: 900, filming: true, broadcast: true,
    contact: "0110000000", status: "COMPLETED",
  } });
  for (const [p, amount, role, tpl] of [[poet, 9000, "POET", "POET"], [poet2, 7000, "POET", "POET"], [leader, 12000, "ROW", "ROW"]] as const) {
    const part = await db.participation.create({ data: { eventId: e1.id, role, partyId: p.id, status: "EXECUTED", agreedHalala: SAR(amount), ...times(e1Start) } });
    const c = await contractFor(part.id, tpl, true, true);
    await db.attendance.create({ data: { participationId: part.id, token: code(), organizerMarkedAt: e1Start, organizerSaysPresent: true, partyMarkedAt: e1Start, partySaysPresent: true, status: "CONFIRMED", executionApprovedAt: days(-19) } });
    await db.ledgerEntry.createMany({ data: [
      { kind: "ESCROW_HOLD", amountHalala: SAR(amount), direction: "HOLD", partyId: organizer.id, eventId: e1.id, contractId: c.id, memo: `حجز ${c.number}` },
      { kind: "ESCROW_RELEASE", amountHalala: SAR(amount), direction: "OUT", partyId: organizer.id, eventId: e1.id, contractId: c.id, memo: `إفراج ${c.number}`, createdAt: new Date(days(-19).getTime() + 2 * 3_600_000) },
      { kind: "PAYOUT", amountHalala: SAR(amount), direction: "OUT", partyId: p.id, eventId: e1.id, contractId: c.id, memo: `صرف مستحقات ${c.number}`, createdAt: new Date(days(-19).getTime() + 2 * 3_600_000) },
    ] });
  }
  await db.evaluation.create({ data: { eventId: e1.id, subjectPartyId: poet.id, evaluatorUserId: orgUser.id, form: "POET",
    scores: JSON.stringify({ attendance: 20, performance: 23, professionalism: 19, audience: 14, instructions: 19 }), total: 95 } });
  await db.evaluation.create({ data: { eventId: e1.id, subjectPartyId: poet2.id, evaluatorUserId: orgUser.id, form: "POET",
    scores: JSON.stringify({ attendance: 18, performance: 21, professionalism: 18, audience: 12, instructions: 18 }), total: 87 } });

  // فعالية 2: مؤكدة بعقود موقّعة (يوم الفعالية قريب)
  const e2Start = days(5);
  const e2 = await db.event.create({ data: {
    number: ref("E"), organizerId: organizer.id, name: "ملتقى شعراء الوسطى", type: "SOCIAL", level: "STANDARD",
    startsAt: e2Start, durationHours: 3, city: "الرياض", venueId: venue.id, expectedAttendance: 400, filming: true,
    contact: "0110000000", status: "CONFIRMED",
  } });
  for (const [p, amount, role, tpl] of [[poet, 8000, "POET", "POET"], [evaluator, 2000, "EVALUATOR", "EVALUATOR"], [broadcaster, 5000, "BROADCAST", "MEDIA"]] as const) {
    const part = await db.participation.create({ data: { eventId: e2.id, role, partyId: p.id, status: "CONTRACTED", agreedHalala: SAR(amount), ...times(e2Start) } });
    const c = await contractFor(part.id, tpl, true);
    await db.attendance.create({ data: { participationId: part.id, token: code() } });
    await db.ledgerEntry.create({ data: { kind: "ESCROW_HOLD", amountHalala: SAR(amount), direction: "HOLD", partyId: organizer.id, eventId: e2.id, contractId: c.id, memo: `حجز ${c.number}` } });
  }

  // فعالية 3: قيد التفاوض بعروض متبادلة
  const e3Start = days(25);
  const e3 = await db.event.create({ data: {
    number: ref("E"), organizerId: organizer.id, name: "أمسية الشمال الكبرى", type: "SEASONAL", level: "MAJOR",
    startsAt: e3Start, durationHours: 5, city: "حائل", venueText: "مسرح حائل المفتوح", expectedAttendance: 2500, filming: true, broadcast: true,
    contact: "0110000000", status: "NEGOTIATING",
  } });
  const opened = days(-1);
  const p3 = await db.participation.create({ data: { eventId: e3.id, role: "POET", partyId: poet.id, status: "NEGOTIATING", negotiationOpenedAt: opened, negotiationDeadline: days(2), ...times(e3Start) } });
  await db.offer.create({ data: { participationId: p3.id, fromSide: "ORGANIZER", amountHalala: SAR(9000), round: 1, status: "COUNTERED", terms: "مشاركة ثلاث ساعات مع بث مباشر", createdAt: opened } });
  await db.offer.create({ data: { participationId: p3.id, fromSide: "PARTY", amountHalala: SAR(11500), round: 2, status: "PENDING", terms: "مع البث المباشر وحق الأرشفة" } });
  await db.participation.create({ data: { eventId: e3.id, role: "POET", partyId: poet2.id, status: "INVITED", ...times(e3Start) } });
  await db.participation.create({ data: { eventId: e3.id, role: "ROW", partyId: leader.id, status: "AGREED", agreedHalala: SAR(15000), ...times(e3Start) } });

  // فعالية 4: قيد مراجعة الإدارة
  await db.event.create({ data: {
    number: ref("E"), organizerId: organizer.id, name: "حفل تكريم الرواد", type: "OFFICIAL", level: "LARGE",
    startsAt: days(40), durationHours: 3, city: "الرياض", venueId: venue.id, expectedAttendance: 800, contact: "0110000000", status: "UNDER_REVIEW",
  } });

  // حالة تشغيلية وتظلم: اعتذار متأخر للشاعر فهد في فعالية منتهية سابقة
  const e5 = await db.event.create({ data: {
    number: ref("E"), organizerId: organizer.id, name: "أمسية الربيع", type: "SOCIAL", startsAt: days(-6), durationHours: 3,
    city: "بريدة", venueText: "استراحة خاصة", expectedAttendance: 150, contact: "0110000000", status: "COMPLETED",
  } });
  const p5 = await db.participation.create({ data: { eventId: e5.id, role: "POET", partyId: poet2.id, status: "CANCELLED", agreedHalala: SAR(6000) } });
  const caseRow = await db.operationalCase.create({ data: {
    kind: "LATE_APOLOGY", eventId: e5.id, participationId: p5.id, partyId: poet2.id, ratePercent: 20, fineHalala: SAR(1200),
    ruleKey: "apology.late.with_substitute", article: "44", objectionDeadline: days(9), notes: "اعتذار قبل 30 ساعة مع توفير بديل مناسب",
  } });
  await db.grievance.create({ data: {
    number: ref("G"), partyId: poet2.id, caseId: caseRow.id, category: "FINE",
    reasons: "الاعتذار بسبب ظرف صحي طارئ موثّق بتقرير طبي.", requested: "إلغاء الغرامة واعتبار الحالة إلغاءً طارئاً.",
  } });

  await db.auditLog.create({ data: { actorUserId: admin.id, action: "seed", entity: "system", entityId: "seed", detail: "تهيئة البيانات التجريبية" } });
  console.log("تمت التهيئة. حسابات التجربة: admin@ organizer@ poet@ host@ row@ evaluator@ broadcast@ (بنطاق shaaer.test)");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
