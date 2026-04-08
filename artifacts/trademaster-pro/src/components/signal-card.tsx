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

function extractGrade(notes: string | null | undefined): "S" | "A" | "B" | null {
  const m = notes?.match(/GRADE\s+([SAB])/i);
  return m ? (m[1].toUpperCase() as "S" | "A" | "B") : null;
}

function extractOI(notes: string | null | undefined): string | null {
  return notes?.match(/OI:\s*([\d.]+[LKM])/)?.[1] ?? null;
}

function extractVol(notes: string | null | undefined): string | null {
  return notes?.match(/Vol:\s*([\d.]+[LKM])/)?.[1] ?? null;
}

function pctChange(entry: string, target: string, buy: boolean = true): { pct: string; pos: boolean } {
  const e = parseFloat(entry), t = parseFloat(target);
  if (!e || !t) return { pct: "", pos: true };
  const pct = buy ? ((t - e) / e) * 100 : ((e - t) / e) * 100;
  return { pct: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, pos: pct >= 0 };
}

function priceGaugePos(sl: number, entry: number, t2: number, val: number): number {
  const range = t2 - sl;
  if (!range) return 50;
  return Math.min(100, Math.max(0, ((val - sl) / range) * 100));
}

function formatShareText(signal: Signal): string {
  const optType = extractOptionType(signal.assetName);
  const expiry = extractExpiry(signal.assetName);
  const t1pct = pctChange(signal.entryPrice, signal.target1, signal.signalType === "buy");
  const t2pct = signal.target2 ? pctChange(signal.entryPrice, signal.target2, signal.signalType === "buy") : null;
  const lines = [
    `📊 *TradeMaster Pro Signal*`, ``,
    `*${signal.assetName}*`,
    `Action: *${signal.signalType.toUpperCase()}*${optType ? ` — *${optType === "CE" ? "CALL" : "PUT"}*` : ""}`,
    expiry ? `Expiry: *${expiry}*` : "",
    ``, `📌 Entry: *₹${signal.entryPrice}*`,
    `🎯 T1: *₹${signal.target1}* (${t1pct.pct})`,
    t2pct && signal.target2 ? `🎯 T2: *₹${signal.target2}* (${t2pct.pct})` : "",
    `🛑 SL: *₹${signal.stopLoss}*`,
    signal.iv ? `📈 IV: ${signal.iv}%` : "",
    signal.pcr ? `⚖️ PCR: ${signal.pcr}` : "",
    ``, `⚠️ Educational only. Not SEBI investment advice.`,
    `— _TradeMaster Pro_`,
  ].filter(Boolean);
  return lines.join("\n");
}

