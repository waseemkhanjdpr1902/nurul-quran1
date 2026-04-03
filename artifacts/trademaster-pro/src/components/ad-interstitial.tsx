import { useEffect, useRef, useState } from "react";

const IS_DEV = import.meta.env.DEV;

const INTERSTITIAL_UNIT_ID = IS_DEV
  ? "ca-app-pub-3940256099942544/1033173712"
  : (import.meta.env.VITE_ADMOB_INTERSTITIAL_UNIT_ID ?? "");

let hasShownInterstitial = false;

export function useInterstitialAd() {
  const shown = useRef(false);

  const showAd = () => {
    if (shown.current || hasShownInterstitial) return;
    if (!INTERSTITIAL_UNIT_ID) return;

    shown.current = true;
    hasShownInterstitial = true;

    if (IS_DEV) {
      console.log("[AdMob] Interstitial would show here (dev mode)");
      return;
    }

    try {
      const adDiv = document.createElement("div");
      adDiv.id = "admob-interstitial-overlay";
      adDiv.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;";

      const ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      ins.style.cssText = "display:block;width:320px;height:480px;";
      ins.setAttribute("data-ad-client", INTERSTITIAL_UNIT_ID.split("/")[0]);
      ins.setAttribute("data-ad-slot", INTERSTITIAL_UNIT_ID.split("/")[1] ?? "");
      ins.setAttribute("data-ad-format", "interstitial");

      const closeBtn = document.createElement("button");
      closeBtn.textContent = "✕ Close";
      closeBtn.style.cssText = "position:absolute;top:16px;right:16px;color:white;background:rgba(255,255,255,0.15);border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:13px;";
      closeBtn.onclick = () => adDiv.remove();

      adDiv.appendChild(ins);
      adDiv.appendChild(closeBtn);
      document.body.appendChild(adDiv);

      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});

      setTimeout(() => adDiv.remove(), 15000);
    } catch {}
  };

  return { showAd };
}
