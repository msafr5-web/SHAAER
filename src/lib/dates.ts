// التاريخ ميلادي ثم هجري، وبتوقيت الرياض، وبأرقام لاتينية لتثبيت محاذاة الأعمدة.

const TZ = "Asia/Riyadh";

const greg = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  timeZone: TZ, day: "numeric", month: "long", year: "numeric",
});
const hijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", {
  timeZone: TZ, day: "numeric", month: "long", year: "numeric",
});
const time = new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
  timeZone: TZ, hour: "numeric", minute: "2-digit",
});

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "–";
  const x = new Date(d);
  return `${greg.format(x)} · ${hijri.format(x)}`;
}

export function formatGregorian(d: Date | string | null | undefined): string {
  if (!d) return "–";
  return greg.format(new Date(d));
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "–";
  const x = new Date(d);
  return `${greg.format(x)} · ${time.format(x)}`;
}

/** الوقت المتبقي بصياغة عربية، محسوباً من الخادم */
export function remaining(until: Date | string | null | undefined, now = new Date()): string {
  if (!until) return "–";
  const ms = new Date(until).getTime() - now.getTime();
  if (ms <= 0) return "انتهت";
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d} يوم و${h % 24} ساعة`;
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h} ساعة و${m} دقيقة`;
}

/** تحويل قيمة datetime-local (بتوقيت الرياض) إلى Date */
export function fromRiyadhLocal(value: string): Date {
  return new Date(`${value}:00+03:00`);
}
