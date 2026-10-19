import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET مفقود أو قصير");
    return "dev-only-secret-not-for-production-use-0000";
  }
  return s;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmac(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function otpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** رقم مرجعي قابل للقراءة: L-2026-482913 */
export function referenceNumber(prefix: string, year = new Date().getFullYear()): string {
  return `${prefix}-${year}-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
}

/** رمز تحقق عام قصير للشهادات والعقود */
export function verifyCode(): string {
  return randomBytes(9).toString("base64url");
}
