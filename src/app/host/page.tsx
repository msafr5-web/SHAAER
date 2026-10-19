import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireParty } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { BADGES, EVENT_STATES, LICENSE_STATES } from "@/lib/domain";
import { Card, EmptyState, Flash, KpiCard, LinkButton, PageTitle, Pill, StatusPill, TableWrap } from "@/components/ui";
import { IconBuilding, IconCalendar, IconUsers } from "@/components/icons";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "لوحة الموقع" };

export default async function HostHome({ searchParams }: { searchParams: SearchParams }) {
  const { party } = await requireParty(["VENUE_HOST"]);
  const { ok, error } = await flashFrom(searchParams);
  const [venues, license, events] = await Promise.all([
    db.venue.findMany({ where: { hostPartyId: party.id } }),
    db.license.findFirst({ where: { partyId: party.id, typeCode: "VENUE" }, orderBy: { createdAt: "desc" } }),
    db.event.findMany({ where: { venue: { hostPartyId: party.id }, status: { notIn: ["DRAFT", "CANCELLED"] }, startsAt: { gte: new Date(Date.now() - 86_400_000) } }, include: { venue: true, organizer: true }, orderBy: { startsAt: "asc" } }),
  ]);
  const toConfirm = events.filter((e) => ["CONFIRMED", "AWAITING_PAYMENT", "NEGOTIATING"].includes(e.status) && !e.venueConfirmedAt).length;
  const capacity = venues.filter((v) => v.status === "LICENSED").reduce((s, v) => s + v.capacity, 0);

  return (
    <>
      <PageTitle title={party.displayName} subtitle={<StatusPill map={BADGES} state={party.badge} />} actions={<LinkButton href="/host/venues" variant="gold">إضافة موقع</LinkButton>} />
      <Flash ok={ok} error={error} />
      {license?.status !== "ACTIVE" ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold-200 bg-gold-50 p-4 text-sm">
          <div><div className="font-bold text-green-900">ترخيص الموقع {license ? LICENSE_STATES[license.status as keyof typeof LICENSE_STATES]?.label : "لم يُطلب بعد"}</div>لا تظهر مواقعك للمنظّمين قبل ترخيصها: 1,500 ريال لثلاث سنوات (المادة 21).</div>
          <LinkButton href="/host/licenses" variant="primary">ترخيص الموقع</LinkButton>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="مواقع مرخّصة" value={`${venues.filter((v) => v.status === "LICENSED").length} من ${venues.length}`} icon={<IconBuilding />} />
        <KpiCard label="حجوزات قادمة" value={events.length} hint={toConfirm ? `${toConfirm} بانتظار تأكيدك` : undefined} icon={<IconCalendar />} />
        <KpiCard label="السعة المرخّصة" value={capacity.toLocaleString("en-US")} hint="شخص" icon={<IconUsers />} />
      </div>
      <Card title="الحجوزات القادمة" className="mt-6" action={<Link href="/host/events" className="link text-sm">الكل</Link>}>
        {events.length === 0 ? <EmptyState title="لا حجوزات قادمة" /> : (
          <TableWrap>
            <thead><tr><th>الفعالية</th><th>الموقع</th><th>التاريخ</th><th>الحضور</th><th>الحالة</th></tr></thead>
            <tbody>
              {events.slice(0, 6).map((e) => (
                <tr key={e.id}>
                  <td>{e.name}<div className="text-xs text-ink-500">{e.organizer.displayName}</div></td>
                  <td>{e.venue?.name}</td>
                  <td className="whitespace-nowrap text-xs">{formatDate(e.startsAt)}</td>
                  <td className="tabular">{e.expectedAttendance}</td>
                  <td className="space-y-1"><StatusPill map={EVENT_STATES} state={e.status} />{e.venueConfirmedAt ? <div><Pill tone="success">مؤكَّد منك</Pill></div> : null}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
