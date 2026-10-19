import { redirect } from "next/navigation";

export function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function num(form: FormData, key: string): number | null {
  const v = str(form, key);
  if (!v) return null;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function bool(form: FormData, key: string): boolean {
  return form.get(key) === "on" || form.get(key) === "true";
}

/** يعود إلى الصفحة برسالة نجاح أو خطأ تُعرض في Flash */
export function back(path: string, msg: { ok?: string; error?: string }): never {
  const url = new URL(path, "http://x");
  if (msg.ok) url.searchParams.set("ok", msg.ok);
  if (msg.error) url.searchParams.set("error", msg.error);
  redirect(`${url.pathname}${url.search}`);
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function flashFrom(sp: SearchParams) {
  const p = await sp;
  const pick = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : undefined);
  return { ok: pick("ok"), error: pick("error"), params: p };
}
