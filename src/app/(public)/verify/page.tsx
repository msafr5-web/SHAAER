import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "التحقق من وثيقة" };

async function go(form: FormData) {
  "use server";
  const code = String(form.get("code") ?? "").trim();
  if (code) redirect(`/verify/${encodeURIComponent(code)}`);
}

export default function VerifyPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-14">
      <PageTitle title="التحقق من ترخيص أو عقد" subtitle="أدخل رمز التحقق المطبوع على الشهادة أو العقد، أو امسح رمز QR بكاميرا الجوال." />
      <form action={go} className="surface flex gap-3 p-5">
        <input name="code" required placeholder="رمز التحقق" className="input" dir="ltr" />
        <button className="btn-primary">تحقق</button>
      </form>
    </div>
  );
}
