import { requireParty } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { ORGANIZER_NAV } from "@/components/nav";

export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireParty(["ORGANIZER"]);
  return <DashboardShell user={user} area="لوحة الجهة المنظمة" nav={ORGANIZER_NAV}>{children}</DashboardShell>;
}
