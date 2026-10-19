// اختبار طرف لطرف لرحلة الملحق (هـ) كاملة عبر المتصفح:
// إنشاء الفعالية ← الاعتماد المبدئي ← التفاوض ← العقود والتوقيع ← الدفع ← الحضور ← اعتماد التنفيذ والصرف ← الإكمال والتقييم.
// التشغيل: npx tsx scripts/e2e-journey.ts (والخادم يعمل على APP_URL، ومتصفح Edge أو Chrome مثبت)
import { chromium, type Browser, type Page } from "playwright-core";
import { PrismaClient } from "@prisma/client";
import { mkdirSync } from "node:fs";

const BASE = process.env.APP_URL ?? "http://localhost:3010";
const BROWSER = process.env.BROWSER_PATH ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const SHOTS = process.env.SHOTS_DIR ?? "e2e-shots";
const db = new PrismaClient();
const EVENT_NAME = `أمسية الاختبار ${Date.now().toString().slice(-5)}`;

let step = 0;
function ok(msg: string) { console.log(`✓ ${++step}. ${msg}`); }

async function login(browser: Browser, email: string): Promise<Page> {
  const ctx = await browser.newContext({ locale: "ar-SA", viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', email);
  await page.click('button:has-text("أرسل رمز التحقق")');
  await page.waitForURL(/step=code/);
  const code = new URL(page.url()).searchParams.get("dev");
  if (!code) throw new Error("لا رمز تجريبي: تأكد من AUTH_DEV_SHOW_CODE=true");
  await page.fill('input[name="code"]', code);
  await page.click('button:has-text("تحقق ودخول")');
  await page.waitForURL(/\/(dashboard|admin)/);
  return page;
}

async function expectFlash(page: Page, contains?: string) {
  // إجراء الخادم يعيد التوجيه برسالة في العنوان: ننتظر ظهورها
  await page.waitForURL((u) => u.searchParams.has("error") || (contains ? (u.searchParams.get("ok") ?? "").includes(contains) : true), { timeout: 20_000 }).catch(() => {});
  const url = new URL(page.url());
  const error = url.searchParams.get("error");
  if (error) throw new Error(`خطأ من الخادم: ${error}`);
  if (contains) {
    const okMsg = url.searchParams.get("ok") ?? "";
    if (!okMsg.includes(contains)) throw new Error(`توقعت «${contains}» ووجدت «${okMsg}» في ${page.url()}`);
  }
}

async function act(page: Page, target: string | ReturnType<Page["locator"]>) {
  const loc = typeof target === "string" ? page.locator(target) : target;
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && r.url().startsWith(BASE), { timeout: 60_000 }),
    loc.first().click(),
  ]);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
}

async function selectByText(page: Page, selector: string, text: string) {
  const value = await page.locator(`${selector} option`, { hasText: text }).first().getAttribute("value");
  if (!value) throw new Error(`لا خيار يحتوي «${text}»`);
  await page.selectOption(selector, value);
}

