import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { reviewLicenseAction, suspendLicenseAction } from "@/app/actions/admin";
import { formatDate } from "@/lib/dates";
import { LICENSE_STATES, PARTY_KINDS, type PartyKind } from "@/lib/domain";
import { Card, EmptyState, Flash, Money, PageTitle, PendingRule, StatusPill, TableWrap } from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "التراخيص" };

export default async function AdminLicenses({ searchParams }: { searchParams: SearchParams }) {
  const { ok, error, params } = await flashFrom(searchParams);
  const all = params.tab === "all";
  const licenses = await db.license.findMany({
    where: all ? {} : { status: "UNDER_REVIEW" },
    include: { type: true, party: { include: { user: true } } },
    orderBy: { createdAt: all ? "desc" : "asc" },
    take: 200,
  });
  return (
    <>
      <PageTitle title="التراخيص" subtitle="إدارة التراخيص: مراجعة الطلبات ومتابعة الالتزام بمتطلباتها، والتعليق والإلغاء (المادتان 54 و61)." />
      <Flash ok={ok} error={error} />
      <div className="mb-4 flex gap-2">
        <Link href="/admin/licenses" className={`btn-sm ${!all ? "btn-primary" : "btn-ghost"}`}>طابور المراجعة</Link>
        <Link href="/admin/licenses?tab=all" className={`btn-sm ${all ? "btn-primary" : "btn-ghost"}`}>كل التراخيص</Link>
      </div>
      <Card>
        {licenses.length === 0 ? <EmptyState title={all ? "لا تراخيص" : "لا طلبات بانتظار المراجعة"} /> : (
          <TableWrap>
            <thead><tr><th>الطالب</th><th>الترخيص</th><th>الرسم</th><th>الوثائق</th><th>الحالة</th><th>الإجراء</th></tr></thead>
            <tbody>
              {licenses.map((l) => (
                <tr key={l.id}>
                  <td className="font-semibold text-green-900">{l.party.displayName}<div className="text-xs font-normal text-ink-500">{PARTY_KINDS[l.party.kind as PartyKind]} · {l.party.city}</div><div className="text-xs font-normal text-ink-500" dir="ltr">{l.party.user.email}</div></td>
                  <td>{l.type.nameAr}<div className="tabular text-xs text-ink-500" dir="ltr">{l.number}</div><div className="text-xs text-ink-500">{formatDate(l.createdAt)}</div></td>
                  <td><Money halala={l.feeHalala} vat={l.vatHalala} /></td>
                  <td className="text-xs leading-6">
                    {l.party.commercialReg ? <div>سجل تجاري: <span dir="ltr">{l.party.commercialReg}</span></div> : null}
                    {l.type.requiresFreelance ? <div>عمل حر: <span dir="ltr">{l.party.freelanceNumber ?? "–"}</span> حتى {formatDate(l.party.freelanceExpiry)}</div> : null}
                    {!l.party.commercialReg && !l.type.requiresFreelance ? "هوية عبر التحقق المؤقت" : null}
                  </td>
                  <td><StatusPill map={LICENSE_STATES} state={l.status} /></td>
                  <td className="min-w-[14rem]">
                    {l.status === "UNDER_REVIEW" ? (
                      <form action={reviewLicenseAction} className="space-y-2">
                        <input type="hidden" name="licenseId" value={l.id} />
                        <input name="note" placeholder="ملاحظة (إلزامية عند الرفض)" className="input" />
                        <div className="flex gap-2">
                          <button name="decision" value="approve" className="btn-primary btn-sm">اعتماد</button>
                          <button name="decision" value="reject" className="btn-ghost btn-sm">رفض</button>
                        </div>
                      </form>
                    ) : ["ACTIVE", "SUSPENDED"].includes(l.status) ? (
                      <form action={suspendLicenseAction} className="flex gap-2">
                        <input type="hidden" name="licenseId" value={l.id} />
                        <button className={l.status === "SUSPENDED" ? "btn-ghost btn-sm" : "btn-danger btn-sm"}>{l.status === "SUSPENDED" ? "رفع التعليق" : "تعليق"}</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
      <div className="mt-4"><PendingRule question="هـ11">التحقق من السجل التجاري ووثيقة العمل الحر يدوي حتى يكتمل الربط مع وزارة التجارة ووزارة الموارد البشرية</PendingRule></div>
    </>
  );
}
