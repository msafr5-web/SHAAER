import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { markNotificationsReadAction } from "@/app/actions/party";
import { formatDateTime } from "@/lib/dates";
import { EmptyState, Flash, PageTitle } from "@/components/ui";
import { Logo } from "@/components/brand";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "الإشعارات" };

export default async function NotificationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const { ok } = await flashFrom(searchParams);
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="min-h-screen">
      <header className="surface-bar"><div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3"><Logo /><Link href="/dashboard" className="btn-ghost btn-sm">لوحاتي</Link></div></header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <PageTitle title="الإشعارات" actions={items.some((i) => !i.readAt) ? <form action={markNotificationsReadAction}><button className="btn-ghost btn-sm">تعليم الكل مقروءاً</button></form> : null} />
        <Flash ok={ok} />
        {items.length === 0 ? <EmptyState title="لا إشعارات" /> : (
          <ul className="space-y-2">
            {items.map((n) => (
              <li key={n.id} className={`surface p-4 ${n.readAt ? "opacity-70" : "border-green-200"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-green-900">{n.title}</div>
                    <div className="mt-1 text-sm text-ink-600">{n.body}</div>
                  </div>
                  <span className="tabular shrink-0 text-xs text-ink-500">{formatDateTime(n.createdAt)}</span>
                </div>
                {n.link ? <Link href={n.link} className="link mt-2 inline-block text-sm">فتح</Link> : null}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
