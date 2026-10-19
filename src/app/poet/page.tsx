import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/participant";
import { formatDate } from "@/lib/dates";
import { BADGES, LICENSE_STATES, PARTICIPATION_STATES, PARTY_KINDS, type PartyKind } from "@/lib/domain";
import { Card, EmptyState, Flash, KpiCard, LinkButton, Money, PageTitle, PendingRule, StatusPill, TableWrap } from "@/components/ui";
import { IconCalendar, IconFile, IconStar, IconWallet } from "@/components/icons";
import { flashFrom, type SearchParams } from "@/lib/forms";
import { expireNegotiations, finalizeCases } from "@/lib/services";

export const metadata: Metadata = { title: "لوحة الشاعر" };

export default async function ParticipantHome({ searchParams }: { searchParams: SearchParams }) {
  const { party, ids } = await requireParticipant();
  const { ok, error } = await flashFrom(searchParams);
  await expireNegotiations();
  await finalizeCases();
  const now = new Date();
  const [license, pending, upcoming, evals, paid, executed, cancelled] = await Promise.all([
    db.license.findFirst({ where: { partyId: { in: ids }, scopeEventId: null }, orderBy: { createdAt: "desc" }, include: { type: true } }),
    db.participation.count({ where: { partyId: { in: ids }, OR: [{ status: "INVITED" }, { status: "NEGOTIATING", offers: { some: { status: "PENDING", fromSide: "ORGANIZER" } } }] } }),
    db.participation.findMany({ where: { partyId: { in: ids }, status: { in: ["CONTRACTED", "AGREED"] }, event: { startsAt: { gt: now } } }, include: { event: true, contract: true }, orderBy: { event: { startsAt: "asc" } }, take: 6 }),
    db.evaluation.findMany({ where: { subjectPartyId: { in: ids } } }),
    db.ledgerEntry.findMany({ where: { partyId: { in: ids }, kind: "PAYOUT" } }),
    db.participation.count({ where: { partyId: { in: ids }, status: "EXECUTED" } }),
    db.operationalCase.count({ where: { partyId: { in: ids }, kind: { in: ["ABSENCE", "LATE_APOLOGY", "EARLY_CANCEL", "LATE_CANCEL"] } } }),
  ]);
  const avg = evals.length ? Math.round(evals.reduce((s, e) => s + e.total, 0) / evals.length) : null;
  const totalPaid = paid.reduce((s, r) => s + r.amountHalala, 0);
  // مؤشرات المادة 48: نسبة الحضور ومعدل الإلغاء ومتوسط الأداء، محسوبة لا مكتوبة
  const committed = executed + cancelled;
  const attendanceRate = committed ? Math.round((executed / committed) * 100) : null;

  return (
    <>
      <PageTitle title={party.displayName} subtitle={<span className="flex flex-wrap items-center gap-2">{PARTY_KINDS[party.kind as PartyKind]} · {party.city} <StatusPill map={BADGES} state={party.badge} /></span>} />
      <Flash ok={ok} error={error} />
      {!license || license.status !== "ACTIVE" ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold-200 bg-gold-50 p-4">
          <div className="text-sm text-ink-700">
            <div className="font-bold text-green-900">{license ? `ترخيصك ${LICENSE_STATES[license.status as keyof typeof LICENSE_STATES]?.label}` : "لا ترخيص بعد"}</div>
            الترخيص الساري شرط لاستقبال العروض والتعاقد (المادة 9).
          </div>
          <LinkButton href="/poet/licenses" variant="gold">{license?.status === "AWAITING_PAYMENT" ? "ادفع وأصدر ترخيصك" : "اطلب ترخيصك"}</LinkButton>
        </div>
      ) : null}
      {party.iban && !party.ibanVerified ? <div className="mb-6"><PendingRule>حسابك البنكي بانتظار التحقق. لا يُصرف أي مستحق قبل اعتماده (المادة 36)</PendingRule></div> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="دعوات وعروض بانتظارك" value={pending} icon={<IconFile />} />
        <KpiCard label="مشاركات قادمة" value={upcoming.length} icon={<IconCalendar />} />
        <KpiCard label="متوسط التقييم" value={avg !== null ? `${avg} / 100` : "–"} hint={`${evals.length} تقييم`} icon={<IconStar />} />
        <KpiCard label="المستحقات المصروفة" value={<Money halala={totalPaid} />} icon={<IconWallet />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card title="مشاركاتي القادمة" action={<Link href="/poet/contracts" className="link text-sm">عقودي</Link>}>
          {upcoming.length === 0 ? <EmptyState title="لا مشاركات قادمة" body="الدعوات تصلك من المنظّمين، وتظهر في «الدعوات والعروض»." /> : (
            <TableWrap>
              <thead><tr><th>الفعالية</th><th>التاريخ</th><th>المبلغ</th><th>الحالة</th></tr></thead>
              <tbody>
                {upcoming.map((p) => (
                  <tr key={p.id}>
                    <td>{p.contract ? <Link href={`/contracts/${p.contract.id}`} className="link">{p.event.name}</Link> : p.event.name}<div className="text-xs text-ink-500">{p.event.city}</div></td>
                    <td className="whitespace-nowrap text-xs">{formatDate(p.event.startsAt)}</td>
                    <td><Money halala={p.agreedHalala} /></td>
                    <td><StatusPill map={PARTICIPATION_STATES} state={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
        <Card title="مؤشراتي (المادة 48)">
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between"><span className="text-ink-600">نسبة الحضور</span><span className="tabular font-bold text-green-900">{attendanceRate !== null ? `${attendanceRate}%` : "–"}</span></li>
            <li className="flex justify-between"><span className="text-ink-600">مشاركات منفّذة</span><span className="tabular font-bold text-green-900">{executed}</span></li>
            <li className="flex justify-between"><span className="text-ink-600">غياب أو اعتذار أو إلغاء</span><span className="tabular font-bold text-green-900">{cancelled}</span></li>
            <li className="flex justify-between"><span className="text-ink-600">متوسط الأداء</span><span className="tabular font-bold text-green-900">{avg ?? "–"}</span></li>
          </ul>
          <p className="mt-4 text-xs text-ink-500">تُحسب من بيانات المنصة ولا تُكتب يدوياً.</p>
        </Card>
      </div>
    </>
  );
}
