import { useState } from "react";
import { postToTelegram, type Signal } from "@/lib/api";

export type { Signal };

type SignalCardProps = {
  signal: Signal;
  isPremiumUser: boolean;
  adminToken?: string | null;
  onStatusUpdate?: (id: number, status: string) => void;
};

function extractOptionType(assetName: string): "CE" | "PE" | null {
  if (/\bCE\b/i.test(assetName)) return "CE";
  if (/\bPE\b/i.test(assetName)) return "PE";
  return null;
}

function extractExpiry(assetName: string): string | null {
  const m = assetName.match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d{2}\b/i);
  return m ? m[0].toUpperCase() : null;
}

function pctGain(entry: string, target: string): string {
  const e = parseFloat(entry);
  const t = parseFloat(target);
  if (!e || !t) return "";
  return `+${(((t - e) / e) * 100).toFixed(1)}%`;
}

function formatShareText(signal: Signal): string {
  const optType = extractOptionType(signal.assetName);
  const expiry = extractExpiry(signal.assetName);
  const lines = [
    `📊 *TradeMaster Pro Signal*`,
    ``,
    `*${signal.assetName}*`,
    `Action: *${signal.signalType.toUpperCase()}*${optType ? ` — *${optType === "CE" ? "CALL" : "PUT"}*` : ""}`,
    expiry ? `Expiry: *${expiry}*` : "",
    ``,
    `📌 Entry: *₹${signal.entryPrice}*`,
    `🎯 Target: *₹${signal.target1}* (${pctGain(signal.entryPrice, signal.target1)})`,
    signal.target2 ? `🎯 T2: *₹${signal.target2}* (${pctGain(signal.entryPrice, signal.target2)})` : "",
    ``,
    `⚠️ Educational only. Not SEBI investment advice.`,
    `— _TradeMaster Pro_`,
  ].filter(Boolean);
  return lines.join("\n");
}

const STATUS_STYLES: Record<Signal["status"], string> = {
  active:     "bg-blue-500/20 text-blue-300 border-blue-400/40",
  target_hit: "bg-green-500/20 text-green-300 border-green-400/40",
  sl_hit:     "bg-red-500/20 text-red-300 border-red-400/40",
};

const STATUS_LABELS: Record<Signal["status"], string> = {
  active:     "● LIVE",
  target_hit: "✅ TARGET HIT",
  sl_hit:     "❌ SL HIT",
};

