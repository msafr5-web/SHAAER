import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "./brand";

const NAV = [
  { href: "/", label: "الرئيسية" },
  { href: "/licenses", label: "التراخيص والرسوم" },
  { href: "/directory", label: "دليل المرخّصين" },
  { href: "/regulation", label: "اللائحة والسياسات" },
  { href: "/verify", label: "التحقق من وثيقة" },
];

export async function PublicHeader() {
  const user = await getCurrentUser();
  return (
    <header className="surface-bar">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-5 text-sm font-semibold text-ink-600 lg:flex" aria-label="التنقل الرئيسي">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="hover:text-green-800">{n.label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/dashboard" className="btn-primary btn-sm">لوحتي</Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost btn-sm">الدخول</Link>
              <Link href="/login?next=register" className="btn-primary btn-sm">إنشاء حساب</Link>
            </>
          )}
        </div>
      </div>
      <nav className="flex gap-4 overflow-x-auto border-t border-line/60 px-4 py-2 text-xs font-semibold text-ink-600 lg:hidden" aria-label="التنقل الرئيسي">
        {NAV.map((n) => <Link key={n.href} href={n.href} className="whitespace-nowrap">{n.label}</Link>)}
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-20 bg-green-900 text-green-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-3">
        <div>
          <Logo light />
          <p className="mt-3 text-sm leading-7 text-green-200">
            منصة تشغيل وتنظيم وتوثيق رقمي لفن شعر المحاورة. وليست جهة حكومية أو سلطة تنظيمية رسمية (المادة 56).
          </p>
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">المنصة</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/licenses" className="hover:text-white">جدول التراخيص والرسوم</Link></li>
            <li><Link href="/directory" className="hover:text-white">دليل الأطراف المرخّصين</Link></li>
            <li><Link href="/verify" className="hover:text-white">التحقق من ترخيص أو عقد</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">المرجعية</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/regulation" className="hover:text-white">اللائحة التنفيذية والسياسات</Link></li>
            <li><Link href="/regulation#terms" className="hover:text-white">الشروط وحدود المسؤولية</Link></li>
            <li><Link href="/regulation#ip" className="hover:text-white">الملكية الفكرية</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-green-200">
        جميع الحقوق محفوظة: مبادرة حوكمة فن شعر المحاورة · منصة شاعر · المقر الرئيسي: الرياض
      </div>
    </footer>
  );
}
