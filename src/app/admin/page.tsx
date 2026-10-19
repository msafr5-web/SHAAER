import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { EVENT_STATES } from "@/lib/domain";
import { finalizeCases, expireNegotiations } from "@/lib/services";
import { Card, KpiCard, Money, PageTitle, Pill, TableWrap } from "@/components/ui";
import { IconAlert, IconBadge, IconCalendar, IconScale, IconUsers, IconWallet } from "@/components/icons";

export const metadata: Metadata = { title: "إدارة المنصة" };

export default async function AdminHome() {
  await expireNegotiations();
  await finalizeCases();
  const [licenseQueue, eventQueue, conflicts, grievances, parties, byStatus, ledger, attendance, approved, pendingParams] = await Promise.all([
    db.license.count({ where: { status: "UNDER_REVIEW" } }),
    db.event.count({ where: { status: "UNDER_REVIEW" } }),
    db.attendance.count({ where: { status: "CONFLICT" } }),
    db.grievance.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFO"] } } }),
    db.party.count(),
    db.event.groupBy({ by: ["status"], _count: true }),
    db.ledgerEntry.groupBy({ by: ["kind"], _sum: { amountHalala: true } }),
    db.attendance.findMany({ select: { status: true, organizerSaysPresent: true } }),
    db.attendance.findMany({
      where: { executionApprovedAt: { not: null } },
      select: { executionApprovedAt: true, participation: { select: { contract: { select: { ledger: { where: { kind: "PAYOUT" }, select: { createdAt: true } } } } } } },
    }),
    db.parameter.count({ where: { status: "PENDING" } }),
  ]);
  const sum = (k: string) => ledger.find((l) => l.kind === k)?._sum.amountHalala ?? 0;
  const count = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;

  // مؤشرات الملحق (ش): محسوبة من البيانات
  const decided = attendance.filter((a) => ["CONFIRMED", "RESOLVED"].includes(a.status));
  const attendanceRate = decided.length ? Math.round((decided.filter((a) => a.organizerSaysPresent).length / decided.length) * 100) : null;
  const confirmedish = ["CONFIRMED", "IN_EXECUTION", "COMPLETED", "FINANCIALLY_CLOSED"].reduce((s, k) => s + count(k), 0);
  const completionRate = confirmedish ? Math.round(((count("COMPLETED") + count("FINANCIALLY_CLOSED")) / confirmedish) * 100) : null;
  const hours = approved.flatMap((a) => {
    const paid = a.participation.contract?.ledger[0]?.createdAt;
    return paid && a.executionApprovedAt ? [(paid.getTime() - a.executionApprovedAt.getTime()) / 3_600_000] : [];
  });
  const avgPayoutHours = hours.length ? Math.max(0, Math.round(hours.reduce((s, h) => s + h, 0) / hours.length)) : null;

  const queues = [
    { href: "/admin/licenses", label: "طلبات تراخيص", n: licenseQueue, icon: <IconBadge /> },
    { href: "/admin/events", label: "فعاليات بانتظار الاعتماد", n: eventQueue, icon: <IconCalendar /> },
    { href: "/admin/cases", label: "تعارضات حضور مجمّدة", n: conflicts, icon: <IconAlert /> },
    { href: "/admin/grievances", label: "تظلمات مفتوحة", n: grievances, icon: <IconScale /> },
  ];

  return (
    <>
      <PageTitle title="نظرة عامة" subtitle="طوابير المراجعة ومؤشرات الأداء والحوكمة (الملحق ش)." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {queues.map((q) => (
          <Link key={q.href} href={q.href} className={`surface flex items-center gap-3 p-4 transition hover:border-green-300 ${q.n ? "border-gold-300" : ""}`}>
            <div className={`rounded-lg p-2 ${q.n ? "bg-gold-50 text-gold-700" : "bg-green-50 text-green-700"}`}>{q.icon}</div>
            <div><div className="tabular text-2xl font-bold text-green-900">{q.n}</div><div className="text-xs font-semibold text-ink-500">{q.label}</div></div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="نسبة الالتزام بالحضور" value={attendanceRate !== null ? `${attendanceRate}%` : "–"} />
        <KpiCard label="نسبة اكتمال الفعاليات" value={completionRate !== null ? `${completionRate}%` : "–"} />
        <KpiCard label="متوسط سرعة الصرف" value={avgPayoutHours !== null ? `${avgPayoutHours} ساعة` : "–"} hint="من اعتماد التنفيذ إلى التحويل" />
        <KpiCard label="الأطراف المسجلة" value={parties} icon={<IconUsers />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="الإيرادات والمال (المادة 72)">
          <TableWrap>
            <tbody>
              <tr><td>رسوم التراخيص</td><td><Money halala={sum("LICENSE_FEE")} /></td></tr>
              <tr><td>ضريبة القيمة المضافة المحصلة</td><td><Money halala={sum("VAT")} /></td></tr>
              <tr><td>محجوز في الضمان (صافي)</td><td><Money halala={sum("ESCROW_HOLD") - sum("ESCROW_RELEASE") - sum("REFUND") - sum("CANCEL_DEDUCTION")} /></td></tr>
              <tr><td>مصروف للأطراف</td><td><Money halala={sum("PAYOUT")} /></td></tr>
              <tr><td>غرامات نهائية</td><td><Money halala={sum("FINE")} /></td></tr>
              <tr><td>اقتطاعات إلغاء</td><td><Money halala={sum("CANCEL_DEDUCTION")} /></td></tr>
            </tbody>
          </TableWrap>
          <p className="mt-3 text-xs text-ink-500">عمولة المنصة على العقود: 0% حتى يُحسم السؤال ب2. مستفيد الغرامات والاقتطاع معلّق على السؤالين ب5 و ب6.</p>
        </Card>
        <Card title="الفعاليات حسب الحالة (المادة 25)">
          <ul className="space-y-2">
            {Object.entries(EVENT_STATES).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between text-sm">
                <Pill tone={v.tone}>{v.label}</Pill><span className="tabular font-bold text-green-900">{count(k)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {pendingParams ? (
        <Link href="/admin/parameters" className="mt-6 flex items-center gap-2 rounded-xl border border-warning-100 bg-warning-50 p-4 text-sm text-warning-700">
          <IconAlert size={18} /> {pendingParams} معاملاً من قواعد اللائحة ما زالت معلّقة على أسئلة لصاحب المبادرة. اعرضها
        </Link>
      ) : null}
      <p className="mt-3 flex items-center gap-1 text-xs text-ink-500"><IconWallet size={14} />بوابة الدفع وحساب الضمان والنفاذ الوطني لم تُربط بعد: العمليات المالية قيود تجريبية في الدفتر.</p>
    </>
  );
}
