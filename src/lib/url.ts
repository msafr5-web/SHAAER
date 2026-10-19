/** رابط مطلق لرموز QR (التحقق العام ومسح الحضور) */
export function absoluteUrl(path: string): string {
  const base = (process.env.APP_URL ?? "http://localhost:3010").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
