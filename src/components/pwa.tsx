"use client";
// تطبيق الجوال: تسجيل عامل الخدمة، وزر التثبيت على الشاشة الرئيسية.
import { useEffect, useState } from "react";
import { IconCheck, IconDownload, IconShare } from "./icons";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** يُسجَّل في الإنتاج وحده، كي لا يخزّن ملفات خادم التطوير */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

type Mode = "loading" | "installed" | "prompt" | "ios" | "manual";

export function InstallApp() {
  const [mode, setMode] = useState<Mode>("loading");
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return setMode("installed");
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setMode(ios ? "ios" : "manual");

    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as InstallPrompt); setMode("prompt"); };
    const onInstalled = () => { setPrompt(null); setMode("installed"); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setMode("installed");
    setPrompt(null);
  }

  if (mode === "loading") return <div className="h-12" aria-hidden="true" />;

  if (mode === "installed") {
    return (
      <p className="inline-flex items-center gap-2 rounded-lg bg-success-50 px-4 py-3 text-sm font-semibold text-success-700">
        <IconCheck size={18} /> التطبيق مثبّت على هذا الجهاز
      </p>
    );
  }

  if (mode === "prompt") {
    return (
      <button type="button" onClick={install} className="btn-gold w-full px-6 py-3 text-base sm:w-auto">
        <IconDownload size={20} /> تثبيت تطبيق شاعر
      </button>
    );
  }

  if (mode === "ios") {
    return (
      <p className="surface-inset flex items-start gap-2 p-4 text-sm leading-7 text-ink-700">
        <IconShare size={20} className="mt-1 shrink-0 text-green-800" />
        <span>في Safari: اضغط زر المشاركة أسفل الشاشة، ثم «إضافة إلى الشاشة الرئيسية»، ثم «إضافة».</span>
      </p>
    );
  }

  return (
    <p className="surface-inset p-4 text-sm leading-7 text-ink-700">
      افتح قائمة المتصفح (⋮) واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية». ويظهر زر التثبيت هنا مباشرة في Chrome وEdge على أندرويد.
    </p>
  );
}
