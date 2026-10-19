import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireParty } from "@/lib/auth";
import { createEventAction } from "@/app/actions/events";
import { EVENT_LEVELS, EVENT_TYPES, SAUDI_CITIES, VENUE_KINDS, type PartyKind } from "@/lib/domain";
import { Card, Field, Flash, PageTitle } from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "فعالية جديدة" };

export default async function NewEvent({ searchParams }: { searchParams: SearchParams }) {
  await requireParty(["ORGANIZER" as PartyKind]);
  const { error } = await flashFrom(searchParams);
  const venues = await db.venue.findMany({ where: { status: "LICENSED" }, orderBy: [{ city: "asc" }, { name: "asc" }] });

  return (
    <>
      <PageTitle title="فعالية جديدة" subtitle="البيانات الإلزامية في المادة 24. تُحفظ الفعالية مسودةً، ثم تُرسل إلى إدارة التشغيل للاعتماد المبدئي." />
      <Flash error={error} />
      <form action={createEventAction} className="space-y-6">
        <Card title="بيانات الفعالية">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="اسم الفعالية"><input name="name" required minLength={3} className="input" /></Field>
            <Field label="نوع الفعالية" hint="المادة 22">
              <select name="type" required className="input">{Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </Field>
            <Field label="تصنيف الفعالية" hint="مستواها التشغيلي. معاييره قيد الحسم (السؤال هـ20)">
              <select name="level" className="input">{Object.entries(EVENT_LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </Field>
            <Field label="التاريخ والوقت" hint="بتوقيت الرياض"><input name="startsAt" type="datetime-local" required className="input" /></Field>
            <Field label="المدة بالساعات"><input name="durationHours" type="number" min={1} max={24} defaultValue={3} required className="input tabular" /></Field>
            <Field label="عدد الحضور المتوقع"><input name="expectedAttendance" type="number" min={1} required className="input tabular" /></Field>
          </div>
        </Card>
        <Card title="المكان">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="المدينة"><select name="city" required className="input">{SAUDI_CITIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="موقع مرخّص" hint="المواقع المرخّصة في المنصة (المادة 21)">
              <select name="venueId" className="input">
                <option value="">موقع آخر (أدخله يدوياً)</option>
                {venues.map((v) => <option key={v.id} value={v.id}>{v.name} · {VENUE_KINDS[v.kind as keyof typeof VENUE_KINDS]} · {v.city} · سعة {v.capacity}</option>)}
              </select>
            </Field>
            <Field label="الموقع إن لم يكن مرخّصاً" hint="إقامة الفعالية في موقع غير مرخّص قيد الحسم (السؤال ب13)"><input name="venueText" className="input" /></Field>
          </div>
        </Card>
        <Card title="التصوير والجوائز والتواصل">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-wrap gap-6 pt-6 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="filming" /> يوجد تصوير</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="broadcast" /> يوجد بث أو نقل</label>
            </div>
            <Field label="الجوائز إن وجدت"><input name="prizes" className="input" /></Field>
            <Field label="بيانات التواصل الرسمية"><input name="contact" required className="input" /></Field>
          </div>
        </Card>
        <button className="btn-gold px-6 py-3">حفظ الفعالية مسودة</button>
      </form>
    </>
  );
}
