"use client";

import * as React from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center space-x-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white font-bold text-xs shrink-0 dark:bg-neutral-100 dark:text-neutral-900">
          K
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
            Install Kanak App
          </span>
          <span className="text-[11px] text-neutral-500">
            Add to home screen for faster grocery entries and native mobile experience.
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-1.5 shrink-0">
        <Button size="sm" onClick={handleInstall} className="text-xs h-7 px-2.5">
          <Download className="mr-1 h-3 w-3" /> Install
        </Button>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

