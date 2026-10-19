import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireParty } from "@/lib/auth";
import { createVenueAction } from "@/app/actions/party";
import { SAUDI_CITIES, VENUE_KINDS, VENUE_STATES } from "@/lib/domain";
import { Card, EmptyState, Field, Flash, PageTitle, StatusPill, TableWrap } from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "مواقعي" };

export default async function VenuesPage({ searchParams }: { searchParams: SearchParams }) {
  const { party } = await requireParty(["VENUE_HOST"]);
  const { ok, error } = await flashFrom(searchParams);
  const venues = await db.venue.findMany({ where: { hostPartyId: party.id }, include: { _count: { select: { events: true } } }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageTitle title="مواقعي" subtitle="القاعات والمسارح والاستراحات والقصور والساحات والمواقع المخصصة (المادة 21). الترخيص يشترط بيئة آمنة والتزاماً بالذوق العام والسماح بتوثيق الفعاليات." />
      <Flash ok={ok} error={error} />
      <Card title="المواقع">
        {venues.length === 0 ? <EmptyState title="لا مواقع بعد" /> : (
          <TableWrap>
            <thead><tr><th>الموقع</th><th>النوع</th><th>المدينة</th><th>السعة</th><th>الفعاليات</th><th>الحالة</th></tr></thead>
            <tbody>
              {venues.map((v) => (
                <tr key={v.id}>
                  <td className="font-semibold text-green-900">{v.name}<div className="text-xs font-normal text-ink-500">{v.address}</div></td>
                  <td>{VENUE_KINDS[v.kind as keyof typeof VENUE_KINDS]}</td>
                  <td>{v.city}</td>
                  <td className="tabular">{v.capacity}</td>
                  <td className="tabular">{v._count.events}</td>
                  <td><StatusPill map={VENUE_STATES} state={v.status} /></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
      <Card title="إضافة موقع" className="mt-6">
        <form action={createVenueAction} className="grid gap-4 md:grid-cols-3">
          <input type="hidden" name="partyId" value={party.id} />
          <Field label="اسم الموقع"><input name="name" required className="input" /></Field>
          <Field label="النوع"><select name="kind" className="input">{Object.entries(VENUE_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="المدينة"><select name="city" defaultValue={party.city} className="input">{SAUDI_CITIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <div className="md:col-span-2"><Field label="العنوان"><input name="address" required className="input" /></Field></div>
          <Field label="السعة القصوى"><input name="capacity" type="number" min={1} required className="input tabular" /></Field>
          <div><button className="btn-primary">إضافة الموقع</button></div>
        </form>
      </Card>
    </>
  );
}
