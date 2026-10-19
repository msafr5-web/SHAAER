import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { closeEventFinanciallyAction } from "@/app/actions/admin";
import { formatDateTime } from "@/lib/dates";
import {
  ATTENDANCE_STATES, CONTRACT_STATES, EVENT_STATES, EVENT_STATE_STEP, EVENT_TYPES, JOURNEY_STEPS, PARTICIPATION_STATES, SEAT_ROLES,
  type EventState, type SeatRole,
} from "@/lib/domain";
import { Card, DataList, Flash, JourneyBar, Money, PageTitle, StatusPill, TableWrap } from "@/components/ui";
import { LedgerTable } from "@/components/ledger-table";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "تفاصيل الفعالية" };

export default async function AdminEventDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const { id } = await params;
  const { ok, error } = await flashFrom(searchParams);
  const event = await db.event.findUnique({
    where: { id },
    include: { organizer: true, venue: true, ledger: { orderBy: { createdAt: "desc" } }, participations: { include: { party: true, contract: true, attendance: true } } },
  });
  if (!event) notFound();
  const auditRows = await db.auditLog.findMany({ where: { entity: "event", entityId: event.id }, include: { actor: true }, orderBy: { createdAt: "desc" } });

  return (
    <>
      <PageTitle title={event.name} subtitle={<span dir="ltr" className="tabular">{event.number}</span>} actions={<StatusPill map={EVENT_STATES} state={event.status} />} />
      <Flash ok={ok} error={error} />
      <div className="surface mb-6 p-4"><JourneyBar steps={JOURNEY_STEPS} current={EVENT_STATE_STEP[event.status as EventState]} /></div>
      {event.status === "COMPLETED" ? (
        <form action={closeEventFinanciallyAction} className="surface mb-6 flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <input type="hidden" name="eventId" value={event.id} />
          <span>الإغلاق المالي والتشغيلي بعد انقضاء مهل الاعتراض وحسم التظلمات (الملحق هـ، الخطوة 13).</span>
          <button className="btn-gold">إغلاق الفعالية مالياً</button>
        </form>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card title="المشاركات">
            <TableWrap>
              <thead><tr><th>الطرف</th><th>الدور</th><th>المبلغ</th><th>الحالة</th><th>العقد</th><th>الحضور</th></tr></thead>
              <tbody>
                {event.participations.map((p) => (
                  <tr key={p.id}>
                    <td>{p.party?.displayName}</td>
                    <td>{SEAT_ROLES[p.role as SeatRole]?.label}</td>
                    <td><Money halala={p.agreedHalala} /></td>
                    <td><StatusPill map={PARTICIPATION_STATES} state={p.status} /></td>
                    <td>{p.contract ? <><Link href={`/contracts/${p.contract.id}`} className="link text-xs">{p.contract.number}</Link><div><StatusPill map={CONTRACT_STATES} state={p.contract.status} /></div></> : "–"}</td>
                    <td>{p.attendance ? <StatusPill map={ATTENDANCE_STATES} state={p.attendance.status} /> : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </Card>
          <Card title="القيود المالية للفعالية"><LedgerTable rows={event.ledger} /></Card>
          <Card title="سجل النشاط">
            <ul className="space-y-1.5 text-xs">
              {auditRows.map((a) => (
                <li key={a.id} className="flex justify-between gap-3">
                  <span><span className="font-semibold">{a.action}</span> · {a.actor?.name ?? "النظام"}{a.detail ? ` · ${a.detail}` : ""}</span>
                  <span className="tabular shrink-0 text-ink-500">{formatDateTime(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <Card title="البيانات">
          <DataList items={[
            ["المنظّم", event.organizer.displayName],
            ["النوع", EVENT_TYPES[event.type as keyof typeof EVENT_TYPES]],
            ["التاريخ", formatDateTime(event.startsAt)],
            ["الموقع", event.venue?.name ?? event.venueText],
            ["المدينة", event.city],
            ["الحضور المتوقع", event.expectedAttendance],
            ["سبب الإلغاء", event.cancelReason ?? "–"],
          ]} />
        </Card>
      </div>
    </>
  );
}
