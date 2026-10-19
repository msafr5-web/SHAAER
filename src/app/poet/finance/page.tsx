import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/participant";
import { Card, KpiCard, Money, PageTitle, PendingRule } from "@/components/ui";
import { LedgerTable } from "@/components/ledger-table";

export const metadata: Metadata = { title: "مستحقاتي" };

export default async function ParticipantFinance() {
  const { ids, parties } = await requireParticipant();
  const rows = await db.ledgerEntry.findMany({ where: { partyId: { in: ids } }, orderBy: { createdAt: "desc" }, take: 200 });
  const pendingContracts = await db.participation.findMany({ where: { partyId: { in: ids }, status: "CONTRACTED" } });
  const sum = (k: string) => rows.filter((r) => r.kind === k).reduce((s, r) => s + r.amountHalala, 0);
  const upcoming = pendingContracts.reduce((s, p) => s + (p.agreedHalala ?? 0), 0);
  return (
    <>
      <PageTitle title="مستحقاتي" subtitle="تُحوَّل المستحقات إلى حسابك البنكي المعتمد فور إثبات تنفيذ المشاركة (المادة 36)." />
      {parties.some((p) => !p.ibanVerified) ? <div className="mb-6"><PendingRule>أضف آيبانك من «ملفي» وانتظر التحقق منه، فلا صرف قبله</PendingRule></div> : null}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard label="مصروف إليك" value={<Money halala={sum("PAYOUT")} />} />
        <KpiCard label="مستحقات متعاقد عليها قادمة" value={<Money halala={upcoming} />} hint="تُصرف بعد اعتماد التنفيذ" />
        <KpiCard label="رسوم تراخيصك" value={<Money halala={sum("LICENSE_FEE")} />} hint={<>ضريبة <Money halala={sum("VAT")} /></>} />
      </div>
      <Card title="الحركات"><LedgerTable rows={rows} /></Card>
    </>
  );
}
