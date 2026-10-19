import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireParty } from "@/lib/auth";
import {
  addNonContinuousPoetAction, addSeatAction, approveExecutionAction, cancelEventAction, completeEventAction, generateContractsAction,
  makeOfferAction, markAbsenceAction, organizerMarkAction, payEventAction, respondOfferAction, startExecutionAction, submitEventAction, toPaymentAction,
} from "@/app/actions/events";
import { evaluateAction } from "@/app/actions/compliance";
import { formatDate, formatDateTime } from "@/lib/dates";
import {
  ATTENDANCE_STATES, CASE_KINDS, CASE_STATES, CONTRACT_STATES, EVENT_LEVELS, EVENT_STATES, EVENT_STATE_STEP, EVENT_TYPES, JOURNEY_STEPS,
  MEDIA_RIGHTS, OFFER_STATES, PARTICIPATION_STATES, PARTY_KINDS, SEAT_ROLES, type EventState, type SeatRole,
} from "@/lib/domain";
import { EVALUATION_FORMS, NEGOTIATION, organizerCancellationDeduction, classifyCancellation } from "@/lib/rules";
import { expireNegotiations, heldFor } from "@/lib/services";
import {
  Card, DataList, DeadlineBadge, EmptyState, Field, Flash, JourneyBar, Money, PageTitle, PendingRule, Pill, StatusPill, TableWrap,
} from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "الفعالية" };

