import type { Metadata } from "next";
import { requireParticipant } from "@/lib/participant";
import { LicensePanel } from "@/components/license-panel";
import { Flash, PageTitle } from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "تراخيصي" };

export default async function MyLicenses({ searchParams }: { searchParams: SearchParams }) {
  const { parties } = await requireParticipant();
  const { ok, error } = await flashFrom(searchParams);
  return (
    <>
      <PageTitle title="تراخيصي" subtitle="الطلب يُراجع من إدارة التراخيص، ثم يُدفع الرسم فيصدر الترخيص بشهادة ورمز تحقق عام." />
      <Flash ok={ok} error={error} />
      <LicensePanel parties={parties} returnTo="/poet/licenses" />
    </>
  );
}
