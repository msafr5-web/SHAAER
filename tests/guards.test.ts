// حراس الشجرة: قواعد لا تُترك للذاكرة.
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function files(dir: string, exts: string[], out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".next", ".git"].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files(p, exts, out);
    else if (exts.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
}

// يُبنى من رقمه كي لا يحمل الحارس نفسه الحرف الذي يمنعه
const EM_DASH = String.fromCharCode(0x2014);

const SRC = files("src", [".ts", ".tsx", ".css"]);
const ALL_TEXT = [...SRC, ...files("prisma", [".ts", ".prisma"]), ...files("tests", [".ts"]), ...files(".", [".md"]).filter((p) => !p.includes("node_modules"))];

describe("حراس الواجهة والكود", () => {
  it("لا شرطة طويلة في المشروع (قاعدة الترقيم العربي)", () => {
    const bad = ALL_TEXT.filter((f) => readFileSync(f, "utf8").includes(EM_DASH));
    expect(bad).toEqual([]);
  });

  it("لا لون Hex خام في ملفات tsx (الألوان من globals.css وحدها)", () => {
    const bad = SRC.filter((f) => f.endsWith(".tsx") && /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(f, "utf8").replace(/&#\d+;/g, "")));
    expect(bad).toEqual([]);
  });

  it("لا أصناف اتجاه فيزيائية (ml- mr- pl- pr- left- right-): RTL منطقي", () => {
    const re = /(?:className=|class=)[^>]*\b(?:-?m[lr]-|p[lr]-|left-|right-|text-left|text-right)/;
    const bad = SRC.filter((f) => f.endsWith(".tsx") && re.test(readFileSync(f, "utf8")));
    expect(bad).toEqual([]);
  });

  it("لا مكتبة أيقونات خارجية: الأيقونات من components/icons.tsx", () => {
    const bad = SRC.filter((f) => /from ["'](lucide-react|react-icons|@heroicons)/.test(readFileSync(f, "utf8")));
    expect(bad).toEqual([]);
  });

  it("لا رابط لخطوط جوجل: الخط من next/font", () => {
    const bad = SRC.filter((f) => readFileSync(f, "utf8").includes("fonts.googleapis.com"));
    expect(bad).toEqual([]);
  });
});

describe("سجل النشاط إضافة فقط (الملحق ي)", () => {
  it("لا تحديث ولا حذف لسجل النشاط في أي موضع", () => {
    const bad = SRC.filter((f) => /auditLog\.(update|updateMany|delete|deleteMany|upsert)\b/.test(readFileSync(f, "utf8")));
    expect(bad).toEqual([]);
  });
});
