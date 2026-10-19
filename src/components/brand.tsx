import Link from "next/link";

/** شعار مؤقت حتى اعتماد الهوية البصرية (الملحق د) */
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2" aria-label="منصة شاعر: الصفحة الرئيسية">
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${light ? "bg-white/10" : "bg-green-800"}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M20 3c-6 1-11 5-13 11l-2 7 4-4c1 0 3-1 4-2" stroke="rgb(var(--gold-400))" strokeWidth="1.75" strokeLinecap="round" />
          <path d="M20 3c0 5-3 10-7 12" stroke="rgb(var(--gold-200))" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </span>
      <span className={`text-xl font-bold ${light ? "text-white" : "text-green-900"}`}>شاعر</span>
    </Link>
  );
}
