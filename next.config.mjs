/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
        ],
      },
      // ملف تطبيق أندرويد: يُحمَّل ملفاً لا يُفتح صفحة
      {
        source: "/downloads/:file*.apk",
        headers: [
          { key: "Content-Type", value: "application/vnd.android.package-archive" },
          { key: "Content-Disposition", value: "attachment; filename=\"shaaer.apk\"" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
      // عامل خدمة تطبيق الجوال: لا يُخزَّن، كي يصل كل تحديث فور نشره
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
