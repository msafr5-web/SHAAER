import { requireParty } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { HOST_NAV } from "@/components/nav";

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireParty(["VENUE_HOST"]);
  return <DashboardShell user={user} area="لوحة موقع الفعاليات" nav={HOST_NAV}>{children}</DashboardShell>;
}
