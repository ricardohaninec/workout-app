"use client";

import { useEffect, useState } from "react";
import { X, Share, Plus } from "lucide-react";

type Mode = "android" | "ios" | null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallBanner() {
  const [mode, setMode] = useState<Mode>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already installed — don't show
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true);
    if (isStandalone) return;

    // Already dismissed
    if (localStorage.getItem("pwa-banner-dismissed")) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;

    if (isIos) {
      setMode("ios");
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode("android");
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem("pwa-banner-dismissed", "1");
    setVisible(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
  }

  if (!visible || !mode) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 pb-safe">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[#1A1A1A] p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden">
            <svg viewBox="0 0 512 512" fill="none" className="h-10 w-10" xmlns="http://www.w3.org/2000/svg">
              <rect width="512" height="512" rx="112" fill="#0D0D0D"/>
              <rect x="56" y="176" width="56" height="160" rx="20" fill="#f97316"/>
              <rect x="112" y="208" width="40" height="96" rx="12" fill="#f97316"/>
              <rect x="152" y="236" width="208" height="40" rx="10" fill="#f97316"/>
              <rect x="360" y="208" width="40" height="96" rx="12" fill="#f97316"/>
              <rect x="400" y="176" width="56" height="160" rx="20" fill="#f97316"/>
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Add to Home Screen</p>
            {mode === "android" ? (
              <p className="mt-0.5 text-xs text-white/50">
                Install the app for a faster, fullscreen experience.
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-white/50">
                Tap <Share size={11} className="inline -mt-0.5 mx-0.5" /> then{" "}
                <strong className="text-white/70">Add to Home Screen</strong>{" "}
                <Plus size={11} className="inline -mt-0.5 mx-0.5" /> for the full app experience.
              </p>
            )}
          </div>

          <button
            onClick={dismiss}
            className="shrink-0 text-white/30 hover:text-white/60 transition-colors"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        {mode === "android" && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={dismiss}
              className="flex-1 rounded-lg border border-white/10 py-2 text-xs font-medium text-white/50 hover:text-white/80 transition-colors"
            >
              Not now
            </button>
            <button
              onClick={install}
              className="flex-1 rounded-lg bg-[#FF6B35] py-2 text-xs font-semibold text-white hover:bg-[#e85f2b] transition-colors"
            >
              Install
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
