import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { BRAND_THEME_COLOR } from "@/lib/brand";
import "./globals.css";

// الخط من next/font حصراً: يُنزَّل وقت البناء ويُخدَم من خادمنا، فلا طلب لخوادم خارجية من المتصفح.
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "منصة شاعر", template: "%s · منصة شاعر" },
  description: "المنصة الرقمية لتنظيم وحوكمة فن شعر المحاورة: التراخيص، والفعاليات، والتفاوض، والعقود الرقمية، وحفظ الحقوق.",
};

export const viewport: Viewport = { themeColor: BRAND_THEME_COLOR, width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={arabic.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
