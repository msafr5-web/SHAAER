import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { requestCodeAction, verifyCodeAction } from "@/app/actions/auth";
import { Field, Flash } from "@/components/ui";
import type { SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "الدخول" };

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const step = s("step");
  const email = s("email") ?? "";
  const error = s("error") === "suspended" ? "حسابك موقوف مؤقتاً. راجع إدارة الامتثال" : s("error");
  const register = s("next") === "register";

  return (
    <div className="w-full max-w-sm">
      <h1 className="gold-underline text-2xl font-bold text-green-900">{register ? "إنشاء حساب" : "الدخول إلى شاعر"}</h1>
      <p className="mb-6 mt-3 text-sm text-ink-500">
        {step === "code" ? `أرسلنا رمزاً من 6 أرقام إلى ${email}، صالحاً لمدة 10 دقائق.` : "أدخل بريدك الإلكتروني ونرسل لك رمز تحقق. إن لم يكن لك حساب ننشئه بعد التحقق."}
      </p>
      <Flash error={error} ok={s("ok")} />

      {step === "code" ? (
        <form action={verifyCodeAction} className="space-y-4">
          <input type="hidden" name="email" value={email} />
          {s("dev") ? (
            <div className="rounded-lg border border-gold-200 bg-gold-50 px-3 py-2 text-xs text-gold-800">
              بيئة التجربة: الرمز هو <span className="tabular font-bold" dir="ltr">{s("dev")}</span> (لا مزود بريد بعد)
            </div>
          ) : null}
          <Field label="رمز التحقق">
            <input name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} className="input tabular text-center text-lg tracking-[0.5em]" dir="ltr" autoFocus />
          </Field>
          <button className="btn-primary w-full">تحقق ودخول</button>
          <Link href="/login" className="block text-center text-sm text-ink-500 hover:text-green-800">تغيير البريد أو إعادة الإرسال</Link>
        </form>
      ) : (
        <form action={requestCodeAction} className="space-y-4">
          <Field label="البريد الإلكتروني">
            <input name="email" type="email" required autoComplete="email" defaultValue={email} className="input" dir="ltr" autoFocus />
          </Field>
          <button className="btn-primary w-full">أرسل رمز التحقق</button>
        </form>
      )}

      <div className="surface-inset mt-8 p-4 text-xs leading-6 text-ink-600">
        <div className="font-bold text-ink-700">حسابات التجربة</div>
        admin · organizer · poet · row · evaluator · broadcast · host
        <span dir="ltr" className="ms-1">@shaaer.test</span>
      </div>
    </div>
  );
}
