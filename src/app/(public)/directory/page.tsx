import type { Metadata } from "next";
import { db } from "@/lib/db";
import { BADGES, PARTY_KINDS } from "@/lib/domain";
import { EmptyState, PageTitle, StatusPill } from "@/components/ui";
import { IconPin } from "@/components/icons";
import type { SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "دليل المرخّصين" };
export const dynamic = "force-dynamic";

const LISTED = ["POET", "ROW_LEADER", "EVALUATOR", "MEDIA_CHANNEL", "PHOTOGRAPHY", "BROADCAST"];

export default async function DirectoryPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const kind = typeof sp.kind === "string" && LISTED.includes(sp.kind) ? sp.kind : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const now = new Date();
  // يُعرض من يحمل ترخيصاً سارياً عاماً فقط. الترتيب أبجدي معلن، لا يتأثر بالرعاية (الملحق ف س).
  const parties = await db.party.findMany({
    where: {
      kind: kind ?? { in: LISTED },
      ...(q ? { displayName: { contains: q } } : {}),
      licenses: { some: { status: "ACTIVE", scopeEventId: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } },
    },
    orderBy: { displayName: "asc" },
    take: 60,
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <PageTitle title="دليل الأطراف المرخّصين" subtitle="من يحمل ترخيصاً سارياً، مرتبين أبجدياً. بيانات التواصل تُتاح للمنظّم بعد التعاقد فقط." />
      <form className="surface mb-6 flex flex-wrap gap-3 p-4">
        <input name="q" defaultValue={q} placeholder="ابحث بالاسم" className="input max-w-xs" />
        <select name="kind" defaultValue={kind ?? ""} className="input max-w-xs">
          <option value="">كل الصفات</option>
          {LISTED.map((k) => <option key={k} value={k}>{PARTY_KINDS[k as keyof typeof PARTY_KINDS]}</option>)}
        </select>
        <button className="btn-primary">بحث</button>
      </form>
      {parties.length === 0 ? (
        <EmptyState title="لا نتائج" body="جرّب صفة أخرى أو اسماً مختلفاً." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {parties.map((p) => (
            <div key={p.id} className="surface p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-green-900">{p.displayName}</div>
                  <div className="mt-0.5 text-xs text-ink-500">{PARTY_KINDS[p.kind as keyof typeof PARTY_KINDS]}</div>
                </div>
                <StatusPill map={BADGES} state={p.badge} />
              </div>
              <div className="mt-3 flex items-center gap-1 text-sm text-ink-600"><IconPin size={15} />{p.city}</div>
              {p.bio ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink-600">{p.bio}</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
