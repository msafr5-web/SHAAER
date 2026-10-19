import type { Metadata } from "next";
import { db } from "@/lib/db";
import { verifyPartyAction } from "@/app/actions/admin";
import { BADGES, PARTY_KINDS, type PartyKind } from "@/lib/domain";
import { Card, Flash, PageTitle, Pill, StatusPill, TableWrap } from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "الأطراف" };

export default async function AdminParties({ searchParams }: { searchParams: SearchParams }) {
  const { ok, error, params } = await flashFrom(searchParams);
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const parties = await db.party.findMany({
    where: q ? { OR: [{ displayName: { contains: q } }, { user: { email: { contains: q } } }] } : {},
    include: { user: true, _count: { select: { licenses: true, cases: true } } },
    orderBy: { createdAt: "desc" },
    take: 150,
  });
  return (
    <>
      <PageTitle title="الأطراف والتحقق" subtitle="توصيفات الحساب (المادة 64) والتحقق البنكي (المادة 62). لا تُجمع أي بيانات قبلية أو مناطقية تمييزية (الملحق ق ط ط)." />
      <Flash ok={ok} error={error} />
      <form className="surface mb-4 flex gap-3 p-4"><input name="q" defaultValue={q} placeholder="ابحث بالاسم أو البريد" className="input max-w-sm" /><button className="btn-primary">بحث</button></form>
      <Card>
        <TableWrap>
          <thead><tr><th>الطرف</th><th>الصفة</th><th>التوصيف</th><th>الحساب البنكي</th><th>تراخيص · حالات</th><th>تحديث</th></tr></thead>
          <tbody>
            {parties.map((p) => (
              <tr key={p.id}>
                <td className="font-semibold text-green-900">{p.displayName}<div className="text-xs font-normal text-ink-500" dir="ltr">{p.user.email}</div></td>
                <td>{PARTY_KINDS[p.kind as PartyKind]}<div className="text-xs text-ink-500">{p.city}</div></td>
                <td><StatusPill map={BADGES} state={p.badge} /></td>
                <td className="text-xs">{p.iban ? <><span dir="ltr" className="tabular">{p.iban.slice(0, 4)}••••{p.iban.slice(-4)}</span><div>{p.ibanVerified ? <Pill tone="success">معتمد</Pill> : <Pill tone="warning">بانتظار التحقق</Pill>}</div></> : "–"}</td>
                <td className="tabular">{p._count.licenses} · {p._count.cases}</td>
                <td>
                  <form action={verifyPartyAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="partyId" value={p.id} />
                    <select name="badge" defaultValue={p.badge ?? "NONE"} className="input w-40 py-1 text-xs">
                      <option value="NONE">بلا توصيف</option>
                      {Object.entries(BADGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    {p.iban && !p.ibanVerified ? <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="verifyIban" /> اعتماد الآيبان</label> : null}
                    <button className="btn-ghost btn-sm">حفظ</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
