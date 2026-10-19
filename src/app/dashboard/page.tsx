import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { addRoleAction } from "@/app/actions/party";
import { ENTITY_TYPES, PARTY_KINDS, SAUDI_CITIES, type PartyKind } from "@/lib/domain";
import { Card, Field, Flash, PageTitle } from "@/components/ui";
import { Logo } from "@/components/brand";
import { IconBuilding, IconCalendar, IconMic, IconShield } from "@/components/icons";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "لوحاتي" };

const AREA: Record<string, { href: string; label: string; icon: React.ReactNode }> = {
  ORGANIZER: { href: "/organizer", label: "لوحة الجهة المنظمة", icon: <IconCalendar /> },
  VENUE_HOST: { href: "/host", label: "لوحة موقع الفعاليات", icon: <IconBuilding /> },
};
const PARTICIPANT = ["POET", "ROW_LEADER", "ROW_MEMBER", "EVALUATOR", "COMMITTEE", "CRITIC", "MEDIA_CHANNEL", "PHOTOGRAPHY", "BROADCAST"];

export default async function DashboardRouter({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const { ok, error } = await flashFrom(searchParams);
  const cards: { href: string; label: string; sub: string; icon: React.ReactNode }[] = [];
  if (user.isAdmin) cards.push({ href: "/admin", label: "لوحة إدارة المنصة", sub: "التراخيص والفعاليات والامتثال والمالية", icon: <IconShield /> });
  for (const p of user.parties) {
    const a = AREA[p.kind] ?? (PARTICIPANT.includes(p.kind) ? { href: "/poet", label: "لوحة الشاعر والمشارك", icon: <IconMic /> } : null);
    if (a && !cards.some((c) => c.href === a.href)) cards.push({ ...a, sub: `${PARTY_KINDS[p.kind as PartyKind]} · ${p.displayName}` });
  }

  return (
    <div className="min-h-screen">
      <header className="surface-bar"><div className="mx-auto max-w-5xl px-6 py-3"><Logo /></div></header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <PageTitle title={`مرحباً ${user.name}`} subtitle="اختر اللوحة التي تريد العمل منها." />
        <Flash ok={ok} error={error === "no-role" ? "لا تحمل الصفة المطلوبة لهذه اللوحة" : error} />
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((c) => (
            <Link key={c.href} href={c.href} className="surface flex items-center gap-4 p-5 transition hover:border-green-300">
              <div className="rounded-lg bg-green-50 p-3 text-green-700">{c.icon}</div>
              <div><div className="font-bold text-green-900">{c.label}</div><div className="mt-0.5 text-sm text-ink-500">{c.sub}</div></div>
            </Link>
          ))}
        </div>

        <Card title="إضافة صفة لحسابك" className="mt-8">
          <form action={addRoleAction} className="grid gap-4 md:grid-cols-5">
            <Field label="الصفة">
              <select name="kind" className="input">
                {Object.entries(PARTY_KINDS).filter(([k]) => k !== "ROW_MEMBER" && !user.parties.some((p) => p.kind === k)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="المدينة">
              <select name="city" className="input">{SAUDI_CITIES.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="طبيعة الحساب">
              <select name="entityType" className="input">{Object.entries(ENTITY_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </Field>
            <Field label="الاسم المعروض"><input name="displayName" className="input" /></Field>
            <div className="flex items-end"><button className="btn-ghost w-full">إضافة</button></div>
          </form>
        </Card>
      </main>
    </div>
  );
}
