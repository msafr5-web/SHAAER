import type { Metadata } from "next";
import QRCode from "qrcode";
import { absoluteUrl } from "@/lib/url";
import { Card, PageTitle } from "@/components/ui";
import { InstallApp } from "@/components/pwa";
import { IconBell, IconDownload, IconPhone, IconQr, IconShield } from "@/components/icons";

export const metadata: Metadata = { title: "تطبيق الجوال" };

// تطبيق الجوال: المنصة نفسها (الجوال أولاً، الملحق ع)، فلا تختلف بياناتها عن الموقع، ولا يمر بمتجر Google أو Apple.
// ملف أندرويد يُبنى بـ scripts/build-android.mjs إلى public/downloads.
const APK = "/downloads/shaaer.apk";
const STEPS = {
  android: ["اضغط «تحميل التطبيق لأندرويد» وانتظر اكتمال التحميل.", "افتح الملف shaaer.apk من الإشعارات أو من مجلد التنزيلات.", "إن طلب الجوال الإذن فاسمح بالتثبيت من هذا المصدر، ثم اضغط «تثبيت». تظهر أيقونة شاعر على الشاشة الرئيسية."],
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
              <p className="mt-1 text-sm leading-7 text-ink-600">يُحمَّل من المنصة مباشرة، دون متجر Google Play أو App Store، وبلا حساب فيهما.</p>
              <a href={APK} download className="btn-gold mt-4 w-full px-6 py-3 text-base sm:w-auto">
                <IconDownload size={20} /> تحميل التطبيق لأندرويد
              </a>
              <p className="mt-2 text-xs text-ink-500">ملف APK · الإصدار 1.0 · أقل من 50 كيلوبايت · أندرويد 7 فأحدث</p>
              <div className="mt-5 border-t border-line/70 pt-4">
                <p className="mb-2 text-sm font-semibold text-green-900">آيفون، أو التثبيت من المتصفح</p>
                <InstallApp />
              </div>
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
        <Card title="أندرويد: ملف التطبيق">
          <ol className="list-decimal space-y-2 ps-5 text-sm leading-7 text-ink-700">{STEPS.android.map((s) => <li key={s}>{s}</li>)}</ol>
        </Card>
        <Card title="آيفون وآيباد: من Safari">
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
