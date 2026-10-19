import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireParty } from "@/lib/auth";
import { Card, KpiCard, Money, PageTitle } from "@/components/ui";
import { LedgerTable } from "@/components/ledger-table";

export const metadata: Metadata = { title: "المدفوعات" };

export default async function OrganizerFinance() {
  const { party } = await requireParty(["ORGANIZER"]);
  const rows = await db.ledgerEntry.findMany({ where: { partyId: party.id }, orderBy: { createdAt: "desc" }, take: 200 });
  const sum = (k: string[]) => rows.filter((r) => k.includes(r.kind)).reduce((s, r) => s + r.amountHalala, 0);
  const held = sum(["ESCROW_HOLD"]) - sum(["ESCROW_RELEASE", "REFUND", "CANCEL_DEDUCTION"]);
  return (
    <>
      <PageTitle title="المدفوعات" subtitle="كل العمليات المالية تتم عبر المنصة فقط (المادة 34). المبالغ بالريال، والضريبة قيد مستقل." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="محجوز حالياً" value={<Money halala={held} />} />
        <KpiCard label="مُفرَج للأطراف" value={<Money halala={sum(["ESCROW_RELEASE"])} />} />
        <KpiCard label="رسوم التراخيص" value={<Money halala={sum(["LICENSE_FEE"])} />} hint={<>ضريبة <Money halala={sum(["VAT"])} /></>} />
        <KpiCard label="اقتطاعات الإلغاء" value={<Money halala={sum(["CANCEL_DEDUCTION"])} />} />
      </div>
      <Card title="الدفتر"><LedgerTable rows={rows} /></Card>
    </>
  );
}
