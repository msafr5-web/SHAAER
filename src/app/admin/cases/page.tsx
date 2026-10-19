import type { Metadata } from "next";
import { db } from "@/lib/db";
import { resolveAttendanceAction } from "@/app/actions/admin";
import { formatDate, formatDateTime } from "@/lib/dates";
import { CASE_KINDS, CASE_STATES } from "@/lib/domain";
import { finalizeCases } from "@/lib/services";
import { Card, DeadlineBadge, EmptyState, Field, Flash, Money, PageTitle, PendingRule, Pill, StatusPill, TableWrap } from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "الحالات والتعارضات" };

export default async function AdminCases({ searchParams }: { searchParams: SearchParams }) {
  const { ok, error } = await flashFrom(searchParams);
  await finalizeCases();
  const [conflicts, cases] = await Promise.all([
    db.attendance.findMany({ where: { status: "CONFLICT" }, include: { participation: { include: { party: true, event: { include: { organizer: true } } } } } }),
    db.operationalCase.findMany({ include: { party: true, event: true }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return (
    <>
      <PageTitle title="الحالات والتعارضات" subtitle="تعارضات الحضور مجمّدة المستحقات حتى التحقق (المادة 40)، والحالات التشغيلية بغراماتها المحسوبة (المواد 33 و43 إلى 45)." />
      <Flash ok={ok} error={error} />
      <Card title={`تعارضات الحضور (${conflicts.length})`}>
        <div className="mb-4"><PendingRule question="ج6">من يحسم التعارض، وفي كم يوماً، وما الإثبات المقبول: لم يُحدد بعد. الحسم هنا لإدارة المنصة</PendingRule></div>
        {conflicts.length === 0 ? <EmptyState title="لا تعارضات قائمة" /> : (
          <div className="space-y-3">
            {conflicts.map((a) => (
              <div key={a.id} className="surface-inset grid gap-4 p-4 md:grid-cols-2">
                <div className="text-sm">
                  <div className="font-bold text-green-900">{a.participation.party?.displayName} · {a.participation.event.name}</div>
                  <div className="mt-1 text-ink-600">المنظّم ({a.participation.event.organizer.displayName}): {a.organizerSaysPresent ? "حاضر" : "غير حاضر"} · {formatDateTime(a.organizerMarkedAt)}</div>
                  <div className="text-ink-600">الطرف: {a.partySaysPresent ? "حاضر" : "غير حاضر"} · {formatDateTime(a.partyMarkedAt)}</div>
                  <div className="mt-2 flex items-center gap-2">المستحق المجمّد <Money halala={a.participation.agreedHalala} className="font-bold" /></div>
                </div>
                <form action={resolveAttendanceAction} className="space-y-2">
                  <input type="hidden" name="attendanceId" value={a.id} />
                  <Field label="أساس القرار والإثبات"><textarea name="note" required minLength={5} rows={2} className="input" /></Field>
                  <div className="flex gap-2">
                    <button name="outcome" value="present" className="btn-primary btn-sm">ثبت الحضور</button>
                    <button name="outcome" value="absent" className="btn-danger btn-sm">لم يثبت الحضور</button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title="الحالات التشغيلية" className="mt-6">
        {cases.length === 0 ? <EmptyState title="لا حالات" /> : (
          <TableWrap>
            <thead><tr><th>الحالة</th><th>الطرف</th><th>الفعالية</th><th>الغرامة</th><th>القاعدة</th><th>المهلة</th></tr></thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id}>
                  <td>{CASE_KINDS[c.kind as keyof typeof CASE_KINDS]}<div className="mt-1"><StatusPill map={CASE_STATES} state={c.status} /></div></td>
                  <td>{c.party.displayName}</td>
                  <td>{c.event.name}<div className="text-xs text-ink-500">{c.notes}</div></td>
                  <td><Money halala={c.fineHalala} />{c.ratePercent ? <div className="tabular text-xs text-ink-500">{c.ratePercent}%</div> : null}</td>
                  <td className="text-xs">المادة {c.article}{c.pendingRule ? <div className="mt-1"><Pill tone="warning">قيد الحسم</Pill></div> : null}</td>
                  <td>{c.status === "OBJECTION_WINDOW" ? <DeadlineBadge until={c.objectionDeadline} /> : <span className="text-xs">{formatDate(c.objectionDeadline)}</span>}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
