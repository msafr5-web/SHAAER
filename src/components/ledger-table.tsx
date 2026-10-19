import type { LedgerEntry } from "@prisma/client";
import { formatDateTime } from "@/lib/dates";
import { EmptyState, Money, TableWrap } from "./ui";

export const LEDGER_KINDS: Record<string, string> = {
  LICENSE_FEE: "رسم ترخيص",
  VAT: "ضريبة القيمة المضافة",
  ESCROW_HOLD: "حجز في الضمان",
  ESCROW_RELEASE: "إفراج من الضمان",
  PAYOUT: "صرف مستحقات",
  REFUND: "استرداد",
  FINE: "غرامة",
  CANCEL_DEDUCTION: "اقتطاع إلغاء",
};

export function LedgerTable({ rows }: { rows: LedgerEntry[] }) {
  if (!rows.length) return <EmptyState title="لا قيود بعد" />;
  return (
    <TableWrap>
      <thead><tr><th>التاريخ</th><th>القيد</th><th>البيان</th><th>المبلغ</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="whitespace-nowrap text-xs">{formatDateTime(r.createdAt)}</td>
            <td className="whitespace-nowrap">{LEDGER_KINDS[r.kind] ?? r.kind}</td>
            <td className="text-xs text-ink-600">{r.memo}</td>
            <td><Money halala={r.amountHalala} /></td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}
