import type { Metadata } from "next";
import { db } from "@/lib/db";
import { retryPayoutAction } from "@/app/actions/admin";
import { Card, EmptyState, Flash, Money, PageTitle, PendingRule, TableWrap } from "@/components/ui";
import { LedgerTable } from "@/components/ledger-table";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "الدفتر المالي" };

export default async function AdminFinance({ searchParams }: { searchParams: SearchParams }) {
  const { ok, error } = await flashFrom(searchParams);
  const [rows, stuck] = await Promise.all([
    db.ledgerEntry.findMany({ orderBy: { createdAt: "desc" }, take: 300 }),
    db.participation.findMany({
      where: { status: "EXECUTED", honorary: false, contract: { ledger: { none: { kind: "PAYOUT" } } } },
      include: { party: true, event: true, attendance: true },
    }),
  ]);
  return (
    <>
      <PageTitle title="الدفتر المالي" subtitle="الإدارة المالية: كل قيد بالهللة، والضريبة قيد مستقل، ولا صرف قبل اعتماد التنفيذ (المواد 34 إلى 38)." />
      <Flash ok={ok} error={error} />
      <div className="mb-6"><PendingRule question="ب1">حجز مبالغ العقود فعلياً في حساب ضمان، أم توثيقها فقط: لم يُحسم. القيود الحالية توثيق تجريبي</PendingRule></div>
      <Card title={`صرف متعثر (${stuck.length})`}>
        {stuck.length === 0 ? <EmptyState title="لا مستحقات متعثرة" /> : (
          <TableWrap>
            <thead><tr><th>الطرف</th><th>الفعالية</th><th>المبلغ</th><th>السبب</th><th></th></tr></thead>
            <tbody>
              {stuck.map((p) => (
                <tr key={p.id}>
                  <td>{p.party?.displayName}</td>
                  <td>{p.event.name}</td>
                  <td><Money halala={p.agreedHalala} /></td>
                  <td className="text-xs">{p.attendance?.payoutFrozen ? "مجمّد لتعارض الحضور" : !p.party?.ibanVerified ? "لا آيبان معتمد" : "–"}</td>
                  <td><form action={retryPayoutAction}><input type="hidden" name="participationId" value={p.id} /><button className="btn-primary btn-sm">إعادة محاولة الصرف</button></form></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
      <Card title="القيود" className="mt-6"><LedgerTable rows={rows} /></Card>
    </>
  );
}