const GRADE_STYLES = {
  S: "bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-amber-900/20",
  A: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
  B: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const GRADE_LABELS = { S: "GRADE S", A: "GRADE A", B: "GRADE B" };

export function SignalCard({ signal, isPremiumUser: _isPremiumUser, adminToken, onStatusUpdate }: SignalCardProps) {
  const [copied, setCopied] = useState(false);
  const [telegramMsg, setTelegramMsg] = useState("");
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const optType = extractOptionType(signal.assetName);
  const expiry  = extractExpiry(signal.assetName);
  const grade   = extractGrade(signal.notes);
  const oi      = extractOI(signal.notes);
  const vol     = extractVol(signal.notes);
  const isBuy   = signal.signalType === "buy";
  const isActive = signal.status === "active";
  const isAuto  = signal.createdBy === "auto-engine";

  const entry = parseFloat(signal.entryPrice);
  const sl    = parseFloat(signal.stopLoss);
  const t1    = parseFloat(signal.target1);
  const t2    = signal.target2 ? parseFloat(signal.target2) : t1 * 1.2;

  const t1pct  = pctChange(signal.entryPrice, signal.target1, isBuy);
  const t2pct  = signal.target2 ? pctChange(signal.entryPrice, signal.target2, isBuy) : null;
  const slPct  = pctChange(signal.entryPrice, signal.stopLoss, !isBuy);

  const entryPos = priceGaugePos(sl, entry, t2, entry);
  const t1Pos    = priceGaugePos(sl, entry, t2, t1);
  const t2Pos    = 100;

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

  const buyColor  = "text-[#00d084]";
  const sellColor = "text-[#ff4466]";
  const dirColor  = isBuy ? buyColor : sellColor;
  const borderColor = isActive
    ? isBuy ? "border-[#00d084]/20" : "border-[#ff4466]/20"
    : "border-[#1a2535]";

  const statusDot = isActive
    ? <span className="flex items-center gap-1 text-[10px] font-mono text-[#00d084]"><span className="w-1.5 h-1.5 rounded-full bg-[#00d084] animate-pulse inline-block" />LIVE</span>
    : signal.status === "target_hit"
      ? <span className="text-[10px] font-mono text-emerald-400">TARGET HIT</span>
      : <span className="text-[10px] font-mono text-red-400">SL HIT</span>;

  return (
    <div className={`rounded border ${borderColor} bg-[#0b1120] overflow-hidden font-mono transition-all hover:border-opacity-50`}
      style={{ boxShadow: isActive ? (isBuy ? "0 0 20px rgba(0,208,132,0.04)" : "0 0 20px rgba(255,68,102,0.04)") : "none" }}>

      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${isActive ? (isBuy ? "border-[#00d084]/15 bg-[#00d084]/5" : "border-[#ff4466]/15 bg-[#ff4466]/5") : "border-[#1a2535] bg-[#0d1525]"}`}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Direction */}
          <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded-sm border ${
            isBuy ? "border-[#00d084]/40 bg-[#00d084]/10 text-[#00d084]" : "border-[#ff4466]/40 bg-[#ff4466]/10 text-[#ff4466]"
          }`}>
            {isBuy ? "▲ BUY" : "▼ SELL"}
          </span>

          {/* Asset name */}
          <span className="text-white font-black text-sm tracking-tight truncate">{signal.assetName}</span>

          {/* Option type */}
          {optType && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm border hidden sm:inline-block ${
              optType === "CE"
                ? "border-blue-400/30 text-blue-300 bg-blue-500/10"
                : "border-orange-400/30 text-orange-300 bg-orange-500/10"
            }`}>
              {optType}
            </span>
          )}

          {/* Expiry */}
          {expiry && (
            <span className="text-[9px] font-mono text-amber-400/80 hidden sm:inline-block">{expiry}</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isAuto && (
            <span className="text-[9px] font-bold text-purple-400 hidden sm:inline">🤖</span>
          )}
          {grade && (
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-sm border ${GRADE_STYLES[grade]}`}>
              {GRADE_LABELS[grade]}
            </span>
          )}
          {statusDot}
        </div>
      </div>

      {/* ── OI / Volume / IV meta row ───────────────────────────────────── */}
      {(oi || vol || signal.iv || signal.pcr) && (
        <div className="flex items-center gap-3 px-3 py-1.5 border-b border-[#1a2535]/60 bg-[#080e1a]">
          {oi && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-[#3a5070] uppercase tracking-widest">OI</span>
              <span className="text-[10px] text-[#7aadcf] font-bold">{oi}</span>
            </div>
          )}
          {vol && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-[#3a5070] uppercase tracking-widest">VOL</span>
              <span className="text-[10px] text-[#7aadcf] font-bold">{vol}</span>
            </div>
          )}
          {signal.iv && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-[#3a5070] uppercase tracking-widest">IV</span>
              <span className="text-[10px] text-amber-400/80 font-bold">{signal.iv}%</span>
            </div>
          )}
          {signal.pcr && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-[#3a5070] uppercase tracking-widest">PCR</span>
              <span className={`text-[10px] font-bold ${parseFloat(signal.pcr) >= 1 ? "text-[#00d084]" : "text-[#ff9944]"}`}>
                {signal.pcr}
              </span>
            </div>
          )}
          <div className="flex-1" />
          {signal.riskReward && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-[#3a5070] uppercase tracking-widest">R:R</span>
              <span className="text-[10px] text-cyan-400 font-bold">{signal.riskReward}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Price section ─────────────────────────────────────────────────── */}
      {/* Row 1: Entry vs SL — full width, high contrast */}
      <div className="grid grid-cols-2 border-b border-[#1a2535]">
        {/* Entry */}
        <div className="px-3 py-2.5 border-r border-[#1a2535]">
          <div className="text-[9px] text-[#3a5070] uppercase tracking-widest mb-1 font-mono">Entry Price</div>
          <div className="text-white font-black text-base leading-none font-mono">
            ₹{entry.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
          <div className="text-[9px] text-[#3a5070] mt-1 font-mono">{isBuy ? "BUY above" : "SELL below"}</div>
        </div>
        {/* Stop Loss — red highlight so it can't be missed */}
        <div className="px-3 py-2.5 bg-[#ff4466]/5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[9px] text-[#ff4466]/70 uppercase tracking-widest font-mono">Stop Loss</span>
            <span className="text-[8px] text-[#ff4466]/50 font-mono font-bold border border-[#ff4466]/20 px-1 rounded">SL</span>
          </div>
          <div className="text-[#ff4466] font-black text-base leading-none font-mono">
            ₹{sl.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
          <div className="text-[9px] text-[#ff4466]/60 mt-1 font-mono font-bold">{slPct.pct} risk</div>
        </div>
      </div>

      {/* Row 2: Targets */}
      <div className="grid grid-cols-2 border-b border-[#1a2535]">
        {/* T1 */}
        <div className="px-3 py-2 border-r border-[#1a2535] bg-[#00d084]/3">
          <div className="text-[9px] text-[#3a5070] uppercase tracking-widest mb-1 font-mono">Target 1</div>
          <div className="text-[#00d084] font-black text-sm leading-none font-mono">
            ₹{t1.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
          <div className="text-[9px] text-[#00d084]/60 mt-0.5 font-mono">{t1pct.pct}</div>
        </div>
        {/* T2 */}
        <div className="px-3 py-2 bg-[#00d084]/2">
          <div className="text-[9px] text-[#3a5070] uppercase tracking-widest mb-1 font-mono">Target 2</div>
          {signal.target2 ? (
            <>
              <div className="text-emerald-400 font-black text-sm leading-none font-mono">
                ₹{parseFloat(signal.target2).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </div>
              {t2pct && <div className="text-[9px] text-emerald-400/60 mt-0.5 font-mono">{t2pct.pct}</div>}
            </>
          ) : (
            <div className="text-[#2a3545] font-bold text-sm font-mono">—</div>
          )}
        </div>
      </div>

      {/* ── Price gauge ─────────────────────────────────────────────────── */}
      {isActive && (
        <div className="px-3 py-2.5 border-b border-[#1a2535]/40">
          <div className="relative h-1.5 bg-[#1a2535] rounded-full overflow-visible">
            {/* SL zone */}
            <div className="absolute left-0 top-0 h-full bg-[#ff4466]/20 rounded-l-full" style={{ width: `${entryPos}%` }} />
            {/* Profit zone */}
            <div className="absolute top-0 h-full bg-[#00d084]/15 rounded-r-full"
              style={{ left: `${entryPos}%`, width: `${100 - entryPos}%` }} />
            {/* T1 marker */}
            <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-[#00d084]/60 rounded-full" style={{ left: `${t1Pos}%` }} />
            {/* Entry marker */}
            <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full border border-[#1a2535] shadow-lg"
              style={{ left: `${entryPos}%`, transform: "translate(-50%, -50%)" }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[8px] text-[#ff4466]/60">SL ₹{sl.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
            <span className="text-[8px] text-white/40">Entry</span>
            <span className="text-[8px] text-[#00d084]/60">T1 ₹{t1.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
            {signal.target2 && <span className="text-[8px] text-emerald-400/60">T2 ₹{parseFloat(signal.target2).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>}
          </div>
        </div>
      )}

      {/* ── Closed result bar ─────────────────────────────────────────── */}
      {!isActive && signal.exitPrice && (
        <div className={`px-3 py-2 border-b border-[#1a2535] flex items-center justify-between ${
          signal.status === "target_hit" ? "bg-emerald-950/30" : "bg-red-950/30"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-bold ${signal.status === "target_hit" ? "text-emerald-400" : "text-red-400"}`}>
              {signal.status === "target_hit" ? "✓ HIT" : "✗ STOPPED"}
            </span>
            <span className={`text-sm font-black ${signal.status === "target_hit" ? "text-emerald-400" : "text-red-400"}`}>
              ₹{parseFloat(signal.exitPrice).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
          </div>
          {signal.closedAt && (
            <span className="text-[9px] text-[#3a5070]">
              {new Date(signal.closedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })} IST
            </span>
          )}
        </div>
      )}

      {/* ── Notes (expandable) ───────────────────────────────────────── */}
      {signal.notes && isActive && (
        <div className="border-b border-[#1a2535]/40">
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[9px] text-[#3a5070] hover:text-[#5a7090] transition-colors"
          >
            <span className="uppercase tracking-widest">Analysis</span>
            <span>{expanded ? "▲" : "▼"}</span>
          </button>
          {expanded && (
            <div className="px-3 pb-2 text-[10px] text-[#4a6080] leading-relaxed font-sans">
              {signal.notes.replace(/GRADE [SAB]\s*\|?\s*/i, "").replace(/Live LTP[^|]+\|?\s*/i, "")}
            </div>
          )}
        </div>
      )}

      {/* ── Actions ─────────────────────────────────────────────────── */}
      {isActive && (
        <div className="flex items-center gap-1.5 px-3 py-2">
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/25 text-[#25D366] rounded text-[10px] font-bold transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.875-1.426A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.952 7.952 0 01-4.073-1.114l-.292-.173-3.014.882.838-3.046-.19-.313A7.948 7.948 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8z"/></svg>
            WA
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1a2535] hover:bg-[#22304a] border border-[#2a3545] text-[#7a9ab5] rounded text-[10px] font-bold transition-colors"
          >
            {copied ? "✓" : "⧉"} {copied ? "Copied" : "Copy"}
          </button>

          {adminToken && (
            <button
              onClick={() => void handleTelegram()}
              disabled={telegramLoading}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1a3050]/50 hover:bg-[#1a3050] border border-[#2a4570]/40 text-[#5a9acf] rounded text-[10px] font-bold transition-colors disabled:opacity-40"
            >
              {telegramLoading ? "…" : telegramMsg || "↗ TG"}
            </button>
          )}

          {adminToken && onStatusUpdate && (
            <>
              <div className="flex-1" />
              <button
                onClick={() => onStatusUpdate(signal.id, "target_hit")}
                className="px-2 py-1.5 bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-700/30 text-emerald-400 rounded text-[9px] font-bold transition-colors"
              >
                ✓ HIT
              </button>
              <button
                onClick={() => onStatusUpdate(signal.id, "sl_hit")}
                className="px-2 py-1.5 bg-red-900/20 hover:bg-red-900/40 border border-red-700/30 text-red-400 rounded text-[9px] font-bold transition-colors"
              >
                ✗ SL
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
