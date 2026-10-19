import Link from "next/link";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "./brand";
import { IconBell, IconLogout } from "./icons";

export type NavItem = { href: string; label: string; icon: ReactNode };

export async function DashboardShell({ user, area, nav, children }: { user: CurrentUser; area: string; nav: NavItem[]; children: ReactNode }) {
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-e border-line bg-white lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="border-b border-line px-5 py-4">
            <Logo />
            <div className="mt-2 text-xs font-semibold text-gold-700">{area}</div>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label={area}>
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-green-50 hover:text-green-800">
                <span className="text-green-700">{n.icon}</span>{n.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-line p-3 text-xs text-ink-500">
            <Link href="/dashboard" className="block rounded-lg px-3 py-2 font-semibold text-ink-700 hover:bg-sand-100">تبديل اللوحة</Link>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="surface-bar">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="lg:hidden"><Logo /></div>
            <div className="hidden text-sm text-ink-500 lg:block">{area}</div>
            <div className="flex items-center gap-2">
              <Link href="/notifications" className="btn-ghost btn-sm relative" aria-label={`الإشعارات: ${unread} غير مقروء`}>
                <IconBell size={16} />
                {unread > 0 ? <span className="tabular rounded-full bg-danger-700 px-1.5 text-[10px] text-white">{unread}</span> : null}
              </Link>
              <span className="hidden max-w-[12rem] truncate text-sm font-semibold text-ink-700 sm:inline">{user.name}</span>
              <form action={logoutAction}>
                <button className="btn-ghost btn-sm" aria-label="تسجيل الخروج"><IconLogout size={16} /></button>
              </form>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto border-t border-line/60 px-4 py-2 lg:hidden" aria-label={area}>
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-sand-100 px-2.5 py-1.5 text-xs font-semibold text-ink-700">
                {n.icon}{n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