export default async function EventWorkspace({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const { party, user } = await requireParty(["ORGANIZER"]);
  const { id } = await params;
  const { ok, error } = await flashFrom(searchParams);
  await expireNegotiations({ eventId: id });
  const event = await db.event.findUnique({
    where: { id },
    include: {
      venue: true,
      participations: { orderBy: { createdAt: "asc" }, include: { party: true, offers: { orderBy: { round: "asc" } }, contract: true, attendance: true } },
      cases: { include: { party: true }, orderBy: { createdAt: "desc" } },
      evaluations: true,
    },
  });
  if (!event || event.organizerId !== party.id) notFound();
  const state = event.status as EventState;
  const live = event.participations.filter((p) => !["REJECTED", "EXPIRED", "CANCELLED"].includes(p.status));
  const agreedNoContract = live.filter((p) => p.status === "AGREED" && !p.contract);
  const allContracted = live.length > 0 && live.every((p) => p.status === "CONTRACTED");
  const editable = ["DRAFT", "UNDER_REVIEW", "PRELIM_APPROVED", "NEGOTIATING"].includes(state);

  const now = new Date();
  const candidates = editable
    ? await db.party.findMany({
        where: {
          kind: { in: [...new Set(Object.values(SEAT_ROLES).flatMap((r) => r.partyKinds as readonly string[]))] },
          id: { notIn: live.map((p) => p.partyId).filter(Boolean) as string[] },
          licenses: { some: { status: "ACTIVE", scopeEventId: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } },
        },
        orderBy: { displayName: "asc" },
      })
    : [];

  let heldTotal = 0;
  for (const p of live) if (p.contract) heldTotal += await heldFor(p.contract.id);
  const cancelPreview = organizerCancellationDeduction(classifyCancellation(event.startsAt, now, false), heldTotal);

  return (
    <>
      <PageTitle
        title={event.name}
        subtitle={<span className="tabular" dir="ltr">{event.number}</span>}
        actions={<StatusPill map={EVENT_STATES} state={state} />}
      />
      <Flash ok={ok} error={error} />
      <div className="surface mb-6 p-4"><JourneyBar steps={JOURNEY_STEPS} current={EVENT_STATE_STEP[state]} /></div>
      {event.reviewNote ? <div className="mb-6"><PendingRule>ملاحظة إدارة التشغيل: {event.reviewNote}</PendingRule></div> : null}

      {/* الإجراء التالي حسب الحالة */}
      <NextStep state={state} eventId={event.id} allContracted={allContracted} agreedNoContract={agreedNoContract.length} heldTotal={heldTotal} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card title="المشاركون" action={<span className="text-xs text-ink-500">التفاوض: {NEGOTIATION.maxRounds} جولات حداً أقصى خلال {NEGOTIATION.maxWorkingHours} ساعة عمل</span>}>
            {event.participations.length === 0 ? <EmptyState title="لم يُضف مشاركون بعد" body="أضف الشعراء والصف والمقيّمين وجهات الإعلام من النموذج أدناه." /> : (
              <div className="space-y-4">
                {event.participations.map((p) => {
                  const last = p.offers.at(-1);
                  const canCounter = p.status === "INVITED" || (p.status === "NEGOTIATING" && last?.fromSide === "PARTY");
                  const evaluated = event.evaluations.some((e) => e.subjectPartyId === p.partyId);
                  const formKind = p.role === "ROW" ? "ROW" : p.role === "POET" ? "POET" : null;
                  return (
                    <div key={p.id} className="surface-inset p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-green-900">{p.party?.displayName ?? "–"}</div>
                          <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-ink-500">
                            <span>{SEAT_ROLES[p.role as SeatRole]?.label}</span>
                            {p.honorary ? <Pill tone="gold">مشاركة شرفية</Pill> : null}
                            {p.nonContinuous ? <Pill tone="info">شاعر غير مستمر</Pill> : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill map={PARTICIPATION_STATES} state={p.status} />
                          {p.status === "NEGOTIATING" ? <DeadlineBadge until={p.negotiationDeadline} /> : null}
                          {p.agreedHalala !== null ? <Money halala={p.agreedHalala} className="text-sm font-bold text-green-900" /> : null}
                        </div>
                      </div>

                      {p.offers.length ? (
                        <ol className="mt-3 space-y-1.5 text-sm">
                          {p.offers.map((o) => (
                            <li key={o.id} className="flex flex-wrap items-center gap-2">
                              <span className="tabular text-xs text-ink-500">الجولة {o.round}</span>
                              <span className="font-semibold">{o.fromSide === "ORGANIZER" ? "عرضك" : "عرض الطرف"}:</span>
                              <Money halala={o.amountHalala} />
                              {o.terms ? <span className="text-xs text-ink-500">· {o.terms}</span> : null}
                              <StatusPill map={OFFER_STATES} state={o.status} />
                              {o.status === "PENDING" && o.fromSide === "PARTY" ? (
                                <span className="flex gap-1">
                                  <form action={respondOfferAction}><input type="hidden" name="participationId" value={p.id} /><input type="hidden" name="offerId" value={o.id} /><input type="hidden" name="decision" value="accept" /><button className="btn-primary btn-sm">قبول</button></form>
                                  <form action={respondOfferAction}><input type="hidden" name="participationId" value={p.id} /><input type="hidden" name="offerId" value={o.id} /><input type="hidden" name="decision" value="reject" /><button className="btn-ghost btn-sm">رفض</button></form>
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ol>
                      ) : null}

                      {canCounter && p.offers.length < NEGOTIATION.maxRounds && !p.honorary ? (
                        <form action={makeOfferAction} className="mt-3 flex flex-wrap items-end gap-2">
                          <input type="hidden" name="participationId" value={p.id} />
                          <Field label={p.offers.length ? "عرض مضاد (ريال)" : "العرض (ريال)"}>
                            <input name="amount" type="number" min={1} step="0.01" required className="input tabular w-36" defaultValue={p.party?.priceBaseHalala ? p.party.priceBaseHalala / 100 : undefined} />
                          </Field>
                          <Field label="الشروط"><input name="terms" className="input w-56" placeholder="مثل: ثلاث ساعات مع البث" /></Field>
                          <button className="btn-primary btn-sm">إرسال</button>
                        </form>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                        {p.contract ? (
                          <>
                            <Link href={`/contracts/${p.contract.id}`} className="link">العقد {p.contract.number}</Link>
                            <StatusPill map={CONTRACT_STATES} state={p.contract.status} />
                            {p.contract.status === "AWAITING_SIGNATURES" && !p.contract.organizerSignedAt ? <Pill tone="warning">بانتظار توقيعك</Pill> : null}
                          </>
                        ) : null}
                        {p.attendance ? <StatusPill map={ATTENDANCE_STATES} state={p.attendance.status} /> : null}
                      </div>

                      {p.attendance && p.status === "CONTRACTED" && ["CONFIRMED", "IN_EXECUTION"].includes(state) ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <form action={organizerMarkAction}><input type="hidden" name="participationId" value={p.id} /><input type="hidden" name="present" value="yes" /><button className="btn-ghost btn-sm">تأكيد الحضور</button></form>
                          <form action={organizerMarkAction}><input type="hidden" name="participationId" value={p.id} /><input type="hidden" name="present" value="no" /><button className="btn-ghost btn-sm">لم يحضر</button></form>
                          {["CONFIRMED", "RESOLVED"].includes(p.attendance.status) && p.attendance.organizerSaysPresent ? (
                            <form action={approveExecutionAction}><input type="hidden" name="participationId" value={p.id} /><button className="btn-primary btn-sm">اعتماد التنفيذ وصرف المستحقات</button></form>
                          ) : null}
                          <form action={markAbsenceAction}><input type="hidden" name="participationId" value={p.id} /><button className="btn-danger btn-sm">تسجيل غياب (المادة 43)</button></form>
                        </div>
                      ) : null}

                      {state === "COMPLETED" && p.status === "EXECUTED" && formKind && !evaluated && p.partyId ? (
                        <form action={evaluateAction} className="mt-3 grid gap-2 sm:grid-cols-5">
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="subjectPartyId" value={p.partyId} />
                          <input type="hidden" name="form" value={formKind} />
                          <input type="hidden" name="returnTo" value={`/organizer/events/${event.id}`} />
                          {EVALUATION_FORMS[formKind].map((c) => (
                            <Field key={c.key} label={`${c.label} (${c.max})`}><input name={c.key} type="number" min={0} max={c.max} required className="input tabular" /></Field>
                          ))}
                          <div className="sm:col-span-5"><button className="btn-primary btn-sm">حفظ التقييم (الملحق أ)</button></div>
                        </form>
                      ) : evaluated ? <div className="mt-2 text-xs text-success-700">قُيّم</div> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {editable ? (
            <Card title="إضافة مشارك">
              <form action={addSeatAction} className="grid gap-3 md:grid-cols-4">
                <input type="hidden" name="eventId" value={event.id} />
                <Field label="الدور">
                  <select name="role" className="input">{Object.entries(SEAT_ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
                </Field>
                <div className="md:col-span-2">
                  <Field label="الطرف المرخّص" hint="يظهر من يحمل ترخيصاً سارياً فقط (المادة 9)">
                    <select name="partyId" className="input" required>
                      {candidates.map((c) => <option key={c.id} value={c.id}>{c.displayName} · {PARTY_KINDS[c.kind as keyof typeof PARTY_KINDS]} · {c.city}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="flex flex-col justify-end gap-2">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="honorary" /> مشاركة شرفية</label>
                  <button className="btn-primary btn-sm">إضافة</button>
                </div>
              </form>
              <details className="mt-5 border-t border-line pt-4">
                <summary className="cursor-pointer text-sm font-semibold text-green-800">إضافة شاعر غير مستمر (المادة 10)</summary>
                <p className="mt-2 text-xs text-ink-500">لشاعر يشارك في مناسبة محدودة أو موسمية. تدفع أنت ترخيصه المؤقت (300 ريال + الضريبة) لهذه الفعالية، وله القبول أو الرفض أو التفاوض.</p>
                <form action={addNonContinuousPoetAction} className="mt-3 grid gap-3 md:grid-cols-3">
                  <input type="hidden" name="eventId" value={event.id} />
                  <Field label="اسم الشاعر"><input name="name" required className="input" /></Field>
                  <Field label="بريده الإلكتروني"><input name="email" type="email" required className="input" dir="ltr" /></Field>
                  <div className="flex items-end"><button className="btn-ghost btn-sm w-full">إضافة ودفع الترخيص</button></div>
                </form>
              </details>
            </Card>
          ) : null}

          {agreedNoContract.length ? (
            <Card title="إنشاء العقود الرقمية (المادة 30)">
              <form action={generateContractsAction} className="space-y-3">
                <input type="hidden" name="eventId" value={event.id} />
                <p className="text-sm text-ink-600">لـ {agreedNoContract.length} مشاركة متفق عليها. حدد الحقوق الإعلامية المضمّنة في العقود (المادة 49):</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  {Object.entries(MEDIA_RIGHTS).map(([k, v]) => (
                    <label key={k} className="flex items-center gap-2"><input type="checkbox" name={`right_${k}`} defaultChecked={(k === "FILMING" && event.filming) || (k === "BROADCAST" && event.broadcast) || k === "ARCHIVE"} /> {v}</label>
                  ))}
                </div>
                <button className="btn-primary">إنشاء العقود وإرسالها للتوقيع</button>
              </form>
            </Card>
          ) : null}

          {event.cases.length ? (
            <Card title="الحالات التشغيلية">
              <TableWrap>
                <thead><tr><th>الحالة</th><th>الطرف</th><th>الغرامة</th><th>المادة</th><th>المهلة</th></tr></thead>
                <tbody>
                  {event.cases.map((c) => (
                    <tr key={c.id}>
                      <td>{CASE_KINDS[c.kind as keyof typeof CASE_KINDS]}<div className="mt-1"><StatusPill map={CASE_STATES} state={c.status} /></div></td>
                      <td>{c.party.displayName}</td>
                      <td><Money halala={c.fineHalala} />{c.pendingRule ? <div className="mt-1"><Pill tone="warning">قاعدة قيد الحسم</Pill></div> : null}</td>
                      <td>{c.article}</td>
                      <td className="text-xs">{formatDate(c.objectionDeadline)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-6">
          <Card title="بيانات الفعالية">
            <DataList items={[
              ["النوع", EVENT_TYPES[event.type as keyof typeof EVENT_TYPES]],
              ["التصنيف", EVENT_LEVELS[event.level as keyof typeof EVENT_LEVELS]],
              ["التاريخ", formatDateTime(event.startsAt)],
              ["المدة", `${event.durationHours} ساعات`],
              ["المدينة", event.city],
              ["الموقع", <span key="v">{event.venue?.name ?? event.venueText}{event.venue ? (event.venueConfirmedAt ? " · أكّد الحجز" : " · بانتظار تأكيد الموقع") : ""}</span>],
              ["الحضور المتوقع", <span key="a" className="tabular">{event.expectedAttendance}</span>],
              ["التصوير والبث", [event.filming && "تصوير", event.broadcast && "بث"].filter(Boolean).join("، ") || "لا"],
              ["الجوائز", event.prizes ?? "–"],
              ["التواصل", event.contact],
            ]} />
          </Card>
          {!["COMPLETED", "FINANCIALLY_CLOSED", "CANCELLED"].includes(state) ? (
            <Card title="إلغاء الفعالية">
              <p className="mb-3 text-xs leading-6 text-ink-600">
                إلغاء الآن: {cancelPreview.explanation}. المحجوز حالياً <Money halala={heldTotal} />، والاقتطاع المتوقع <Money halala={cancelPreview.fineHalala} /> (المادة 33).
              </p>
              <form action={cancelEventAction} className="space-y-3">
                <input type="hidden" name="eventId" value={event.id} />
                <Field label="سبب الإلغاء"><textarea name="reason" required minLength={5} rows={2} className="input" /></Field>
                <label className="flex items-start gap-2 text-xs"><input type="checkbox" name="forceMajeure" className="mt-0.5" /> قوة قاهرة: قرار رسمي أو ظرف أمني أو كارثة أو حالة طارئة (المادة 46)</label>
                <button className="btn-danger btn-sm w-full">إلغاء الفعالية</button>
              </form>
            </Card>
          ) : null}
          <div className="text-xs text-ink-500">منظّم الفعالية: {user.name}</div>
        </aside>
      </div>
    </>
  );
}

function NextStep({ state, eventId, allContracted, agreedNoContract, heldTotal }: { state: EventState; eventId: string; allContracted: boolean; agreedNoContract: number; heldTotal: number }) {
  const form = (action: (f: FormData) => Promise<void>, label: string, gold = true) => (
    <form action={action}><input type="hidden" name="eventId" value={eventId} /><button className={gold ? "btn-gold" : "btn-primary"}>{label}</button></form>
  );
  let body: React.ReactNode = null;
  switch (state) {
    case "DRAFT": body = <><span>أضف المشاركين ثم أرسل الفعالية لإدارة التشغيل.</span>{form(submitEventAction, "إرسال للمراجعة")}</>; break;
    case "UNDER_REVIEW": body = <span>الفعالية لدى إدارة التشغيل للاعتماد المبدئي. يمكنك متابعة إضافة المشاركين.</span>; break;
    case "PRELIM_APPROVED": body = <span>اعتُمدت مبدئياً. أضف المشاركين لتبدأ التفاوض.</span>; break;
    case "NEGOTIATING":
      body = allContracted
        ? <><span>كل المشاركات متعاقد عليها.</span>{form(toPaymentAction, "الانتقال إلى الدفع")}</>
        : <span>{agreedNoContract ? `${agreedNoContract} مشاركة متفق عليها بانتظار إنشاء العقد.` : "تابع التفاوض حتى الاتفاق، ثم أنشئ العقود ووقّعها."}</span>;
      break;
    case "AWAITING_PAYMENT": body = <><span>ادفع ترخيص الفعالية (500 ريال + الضريبة) واحجز مبالغ العقود في الضمان.</span>{form(payEventAction, "الدفع والحجز")}</>; break;
    case "CONFIRMED": body = <><span>الفعالية مؤكدة. المحجوز <Money halala={heldTotal} />. في يومها ابدأ التنفيذ وسجّل الحضور.</span>{form(startExecutionAction, "بدء التنفيذ")}</>; break;
    case "IN_EXECUTION": body = <><span>امسح رمز QR لكل مشارك من جواله، أو أكّد حضوره من البطاقة، ثم اعتمد التنفيذ.</span>{form(completeEventAction, "إكمال الفعالية", false)}</>; break;
    case "COMPLETED": body = <span>اكتملت الفعالية. قيّم المشاركين. الإغلاق المالي تجريه الإدارة بعد انقضاء مهل الاعتراض.</span>; break;
    case "FINANCIALLY_CLOSED": body = <span>أُغلقت الفعالية مالياً وتشغيلياً.</span>; break;
    case "CANCELLED": body = <span>الفعالية ملغاة.</span>; break;
  }
  return <div className="surface flex flex-wrap items-center justify-between gap-3 border-gold-200 bg-gold-50/60 p-4 text-sm text-ink-700">{body}</div>;
}
