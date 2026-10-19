import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/participant";
import { makeOfferAction, respondOfferAction } from "@/app/actions/events";
import { formatDateTime } from "@/lib/dates";
import { EVENT_TYPES, OFFER_STATES, PARTICIPATION_STATES, SEAT_ROLES, type SeatRole } from "@/lib/domain";
import { NEGOTIATION } from "@/lib/rules";
import { expireNegotiations } from "@/lib/services";
import { Card, DeadlineBadge, EmptyState, Field, Flash, Money, PageTitle, Pill, StatusPill } from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "الدعوات والعروض" };

export default async function OffersPage({ searchParams }: { searchParams: SearchParams }) {
  const { ids } = await requireParticipant();
  const { ok, error } = await flashFrom(searchParams);
  await expireNegotiations();
  const seats = await db.participation.findMany({
    where: { partyId: { in: ids }, status: { in: ["INVITED", "NEGOTIATING", "AGREED", "REJECTED", "EXPIRED"] } },
    include: { event: { include: { organizer: true, venue: true } }, offers: { orderBy: { round: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageTitle title="الدعوات والعروض" subtitle={`كل التفاوض داخل المنصة فقط (المادة 26): ${NEGOTIATION.maxRounds} جولات حداً أقصى خلال ${NEGOTIATION.maxWorkingHours} ساعة عمل من أول عرض.`} />
      <Flash ok={ok} error={error} />
      {seats.length === 0 ? <EmptyState title="لا دعوات بعد" body="تصلك الدعوات حين يضيفك منظّم إلى فعالية. ترخيصك الساري وقائمة أسعارك يرفعان فرص دعوتك." /> : (
        <div className="space-y-4">
          {seats.map((s) => {
            const last = s.offers.at(-1);
            const myTurn = s.status === "INVITED" || (s.status === "NEGOTIATING" && last?.fromSide === "ORGANIZER");
            return (
              <Card key={s.id} title={s.event.name} action={<span className="flex flex-wrap gap-2"><StatusPill map={PARTICIPATION_STATES} state={s.status} />{s.status === "NEGOTIATING" ? <DeadlineBadge until={s.negotiationDeadline} /> : null}</span>}>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-600">
                  <span>{s.event.organizer.displayName}</span>
                  <span>{EVENT_TYPES[s.event.type as keyof typeof EVENT_TYPES]}</span>
                  <span>{formatDateTime(s.event.startsAt)}</span>
                  <span>{s.event.venue?.name ?? s.event.venueText} · {s.event.city}</span>
                  <span>الحضور المتوقع <span className="tabular">{s.event.expectedAttendance}</span></span>
                  <span>دورك: {SEAT_ROLES[s.role as SeatRole]?.label}</span>
                  {s.honorary ? <Pill tone="gold">مشاركة شرفية بلا مقابل</Pill> : null}
                </div>
                {s.offers.length ? (
                  <ol className="mt-4 space-y-2">
                    {s.offers.map((o) => (
                      <li key={o.id} className="surface-inset flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                        <span className="tabular text-xs text-ink-500">الجولة {o.round}</span>
                        <span className="font-semibold">{o.fromSide === "ORGANIZER" ? "عرض المنظّم" : "عرضك"}:</span>
                        <Money halala={o.amountHalala} className="font-bold" />
                        {o.terms ? <span className="text-xs text-ink-500">· {o.terms}</span> : null}
                        <StatusPill map={OFFER_STATES} state={o.status} />
                        {o.status === "PENDING" && o.fromSide === "ORGANIZER" ? (
                          <span className="ms-auto flex gap-1">
                            <form action={respondOfferAction}><input type="hidden" name="participationId" value={s.id} /><input type="hidden" name="offerId" value={o.id} /><input type="hidden" name="decision" value="accept" /><button className="btn-primary btn-sm">قبول</button></form>
                            <form action={respondOfferAction}><input type="hidden" name="participationId" value={s.id} /><input type="hidden" name="offerId" value={o.id} /><input type="hidden" name="decision" value="reject" /><button className="btn-ghost btn-sm">رفض</button></form>
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
                {myTurn && !s.honorary && s.offers.length < NEGOTIATION.maxRounds ? (
                  <form action={makeOfferAction} className="mt-4 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="participationId" value={s.id} />
                    <Field label={s.offers.length ? "عرضك المضاد (ريال)" : "عرضك (ريال)"}><input name="amount" type="number" min={1} step="0.01" required className="input tabular w-36" /></Field>
                    <Field label="الشروط"><input name="terms" className="input w-64" placeholder="مثل: مع حق الأرشفة" /></Field>
                    <button className="btn-primary btn-sm">إرسال</button>
                  </form>
                ) : null}
                {s.status === "AGREED" ? <p className="mt-3 text-sm text-success-700">تم الاتفاق. يُنشئ المنظّم العقد الرقمي، ويصلك للتوقيع.</p> : null}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
