import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { CONTRACT_STATES, LICENSE_STATES, PARTY_KINDS } from "@/lib/domain";
import { Card, DataList, EmptyState, PageTitle, StatusPill } from "@/components/ui";

export const metadata: Metadata = { title: "نتيجة التحقق" };
export const dynamic = "force-dynamic";

// صفحة تحقق عامة: تعرض صحة الوثيقة دون بيانات شخصية (NFR-14).
export default async function VerifyResult({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const license = await db.license.findUnique({ where: { verifyCode: code }, include: { type: true, party: true } });
  const contract = license ? null : await db.contract.findUnique({ where: { verifyCode: code }, include: { participation: { include: { event: true } } } });

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <PageTitle title="نتيجة التحقق" />
      {license ? (
        <Card title={license.type.nameAr} action={<StatusPill map={LICENSE_STATES} state={license.status} />}>
          <DataList items={[
            ["رقم الترخيص", <span key="n" className="tabular" dir="ltr">{license.number}</span>],
            ["صاحب الترخيص", license.party.displayName],
            ["الصفة", PARTY_KINDS[license.party.kind as keyof typeof PARTY_KINDS]],
            ["تاريخ الإصدار", formatDate(license.issuedAt)],
            ["ينتهي في", formatDate(license.expiresAt)],
            ["النطاق", license.scopeEventId ? "مقيّد بفعالية واحدة" : "عام"],
          ]} />
          <p className="mt-4 text-xs text-ink-500">ترخيص تنظيمي صادر عن منصة «شاعر»، وليست جهة حكومية (المادة 56).</p>
        </Card>
      ) : contract ? (
        <Card title={`عقد رقمي ${contract.number}`} action={<StatusPill map={CONTRACT_STATES} state={contract.status} />}>
          <DataList items={[
            ["الفعالية", contract.participation.event.name],
            ["تاريخ الفعالية", formatDate(contract.participation.event.startsAt)],
            ["توقيع المنظّم", contract.organizerSignedAt ? formatDate(contract.organizerSignedAt) : "لم يوقّع"],
            ["توقيع الطرف الثاني", contract.partySignedAt ? formatDate(contract.partySignedAt) : "لم يوقّع"],
            ["بصمة المحتوى", <span key="h" className="break-all font-mono text-xs" dir="ltr">{contract.contentHash.slice(0, 32)}…</span>],
          ]} />
        </Card>
      ) : (
        <EmptyState title="لا وثيقة بهذا الرمز" body="تأكد من الرمز. الوثائق الصادرة عن المنصة تحمل رمزاً فريداً يُتحقق منه هنا." />
      )}
    </div>
  );
}
