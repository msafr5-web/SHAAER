import { requireAdmin } from "@/lib/auth";
import { ADMIN_DEPTS } from "@/lib/domain";
import { DashboardShell } from "@/components/dashboard-shell";
import { ADMIN_NAV } from "@/components/nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const dept = user.adminDept ? ADMIN_DEPTS[user.adminDept as keyof typeof ADMIN_DEPTS] : "إدارة المنصة";
  return <DashboardShell user={user} area={`إدارة المنصة · ${dept}`} nav={ADMIN_NAV}>{children}</DashboardShell>;
}
