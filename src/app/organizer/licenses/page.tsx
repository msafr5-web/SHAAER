import type { Metadata } from "next";
import { requireParty } from "@/lib/auth";
import { LicensePanel } from "@/components/license-panel";
import { Flash, PageTitle } from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "تراخيص المنظّم" };

export default async function OrganizerLicenses({ searchParams }: { searchParams: SearchParams }) {
  const { user } = await requireParty(["ORGANIZER"]);
  const { ok, error } = await flashFrom(searchParams);
  const parties = user.parties.filter((p) => p.kind === "ORGANIZER");
  return (
    <>
      <PageTitle title="التراخيص" subtitle="ترخيص المسابقات (10,000 ريال لكل مسابقة)، وتراخيص الفعاليات والشعراء غير المستمرين التي دفعتها. ترخيص الفعالية يصدر تلقائياً عند الدفع." />
      <Flash ok={ok} error={error} />
      <LicensePanel parties={parties} returnTo="/organizer/licenses" />
    </>
  );
}
