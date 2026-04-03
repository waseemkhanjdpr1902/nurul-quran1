import { useEffect, useRef, useState } from "react";

const IS_DEV = import.meta.env.DEV;

const BANNER_UNIT_ID = IS_DEV
  ? "ca-app-pub-3940256099942544/6300978111"
  : (import.meta.env.VITE_ADMOB_BANNER_UNIT_ID ?? "");

type AdBannerProps = {
  className?: string;
};

type AdStatus = "loading" | "loaded" | "blocked" | "error" | "unavailable";

export function AdBanner({ className = "" }: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<AdStatus>("loading");

  useEffect(() => {
    if (!BANNER_UNIT_ID) {
      setStatus("unavailable");
      return;
    }

    const detectAdBlocker = async () => {
      try {
        const testUrl = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
        const res = await fetch(testUrl, { method: "HEAD", mode: "no-cors", cache: "no-store" });
        return false;
      } catch {
        return true;
      }
    };

    detectAdBlocker().then(blocked => {
      if (blocked) {
        setStatus("blocked");
        return;
      }

      const script = document.createElement("script");
      script.async = true;
      script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
      script.setAttribute("data-ad-client", BANNER_UNIT_ID.split("/")[0]);
      script.onload = () => setStatus("loaded");
      script.onerror = () => setStatus("error");
      document.head.appendChild(script);

      if (containerRef.current) {
        const ins = document.createElement("ins");
        ins.className = "adsbygoogle";
        ins.style.cssText = "display:block;width:100%;height:90px;";
        ins.setAttribute("data-ad-client", BANNER_UNIT_ID.split("/")[0]);
        ins.setAttribute("data-ad-slot", BANNER_UNIT_ID.split("/")[1] ?? "");
        ins.setAttribute("data-ad-format", "auto");
        ins.setAttribute("data-full-width-responsive", "true");
        containerRef.current.appendChild(ins);
        try {
          (window as any).adsbygoogle = (window as any).adsbygoogle || [];
          (window as any).adsbygoogle.push({});
        } catch {}
      }
    });
  }, []);

  if (IS_DEV) {
    return (
      <div className={`flex items-center justify-center bg-[hsl(220,13%,14%)] border border-dashed border-[hsl(220,13%,22%)] rounded-lg h-[90px] ${className}`}>
        <span className="text-[10px] text-gray-600 font-mono tracking-wider uppercase">[ AdMob Banner — Test Mode ]</span>
      </div>
    );
  }

  if (status === "unavailable") return null;

  if (status === "blocked") {
    return (
      <div className={`flex flex-col items-center justify-center bg-amber-900/10 border border-amber-500/20 rounded-lg p-3 text-center ${className}`}>
        <p className="text-amber-400 text-xs font-semibold">Ad blocker detected</p>
        <p className="text-gray-500 text-[11px] mt-0.5">Please disable your ad blocker to support the free version of TradeMaster Pro.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`min-h-[90px] overflow-hidden rounded-lg ${className}`} />
  );
}
