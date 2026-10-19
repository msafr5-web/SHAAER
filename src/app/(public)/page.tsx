import Link from "next/link";
import { db } from "@/lib/db";
import { JOURNEY_STEPS } from "@/lib/domain";
import { formatSAR } from "@/lib/money";
import {
  IconBadge, IconBuilding, IconCalendar, IconFile, IconHandshake, IconMic, IconQr, IconScale, IconShield, IconUsers, IconWallet,
} from "@/components/icons";

export const dynamic = "force-dynamic";

const VALUE = [
  { icon: <IconWallet />, title: "مستحقاتك مضمونة", body: "يمر المال عبر المنصة فقط، ويُصرف للطرف فور إثبات تنفيذ مشاركته، ويُجمَّد تلقائياً عند أي تعارض حتى التحقق.", ref: "المواد 34 إلى 36 و40" },
  { icon: <IconFile />, title: "عقد رقمي موثّق", body: "عقد لكل مشاركة، يحدد الأجر والمواعيد وحقوق التصوير والبث، ويوقّعه الطرفان برمز تحقق مع توثيق زمني.", ref: "المواد 30 إلى 32" },
  { icon: <IconHandshake />, title: "تفاوض واضح ومحدود", body: "عرض وعرض مضاد داخل المنصة، بثلاث جولات حداً أقصى وخلال 48 ساعة عمل، فلا مفاوضات معلّقة.", ref: "المواد 26 إلى 29" },
  { icon: <IconScale />, title: "قواعد معلنة وتظلم منصف", body: "الإلغاء والغياب والاعتذار تُحسب بقواعد مكتوبة، ولكل طرف حق الاعتراض خلال 15 يوماً.", ref: "المواد 33 و43 إلى 55" },
];

const PERSONAS = [
  { icon: <IconMic />, title: "الشعراء", body: "ملف مهني موثّق، وقائمة أسعارك، والعروض والعقود والمستحقات في مكان واحد.", href: "/login?next=register" },
  { icon: <IconCalendar />, title: "الجهات المنظمة", body: "أنشئ فعاليتك، وفاوض المشاركين، ووقّع العقود، وسجّل الحضور برمز QR من جوالك.", href: "/login?next=register" },
  { icon: <IconUsers />, title: "الصفوف", body: "قائد الصف يدير أعضاءه ويتعاقد عن الصف، والمسؤولية فردية لا جماعية.", href: "/login?next=register" },
  { icon: <IconBuilding />, title: "مواقع الفعاليات", body: "رخّص قاعتك أو استراحتك، واستقبل حجوزات الفعاليات المؤكدة وأكّدها.", href: "/login?next=register" },
];

