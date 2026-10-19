import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireParty } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { EVENT_STATES, EVENT_TYPES, type EventType } from "@/lib/domain";
import { Card, EmptyState, Flash, LinkButton, PageTitle, StatusPill, TableWrap } from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "فعالياتي" };

export default async function OrganizerEvents({ searchParams }: { searchParams: SearchParams }) {
  const { party } = await requireParty(["ORGANIZER"]);
  const { ok, error, params } = await flashFrom(searchParams);
  const status = typeof params.status === "string" && params.status in EVENT_STATES ? params.status : undefined;
  const events = await db.event.findMany({
    where: { organizerId: party.id, ...(status ? { status } : {}) },
    orderBy: { startsAt: "desc" },
    include: { venue: true, _count: { select: { participations: true } } },
  });
  return (
    <>
      <PageTitle title="فعالياتي" actions={<LinkButton href="/organizer/events/new" variant="gold">فعالية جديدة</LinkButton>} />
      <Flash ok={ok} error={error} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/organizer/events" className={`btn-sm ${!status ? "btn-primary" : "btn-ghost"}`}>الكل</Link>
        {Object.entries(EVENT_STATES).map(([k, v]) => (
          <Link key={k} href={`/organizer/events?status=${k}`} className={`btn-sm ${status === k ? "btn-primary" : "btn-ghost"}`}>{v.label}</Link>
        ))}
      </div>
      <Card>
        {events.length === 0 ? <EmptyState title="لا فعاليات" /> : (
          <TableWrap>
            <thead><tr><th>الفعالية</th><th>النوع</th><th>التاريخ</th><th>الموقع</th><th>المشاركون</th><th>الحالة</th></tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td><Link href={`/organizer/events/${e.id}`} className="link">{e.name}</Link><div className="tabular text-xs text-ink-500" dir="ltr">{e.number}</div></td>
                  <td>{EVENT_TYPES[e.type as EventType]}</td>
                  <td className="whitespace-nowrap text-xs">{formatDate(e.startsAt)}</td>
                  <td>{e.venue?.name ?? e.venueText} · {e.city}</td>
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
