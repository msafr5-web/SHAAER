// المكوّنات الموحدة: يُركَّب منها كل شيء (مهارة التصميم: لا تخترع، ركِّب).
import Link from "next/link";
import type { ReactNode } from "react";
import type { Tone } from "@/lib/domain";
import { formatSAR } from "@/lib/money";
import { remaining } from "@/lib/dates";
import { IconAlert, IconCheck, IconClock } from "./icons";

const TONES: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700 ring-ink-200",
  info: "bg-info-50 text-info-700 ring-info-100",
  success: "bg-success-50 text-success-700 ring-success-100",
  warning: "bg-warning-50 text-warning-700 ring-warning-100",
  danger: "bg-danger-50 text-danger-700 ring-danger-100",
  gold: "bg-gold-50 text-gold-800 ring-gold-200",
};

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="gold-underline text-2xl font-bold text-green-900">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-ink-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`surface p-5 ${className}`}>
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-green-900">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** حالة كيان: الاسم واللون من المصدر الموحد في domain.ts */
export function StatusPill({ map, state }: { map: Record<string, { label: string; tone: Tone }>; state: string | null | undefined }) {
  const s = state ? map[state] : undefined;
  if (!s) return <span className="text-ink-500">–</span>;
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONES[tone]}`}>{children}</span>;
}

/** مبلغ من الهللة، وعند الحاجة الضريبة سطراً مستقلاً (المادة 71) */
export function Money({ halala, vat, className = "" }: { halala: number | null | undefined; vat?: number; className?: string }) {
  if (halala === null || halala === undefined) return <span className="text-ink-500">–</span>;
  if (vat === undefined) return <span className={`tabular whitespace-nowrap ${className}`}>{formatSAR(halala)}</span>;
  return (
    <span className={`tabular inline-flex flex-col text-start ${className}`}>
      <span>{formatSAR(halala)}</span>
      <span className="text-xs text-ink-500">ضريبة {formatSAR(vat)} · الإجمالي {formatSAR(halala + vat)}</span>
    </span>
  );
}

export function DeadlineBadge({ until, label = "متبقٍ" }: { until: Date | string | null | undefined; label?: string }) {
  if (!until) return null;
  const left = remaining(until);
  const expired = left === "انتهت";
  const urgent = !expired && new Date(until).getTime() - Date.now() < 12 * 3_600_000;
  return (
    <Pill tone={expired ? "neutral" : urgent ? "danger" : "warning"}>
      <IconClock size={13} />
      <span className="tabular">{expired ? "انتهت المهلة" : `${label} ${left}`}</span>
    </Pill>
  );
}

export function KpiCard({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="surface flex items-start gap-3 p-4">
      {icon ? <div className="rounded-lg bg-green-50 p-2 text-green-700">{icon}</div> : null}
      <div className="min-w-0">
        <div className="text-xs font-semibold text-ink-500">{label}</div>
        <div className="tabular mt-1 text-2xl font-bold text-green-900">{value}</div>
        {hint ? <div className="mt-1 text-xs text-ink-500">{hint}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="surface-inset flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="text-sm font-bold text-ink-700">{title}</div>
      {body ? <p className="max-w-md text-sm text-ink-500">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** رسالة نجاح أو خطأ قادمة من إجراء الخادم عبر عنوان الصفحة */
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div role="status" className={`mb-5 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${error ? "border-danger-100 bg-danger-50 text-danger-700" : "border-success-100 bg-success-50 text-success-700"}`}>
      {error ? <IconAlert size={18} /> : <IconCheck size={18} />}
      <span>{error ?? ok}</span>
    </div>
  );
}

/** تنبيه بقاعدة معلّقة على سؤال لصاحب المبادرة: لا يُخفى عن المستخدم */
export function PendingRule({ question, children }: { question?: string | null; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning-100 bg-warning-50 px-3 py-2 text-xs text-warning-700">
      <IconAlert size={16} />
      <span>{children}{question ? ` (معلّقة على السؤال ${question})` : ""}</span>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint ? <span className="hint block">{hint}</span> : null}
    </label>
  );
}

export function DataList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs font-semibold text-ink-500">{k}</dt>
          <dd className="mt-0.5 break-words text-sm text-ink-800">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="-mx-5 overflow-x-auto px-5"><table className="table-base">{children}</table></div>;
}

export function LinkButton({ href, children, variant = "ghost" }: { href: string; children: ReactNode; variant?: "primary" | "ghost" | "gold" }) {
  const cls = variant === "primary" ? "btn-primary" : variant === "gold" ? "btn-gold" : "btn-ghost";
  return <Link href={href} className={cls}>{children}</Link>;
}

/** خطوات رحلة الفعالية (الملحق هـ) */
export function JourneyBar({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol className="flex flex-wrap gap-1.5" aria-label="رحلة الفعالية">
      {steps.map((s, i) => {
        const n = i + 1;
        const state = current === 0 ? "off" : n < current ? "done" : n === current ? "now" : "next";
        const cls = state === "done" ? "bg-green-700 text-white" : state === "now" ? "bg-gold-500 text-green-900" : "bg-ink-100 text-ink-500";
        return (
          <li key={s} className={`rounded-md px-2 py-1 text-[11px] font-semibold ${cls}`} aria-current={state === "now" ? "step" : undefined}>
            <span className="tabular">{n}</span>. {s}
          </li>
        );
      })}
    </ol>
  );
}
