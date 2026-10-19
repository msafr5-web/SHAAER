import type { Metadata } from "next";
import { db } from "@/lib/db";
import { decideGrievanceAction } from "@/app/actions/admin";
import { formatDate } from "@/lib/dates";
import { CASE_KINDS, GRIEVANCE_CATEGORIES, GRIEVANCE_STATES } from "@/lib/domain";
import { Card, EmptyState, Field, Flash, Money, PageTitle, StatusPill } from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "التظلمات" };

export default async function AdminGrievances({ searchParams }: { searchParams: SearchParams }) {
  const { ok, error } = await flashFrom(searchParams);
  const items = await db.grievance.findMany({ include: { party: true, case: { include: { event: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  const open = items.filter((g) => ["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFO"].includes(g.status));
  const closed = items.filter((g) => !open.includes(g));
  return (
    <>
      <PageTitle title="التظلمات" subtitle="إدارة النزاعات والتظلمات: مراجعة السجلات والعقود، وطلب المعلومات، وتعليق الإجراء مؤقتاً، واعتماد القرار النهائي (المادة 55)." />
      <Flash ok={ok} error={error} />
      <div className="space-y-4">
        {open.length === 0 ? <EmptyState title="لا تظلمات مفتوحة" /> : open.map((g) => (
          <Card key={g.id} title={`${g.number} · ${GRIEVANCE_CATEGORIES[g.category as keyof typeof GRIEVANCE_CATEGORIES]}`} action={<StatusPill map={GRIEVANCE_STATES} state={g.status} />}>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 text-sm">
                <div><span className="font-semibold">المتظلم:</span> {g.party.displayName} · {formatDate(g.createdAt)}</div>
                {g.case ? <div><span className="font-semibold">الحالة:</span> {CASE_KINDS[g.case.kind as keyof typeof CASE_KINDS]} في {g.case.event.name} · الغرامة <Money halala={g.case.fineHalala} /> (المادة {g.case.article})</div> : null}
                <div><span className="font-semibold">الأسباب:</span> {g.reasons}</div>
                <div><span className="font-semibold">الطلب:</span> {g.requested}</div>
              </div>
              <form action={decideGrievanceAction} className="space-y-2">
                <input type="hidden" name="grievanceId" value={g.id} />
                <Field label="القرار">
                  <select name="outcome" className="input">
                    <option value="UNDER_REVIEW">قيد المراجعة</option>
                    <option value="NEEDS_INFO">طلب معلومات إضافية</option>
                    <option value="ACCEPTED">قبول: إلغاء الغرامة</option>
                    <option value="PARTIAL">قبول جزئي: تعديل الغرامة</option>
                    <option value="REJECTED">رفض</option>
                  </select>
                </Field>
                <Field label="الغرامة المعدّلة (ريال)" hint="للقبول الجزئي"><input name="newFine" type="number" min={0} step="0.01" className="input tabular" /></Field>
                <Field label="سبب القرار"><textarea name="decision" required minLength={5} rows={2} className="input" /></Field>
                <button className="btn-primary btn-sm">حفظ القرار</button>
              </form>
            </div>
          </Card>
        ))}
        {closed.length ? (
          <Card title="محسومة">
            <ul className="space-y-2 text-sm">
              {closed.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{g.number} · {g.party.displayName} · {g.decision}</span>
                  <StatusPill map={GRIEVANCE_STATES} state={g.status} />
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </>
  );
}
