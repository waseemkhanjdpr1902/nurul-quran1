import { useState } from "react";
import { postToTelegram, type Signal } from "@/lib/api";
import { useSignalQuote, getActionableTip } from "@/hooks/useSignalQuote";

export type { Signal };

type SignalCardProps = {
  signal: Signal;
  isPremiumUser: boolean;
  adminToken?: string | null;
  onStatusUpdate?: (id: number, status: string) => void;
};

const SEGMENT_LABELS: Record<string, string> = {
  intraday: "⚡ Intraday",
  nifty: "📈 Nifty 50",
  banknifty: "🏦 BankNifty",
  options: "🔄 Options",
  futures: "📊 Futures",
  fno: "🔄 F&O",
  equity: "🏢 Stocks",
  stocks: "🏢 Stocks",
  commodity: "🥇 Commodity",
  currency: "💱 Currency",
};

function formatTelegramMessage(signal: Signal): string {
  const emoji = signal.signalType === "buy" ? "🟢" : "🔴";
  const lines = [
    `${emoji} <b>TradeMaster Pro — ${signal.signalType.toUpperCase()}</b>`,
    ``,
    `📊 <b>${signal.assetName}</b> [${(SEGMENT_LABELS[signal.segment] ?? signal.segment).toUpperCase()}]`,
    ``,
    `📌 Entry: <b>₹${signal.entryPrice}</b>`,
    `🛑 Stop Loss: <b>₹${signal.stopLoss}</b>`,
    `🎯 Target 1: <b>₹${signal.target1}</b>`,
  ];
  if (signal.target2) lines.push(`🎯 Target 2: <b>₹${signal.target2}</b>`);
  if (signal.riskReward) lines.push(`⚖️ Risk:Reward = <b>1:${signal.riskReward}</b>`);
  if (signal.iv) lines.push(`📈 IV: ${signal.iv}`);
  if (signal.pcr) lines.push(`📊 PCR: ${signal.pcr}`);
  if (signal.notes) lines.push(``, `🧠 <i>${signal.notes}</i>`);
  lines.push(``, `⚠️ Educational only. Not SEBI-registered investment advice.`);
  return lines.join("\n");
}

function formatShareMessage(signal: Signal): string {
  const lines = [
    `*TradeMaster Pro Signal*`,
    ``,
    `*${signal.assetName}* [${(SEGMENT_LABELS[signal.segment] ?? signal.segment).toUpperCase()}]`,
    `Signal: *${signal.signalType.toUpperCase()}*`,
    ``,
    `Entry: *₹${signal.entryPrice}*`,
    `Stop Loss: *₹${signal.stopLoss}*`,
    `Target 1: *₹${signal.target1}*`,
  ];
  if (signal.target2) lines.push(`Target 2: *₹${signal.target2}*`);
  if (signal.riskReward) lines.push(`R:R — *1:${signal.riskReward}*`);
  if (signal.notes) lines.push(``, `_${signal.notes}_`);
  lines.push(``, `⚠️ Educational only. Not SEBI investment advice.`);
  return lines.join("\n");
}

const STATUS_CONFIG: Record<Signal["status"], { label: string; color: string }> = {
  active: { label: "LIVE", color: "bg-blue-500/20 text-blue-300 border-blue-400/50" },
  target_hit: { label: "✅ TARGET HIT", color: "bg-green-500/20 text-green-300 border-green-400/50" },
  sl_hit: { label: "❌ SL HIT", color: "bg-red-500/20 text-red-300 border-red-400/50" },
};

const URGENCY_STYLES = {
  high: "bg-emerald-950/70 border-emerald-400/50 text-emerald-300",
  medium: "bg-blue-950/60 border-blue-400/40 text-blue-300",
  low: "bg-amber-950/50 border-amber-500/30 text-amber-300",
  info: "bg-[hsl(220,13%,15%)] border-[hsl(220,13%,22%)] text-gray-400",
};

