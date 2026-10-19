import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireParty } from "@/lib/auth";
import { confirmVenueBookingAction } from "@/app/actions/party";
import { formatDateTime } from "@/lib/dates";
import { EVENT_STATES, EVENT_TYPES } from "@/lib/domain";
import { Card, EmptyState, Flash, PageTitle, Pill, StatusPill, TableWrap } from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "الحجوزات" };

export default async function HostEvents({ searchParams }: { searchParams: SearchParams }) {
  const { party } = await requireParty(["VENUE_HOST"]);
  const { ok, error } = await flashFrom(searchParams);
  const events = await db.event.findMany({
    where: { venue: { hostPartyId: party.id }, status: { not: "DRAFT" } },
    include: { venue: true, organizer: true },
    orderBy: { startsAt: "desc" },
  });
  return (
    <>
      <PageTitle title="الحجوزات" subtitle="الفعاليات المقامة في مواقعك. أكّد الحجز ليظهر للمنظّم والمشاركين، وتلتزم بتوفير بيئة آمنة ومنظمة (الملحق ض ض)." />
      <Flash ok={ok} error={error} />
      <Card>
        {events.length === 0 ? <EmptyState title="لا حجوزات" /> : (
          <TableWrap>
            <thead><tr><th>الفعالية</th><th>الموقع</th><th>الموعد</th><th>الحضور المتوقع</th><th>الحالة</th><th></th></tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{e.name}<div className="text-xs text-ink-500">{e.organizer.displayName} · {EVENT_TYPES[e.type as keyof typeof EVENT_TYPES]}</div></td>
                  <td>{e.venue?.name}</td>
                  <td className="whitespace-nowrap text-xs">{formatDateTime(e.startsAt)}</td>
                  <td className="tabular">{e.expectedAttendance}{e.venue && e.expectedAttendance > e.venue.capacity * 0.9 ? <div><Pill tone="warning">قريب من السعة</Pill></div> : null}</td>
                  <td><StatusPill map={EVENT_STATES} state={e.status} /></td>
                  <td>
                    {e.venueConfirmedAt ? <Pill tone="success">مؤكَّد</Pill> : !["CANCELLED", "COMPLETED", "FINANCIALLY_CLOSED"].includes(e.status) ? (
                      <form action={confirmVenueBookingAction}><input type="hidden" name="eventId" value={e.id} /><button className="btn-primary btn-sm">تأكيد الحجز</button></form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
