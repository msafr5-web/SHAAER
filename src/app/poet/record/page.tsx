import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/participant";
import { submitGrievanceAction } from "@/app/actions/compliance";
import { formatDate } from "@/lib/dates";
import { CASE_KINDS, CASE_STATES, GRIEVANCE_CATEGORIES, GRIEVANCE_STATES } from "@/lib/domain";
import { finalizeCases } from "@/lib/services";
import { Card, DeadlineBadge, EmptyState, Field, Flash, Money, PageTitle, Pill, StatusPill, TableWrap } from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "سجلي والتظلمات" };

export default async function RecordPage({ searchParams }: { searchParams: SearchParams }) {
  const { ids } = await requireParticipant();
  const { ok, error, params } = await flashFrom(searchParams);
  await finalizeCases();
  const [cases, grievances, evals] = await Promise.all([
    db.operationalCase.findMany({ where: { partyId: { in: ids } }, include: { event: true }, orderBy: { createdAt: "desc" } }),
    db.grievance.findMany({ where: { partyId: { in: ids } }, include: { case: true }, orderBy: { createdAt: "desc" } }),
    db.evaluation.findMany({ where: { subjectPartyId: { in: ids } }, include: { event: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const caseId = typeof params.case === "string" ? params.case : "";
  const openCases = cases.filter((c) => c.status === "OBJECTION_WINDOW");

  return (
    <>
      <PageTitle title="سجلي المهني والتظلمات" subtitle="السجل التشغيلي (المادة 63): الحالات والغرامات والتقييمات والاعتراضات. لك الاعتراض على أي حالة خلال 15 يوماً من تسجيلها." />
      <Flash ok={ok} error={error} />
      <div className="space-y-6">
        <Card title="الحالات التشغيلية">
          {cases.length === 0 ? <EmptyState title="سجلك خالٍ من الحالات" /> : (
            <TableWrap>
              <thead><tr><th>الحالة</th><th>الفعالية</th><th>الغرامة</th><th>المادة</th><th>الاعتراض</th></tr></thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td>{CASE_KINDS[c.kind as keyof typeof CASE_KINDS]}<div className="mt-1"><StatusPill map={CASE_STATES} state={c.status} /></div></td>
                    <td>{c.event.name}<div className="text-xs text-ink-500">{c.notes}</div></td>
                    <td><Money halala={c.fineHalala} />{c.pendingRule ? <div className="mt-1"><Pill tone="warning">لا تُحصَّل حتى تُحسم القاعدة</Pill></div> : null}</td>
                    <td>{c.article}</td>
                    <td>{c.status === "OBJECTION_WINDOW" ? <DeadlineBadge until={c.objectionDeadline} /> : formatDate(c.objectionDeadline)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>

        <Card title="تقديم تظلم (الملحق ب)">
          <form action={submitGrievanceAction} className="grid gap-4 md:grid-cols-2">
            <Field label="نوع الاعتراض">
              <select name="category" className="input">{Object.entries(GRIEVANCE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </Field>
            <Field label="الحالة محل الاعتراض">
              <select name="caseId" defaultValue={caseId} className="input">
                <option value="">بلا حالة محددة</option>
                {openCases.map((c) => <option key={c.id} value={c.id}>{CASE_KINDS[c.kind as keyof typeof CASE_KINDS]} · {c.event.name}</option>)}
              </select>
            </Field>
            <div className="md:col-span-2"><Field label="أسباب الاعتراض" hint="أرفق ما يدعم اعتراضك بوصفه هنا (رفع المستندات في الإصدار القادم)"><textarea name="reasons" required minLength={10} rows={3} className="input" /></Field></div>
            <div className="md:col-span-2"><Field label="الطلب المطلوب"><input name="requested" required className="input" placeholder="مثل: إلغاء الغرامة أو تخفيضها" /></Field></div>
            <div><button className="btn-primary">تقديم التظلم</button></div>
          </form>
        </Card>

        <Card title="تظلماتي">
          {grievances.length === 0 ? <EmptyState title="لا تظلمات" /> : (
            <TableWrap>
              <thead><tr><th>الرقم</th><th>النوع</th><th>الحالة</th><th>القرار</th></tr></thead>
              <tbody>
                {grievances.map((g) => (
                  <tr key={g.id}>
                    <td className="tabular whitespace-nowrap" dir="ltr">{g.number}</td>
                    <td>{GRIEVANCE_CATEGORIES[g.category as keyof typeof GRIEVANCE_CATEGORIES]}</td>
                    <td><StatusPill map={GRIEVANCE_STATES} state={g.status} /></td>
                    <td className="text-xs text-ink-600">{g.decision ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>

        <Card title="التقييمات">
          {evals.length === 0 ? <EmptyState title="لا تقييمات بعد" /> : (
            <TableWrap>
              <thead><tr><th>الفعالية</th><th>النتيجة</th><th>التاريخ</th></tr></thead>
              <tbody>{evals.map((e) => <tr key={e.id}><td>{e.event.name}</td><td className="tabular font-bold text-green-900">{e.total} / 100</td><td className="text-xs">{formatDate(e.createdAt)}</td></tr>)}</tbody>
            </TableWrap>
          )}
        </Card>
      </div>
    </>
  );
}
