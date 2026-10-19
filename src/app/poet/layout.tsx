import { requireParticipant } from "@/lib/participant";
import { DashboardShell } from "@/components/dashboard-shell";
import { PARTICIPANT_NAV } from "@/components/nav";

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireParticipant();
  return <DashboardShell user={user} area="لوحة الشاعر والأطراف المشاركة" nav={PARTICIPANT_NAV}>{children}</DashboardShell>;
}
