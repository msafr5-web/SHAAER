// بناء تطبيق أندرويد (APK) يُحمَّل مباشرة من shaaer.net/app دون متجر Google Play.
// التشغيل: node scripts/build-android.mjs
// يحتاج JDK 17 وأدوات Android SDK (platforms;android-34 وbuild-tools;34.0.0) في ANDROID_HOME.
//
// مفتاح التوقيع خارج المستودع (~/Android/shaaer-release.jks) وكلمته بجانبه. يُنشأ أول مرة،
// ويجب الاحتفاظ به: كل تحديث للتطبيق يُوقَّع به نفسه، وإلا رفض الجوال تثبيت التحديث فوق النسخة القديمة.
import { execSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const q = (p) => `"${p}"`;
const SDK = process.env.ANDROID_HOME ?? join(homedir(), "Android", "sdk");
const BT = join(SDK, "build-tools", "34.0.0");
const JAR = join(SDK, "platforms", "android-34", "android.jar");
const KEYSTORE = process.env.ANDROID_KEYSTORE ?? join(homedir(), "Android", "shaaer-release.jks");
const PASSFILE = `${KEYSTORE}.pass`;
const OUT = join("public", "downloads", "shaaer.apk");
const B = join("android", "build");
// أدوات Java من JAVA_HOME، لأن مسار النظام قد لا يحوي إلا java وحده
const jdk = (tool) => (process.env.JAVA_HOME ? q(join(process.env.JAVA_HOME, "bin", tool)) : tool);

if (!existsSync(JAR) || !existsSync(BT)) {
  console.error(`أدوات Android غير موجودة في ${SDK}. ثبّت: sdkmanager "platforms;android-34" "build-tools;34.0.0"`);
  process.exit(1);
}

const run = (cmd) => execSync(cmd, { stdio: ["ignore", "inherit", "inherit"] });

// مفتاح التوقيع: يُنشأ مرة واحدة
if (!existsSync(KEYSTORE)) {
  const pass = randomBytes(18).toString("base64url");
  writeFileSync(PASSFILE, pass);
  run(`${jdk("keytool")} -genkeypair -keystore ${q(KEYSTORE)} -alias shaaer -keyalg RSA -keysize 2048 -validity 10000 -storepass ${pass} -keypass ${pass} -dname "CN=Shaaer, O=Shaaer, C=SA"`);
  console.log(`أُنشئ مفتاح التوقيع: ${KEYSTORE} (احتفظ بنسخة منه ومن ${PASSFILE})`);
}
const pass = (process.env.ANDROID_KEYSTORE_PASS ?? readFileSync(PASSFILE, "utf8")).trim();

rmSync(B, { recursive: true, force: true });
mkdirSync(join(B, "classes"), { recursive: true });
mkdirSync(join(B, "dex"), { recursive: true });
mkdirSync(join(B, "assets"), { recursive: true });

// الموارد: المكتوبة بيد، والأيقونة من أيقونات تطبيق الويب نفسها
cpSync(join("android", "res"), join(B, "res"), { recursive: true });
mkdirSync(join(B, "res", "mipmap-xxxhdpi"), { recursive: true });
copyFileSync(join("public", "icons", "icon-192.png"), join(B, "res", "mipmap-xxxhdpi", "ic_launcher.png"));

// صفحة انقطاع الاتصال نفسها، وزرها يعيد فتح المنصة
copyFileSync(join("public", "icons", "icon-192.png"), join(B, "assets", "icon.png"));
const offline = readFileSync(join("public", "offline.html"), "utf8")
  .replace("/icons/icon-192.png", "icon.png")
  .replace("location.reload()", "location.href='https://shaaer.net/dashboard'");
writeFileSync(join(B, "assets", "offline.html"), offline);

run(`${q(join(BT, "aapt2"))} compile --dir ${q(join(B, "res"))} -o ${q(join(B, "res.zip"))}`);
run(`${q(join(BT, "aapt2"))} link -I ${q(JAR)} --manifest ${q(join("android", "AndroidManifest.xml"))} -A ${q(join(B, "assets"))} -o ${q(join(B, "unsigned.apk"))} ${q(join(B, "res.zip"))}`);

const sources = [];
(function walk(d) {
  for (const n of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, n.name);
    if (n.isDirectory()) walk(p);
    else if (p.endsWith(".java")) sources.push(p);
  }
})(join("android", "src"));
run(`${jdk("javac")} -source 8 -target 8 -Xlint:-options -encoding UTF-8 -bootclasspath ${q(JAR)} -d ${q(join(B, "classes"))} ${sources.map(q).join(" ")}`);

const classes = [];
(function walk(d) {
  for (const n of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, n.name);
    if (n.isDirectory()) walk(p);
    else classes.push(p);
  }
})(join(B, "classes"));
run(`${q(join(BT, "d8.bat"))} --release --min-api 24 --lib ${q(JAR)} --output ${q(join(B, "dex"))} ${classes.map(q).join(" ")}`);
run(`${jdk("jar")} -u -M -f ${q(join(B, "unsigned.apk"))} -C ${q(join(B, "dex"))} classes.dex`);

run(`${q(join(BT, "zipalign"))} -f -p 4 ${q(join(B, "unsigned.apk"))} ${q(join(B, "aligned.apk"))}`);
mkdirSync(join("public", "downloads"), { recursive: true });
run(`${q(join(BT, "apksigner.bat"))} sign --ks ${q(KEYSTORE)} --ks-key-alias shaaer --ks-pass pass:${pass} --key-pass pass:${pass} --out ${q(OUT)} ${q(join(B, "aligned.apk"))}`);
run(`${q(join(BT, "apksigner.bat"))} verify ${q(OUT)}`);
rmSync(`${OUT}.idsig`, { force: true });

console.log(`\nالتطبيق جاهز: ${OUT}`);
