import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireParty } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { BADGES, EVENT_STATES } from "@/lib/domain";
import { EmptyState, Flash, KpiCard, LinkButton, Money, PageTitle, PendingRule, StatusPill, TableWrap, Card } from "@/components/ui";
import { IconCalendar, IconFile, IconHandshake, IconWallet } from "@/components/icons";
import { flashFrom, type SearchParams } from "@/lib/forms";
import { expireNegotiations } from "@/lib/services";

export const metadata: Metadata = { title: "لوحة المنظّم" };

export default async function OrganizerHome({ searchParams }: { searchParams: SearchParams }) {
  const { party } = await requireParty(["ORGANIZER"]);
  const { ok, error } = await flashFrom(searchParams);
  await expireNegotiations();
  const [events, negotiating, awaitingSign, held] = await Promise.all([
    db.event.findMany({ where: { organizerId: party.id }, orderBy: { startsAt: "asc" }, include: { _count: { select: { participations: true } } } }),
    db.participation.count({ where: { event: { organizerId: party.id }, status: "NEGOTIATING" } }),
    db.contract.count({ where: { participation: { event: { organizerId: party.id } }, status: "AWAITING_SIGNATURES", organizerSignedAt: null } }),
    db.ledgerEntry.findMany({ where: { partyId: party.id, kind: { in: ["ESCROW_HOLD", "ESCROW_RELEASE", "REFUND", "CANCEL_DEDUCTION"] } } }),
  ]);
  const heldNow = held.reduce((s, r) => (r.kind === "ESCROW_HOLD" ? s + r.amountHalala : s - r.amountHalala), 0);
  const upcoming = events.filter((e) => !["COMPLETED", "FINANCIALLY_CLOSED", "CANCELLED"].includes(e.status));

  return (
    <>
      <PageTitle title={party.displayName} subtitle={<StatusPill map={BADGES} state={party.badge} />} actions={<LinkButton href="/organizer/events/new" variant="gold">فعالية جديدة</LinkButton>} />
      <Flash ok={ok} error={error} />
      {party.badge !== "VERIFIED_ORGANIZER" ? (
        <div className="mb-6"><PendingRule question="هـ5">إقامة الفعالية تشترط «منظّماً معتمداً» (المادة 21)، ومسار الاعتماد لم يُحسم بعد. تراجع إدارة المنصة حسابك عند أول فعالية</PendingRule></div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="فعاليات قائمة" value={upcoming.length} icon={<IconCalendar />} />
        <KpiCard label="مفاوضات مفتوحة" value={negotiating} hint="48 ساعة عمل لكل مشاركة" icon={<IconHandshake />} />
        <KpiCard label="عقود بانتظار توقيعك" value={awaitingSign} icon={<IconFile />} />
        <KpiCard label="محجوز في الضمان" value={<Money halala={heldNow} />} icon={<IconWallet />} />
      </div>

      <Card title="الفعاليات القادمة" className="mt-6" action={<Link href="/organizer/events" className="link text-sm">الكل</Link>}>
        {upcoming.length === 0 ? <EmptyState title="لا فعاليات قائمة" action={<LinkButton href="/organizer/events/new" variant="primary">أنشئ أول فعالية</LinkButton>} /> : (
          <TableWrap>
            <thead><tr><th>الفعالية</th><th>التاريخ</th><th>المدينة</th><th>المشاركون</th><th>الحالة</th></tr></thead>
            <tbody>
              {upcoming.slice(0, 8).map((e) => (
                <tr key={e.id}>
                  <td><Link href={`/organizer/events/${e.id}`} className="link">{e.name}</Link></td>
                  <td className="whitespace-nowrap text-xs">{formatDate(e.startsAt)}</td>
                  <td>{e.city}</td>
                  <td className="tabular">{e._count.participations}</td>
                  <td><StatusPill map={EVENT_STATES} state={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
