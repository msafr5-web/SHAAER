// بناء Vercel: يلتقط رابط القاعدة بأي اسم يضعه مزوّدها (Neon أو Supabase أو Prisma Postgres)،
// ويطبّق الترحيلات والبذرة على الاتصال المباشر، ثم يبني الموقع على الاتصال المجمّع.
import { execSync } from "node:child_process";

const first = (...names) => names.map((n) => process.env[n]).find((v) => v && v.trim());

const pooled = first("DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL");
const direct = first("DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "DATABASE_URL_DIRECT") ?? pooled;

if (!pooled) {
  console.error(`
لا توجد قاعدة بيانات مربوطة بالمشروع.
من لوحة Vercel: Storage ثم Create Database ثم Neon (Postgres)، واربطها بالمشروع لكل البيئات،
ثم أعد النشر. التفاصيل في docs/DEPLOYMENT.md.
`);
  process.exit(1);
}

const run = (cmd, url) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
};

run("npx prisma generate", pooled);
run("npx prisma migrate deploy", direct);
run("npx tsx prisma/seed.ts", direct);
run("npx next build", pooled);
