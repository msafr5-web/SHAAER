import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { scanTokenAction } from "@/app/actions/events";
import { formatDateTime } from "@/lib/dates";
import { ATTENDANCE_STATES, SEAT_ROLES, type SeatRole } from "@/lib/domain";
import { Card, DataList, PageTitle, StatusPill } from "@/components/ui";
import { Logo } from "@/components/brand";

export const metadata: Metadata = { title: "تسجيل الحضور" };

// تفتح هذه الصفحة عند مسح رمز QR للطرف بكاميرا جوال المنظّم في موقع الفعالية (المادة 40).
export default async function ScanPage({ params }: { params: Promise<{ token: string }> }) {
  const user = await requireUser();
  const { token } = await params;
  const a = await db.attendance.findUnique({ where: { token }, include: { participation: { include: { party: true, event: { include: { organizer: true } } } } } });
  if (!a) notFound();
  const isOrganizer = a.participation.event.organizer.userId === user.id;

  return (
    <div className="min-h-screen">
      <header className="surface-bar"><div className="mx-auto max-w-md px-6 py-3"><Logo /></div></header>
      <main className="mx-auto max-w-md px-6 py-8">
        <PageTitle title="تسجيل الحضور" subtitle={a.participation.event.name} />
        <Card>
          <DataList items={[
            ["المشارك", a.participation.party?.displayName ?? "–"],
            ["الدور", SEAT_ROLES[a.participation.role as SeatRole]?.label ?? a.participation.role],
            ["وقت الحضور المحدد", formatDateTime(a.participation.attendStart)],
            ["الحالة", <StatusPill key="s" map={ATTENDANCE_STATES} state={a.status} />],
          ]} />
          {isOrganizer ? (
            <form action={scanTokenAction} className="mt-6">
              <input type="hidden" name="token" value={token} />
              <button className="btn-gold w-full py-3 text-base">تأكيد حضور المشارك</button>
            </form>
          ) : (
            <p className="mt-6 text-sm text-ink-500">تأكيد الحضور بهذا الرمز للجهة المنظمة للفعالية.</p>
          )}
        </Card>
      </main>
    </div>
  );
}