export function SignalCard({ signal, isPremiumUser: _isPremiumUser, adminToken, onStatusUpdate }: SignalCardProps) {
  const [copied, setCopied] = useState(false);
  const [telegramMsg, setTelegramMsg] = useState("");
  const [telegramLoading, setTelegramLoading] = useState(false);

  const optType = extractOptionType(signal.assetName);
  const expiry  = extractExpiry(signal.assetName);
  const isBuy   = signal.signalType === "buy";
  const isActive = signal.status === "active";

  const gain = pctGain(signal.entryPrice, signal.target1);
  const gain2 = signal.target2 ? pctGain(signal.entryPrice, signal.target2) : null;

  const handleWhatsApp = () => {
    const text = encodeURIComponent(formatShareText(signal));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formatShareText(signal)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTelegram = async () => {
    if (!adminToken) return;
    setTelegramLoading(true);
    try {
      const html = formatShareText(signal).replace(/\*/g, "<b>").replace(/_/g, "<i>");
      await postToTelegram(html, adminToken);
      setTelegramMsg("Posted!");
    } catch {
      setTelegramMsg("Failed");
    } finally {
      setTelegramLoading(false);
      setTimeout(() => setTelegramMsg(""), 3000);
    }
  };

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      isActive
        ? isBuy
          ? "border-green-500/40 bg-gradient-to-br from-green-950/30 to-[hsl(220,13%,10%)]"
          : "border-red-500/40 bg-gradient-to-br from-red-950/30 to-[hsl(220,13%,10%)]"
        : "border-[hsl(220,13%,20%)] bg-[hsl(220,13%,11%)] opacity-70"
    }`}>

      {/* ── Top bar: asset name + status ─────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 gap-2">
        <h3 className="text-white font-black text-base leading-tight truncate flex-1">
          {signal.assetName}
        </h3>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${STATUS_STYLES[signal.status]}`}>
          {STATUS_LABELS[signal.status]}
        </span>
      </div>

      {/* ── Badge row: BUY/SELL · CE/PE · Expiry ─────────────────────── */}
      <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
        <span className={`text-xs font-black px-3 py-1 rounded-full tracking-widest ${
          isBuy
            ? "bg-green-500 text-black"
            : "bg-red-500 text-white"
        }`}>
          {isBuy ? "▲ BUY" : "▼ SELL"}
        </span>

        {optType && (
          <span className={`text-xs font-black px-3 py-1 rounded-full border tracking-widest ${
            optType === "CE"
              ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
              : "bg-orange-500/20 text-orange-300 border-orange-500/40"
          }`}>
            {optType === "CE" ? "CALL (CE)" : "PUT (PE)"}
          </span>
        )}

        {expiry && (
          <span className="text-xs font-mono text-amber-400 bg-amber-900/20 border border-amber-700/30 px-2.5 py-1 rounded-full">
            {expiry}
          </span>
        )}

        {signal.createdBy === "auto-engine" && (
          <span className="text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">
            🤖 Auto
          </span>
        )}
      </div>

      {/* ── Price row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        {/* Entry */}
        <div className="bg-black/30 rounded-xl p-3 border border-white/5">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1 font-semibold">Entry</div>
          <div className="text-white font-black font-mono text-xl">
            ₹{parseFloat(signal.entryPrice).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Target */}
        <div className="bg-green-950/40 rounded-xl p-3 border border-green-700/30">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1 font-semibold flex items-center gap-1">
            Target
            {gain && <span className="text-green-400 font-mono">{gain}</span>}
          </div>
          <div className="text-green-400 font-black font-mono text-xl">
            ₹{parseFloat(signal.target1).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
          {gain2 && signal.target2 && (
            <div className="text-emerald-400 font-mono text-xs mt-1">
              T2: ₹{parseFloat(signal.target2).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} <span className="text-emerald-500">{gain2}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Closed signal result ──────────────────────────────────────── */}
      {!isActive && signal.exitPrice && (
        <div className={`mx-4 mb-3 rounded-xl px-3 py-2 text-sm font-mono font-bold ${
          signal.status === "target_hit"
            ? "bg-green-950/50 border border-green-700/30 text-green-400"
            : "bg-red-950/50 border border-red-700/30 text-red-400"
        }`}>
          Exit: ₹{parseFloat(signal.exitPrice).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          {signal.closedAt && (
            <span className="text-gray-500 font-normal text-xs ml-2">
              {new Date(signal.closedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })} IST
            </span>
          )}
        </div>
      )}

      {/* ── Share bar ─────────────────────────────────────────────────── */}
      {isActive && (
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={handleWhatsApp}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] rounded-xl py-2 text-xs font-bold transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.875-1.426A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.952 7.952 0 01-4.073-1.114l-.292-.173-3.014.882.838-3.046-.19-.313A7.948 7.948 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8z"/></svg>
            WhatsApp
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 bg-[hsl(220,13%,18%)] hover:bg-[hsl(220,13%,24%)] border border-[hsl(220,13%,26%)] text-gray-300 rounded-xl px-3 py-2 text-xs font-bold transition-colors"
          >
            {copied ? "✓ Copied" : "📋 Copy"}
          </button>

          {adminToken && (
            <button
              onClick={() => void handleTelegram()}
              disabled={telegramLoading}
              className="flex items-center justify-center gap-1.5 bg-blue-900/20 hover:bg-blue-900/35 border border-blue-700/30 text-blue-400 rounded-xl px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50"
            >
              {telegramLoading ? "…" : telegramMsg || "📢 Post"}
            </button>
          )}
        </div>
      )}

      {/* ── Admin close buttons ───────────────────────────────────────── */}
      {adminToken && isActive && onStatusUpdate && (
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={() => onStatusUpdate(signal.id, "target_hit")}
            className="flex-1 bg-green-900/30 hover:bg-green-900/50 border border-green-700/40 text-green-400 rounded-xl py-1.5 text-xs font-bold transition-colors"
          >
            ✅ Mark Target Hit
          </button>
          <button
            onClick={() => onStatusUpdate(signal.id, "sl_hit")}
            className="flex-1 bg-red-900/30 hover:bg-red-900/50 border border-red-700/40 text-red-400 rounded-xl py-1.5 text-xs font-bold transition-colors"
          >
            ❌ Mark SL Hit
          </button>
        </div>
      )}
    </div>
  );
}
