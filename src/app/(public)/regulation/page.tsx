import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { Card, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "اللائحة والسياسات" };
export const dynamic = "force-dynamic";

export default async function RegulationPage() {
  const policies = await db.policy.findMany({ orderBy: [{ code: "asc" }, { effectiveFrom: "desc" }] });
  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <PageTitle title="اللائحة التنفيذية والسياسات المعتمدة" subtitle="النسخة الإلكترونية المعتمدة والمنشورة عبر المنصة هي النسخة الرسمية (المادة 78)، والعربية لغتها الرسمية (المادة 79)." />
      <div className="space-y-4">
        {policies.map((p) => (
          <Card key={p.id} title={p.title} action={<span className="tabular text-xs text-ink-500">الإصدار {p.version} · يسري من {formatDate(p.effectiveFrom)}</span>}>
            <p className="text-sm leading-7 text-ink-600">{p.summary}</p>
          </Card>
        ))}
        <Card title="الشروط وحدود المسؤولية" className="scroll-mt-24" >
          <div id="terms" className="space-y-2 text-sm leading-7 text-ink-600">
            <p>تعمل المنصة بوصفها منصة تشغيل وتنظيم وتوثيق رقمي، ولا تمثل جهة حكومية أو سلطة تنظيمية رسمية (المادة 56).</p>
            <p>لا تتحمل المنصة مسؤولية: الاتفاقات خارج النظام، والالتزامات الوظيفية للمشاركين، والنزاعات خارج العقود الرقمية، والأعطال الناتجة عن جهات خارجية، والقوة القاهرة (المادة 57).</p>
            <p>تسعى المنصة إلى الحل الودي، وتخضع النزاعات للأنظمة والقضاء المختص في المملكة العربية السعودية (المادتان 58 و59).</p>
          </div>
        </Card>
        <Card title="الملكية الفكرية">
          <p id="ip" className="text-sm leading-7 text-ink-600">
            اللوائح والأنظمة والمحتوى والهوية والنماذج والتصاميم والإجراءات ملك للمنصة، ويُحظر نسخها أو تقليدها أو إعادة تطويرها أو استخدامها أو نشرها دون إذن خطي مسبق (المادة 50، والملحق ق).
          </p>
        </Card>
        <Card title="المرجعية النظامية">
          <p className="text-sm leading-7 text-ink-600">
            تلتزم المنصة وجميع الأطراف بأنظمة المملكة العربية السعودية، وبالأخص: الأنظمة الإعلامية، والضريبية، والتجارية، والتقنية، وحماية البيانات، والملكية الفكرية، والأنظمة المالية، ولائحة المحافظة على الذوق العام (المادة 5).
          </p>
        </Card>
      </div>
    </div>
  );
}
