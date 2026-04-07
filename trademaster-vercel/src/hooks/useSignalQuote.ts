import { useState, useEffect, useRef } from "react";
import { fetchQuote, resolveUnderlyingInfo, type LiveQuote, type UnderlyingInfo } from "@/lib/api";

export function useSignalQuote(assetName: string, segment: string) {
  const info: UnderlyingInfo = resolveUnderlyingInfo(assetName, segment);
  const [quote, setQuote] = useState<LiveQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function load() {
      try {
        const { quotes } = await fetchQuote(info.yahooSymbol);
        if (mountedRef.current) {
          setQuote(quotes[info.yahooSymbol] ?? null);
          setLastUpdated(new Date());
          setLoading(false);
        }
      } catch {
        if (mountedRef.current) setLoading(false);
      }
      if (mountedRef.current) {
        timeoutId = setTimeout(load, 30_000);
      }
    }

    load();
    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
    };
  }, [info.yahooSymbol]);

  return { quote, loading, info, lastUpdated };
}

export type TradingTip = {
  text: string;
  urgency: "high" | "medium" | "low" | "info";
  emoji: string;
};

export function getActionableTip(
  signalType: "buy" | "sell",
  entryPrice: string,
  stopLoss: string,
  target1: string,
  livePrice: number,
): TradingTip {
  const entry = parseFloat(entryPrice);
  const sl = parseFloat(stopLoss);
  const t1 = parseFloat(target1);

  if (isNaN(entry) || isNaN(sl) || isNaN(t1) || entryPrice === "—") {
    return { text: "Upgrade to Elite to see entry zone tips", urgency: "info", emoji: "🔒" };
  }

  const pctFromEntry = ((livePrice - entry) / entry) * 100;
  const pctToT1 = ((t1 - livePrice) / livePrice) * 100;
  const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  void pctToT1;

  if (signalType === "buy") {
    if (Math.abs(pctFromEntry) < 0.4) {
      return { text: `Price exactly at entry zone ₹${fmt(entry)} — ideal buy zone`, urgency: "high", emoji: "⚡" };
    }
    if (pctFromEntry < 0 && pctFromEntry > -2) {
      return { text: `Approaching entry — set buy alert at ₹${fmt(entry)} (${Math.abs(pctFromEntry).toFixed(1)}% away)`, urgency: "medium", emoji: "🔔" };
    }
    if (pctFromEntry < -2 && pctFromEntry > -5) {
      return { text: `Price ₹${fmt(entry - livePrice)} below entry — wait for bounce to ₹${fmt(entry)}`, urgency: "low", emoji: "⏳" };
    }
    if (pctFromEntry < -5) {
      return { text: `Far below entry — strong support may exist; wait for confirmation`, urgency: "info", emoji: "👀" };
    }
    if (pctFromEntry > 0 && pctFromEntry < 1.5) {
      return { text: `Slightly above entry — buy on any dip to ₹${fmt(entry)}`, urgency: "medium", emoji: "📉" };
    }
    if (pctFromEntry >= 1.5 && pctFromEntry < 3) {
      return { text: `Price ₹${fmt(livePrice - entry)} above entry — avoid chasing; wait for retest`, urgency: "low", emoji: "⚠️" };
    }
    return { text: `Price ran ${pctFromEntry.toFixed(1)}% above entry — monitor for next opportunity`, urgency: "info", emoji: "🎯" };
  } else {
    if (Math.abs(pctFromEntry) < 0.4) {
      return { text: `Price at resistance ₹${fmt(entry)} — ideal short/sell zone`, urgency: "high", emoji: "⚡" };
    }
    if (pctFromEntry > 0 && pctFromEntry < 2) {
      return { text: `Approaching resistance — set sell alert at ₹${fmt(entry)} (${pctFromEntry.toFixed(1)}% away)`, urgency: "medium", emoji: "🔔" };
    }
    if (pctFromEntry >= 2 && pctFromEntry < 5) {
      return { text: `Price ₹${fmt(livePrice - entry)} above resistance — wait for reversal signal`, urgency: "low", emoji: "⏳" };
    }
    if (pctFromEntry >= 5) {
      return { text: `Price far above resistance — stop-loss may be at risk`, urgency: "info", emoji: "🛑" };
    }
    if (pctFromEntry < 0 && pctFromEntry > -1.5) {
      return { text: `Slightly below resistance — sell on any rally to ₹${fmt(entry)}`, urgency: "medium", emoji: "📈" };
    }
    return { text: `Price fell ${Math.abs(pctFromEntry).toFixed(1)}% below sell entry — avoid chasing down`, urgency: "info", emoji: "👀" };
  }
}
