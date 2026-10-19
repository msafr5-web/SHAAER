import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { Card, PageTitle, TableWrap } from "@/components/ui";
import type { SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "سجل النشاط" };

export default async function AdminAudit({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const entity = typeof sp.entity === "string" ? sp.entity : "";
  const rows = await db.auditLog.findMany({ where: entity ? { entity } : {}, include: { actor: true }, orderBy: { createdAt: "desc" }, take: 300 });
  const entities = await db.auditLog.findMany({ distinct: ["entity"], select: { entity: true } });
  return (
    <>
      <PageTitle title="سجل النشاط" subtitle="كل عملية جوهرية مسجلة بمن وماذا ومتى. السجل يُكتب ولا يُعدَّل ولا يُحذف (الملحق ي)." />
      <form className="surface mb-4 flex gap-3 p-4">
        <select name="entity" defaultValue={entity} className="input max-w-xs">
          <option value="">كل الكيانات</option>
          {entities.map((e) => <option key={e.entity} value={e.entity}>{e.entity}</option>)}
        </select>
        <button className="btn-primary">تصفية</button>
      </form>
      <Card>
        <TableWrap>
          <thead><tr><th>الوقت</th><th>المنفّذ</th><th>العملية</th><th>الكيان</th><th>التفاصيل</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="tabular whitespace-nowrap text-xs">{formatDateTime(r.createdAt)}</td>
                <td>{r.actor?.name ?? "النظام"}</td>
                <td className="text-xs font-semibold" dir="ltr">{r.action}</td>
                <td className="text-xs" dir="ltr">{r.entity}</td>
                <td className="max-w-xs break-words text-xs text-ink-600">{r.detail ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