function fmtPrice(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function pctTo(from: number, to: number) {
  if (!from || !to) return null;
  return (((to - from) / from) * 100).toFixed(1);
}

export function SignalCard({ signal, isPremiumUser, adminToken, onStatusUpdate }: SignalCardProps) {
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramMsg, setTelegramMsg] = useState("");
  // TESTING MODE: lock disabled — re-enable after accuracy testing
  const isLocked = false;
  const isBuy = signal.signalType === "buy";
  const status = STATUS_CONFIG[signal.status];

  const { quote, loading: quoteLoading, lastUpdated, info } = useSignalQuote(signal.assetName, signal.segment);
  const livePrice = quote?.price ?? null;

  const tip = livePrice != null && signal.status === "active"
    ? getActionableTip(signal.signalType, signal.entryPrice, signal.stopLoss, signal.target1, livePrice)
    : null;

  const pctToEntry = livePrice != null && !isNaN(parseFloat(signal.entryPrice))
    ? pctTo(livePrice, parseFloat(signal.entryPrice))
    : null;
  const pctToT1 = livePrice != null && !isNaN(parseFloat(signal.target1))
    ? pctTo(livePrice, parseFloat(signal.target1))
    : null;

  const changePos = (quote?.changePercent ?? 0) >= 0;

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(formatShareMessage(signal))}`, "_blank");
  };
  const handleTelegramShare = () => {
    const appUrl = `${window.location.origin}${window.location.pathname}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(formatShareMessage(signal))}`, "_blank");
  };
  const handlePostToChannel = async () => {
    if (!adminToken) return;
    setTelegramLoading(true);
    try {
      await postToTelegram(formatTelegramMessage(signal), adminToken);
      setTelegramMsg("Posted!");
    } catch (err: unknown) {
      setTelegramMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setTelegramLoading(false);
      setTimeout(() => setTelegramMsg(""), 3000);
    }
  };

  return (
    <div className={`signal-card rounded-xl p-4 relative overflow-hidden border ${
      signal.status !== "active" ? "opacity-70" : ""
    } ${isBuy ? "border-green-900/40" : "border-red-900/40"} bg-[hsl(220,13%,11%)]`}>

      {isLocked && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10 gap-2">
          <div className="text-4xl">🔒</div>
          <div className="text-sm font-bold text-white">Pro Educator Content</div>
          <div className="text-xs text-gray-400 text-center px-4">Subscribe to unlock full S&amp;R levels and price objectives</div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-black px-2 py-0.5 rounded border tracking-wide ${
              isBuy ? "bg-green-500/20 text-green-400 border-green-500/40" : "bg-red-500/20 text-red-400 border-red-500/40"
            }`}>
              {isBuy ? "▲ Bullish Setup" : "▼ Bearish Setup"}
            </span>
            <span className="text-xs text-gray-500 bg-[hsl(220,13%,18%)] px-2 py-0.5 rounded">
              {SEGMENT_LABELS[signal.segment] ?? signal.segment.toUpperCase()}
            </span>
            {signal.isPremium && (
              <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-bold">PRO</span>
            )}
          </div>
          <h3 className="text-white font-black text-base leading-tight truncate">{signal.assetName}</h3>
        </div>
        <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded border font-bold ${status.color}`}>{status.label}</span>
          {signal.riskReward && (
            <span className="text-xs text-gray-500 font-mono">1:{signal.riskReward}</span>
          )}
        </div>
      </div>

      {/* Live Price Band */}
      <div className={`rounded-lg px-3 py-2.5 mb-3 border ${
        quoteLoading && !livePrice
          ? "bg-[hsl(220,13%,16%)] border-[hsl(220,13%,22%)]"
          : livePrice
            ? changePos
              ? "bg-green-950/30 border-green-900/40"
              : "bg-red-950/30 border-red-900/40"
            : "bg-[hsl(220,13%,16%)] border-[hsl(220,13%,22%)] opacity-60"
      }`}>
        {/* F&O Contract badge */}
        {info.isFnO && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <span className="text-xs text-gray-500">Contract:</span>
            <span className="text-xs font-mono font-bold text-amber-300 bg-amber-900/25 border border-amber-700/30 px-2 py-0.5 rounded">
              {signal.assetName}
            </span>
          </div>
        )}

        {quoteLoading && !livePrice ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs text-gray-500">Fetching live price…</span>
          </div>
        ) : livePrice ? (
          <div className="flex items-center justify-between flex-wrap gap-1">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${changePos ? "bg-green-400" : "bg-red-400"}`} />
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{info.spotLabel}</span>
              <span className={`font-black font-mono text-sm ${changePos ? "text-green-300" : "text-red-300"}`}>
                ₹{fmtPrice(livePrice)}
              </span>
              {quote?.changePercent != null && (
                <span className={`text-xs font-mono ${changePos ? "text-green-400" : "text-red-400"}`}>
                  {changePos ? "▲" : "▼"} {Math.abs(quote.changePercent).toFixed(2)}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              {pctToEntry !== null && signal.entryPrice !== "—" && (
                <span className="text-gray-500">
                  Entry: <span className={parseFloat(pctToEntry) < 0 ? "text-red-400" : "text-amber-400"}>
                    {parseFloat(pctToEntry) >= 0 ? "+" : ""}{pctToEntry}%
                  </span>
                </span>
              )}
              {pctToT1 !== null && signal.target1 !== "—" && (
                <span className="text-gray-500">
                  T1: <span className="text-emerald-400">
                    {parseFloat(pctToT1) >= 0 ? "+" : ""}{pctToT1}%
                  </span>
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Live data unavailable — market may be closed</span>
          </div>
        )}
        {lastUpdated && livePrice && (
          <div className="text-xs text-gray-600 mt-1 font-mono">
            Updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        )}
      </div>

      {/* Support / Resistance / Target Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-[hsl(220,13%,16%)] rounded-lg p-2.5">
          <div className="text-xs text-gray-500 mb-0.5">Entry / Support</div>
          <div className="text-white font-black font-mono text-sm">
            {signal.entryPrice === "—" ? <span className="text-gray-600">—</span> : `₹${signal.entryPrice}`}
          </div>
        </div>
        <div className="bg-red-950/40 border border-red-900/30 rounded-lg p-2.5">
          <div className="text-xs text-gray-500 mb-0.5">Stop Loss</div>
          <div className="text-red-400 font-black font-mono text-sm">
            {signal.stopLoss === "—" ? <span className="text-gray-600">—</span> : `₹${signal.stopLoss}`}
          </div>
        </div>
        <div className="bg-green-950/40 border border-green-900/30 rounded-lg p-2.5">
          <div className="text-xs text-gray-500 mb-0.5">
            Target 1
            {livePrice && signal.target1 !== "—" && pctToT1 && (
              <span className="ml-1 text-emerald-500">({parseFloat(pctToT1) >= 0 ? "+" : ""}{pctToT1}%)</span>
            )}
          </div>
          <div className="text-green-400 font-black font-mono text-sm">
            {signal.target1 === "—" ? <span className="text-gray-600">—</span> : `₹${signal.target1}`}
          </div>
        </div>
        {signal.target2 ? (
          <div className="bg-emerald-950/40 border border-emerald-900/30 rounded-lg p-2.5">
            <div className="text-xs text-gray-500 mb-0.5">
              Target 2
              {livePrice && signal.target2 !== "—" && (
                <span className="ml-1 text-emerald-500">
                  ({(() => {
                    const p = pctTo(livePrice, parseFloat(signal.target2 ?? "0"));
                    return p ? `${parseFloat(p) >= 0 ? "+" : ""}${p}%` : "";
                  })()})
                </span>
              )}
            </div>
            <div className="text-emerald-400 font-black font-mono text-sm">{`₹${signal.target2}`}</div>
          </div>
        ) : (
          <div className="bg-[hsl(220,13%,16%)] rounded-lg p-2.5 opacity-40">
            <div className="text-xs text-gray-500 mb-0.5">Target 2</div>
            <div className="text-gray-600 font-mono text-sm">—</div>
          </div>
        )}
      </div>

      {/* Day High / Low from live data */}
      {livePrice && (quote?.high || quote?.low) && (
        <div className="flex gap-2 mb-3">
          {quote?.high && (
            <div className="bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,22%)] rounded-lg px-3 py-1.5 flex-1">
              <span className="text-xs text-gray-500 mr-1">Day H</span>
              <span className="text-xs font-mono font-bold text-gray-300">₹{fmtPrice(quote.high)}</span>
            </div>
          )}
          {quote?.low && (
            <div className="bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,22%)] rounded-lg px-3 py-1.5 flex-1">
              <span className="text-xs text-gray-500 mr-1">Day L</span>
              <span className="text-xs font-mono font-bold text-gray-300">₹{fmtPrice(quote.low)}</span>
            </div>
          )}
        </div>
      )}

      {/* IV / PCR */}
      {(signal.iv || signal.pcr) && (
        <div className="flex gap-2 mb-3">
          {signal.iv && (
            <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg px-3 py-1.5">
              <span className="text-xs text-gray-500 mr-1.5">IV</span>
              <span className="text-xs font-mono font-bold text-purple-400">{signal.iv}</span>
            </div>
          )}
          {signal.pcr && (
            <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg px-3 py-1.5">
              <span className="text-xs text-gray-500 mr-1.5">PCR</span>
              <span className="text-xs font-mono font-bold text-blue-400">{signal.pcr}</span>
            </div>
          )}
        </div>
      )}

      {/* Actionable Trading Tip */}
      {tip && (
        <div className={`rounded-lg px-3 py-2 mb-3 border ${URGENCY_STYLES[tip.urgency]}`}>
          <div className="text-xs leading-relaxed">
            <span className="font-semibold mr-1.5">{tip.emoji} Trading Tip:</span>
            {tip.text}
          </div>
        </div>
      )}

      {/* Analyst Notes */}
      {signal.notes && (
        <div className="bg-[hsl(220,13%,15%)] border border-[hsl(220,13%,22%)] rounded-lg px-3 py-2 mb-3">
          <div className="text-xs text-gray-400 leading-relaxed">
            <span className="text-gray-600 font-semibold mr-1">🧠 Analyst:</span>
            {signal.notes}
          </div>
        </div>
      )}

      {/* Share Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={handleWhatsApp}
          className="flex items-center gap-1 text-xs bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/25 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          📱 WhatsApp
        </button>
        <button
          onClick={handleTelegramShare}
          className="flex items-center gap-1 text-xs bg-[#229ED9]/10 hover:bg-[#229ED9]/20 text-[#229ED9] border border-[#229ED9]/25 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          ✈️ Telegram
        </button>
        {adminToken && (
          <button
            onClick={handlePostToChannel}
            disabled={telegramLoading}
            className="flex items-center gap-1 text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/25 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            📢 {telegramLoading ? "…" : telegramMsg || "Post to Channel"}
          </button>
        )}
        {adminToken && onStatusUpdate && signal.status === "active" && (
          <>
            <button
              onClick={() => onStatusUpdate(signal.id, "target_hit")}
              className="text-xs text-green-400 hover:text-green-300 px-2.5 py-1.5 bg-green-500/10 rounded-lg border border-green-500/25 transition-colors"
            >
              ✅ Hit
            </button>
            <button
              onClick={() => onStatusUpdate(signal.id, "sl_hit")}
              className="text-xs text-red-400 hover:text-red-300 px-2.5 py-1.5 bg-red-500/10 rounded-lg border border-red-500/25 transition-colors"
            >
              ❌ SL
            </button>
          </>
        )}
      </div>

      <div className="mt-3 pt-2.5 border-t border-[hsl(220,13%,18%)]">
        <span className="text-xs text-gray-600 font-mono">
          {new Date(signal.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
        </span>
      </div>
    </div>
  );
}
