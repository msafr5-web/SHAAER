import type { Metadata } from "next";
import QRCode from "qrcode";
import { absoluteUrl } from "@/lib/url";
import { Card, PageTitle } from "@/components/ui";
import { InstallApp } from "@/components/pwa";
import { IconBell, IconPhone, IconQr, IconShield } from "@/components/icons";

export const metadata: Metadata = { title: "تطبيق الجوال" };

// تطبيق الجوال: نسخة قابلة للتثبيت من المنصة نفسها (الجوال أولاً، الملحق ع)، فلا تختلف بياناتها عن الموقع.
const STEPS = {
  android: ["افتح shaaer.net في Chrome أو Edge.", "اضغط زر «تثبيت تطبيق شاعر» في هذه الصفحة، أو اختر «تثبيت التطبيق» من قائمة المتصفح (⋮).", "تظهر أيقونة شاعر على الشاشة الرئيسية، ويفتح التطبيق بملء الشاشة."],
  ios: ["افتح shaaer.net في Safari.", "اضغط زر المشاركة أسفل الشاشة.", "اختر «إضافة إلى الشاشة الرئيسية» ثم «إضافة»."],
};

const FEATURES = [
  { icon: IconQr, title: "مسح الحضور من موقع الفعالية", body: "الكاميرا من التطبيق مباشرة لتسجيل الحضور برمز QR (المادة 40)." },
  { icon: IconBell, title: "التفاوض والعقود في جيبك", body: "متابعة العروض ومهل الرد والتوقيع على العقد الرقمي من الجوال." },
  { icon: IconShield, title: "البيانات نفسها بأمان", body: "التطبيق هو المنصة ذاتها، فلا نسخة ثانية من بياناتك، ولا تُخزَّن العقود على الجهاز." },
];

export default async function MobileAppPage() {
  const qr = await QRCode.toDataURL(absoluteUrl("/app"), { margin: 1, width: 200 });
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <PageTitle title="تطبيق شاعر للجوال" subtitle="ثبّت المنصة على جوالك بأيقونتها، وافتحها بملء الشاشة دون متجر تطبيقات." />

      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        <Card>
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-green-50 text-green-800"><IconPhone size={26} /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-green-900">التثبيت على هذا الجهاز</h2>
              <p className="mt-1 text-sm leading-7 text-ink-600">يعمل على أندرويد وآيفون، ولا يحتاج إلى أكثر من دقيقة.</p>
              <div className="mt-4"><InstallApp /></div>
            </div>
          </div>
        </Card>

        <Card className="hidden text-center md:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="رمز QR لفتح صفحة التطبيق على الجوال" width={160} height={160} className="mx-auto" />
          <p className="mt-3 max-w-[11rem] text-xs leading-6 text-ink-500">تتصفح من الحاسب؟ امسح الرمز بكاميرا جوالك لفتح هذه الصفحة.</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card title="أندرويد">
          <ol className="list-decimal space-y-2 ps-5 text-sm leading-7 text-ink-700">{STEPS.android.map((s) => <li key={s}>{s}</li>)}</ol>
        </Card>
        <Card title="آيفون وآيباد">
          <ol className="list-decimal space-y-2 ps-5 text-sm leading-7 text-ink-700">{STEPS.ios.map((s) => <li key={s}>{s}</li>)}</ol>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="surface p-5">
            <f.icon size={22} className="text-gold-700" />
            <h3 className="mt-3 text-sm font-bold text-green-900">{f.title}</h3>
            <p className="mt-1 text-sm leading-7 text-ink-600">{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
