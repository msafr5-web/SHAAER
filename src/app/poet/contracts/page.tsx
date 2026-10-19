import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/participant";
import { partyWithdrawAction } from "@/app/actions/events";
import { formatDateTime } from "@/lib/dates";
import { CONTRACT_STATES } from "@/lib/domain";
import { isLateApology } from "@/lib/rules";
import { Card, EmptyState, Field, Flash, Money, PageTitle, PendingRule, Pill, StatusPill } from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "عقودي" };

export default async function ContractsPage({ searchParams }: { searchParams: SearchParams }) {
  const { ids } = await requireParticipant();
  const { ok, error } = await flashFrom(searchParams);
  const contracts = await db.contract.findMany({
    where: { participation: { partyId: { in: ids } } },
    include: { participation: { include: { event: { include: { organizer: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  const now = new Date();

  return (
    <>
      <PageTitle title="عقودي" subtitle="عقد رقمي لكل مشاركة، يوقّعه الطرفان برمز تحقق مع توثيق زمني (المادتان 30 و31)." />
      <Flash ok={ok} error={error} />
      {contracts.length === 0 ? <EmptyState title="لا عقود بعد" /> : (
        <div className="space-y-4">
          {contracts.map((c) => {
            const e = c.participation.event;
            const late = isLateApology(e.startsAt, now);
            const canWithdraw = c.status === "ACTIVE" && e.startsAt > now;
            return (
              <Card key={c.id} title={<Link href={`/contracts/${c.id}`} className="link">{e.name}</Link>} action={<span className="flex gap-2"><StatusPill map={CONTRACT_STATES} state={c.status} />{c.status === "AWAITING_SIGNATURES" && !c.partySignedAt ? <Pill tone="warning">بانتظار توقيعك</Pill> : null}</span>}>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-600">
                  <span className="tabular" dir="ltr">{c.number}</span>
                  <span>{e.organizer.displayName}</span>
                  <span>{formatDateTime(e.startsAt)}</span>
                  <Money halala={c.participation.agreedHalala} className="font-bold text-green-900" />
                </div>
                {canWithdraw ? (
                  <details className="mt-4 border-t border-line pt-3">
                    <summary className="cursor-pointer text-sm font-semibold text-danger-700">الاعتذار عن المشاركة</summary>
                    <div className="mt-3 space-y-3">
                      {late ? (
                        <PendingRule question="هـ1">اعتذار خلال أقل من 48 ساعة: غرامة 20% من قيمة العقد مع توفير بديل مناسب، أو 35% مع الإرباك أو تعذّر البديل (المادة 44)</PendingRule>
                      ) : (
                        <PendingRule question="هـ3">إلغاء قبل الفعالية: تُسجَّل حالة إلغاء، وقيمة غرامتها غير محددة في اللائحة (المادة 33)</PendingRule>
                      )}
                      <form action={partyWithdrawAction} className="space-y-3">
                        <input type="hidden" name="participationId" value={c.participationId} />
                        <Field label="السبب"><textarea name="reason" required rows={2} className="input" /></Field>
                        {late ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="substitute" /> وفّرت بديلاً مناسباً</label> : null}
                        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="forceMajeure" className="mt-0.5" /> ظرف قاهر أو حالة صحية طارئة مثبتة (يُطلب الإثبات في التظلم)</label>
                        <button className="btn-danger btn-sm">تأكيد الاعتذار</button>
                      </form>
                    </div>
                  </details>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
