import type { MetadataRoute } from "next";
import { BRAND_THEME_COLOR } from "@/lib/brand";

// بيان تطبيق الجوال: يُثبَّت من المتصفح على الشاشة الرئيسية ويفتح بملء الشاشة (صفحة /app).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "منصة شاعر",
    short_name: "شاعر",
    description: "المنصة الرقمية لتنظيم وحوكمة فن شعر المحاورة: التراخيص، والفعاليات، والتفاوض، والعقود الرقمية، وحفظ الحقوق.",
    lang: "ar",
    dir: "rtl",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: BRAND_THEME_COLOR,
    background_color: BRAND_THEME_COLOR,
    categories: ["entertainment", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "لوحتي", url: "/dashboard" },
      { name: "التحقق من وثيقة", url: "/verify" },
    ],
  };
}
