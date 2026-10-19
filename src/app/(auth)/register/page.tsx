import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPendingEmail } from "@/lib/auth";
import { registerAction } from "@/app/actions/auth";
import { ENTITY_TYPES, PARTY_KINDS, SAUDI_CITIES } from "@/lib/domain";
import { Field, Flash } from "@/components/ui";
import { flashFrom, type SearchParams } from "@/lib/forms";

export const metadata: Metadata = { title: "إكمال التسجيل" };

const SELF_SERVE = Object.entries(PARTY_KINDS).filter(([k]) => k !== "ROW_MEMBER");

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const email = await getPendingEmail();
  if (!email) redirect("/login?next=register");
  const { ok, error } = await flashFrom(searchParams);

  return (
    <div className="w-full max-w-lg py-10">
      <h1 className="gold-underline text-2xl font-bold text-green-900">إكمال التسجيل</h1>
      <p className="mb-6 mt-3 text-sm text-ink-500">تحققنا من <span dir="ltr">{email}</span>. أكمل بياناتك، وقبول اللائحة وميثاق الشرف شرط للتسجيل.</p>
      <Flash ok={ok} error={error} />
      <form action={registerAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الاسم الكامل"><input name="name" required minLength={3} className="input" /></Field>
          <Field label="الجوال" hint="اختياري"><input name="phone" inputMode="tel" className="input" dir="ltr" /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الصفة" hint="يمكن إضافة صفات أخرى لاحقاً">
            <select name="kind" required className="input">
              {SELF_SERVE.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="المدينة">
            <select name="city" required className="input">
              {SAUDI_CITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="طبيعة الحساب">
            <select name="entityType" className="input">
              {Object.entries(ENTITY_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="سنة الميلاد" hint="للتحقق من السن (الملحق ذ ذ)">
            <input name="birthYear" type="number" min={1920} max={new Date().getFullYear()} className="input tabular" dir="ltr" />
          </Field>
        </div>
        <Field label="الاسم المعروض" hint="اسم المنشأة أو الاسم الفني. اتركه فارغاً لاستعمال اسمك">
          <input name="displayName" className="input" />
        </Field>
        <Field label="السجل التجاري" hint="للمنشآت والكيانات">
          <input name="commercialReg" className="input tabular" dir="ltr" />
        </Field>
        <div className="surface-inset space-y-3 p-4 text-sm">
          <label className="flex items-start gap-2">
            <input type="checkbox" name="acceptRegulation" required className="mt-1" />
            <span>أقرّ بقبول <Link href="/regulation" className="link" target="_blank">اللائحة التنفيذية</Link> الإصدار 1.0، وأن أي اتفاق خارج المنصة غير معتمد ضمن إجراءاتها (المادتان 2 و32).</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="acceptCharter" required className="mt-1" />
            <span>ألتزم بميثاق الشرف والسلوك المهني والإعلامي، واحترام الثوابت والذوق العام (المواد 6 إلى 8).</span>
          </label>
        </div>
        <button className="btn-primary w-full">إنشاء الحساب</button>
      </form>
    </div>
  );
}