export default async function HomePage() {
  const [licensed, events, venues, minFee] = await Promise.all([
    db.license.count({ where: { status: "ACTIVE", scopeEventId: null } }),
    db.event.count({ where: { status: { in: ["CONFIRMED", "IN_EXECUTION", "COMPLETED", "FINANCIALLY_CLOSED"] } } }),
    db.venue.count({ where: { status: "LICENSED" } }),
    db.licenseType.findFirst({ orderBy: { feeHalala: "asc" } }),
  ]);

  return (
    <>
      {/* البطل */}
      <section className="relative overflow-hidden bg-green-900 text-white">
        <div className="absolute inset-0 opacity-[0.07]" aria-hidden="true"
          style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgb(var(--gold-300)) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgb(var(--gold-400)) 0, transparent 35%)" }} />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div>
            <p className="text-sm font-semibold text-gold-300">المنصة الرقمية لتنظيم وحوكمة فن شعر المحاورة</p>
            <h1 className="mt-4 text-3xl font-bold leading-snug md:text-5xl md:leading-tight">
              فن المحاورة كما عرفناه،<br />بحقوق محفوظة وعقود موثّقة
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-green-100">
              «شاعر» تجمع الشاعر والصف والجهة المنظمة والموقع في رحلة واحدة: ترخيص، ثم تفاوض، ثم عقد رقمي، ثم حضور موثّق وصرف مضمون.
              والتنظيم خدمة للفن، لا قيد على ارتجاله وأصالته.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login?next=register" className="btn-gold px-6 py-3 text-base">ابدأ بإنشاء حسابك</Link>
              <Link href="/licenses" className="btn border border-white/30 px-6 py-3 text-base text-white hover:bg-white/10">التراخيص والرسوم</Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[[licensed, "ترخيص ساري"], [events, "فعالية مؤكدة"], [venues, "موقع مرخّص"]].map(([n, l]) => (
              <div key={l as string} className="rounded-xl border border-white/15 bg-white/5 p-4">
                <div className="tabular text-3xl font-bold text-gold-300">{n}</div>
                <div className="mt-1 text-xs text-green-100">{l}</div>
              </div>
            ))}
            <div className="col-span-3 rounded-xl border border-white/15 bg-white/5 p-4 text-start text-sm leading-7 text-green-100">
              <span className="font-bold text-white">رحلة واحدة من 13 خطوة</span> من إنشاء الفعالية إلى إغلاقها مالياً، تُطبَّق قواعدها آلياً كما نصت عليها اللائحة التنفيذية.
            </div>
          </div>
        </div>
      </section>

      {/* القيمة */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="gold-underline text-2xl font-bold text-green-900">لماذا عبر المنصة؟</h2>
        <p className="mt-3 max-w-2xl text-ink-600">ما لا يحصل عليه الطرف في الاتفاق المباشر: ضمان أجره، وعقد يحفظ حقه، وسجل مهني يرفع الطلب عليه.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {VALUE.map((v) => (
            <div key={v.title} className="surface p-6">
              <div className="w-fit rounded-lg bg-green-50 p-2.5 text-green-700">{v.icon}</div>
              <h3 className="mt-4 text-lg font-bold text-green-900">{v.title}</h3>
              <p className="mt-2 text-sm leading-7 text-ink-600">{v.body}</p>
              <p className="mt-3 text-xs font-semibold text-gold-700">{v.ref}</p>
            </div>
          ))}
        </div>
      </section>

      {/* الرحلة */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="gold-underline text-2xl font-bold text-green-900">رحلة الفعالية</h2>
          <p className="mt-3 text-ink-600">كما في الملحق (هـ) من اللائحة التنفيذية.</p>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {JOURNEY_STEPS.map((s, i) => (
              <li key={s} className="surface-inset flex items-center gap-3 p-4">
                <span className="tabular grid h-9 w-9 shrink-0 place-items-center rounded-full bg-green-800 text-sm font-bold text-white">{i + 1}</span>
                <span className="text-sm font-semibold text-ink-700">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* لمن */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="gold-underline text-2xl font-bold text-green-900">لكل طرف لوحته</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PERSONAS.map((p) => (
            <Link key={p.title} href={p.href} className="surface group p-6 transition hover:border-green-300">
              <div className="w-fit rounded-lg bg-gold-50 p-2.5 text-gold-700">{p.icon}</div>
              <h3 className="mt-4 text-lg font-bold text-green-900">{p.title}</h3>
              <p className="mt-2 text-sm leading-7 text-ink-600">{p.body}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* الثقة */}
      <section className="bg-green-50 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <h2 className="gold-underline text-2xl font-bold text-green-900">حوكمة تحفظ الثقة</h2>
            <p className="mt-4 text-sm leading-7 text-ink-600">
              المنصة منصة تشغيل وتنظيم وتوثيق رقمي، وليست جهة حكومية أو سلطة تنظيمية رسمية (المادة 56). وتلتزم بالحياد الثقافي، فلا تمييز مناطقي أو قبلي في أي إجراء أو ترتيب.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">
            {[
              [<IconShield key="s" />, "سجل نشاط لا يُعدَّل", "كل عملية جوهرية موثقة بمن وماذا ومتى (الملحق ي)."],
              [<IconQr key="q" />, "تحقق عام من الوثائق", "رمز على كل ترخيص وعقد يفتح صفحة تحقق للعموم."],
              [<IconBadge key="b" />, "توصيفات محايدة", "تصنيفات تنظيمية بلا دلالة طبقية أو تفضيلية (المادتان 9 و64)."],
              [<IconScale key="c" />, "منع تضارب المصالح", "إفصاح المقيّمين واللجان واستبعاد عند التعارض (الملحق ك)."],
            ].map(([icon, t, b]) => (
              <div key={t as string} className="surface flex gap-3 p-5">
                <div className="text-green-700">{icon}</div>
                <div><div className="font-bold text-green-900">{t}</div><p className="mt-1 text-sm text-ink-600">{b}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* الدعوة */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-2xl font-bold text-green-900">ابدأ بترخيصك</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-600">
          تبدأ التراخيص من {minFee ? formatSAR(minFee.feeHalala) : "–"} غير شاملة الضريبة، وتُراجع ثم تُصدر بشهادة ورمز تحقق.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/licenses" className="btn-primary px-6 py-3">جدول التراخيص</Link>
          <Link href="/verify" className="btn-ghost px-6 py-3">تحقق من ترخيص أو عقد</Link>
        </div>
      </section>
    </>
  );
}
