import type { Metadata } from "next";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/participant";
import { partyMarkAction } from "@/app/actions/events";
import { formatDateTime } from "@/lib/dates";
import { ATTENDANCE_STATES } from "@/lib/domain";
import { absoluteUrl } from "@/lib/url";
import { Card, DataList, EmptyState, Flash, PageTitle, StatusPill } from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "رموز الحضور" };

export default async function AttendancePage({ searchParams }: { searchParams: SearchParams }) {
  const { ids } = await requireParticipant();
  const { ok, error } = await flashFrom(searchParams);
  const rows = await db.attendance.findMany({
    where: { participation: { partyId: { in: ids }, status: { in: ["CONTRACTED", "EXECUTED"] } } },
    include: { participation: { include: { event: true } } },
    orderBy: { participation: { event: { startsAt: "asc" } } },
  });
  const qrs = await Promise.all(rows.map((r) => QRCode.toDataURL(absoluteUrl(`/scan/${r.token}`), { margin: 1, width: 220 })));

  return (
    <>
      <PageTitle title="رموز الحضور" subtitle="اعرض رمزك على المنظّم في موقع الفعالية ليمسحه، وسجّل حضورك من هنا. اختلاف التسجيلين يجمّد المستحقات حتى التحقق (المادة 40)." />
      <Flash ok={ok} error={error} />
      {rows.length === 0 ? <EmptyState title="لا مشاركات متعاقد عليها" /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((r, i) => (
            <Card key={r.id} title={r.participation.event.name} action={<StatusPill map={ATTENDANCE_STATES} state={r.status} />}>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrs[i]} alt={`رمز حضور ${r.participation.event.name}`} width={180} height={180} className="rounded-lg border border-line" />
                <div className="min-w-0 flex-1">
                  <DataList items={[
                    ["وقت الحضور", formatDateTime(r.participation.attendStart)],
                    ["بدء المشاركة", formatDateTime(r.participation.performStart)],
                    ["تسجيل المنظّم", r.organizerMarkedAt ? (r.organizerSaysPresent ? "حاضر" : "غير حاضر") : "لم يسجّل"],
                    ["تسجيلك", r.partyMarkedAt ? (r.partySaysPresent ? "حاضر" : "غير حاضر") : "لم تسجّل"],
                  ]} />
                  {r.participation.status === "CONTRACTED" && !r.partyMarkedAt ? (
                    <form action={partyMarkAction} className="mt-4">
                      <input type="hidden" name="participationId" value={r.participationId} />
                      <input type="hidden" name="present" value="yes" />
                      <button className="btn-primary w-full">أنا حاضر في الموقع</button>
                    </form>
                  ) : null}
                  {r.resolution ? <p className="mt-3 text-xs text-ink-600">قرار التحقق: {r.resolution}</p> : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
