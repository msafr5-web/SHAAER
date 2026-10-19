import type { Metadata } from "next";
import { db } from "@/lib/db";
import { updateParameterAction } from "@/app/actions/admin";
import { formatDate } from "@/lib/dates";
import { Card, Flash, PageTitle, Pill, TableWrap } from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "معاملات القواعد" };

export default async function AdminParameters({ searchParams }: { searchParams: SearchParams }) {
  const { ok, error } = await flashFrom(searchParams);
  const all = await db.parameter.findMany({ orderBy: [{ key: "asc" }, { effectiveFrom: "desc" }] });
  const latest = new Map<string, (typeof all)[number]>();
  const history = new Map<string, number>();
  for (const p of all) {
    if (!latest.has(p.key)) latest.set(p.key, p);
    history.set(p.key, (history.get(p.key) ?? 0) + 1);
  }
  return (
    <>
      <PageTitle title="معاملات القواعد" subtitle="كل رقم في اللائحة معامل بتاريخ سريان. التعديل يُنشئ إصداراً جديداً، والحالات السابقة تبقى محسوبة بقيمتها يوم وقوعها (المادتان 38 و71)." />
      <Flash ok={ok} error={error} />
      <Card>
        <TableWrap>
          <thead><tr><th>القاعدة</th><th>القيمة السارية</th><th>المادة</th><th>الحالة</th><th>تعديل بإصدار جديد</th></tr></thead>
          <tbody>
            {[...latest.values()].map((p) => (
              <tr key={p.key}>
                <td className="font-semibold text-green-900">{p.label}<div className="text-xs font-normal text-ink-500" dir="ltr">{p.key}</div></td>
                <td className="tabular">{p.value || "–"}<div className="text-xs text-ink-500">من {formatDate(p.effectiveFrom)} · {history.get(p.key)} إصدار</div></td>
                <td className="text-xs">{p.article}</td>
                <td>{p.status === "PENDING" ? <Pill tone="warning">معلّقة{p.question ? `: ${p.question}` : ""}</Pill> : <Pill tone="success">مؤكدة</Pill>}</td>
                <td>
                  <form action={updateParameterAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="key" value={p.key} />
                    <input name="value" defaultValue={p.value} className="input tabular w-24 py-1" dir="ltr" />
                    <input name="effectiveFrom" type="date" className="input w-36 py-1" />
                    {p.status === "PENDING" ? <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="confirm" /> حُسمت</label> : null}
                    <button className="btn-ghost btn-sm">حفظ</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
      <p className="mt-3 text-xs text-ink-500">ملاحظة للفريق: محرك القواعد في src/lib/rules.ts يستعمل القيم الافتراضية من اللائحة، وربطه بالقراءة من هذا الجدول في كل حساب بند في خطة الإصدار التالي.</p>
    </>
  );
}
