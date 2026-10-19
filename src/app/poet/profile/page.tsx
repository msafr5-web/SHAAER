import type { Metadata } from "next";
import { requireParticipant } from "@/lib/participant";
import { updateProfileAction } from "@/app/actions/party";
import { PARTY_KINDS, type PartyKind } from "@/lib/domain";
import { Card, Field, Flash, PageTitle, PendingRule } from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "ملفي وأسعاري" };

const FACTORS = [
  ["factorCity", "المدينة", "مثل: خارج الرياض +20%"],
  ["factorType", "نوع الفعالية", "مثل: الرسمية +25%"],
  ["factorSeason", "الموسم", "مثل: الصيف والأعياد +15%"],
  ["factorOccasion", "طبيعة المناسبة", "مثل: الأعراس +10%"],
  ["factorAudience", "حجم الحضور", "مثل: أكثر من 1000 +20%"],
  ["factorBroadcast", "طبيعة البث أو التغطية", "مثل: البث المباشر +10%"],
] as const;

export default async function ProfilePage({ searchParams }: { searchParams: SearchParams }) {
  const { parties } = await requireParticipant();
  const { ok, error } = await flashFrom(searchParams);
  return (
    <>
      <PageTitle title="ملفي وأسعاري" subtitle="قائمة الأسعار تقترح السعر الافتتاحي في التفاوض ولا تُلزم به (المادة 29)." />
      <Flash ok={ok} error={error} />
      <div className="space-y-6">
        {parties.map((p) => {
          const f = p.priceFactors ? (JSON.parse(p.priceFactors) as Record<string, string>) : {};
          return (
            <Card key={p.id} title={`${PARTY_KINDS[p.kind as PartyKind]} · ${p.displayName}`}>
              <form action={updateProfileAction} className="space-y-4">
                <input type="hidden" name="partyId" value={p.id} />
                <input type="hidden" name="returnTo" value="/poet/profile" />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="الاسم المعروض"><input name="displayName" defaultValue={p.displayName} className="input" /></Field>
                  <Field label="السعر الأساسي (ريال)"><input name="priceBase" type="number" min={0} step="0.01" defaultValue={p.priceBaseHalala ? p.priceBaseHalala / 100 : ""} className="input tabular" /></Field>
                </div>
                <Field label="نبذة مهنية"><textarea name="bio" rows={3} defaultValue={p.bio ?? ""} className="input" /></Field>
                <div>
                  <div className="label">معاملات التسعير (المادة 29)</div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {FACTORS.map(([k, label, ph]) => <Field key={k} label={label}><input name={k} defaultValue={f[k] ?? ""} placeholder={ph} className="input" /></Field>)}
                  </div>
                </div>
                <Field label="الآيبان" hint="باسمك نفسه. تغييره يوقف الصرف حتى تتحقق منه المنصة (المادتان 36 و62)">
                  <input name="iban" defaultValue={p.iban ?? ""} className="input tabular" dir="ltr" placeholder="SA0000000000000000000000" />
                </Field>
                {p.iban && !p.ibanVerified ? <PendingRule>الآيبان بانتظار التحقق</PendingRule> : null}
                <button className="btn-primary">حفظ</button>
              </form>
            </Card>
          );
        })}
      </div>
    </>
  );
}
