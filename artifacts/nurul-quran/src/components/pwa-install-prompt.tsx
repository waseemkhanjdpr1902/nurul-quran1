import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share, ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && (window.navigator as any).standalone === true)
  );
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [iosGuide, setIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (localStorage.getItem("pwa-dismissed")) return;

    // iOS — show guide after delay
    if (isIOS()) {
      const t = setTimeout(() => setShowBanner(true), 4000);
      return () => clearTimeout(t);
    }

    // Android / Chrome — listen for native prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 3000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS()) {
      setIosGuide(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setIosGuide(false);
    setDismissed(true);
    localStorage.setItem("pwa-dismissed", "1");
  };

  if (!showBanner || dismissed) return null;

  return (
    <AnimatePresence>
      {iosGuide ? (
        <motion.div
          key="ios-guide"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="fixed bottom-[170px] left-3 right-3 md:left-auto md:right-6 md:w-80 z-[60]"
        >
          <div className="bg-primary text-primary-foreground shadow-2xl rounded-2xl p-4">
            <div className="flex items-start justify-between mb-3">
              <p className="font-bold text-sm">Add to Home Screen</p>
              <button onClick={handleDismiss} className="opacity-70 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs text-primary-foreground/85">
              <div className="flex items-center gap-3 bg-primary-foreground/10 rounded-xl p-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-primary-foreground">1. Tap the Share button</p>
                  <p className="opacity-70">Bottom of your Safari browser</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-primary-foreground/10 rounded-xl p-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center shrink-0">
                  <ArrowUp className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-primary-foreground">2. Tap "Add to Home Screen"</p>
                  <p className="opacity-70">Scroll down in the Share sheet</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-primary-foreground/10 rounded-xl p-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center shrink-0">
                  <span className="text-base">☪</span>
                </div>
                <div>
                  <p className="font-semibold text-primary-foreground">3. Tap "Add"</p>
                  <p className="opacity-70">Nurul Quran is now on your home screen!</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="install-banner"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="fixed bottom-[170px] left-3 right-3 md:left-auto md:right-6 md:w-80 z-[60]"
        >
          <div className="bg-card border border-primary/20 shadow-xl rounded-2xl p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <span className="text-xl">☪</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">Install Nurul Quran</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isIOS() ? "Add to Home Screen for the best experience" : "Add to home screen for offline access"}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="sm"
                className="h-8 bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-3"
                onClick={handleInstall}
              >
                <Download className="w-3 h-3 mr-1" />
                Install
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={handleDismiss}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
