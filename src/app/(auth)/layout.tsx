import { Logo } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-green-900 p-10 text-white lg:flex">
        <Logo light />
        <div>
          <h2 className="text-3xl font-bold leading-snug">حقوقك محفوظة،<br />وعقدك موثّق.</h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-green-100">
            المال يمر عبر المنصة فقط، ويُصرف بعد إثبات التنفيذ. وكل اتفاق داخلها موثّق برمز تحقق وتوقيت.
          </p>
        </div>
        <p className="text-xs text-green-200">الدخول برمز على البريد الإلكتروني مؤقت لتجربة النظام، ويُستبدل بالنفاذ الوطني الموحد قبل الإطلاق العام.</p>
      </div>
      <div className="flex flex-col">
        <div className="p-6 lg:hidden"><Logo /></div>
        <div className="flex flex-1 items-center justify-center px-6 pb-12">{children}</div>
      </div>
    </div>
  );
}
