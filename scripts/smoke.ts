// فحص سريع: يفتح جلسة لكل حساب تجريبي ويطلب صفحات لوحته، ويبلغ عن أي صفحة لا تعيد 200.
// التشغيل: npx tsx scripts/smoke.ts (والخادم يعمل على APP_URL)
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";

const db = new PrismaClient();
const BASE = process.env.APP_URL ?? "http://localhost:3010";

const PAGES: Record<string, string[]> = {
  "": ["/", "/licenses", "/directory", "/regulation", "/verify", "/login"],
  "admin@shaaer.test": ["/dashboard", "/admin", "/admin/licenses", "/admin/licenses?tab=all", "/admin/events", "/admin/parties", "/admin/cases", "/admin/grievances", "/admin/finance", "/admin/parameters", "/admin/audit", "/notifications"],
  "organizer@shaaer.test": ["/organizer", "/organizer/events", "/organizer/events/new", "/organizer/licenses", "/organizer/finance"],
  "poet@shaaer.test": ["/poet", "/poet/offers", "/poet/contracts", "/poet/attendance", "/poet/licenses", "/poet/profile", "/poet/row", "/poet/finance", "/poet/record"],
  "row@shaaer.test": ["/poet", "/poet/row"],
  "host@shaaer.test": ["/host", "/host/venues", "/host/events", "/host/licenses"],
};

async function cookieFor(email: string) {
  if (!email) return "";
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  const token = randomBytes(32).toString("base64url");
  await db.session.create({ data: { id: createHash("sha256").update(token).digest("hex"), userId: user.id, expiresAt: new Date(Date.now() + 3_600_000) } });
  return `shaaer_session=${token}`;
}

async function main() {
  const failures: string[] = [];
  let count = 0;
  const events = await db.event.findMany({ select: { id: true } });
  const contracts = await db.contract.findMany({ select: { id: true, verifyCode: true } });
  const licenses = await db.license.findMany({ where: { status: "ACTIVE" }, select: { verifyCode: true }, take: 1 });
  const att = await db.attendance.findFirst({ select: { token: true } });
  PAGES["organizer@shaaer.test"].push(...events.map((e) => `/organizer/events/${e.id}`), ...contracts.map((c) => `/contracts/${c.id}`));
  if (att) PAGES["organizer@shaaer.test"].push(`/scan/${att.token}`);
  PAGES["admin@shaaer.test"].push(...events.map((e) => `/admin/events/${e.id}`));
  PAGES[""].push(`/verify/${contracts[0]?.verifyCode}`, `/verify/${licenses[0]?.verifyCode}`, "/verify/not-a-code");

  for (const [email, paths] of Object.entries(PAGES)) {
    const cookie = await cookieFor(email);
    for (const p of paths) {
      const res = await fetch(BASE + p, { headers: cookie ? { cookie } : {}, redirect: "manual" });
      count++;
      const body = res.status === 200 ? await res.text() : "";
      if (res.status !== 200 || body.includes("Application error") || body.includes("Unhandled Runtime Error")) {
        failures.push(`${res.status} ${email || "زائر"} ${p} ${res.headers.get("location") ?? ""}`);
      }
    }
  }
  console.log(`${count} صفحة، ${failures.length} فشل`);
  for (const f of failures) console.log("  ", f);
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() + 3_700_000) }, createdAt: { gt: new Date(Date.now() - 600_000) } } });
  process.exit(failures.length ? 1 : 0);
}

main();
