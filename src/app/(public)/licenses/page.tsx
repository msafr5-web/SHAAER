import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PARTY_KINDS } from "@/lib/domain";
import { vatOn } from "@/lib/money";
import { Money, PageTitle, Pill } from "@/components/ui";

export const metadata: Metadata = { title: "التراخيص والرسوم" };
export const dynamic = "force-dynamic";

const DURATION: Record<string, string> = {
  PER_EVENT: "لكل فعالية",
  PER_COMPETITION: "لكل مسابقة",
  BY_LICENSE: "بحسب الترخيص",
  BY_EVENT: "بحسب الفعالية",
};

export default async function LicensesPage() {
  const types = await db.licenseType.findMany({ orderBy: [{ partyKind: "asc" }, { feeHalala: "desc" }] });
  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <PageTitle title="جدول التراخيص والرسوم" subtitle="المادة 71 من اللائحة التنفيذية. الرسوم غير شاملة ضريبة القيمة المضافة، والضريبة تُعرض سطراً مستقلاً." />
      <div className="surface overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr><th>نوع الترخيص</th><th>الصفة</th><th>الرسم</th><th>المدة</th><th>الدافع</th><th>ما يمنحه</th><th>المادة</th></tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.code}>
                <td className="font-semibold text-green-900">
                  {t.nameAr}
                  {t.requiresFreelance ? <div className="mt-1 text-xs text-ink-500">يتطلب وثيقة عمل حر سارية</div> : null}
                </td>
                <td>{PARTY_KINDS[t.partyKind as keyof typeof PARTY_KINDS] ?? t.partyKind}</td>
                <td><Money halala={t.feeHalala} vat={vatOn(t.feeHalala)} /></td>
                <td className="whitespace-nowrap">{t.durationYears ? `${t.durationYears === 1 ? "سنة واحدة" : `${t.durationYears} سنوات`}` : DURATION[t.durationKind]}</td>
                <td>{t.payer === "ORGANIZER" ? "المنظّم" : "صاحب الترخيص"}</td>
                <td className="text-xs leading-6 text-ink-600">{t.grants.split(",").join("، ")}</td>
                <td className="whitespace-nowrap">
                  {t.article}
                  {t.pendingQuestion ? <div className="mt-1"><Pill tone="warning">قيد الحسم</Pill></div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs leading-6 text-ink-500">
        «قيد الحسم»: بند في هذا الترخيص (المدة أو الدافع أو نطاقه) يُستكمل مع صاحب المبادرة. ويجوز للمنصة تعديل الرسوم أو إطلاق باقات وعروض تشغيلية وفق السياسة المالية (المادتان 38 و71).
        وتسمية «ترخيص» تنظيمية داخل المنصة، والمنصة ليست جهة رسمية (المادة 56).
      </p>
    </div>
  );
}
