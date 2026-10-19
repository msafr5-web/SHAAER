import Link from "next/link";
import { Logo } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo />
      <h1 className="text-2xl font-bold text-green-900">الصفحة غير موجودة</h1>
      <p className="text-sm text-ink-500">الرابط غير صحيح، أو لا صلاحية لك على هذا المحتوى.</p>
      <Link href="/" className="btn-primary">الصفحة الرئيسية</Link>
    </div>
  );
}