async function sign(page: Page, contractId: string) {
  await page.goto(`${BASE}/contracts/${contractId}`);
  await act(page, 'button:has-text("أرسل رمز التوقيع")');
  await page.waitForURL(/step=sign/);
  const code = new URL(page.url()).searchParams.get("dev")!;
  await page.fill('input[name="code"]', code);
  await page.check('input[name="accept"]');
  await act(page, 'button:has-text("توقيع العقد")');
  await expectFlash(page);
}

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: BROWSER, headless: true });
  try {
    // لقطات الواجهة العامة على سطح المكتب والجوال
    const pub = await browser.newPage({ viewport: { width: 1360, height: 900 } });
    await pub.goto(BASE);
    await pub.screenshot({ path: `${SHOTS}/01-home-desktop.png`, fullPage: true });
    const mob = await browser.newPage({ viewport: { width: 375, height: 800 } });
    await mob.goto(BASE);
    await mob.screenshot({ path: `${SHOTS}/02-home-mobile.png`, fullPage: true });
    const overflow = await mob.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) throw new Error("الصفحة الرئيسية فيها تمرير أفقي على عرض الجوال");
    ok("الصفحة الرئيسية على سطح المكتب والجوال بلا تمرير أفقي");

    const org = await login(browser, "organizer@shaaer.test");
    const admin = await login(browser, "admin@shaaer.test");
    const poet = await login(browser, "poet@shaaer.test");
    const row = await login(browser, "row@shaaer.test");
    ok("الدخول برمز البريد لأربعة حسابات");

    // 1. إنشاء الفعالية (المادة 24)
    await org.goto(`${BASE}/organizer/events/new`);
    await org.fill('input[name="name"]', EVENT_NAME);
    await org.selectOption('select[name="type"]', "SOCIAL");
    const start = new Date(Date.now() + 10 * 86_400_000);
    const local = new Date(start.getTime() + 3 * 3_600_000).toISOString().slice(0, 16);
    await org.fill('input[name="startsAt"]', local);
    await org.fill('input[name="expectedAttendance"]', "300");
    await selectByText(org, 'select[name="venueId"]', "قاعة الديرة الكبرى");
    await org.fill('input[name="contact"]', "0110000000");
    await org.click('button:has-text("حفظ الفعالية مسودة")');
    await org.waitForURL(/\/organizer\/events\/[a-z0-9]+\?/);
    await expectFlash(org, "أُنشئت");
    const eventUrl = org.url().split("?")[0];
    const eventId = eventUrl.split("/").pop()!;
    ok("إنشاء الفعالية مسودة");

    // 3. إضافة المشاركين
    for (const [role, name] of [["POET", "الشاعر سالم"], ["ROW", "قائد صف النخيل"]] as const) {
      await org.selectOption('select[name="role"]', role);
      await selectByText(org, 'select[name="partyId"]', name);
      await act(org, 'form:has(select[name="role"]) button:has-text("إضافة")');
      await expectFlash(org, "أُضيف");
    }
    ok("إضافة شاعر وصف مرخّصين");

    // 2. الإرسال والاعتماد المبدئي
    await act(org, 'button:has-text("إرسال للمراجعة")');
    await expectFlash(org, "أُرسلت");
    await admin.goto(`${BASE}/admin/events`);
    await act(admin, admin.locator(".surface-inset", { hasText: EVENT_NAME }).locator('button:has-text("اعتماد مبدئي")'));
    await expectFlash(admin, "اعتُمدت");
    ok("الاعتماد المبدئي من إدارة التشغيل");

    // 4. التفاوض (المواد 26 إلى 28)
    await org.goto(eventUrl);
    for (const [name, amount] of [["الشاعر سالم", "8000"], ["قائد صف النخيل", "12000"]] as const) {
      const seat = org.locator(".surface-inset", { hasText: name });
      await seat.locator('input[name="amount"]').fill(amount);
      await act(org, seat.locator('button:has-text("إرسال")'));
      await expectFlash(org, "أُرسل العرض");
    }
    await poet.goto(`${BASE}/poet/offers`);
    const poetCard = poet.locator("section", { hasText: EVENT_NAME });
    await poetCard.locator('input[name="amount"]').fill("9000");
    await act(poet, poetCard.locator('button:has-text("إرسال")'));
    await expectFlash(poet, "الجولة 2");
    await org.goto(eventUrl);
    await act(org, org.locator(".surface-inset", { hasText: "الشاعر سالم" }).locator('button:has-text("قبول")'));
    await expectFlash(org, "تم الاتفاق");
    await row.goto(`${BASE}/poet/offers`);
    await act(row, row.locator("section", { hasText: EVENT_NAME }).locator('button:has-text("قبول")'));
    await expectFlash(row, "تم الاتفاق");
    ok("تفاوض بعرض وعرض مضاد وقبول (جولتان)");

    // 5. العقود والتوقيع (المادتان 30 و31)
    await org.goto(eventUrl);
    await act(org, 'button:has-text("إنشاء العقود وإرسالها للتوقيع")');
    await expectFlash(org, "أُنشئ");
    const contracts = await db.contract.findMany({ where: { participation: { eventId } }, include: { participation: { include: { party: true } } } });
    if (contracts.length !== 2) throw new Error(`توقعت عقدين ووجدت ${contracts.length}`);
    for (const c of contracts) {
      await sign(org, c.id);
      await sign(c.participation.party?.displayName === "الشاعر سالم" ? poet : row, c.id);
    }
    const active = await db.contract.count({ where: { participation: { eventId }, status: "ACTIVE" } });
    if (active !== 2) throw new Error("العقود لم تصبح نافذة بعد توقيع الطرفين");
    await org.goto(`${BASE}/contracts/${contracts[0].id}`);
    await org.screenshot({ path: `${SHOTS}/03-contract.png`, fullPage: true });
    ok("إنشاء عقدين وتوقيعهما من الطرفين برمز تحقق");

    // 6 و7. الدفع وإصدار ترخيص الفعالية
    await org.goto(eventUrl);
    await act(org, 'button:has-text("الانتقال إلى الدفع")');
    await act(org, 'button:has-text("الدفع والحجز")');
    await expectFlash(org, "مؤكدة");
    const held = await db.ledgerEntry.aggregate({ where: { eventId, kind: "ESCROW_HOLD" }, _sum: { amountHalala: true } });
    if (held._sum.amountHalala !== 2_100_000) throw new Error(`المحجوز ${held._sum.amountHalala} والمتوقع 2100000 هللة`);
    if (!(await db.license.findFirst({ where: { scopeEventId: eventId, typeCode: "EVENT", status: "ACTIVE" } }))) throw new Error("لم يصدر ترخيص الفعالية");
    ok("حجز 21,000 ريال وإصدار ترخيص الفعالية، والفعالية مؤكدة");

    // 8 و9. التنفيذ والحضور (المادة 40)
    await act(org, 'button:has-text("بدء التنفيذ")');
    for (const name of ["الشاعر سالم", "قائد صف النخيل"]) {
      await act(org, org.locator(".surface-inset", { hasText: name }).locator('button:has-text("تأكيد الحضور")'));
    }
    for (const p of [poet, row]) {
      await p.goto(`${BASE}/poet/attendance`);
      await act(p, p.locator("section", { hasText: EVENT_NAME }).locator('button:has-text("أنا حاضر")'));
      await expectFlash(p, "سُجّل حضورك");
    }
    await poet.goto(`${BASE}/poet/attendance`);
    await poet.screenshot({ path: `${SHOTS}/04-poet-attendance.png`, fullPage: true });
    ok("تسجيل الحضور من المنظّم والطرفين، دون تعارض");

    // 10 و11. اعتماد التنفيذ والصرف (المادة 36)
    await org.goto(eventUrl);
    for (const name of ["الشاعر سالم", "قائد صف النخيل"]) {
      await act(org, org.locator(".surface-inset", { hasText: name }).locator('button:has-text("اعتماد التنفيذ")'));
      await expectFlash(org, "صُرفت");
    }
    const paid = await db.ledgerEntry.aggregate({ where: { eventId, kind: "PAYOUT" }, _sum: { amountHalala: true } });
    if (paid._sum.amountHalala !== 2_100_000) throw new Error(`المصروف ${paid._sum.amountHalala}`);
    ok("اعتماد التنفيذ وصرف 21,000 ريال للطرفين");

    // 12. الإكمال والتقييم (الملحق أ)
    await act(org, 'button:has-text("إكمال الفعالية")');
    await expectFlash(org, "اكتملت");
    const seat = org.locator(".surface-inset", { hasText: "الشاعر سالم" });
    for (const [k, v] of [["attendance", "20"], ["performance", "22"], ["professionalism", "18"], ["audience", "13"], ["instructions", "19"]]) await seat.locator(`input[name="${k}"]`).fill(v);
    await act(org, seat.locator('button:has-text("حفظ التقييم")'));
    await expectFlash(org, "92 من 100");
    await org.screenshot({ path: `${SHOTS}/05-organizer-event.png`, fullPage: true });
    ok("إكمال الفعالية وتقييم الشاعر 92 من 100");

    // لقطات اللوحات
    await admin.goto(`${BASE}/admin`);
    await admin.screenshot({ path: `${SHOTS}/06-admin.png`, fullPage: true });
    await poet.goto(`${BASE}/poet`);
    await poet.screenshot({ path: `${SHOTS}/07-poet.png`, fullPage: true });
    const host = await login(browser, "host@shaaer.test");
    await host.goto(`${BASE}/host/events`);
    await host.locator("tr", { hasText: EVENT_NAME }).locator('button:has-text("تأكيد الحجز")').count();
    await host.goto(`${BASE}/host`);
    await host.screenshot({ path: `${SHOTS}/08-host.png`, fullPage: true });
    const orgMob = await browser.newPage({ viewport: { width: 375, height: 800 } });
    await orgMob.context().addCookies(await org.context().cookies());
    await orgMob.goto(eventUrl);
    if (await orgMob.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error("صفحة الفعالية فيها تمرير أفقي على الجوال");
    await orgMob.screenshot({ path: `${SHOTS}/09-event-mobile.png`, fullPage: true });
    ok("لوحات الإدارة والشاعر والموقع، وصفحة الفعالية على الجوال بلا تمرير أفقي");

    const audit = await db.auditLog.count({ where: { OR: [{ entityId: eventId }, { entity: "contract" }] } });
    console.log(`\nاكتملت الرحلة: ${step} خطوات ناجحة. قيود سجل النشاط المرتبطة: ${audit}`);
  } finally {
    await browser.close();
    await db.$disconnect();
  }
}

main().catch((e) => { console.error(`✗ فشل بعد الخطوة ${step}:`, e.message); process.exit(1); });
