import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { requestSignCodeAction, signContractAction } from "@/app/actions/events";
import { formatDateTime } from "@/lib/dates";
import { CONTRACT_STATES, MEDIA_RIGHTS } from "@/lib/domain";
import { Card, DataList, Field, Flash, Money, PageTitle, StatusPill } from "@/components/ui";
import { Logo } from "@/components/brand";
import type { SearchParams } from "@/lib/forms";
import { absoluteUrl } from "@/lib/url";

export const metadata: Metadata = { title: "العقد الرقمي" };

export default async function ContractPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const contract = await db.contract.findUnique({
    where: { id },
    include: { participation: { include: { party: true, event: { include: { organizer: true } } } } },
  });
  if (!contract) notFound();
  const isOrganizer = contract.participation.event.organizer.userId === user.id;
  const isParty = contract.participation.party?.userId === user.id;
  if (!isOrganizer && !isParty && !user.isAdmin) notFound();
  const mySigned = isOrganizer ? contract.organizerSignedAt : contract.partySignedAt;
  const canSign = (isOrganizer || isParty) && contract.status === "AWAITING_SIGNATURES" && !mySigned;
  const qr = await QRCode.toDataURL(absoluteUrl(`/verify/${contract.verifyCode}`), { margin: 1, width: 140 });
  const back = isOrganizer ? `/organizer/events/${contract.participation.eventId}` : user.isAdmin && !isParty ? "/admin/events" : "/poet/contracts";

  return (
    <div className="min-h-screen">
      <header className="surface-bar"><div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3"><Logo /><Link href={back} className="btn-ghost btn-sm">رجوع</Link></div></header>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <PageTitle title={`العقد الرقمي ${contract.number}`} subtitle={contract.participation.event.name} actions={<StatusPill map={CONTRACT_STATES} state={contract.status} />} />
        <Flash ok={s("ok")} error={s("error")} />
        <div className="grid gap-6 md:grid-cols-[1fr_220px]">
          <Card title="نص العقد">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-8 text-ink-700">{contract.body}</pre>
          </Card>
          <div className="space-y-4">
            <Card title="التوقيعات">
              <DataList items={[
                ["الطرف الأول", contract.organizerSignedAt ? formatDateTime(contract.organizerSignedAt) : "لم يوقّع"],
                ["الطرف الثاني", contract.partySignedAt ? formatDateTime(contract.partySignedAt) : "لم يوقّع"],
                ["المبلغ", <Money key="m" halala={contract.participation.agreedHalala} />],
                ["الحقوق الإعلامية", contract.mediaRights ? contract.mediaRights.split(",").map((r) => MEDIA_RIGHTS[r as keyof typeof MEDIA_RIGHTS]).join("، ") : "لا شيء"],
              ]} />
            </Card>
            <Card title="التحقق العام">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="رمز التحقق من العقد" width={140} height={140} className="mx-auto" />
              <p className="mt-2 break-all text-center text-xs text-ink-500" dir="ltr">{contract.verifyCode}</p>
              <p className="mt-2 text-xs leading-5 text-ink-500">بصمة المحتوى: <span className="break-all font-mono" dir="ltr">{contract.contentHash.slice(0, 20)}…</span></p>
            </Card>
          </div>
        </div>

        {canSign ? (
          <Card title="التوقيع الإلكتروني (المادة 31)" className="mt-6">
            {s("step") === "sign" ? (
              <form action={signContractAction} className="space-y-4">
                <input type="hidden" name="contractId" value={contract.id} />
                {s("dev") ? <div className="rounded-lg border border-gold-200 bg-gold-50 px-3 py-2 text-xs text-gold-800">بيئة التجربة: رمز التوقيع <span className="tabular font-bold" dir="ltr">{s("dev")}</span></div> : null}
                <Field label="رمز التحقق المرسل إلى بريدك">
                  <input name="code" required inputMode="numeric" pattern="\d{6}" maxLength={6} className="input tabular max-w-[12rem] text-center tracking-[0.4em]" dir="ltr" />
                </Field>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="accept" required className="mt-1" />
                  <span>اطلعت على بنود العقد وأقبلها، وأقرّ بأن قبولي الإلكتروني ملزم (المادة 30).</span>
                </label>
                <button className="btn-gold">توقيع العقد</button>
              </form>
            ) : (
              <form action={requestSignCodeAction}>
                <input type="hidden" name="contractId" value={contract.id} />
                <p className="mb-3 text-sm text-ink-600">يتم التوقيع برمز تحقق وقبول صريح وتوثيق زمني. الرمز يُرسل إلى بريدك مؤقتاً، ويُستبدل بالنفاذ الوطني لاحقاً.</p>
                <button className="btn-primary">أرسل رمز التوقيع</button>
              </form>
            )}
          </Card>
        ) : null}
      </main>
    </div>
  );
}
