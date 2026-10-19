import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { reviewEventAction } from "@/app/actions/admin";
import { formatDate } from "@/lib/dates";
import { EVENT_LEVELS, EVENT_STATES, EVENT_TYPES } from "@/lib/domain";
import { Card, EmptyState, Flash, PageTitle, StatusPill, TableWrap } from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "الفعاليات" };

export default async function AdminEvents({ searchParams }: { searchParams: SearchParams }) {
  const { ok, error } = await flashFrom(searchParams);
  const [queue, events] = await Promise.all([
    db.event.findMany({ where: { status: "UNDER_REVIEW" }, include: { organizer: true, venue: true, _count: { select: { participations: true } } }, orderBy: { startsAt: "asc" } }),
    db.event.findMany({ where: { status: { not: "UNDER_REVIEW" } }, include: { organizer: true }, orderBy: { startsAt: "desc" }, take: 100 }),
  ]);
  return (
    <>
      <PageTitle title="الفعاليات" subtitle="إدارة التشغيل: الاعتماد المبدئي ومتابعة التنفيذ والإغلاق المالي (المادتان 25 و61)." />
      <Flash ok={ok} error={error} />
      <Card title={`بانتظار الاعتماد المبدئي (${queue.length})`}>
        {queue.length === 0 ? <EmptyState title="لا فعاليات بانتظار المراجعة" /> : (
          <div className="space-y-3">
            {queue.map((e) => (
              <div key={e.id} className="surface-inset flex flex-wrap items-start justify-between gap-4 p-4">
                <div className="text-sm">
                  <Link href={`/admin/events/${e.id}`} className="link text-base">{e.name}</Link>
                  <div className="mt-1 text-ink-600">{e.organizer.displayName} · {EVENT_TYPES[e.type as keyof typeof EVENT_TYPES]} · {EVENT_LEVELS[e.level as keyof typeof EVENT_LEVELS]}</div>
                  <div className="text-ink-600">{formatDate(e.startsAt)} · {e.venue?.name ?? `${e.venueText} (غير مرخّص)`} · {e.city}</div>
                  <div className="text-ink-600">الحضور المتوقع <span className="tabular">{e.expectedAttendance}</span>{e.venue ? <> من سعة <span className="tabular">{e.venue.capacity}</span></> : null} · <span className="tabular">{e._count.participations}</span> مشارك</div>
                </div>
                <form action={reviewEventAction} className="flex w-full max-w-xs flex-col gap-2">
                  <input type="hidden" name="eventId" value={e.id} />
                  <input name="note" placeholder="ملاحظة للمنظّم" className="input" />
                  <div className="flex gap-2">
                    <button name="decision" value="approve" className="btn-primary btn-sm">اعتماد مبدئي</button>
                    <button name="decision" value="return" className="btn-ghost btn-sm">إعادة للتعديل</button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title="كل الفعاليات" className="mt-6">
        <TableWrap>
          <thead><tr><th>الفعالية</th><th>المنظّم</th><th>التاريخ</th><th>الحالة</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td><Link href={`/admin/events/${e.id}`} className="link">{e.name}</Link></td>
                <td>{e.organizer.displayName}</td>
                <td className="whitespace-nowrap text-xs">{formatDate(e.startsAt)}</td>
                <td><StatusPill map={EVENT_STATES} state={e.status} /></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
