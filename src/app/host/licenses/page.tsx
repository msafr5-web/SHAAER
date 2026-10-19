import type { Metadata } from "next";
import { requireParty } from "@/lib/auth";
import { LicensePanel } from "@/components/license-panel";
import { Flash, PageTitle } from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "ترخيص الموقع" };

export default async function HostLicenses({ searchParams }: { searchParams: SearchParams }) {
  const { user } = await requireParty(["VENUE_HOST"]);
  const { ok, error } = await flashFrom(searchParams);
  return (
    <>
      <PageTitle title="ترخيص الموقع" subtitle="ترخيص واحد يغطي مواقعك لثلاث سنوات (المادة 21). عند صدوره تصبح مواقعك متاحة للمنظّمين." />
      <Flash ok={ok} error={error} />
      <LicensePanel parties={user.parties.filter((p) => p.kind === "VENUE_HOST")} returnTo="/host/licenses" />
    </>
  );
}
