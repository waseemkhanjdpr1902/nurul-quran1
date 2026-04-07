/**
 * Signal Pulse Engine — Momentum Alerts Dashboard
 * Spec: 1-min candle breaks 5-min H/L · 9EMA + VWAP · OI Velocity · Volume >150% avg
 * T1 = 0.5% · T2 = 1% · Projected Support = 0.3%
 * Premium: OI Velocity alerts gated behind Razorpay subscription
 */

import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = "/api/trademaster";

// ── Types ─────────────────────────────────────────────────────────────────────

type TradeStatus = "ACTIVE" | "T1_HIT" | "T2_HIT" | "SL_HIT" | "EXPIRED";
type SignalGrade = "A" | "B";
type SignalDir   = "BUY" | "SELL";

interface ScalpSignal {
  id:          string;
  index:       "NIFTY" | "BANKNIFTY";
  dir:         SignalDir;
  grade:       SignalGrade;
  optionName:  string;
  entry:       number;
  stopLoss:    number;
  target1:     number;
  target2:     number;
  spotAtEntry: number;
  vwap:        number;
  rsi7:        number;
  oiVelocity:  number;
  volumeRatio: number;
  reason:      string;
  status:      TradeStatus;
  trailingSlActive: boolean;
  createdAt:   string;
  closedAt?:   string;
  exitPrice?:  number;
}

interface ScalpStats {
  totalSignals: number;
  t1Hit:    number;
  t2Hit:    number;
  slHit:    number;
  active:   number;
  winRate:  number;
  netPointsNifty:     number;
  netPointsBankNifty: number;
  lastUpdated: string;
}

interface LiveData {
  nifty:     { price: number; change: number; changePct: number };
  banknifty: { price: number; change: number; changePct: number };
  vwapNifty: number;
  vwapBankNifty: number;
  rsiNifty:  number;
  rsiBankNifty: number;
  ema9Nifty:  number;
  ema21Nifty: number;
  ema9BankNifty:  number;
  ema21BankNifty: number;
  atmCallOiNifty:      number;
  atmPutOiNifty:       number;
  atmCallOiBankNifty:  number;
  atmPutOiBankNifty:   number;
  callOiVelocityNifty:     number;
  putOiVelocityNifty:      number;
  callOiVelocityBankNifty: number;
  putOiVelocityBankNifty:  number;
  volumeRatioNifty:     number;
  volumeRatioBankNifty: number;
  momentum: {
    nifty:     { rsiSpeed: number; burst: boolean };
    banknifty: { rsiSpeed: number; burst: boolean };
  };
  isMarketOpen:  boolean;
  isPrimeWindow: boolean;
  lastUpdated:   string;
}

// ── Sound ─────────────────────────────────────────────────────────────────────

function playT1Sound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const playTone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = "sine";
      g.gain.setValueAtTime(0.3, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur + 0.1);
    };
    playTone(523, 0, 0.15); playTone(659, 0.15, 0.15); playTone(784, 0.30, 0.25);
  } catch { /* ignore */ }
}

function playSignalSound(dir: SignalDir) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.frequency.value = dir === "BUY" ? 880 : 440; osc.type = "square";
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.35);
  } catch { /* ignore */ }
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(n: number, d = 2): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function timeStr(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" });
}
function timeDiff(from: string, to?: string): string {
  const ms = (to ? new Date(to) : new Date()).getTime() - new Date(from).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60)  return `${s}s`;
  if (s < 3600) return `${Math.floor(s/60)}m ${s%60}s`;
  return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
}

function statusConfig(status: TradeStatus) {
  switch (status) {
    case "ACTIVE":  return { label: "● Active",          cls: "text-amber-400 border-amber-500/40 bg-amber-500/10" };
    case "T1_HIT":  return { label: "✓ Proj. Resistance 1", cls: "text-green-400 border-green-500/40 bg-green-500/10" };
    case "T2_HIT":  return { label: "✓✓ Proj. Resistance 2", cls: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" };
    case "SL_HIT":  return { label: "✗ Proj. Support Hit",  cls: "text-red-400 border-red-500/40 bg-red-500/10" };
    case "EXPIRED": return { label: "Expired",           cls: "text-gray-500 border-gray-700/40 bg-gray-700/10" };
  }
}

// ── Disclaimer Popup ──────────────────────────────────────────────────────────

function DisclaimerPopup({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,22%)] rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-2xl">⚡</div>
          <div>
            <h2 className="text-white font-black text-lg">Signal Pulse Engine</h2>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">Educational Tool — Read Before Proceeding</p>
          </div>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 text-sm text-gray-300 space-y-2">
          <p className="font-bold text-red-400">⚠ This tool is for educational data analysis only.</p>
          <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
            <li>NOT registered with SEBI as an investment advisor or research analyst.</li>
            <li>"Momentum Alerts" are algorithmic pattern detections, <strong className="text-white">not</strong> investment recommendations.</li>
            <li>"Projected Resistance / Support" are statistical estimates — not guaranteed price levels.</li>
            <li>Paper trade only. Real trading carries substantial risk of capital loss.</li>
            <li>Past signal accuracy does not guarantee future results.</li>
          </ul>
        </div>

        <label className="flex items-start gap-3 cursor-pointer mb-5">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            className="mt-0.5 accent-amber-500 w-4 h-4 shrink-0"
          />
          <span className="text-sm text-gray-400">
            I understand this is an <strong className="text-white">educational data analysis tool</strong>. I will use it for paper trading only and will not rely on it as financial advice.
          </span>
        </label>

        <button
          disabled={!checked}
          onClick={onAccept}
          className={`w-full py-3 rounded-xl font-black text-sm transition-all ${
            checked
              ? "bg-amber-500 hover:bg-amber-400 text-black"
              : "bg-[hsl(220,13%,18%)] text-gray-600 cursor-not-allowed"
          }`}
        >
          {checked ? "Enter Signal Pulse Engine →" : "Check the box above to continue"}
        </button>
      </div>
    </div>
  );
}

// ── Razorpay Premium Modal ────────────────────────────────────────────────────

declare global {
  interface Window { Razorpay: new (opts: Record<string, unknown>) => { open(): void }; }
}

function PremiumModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handlePay() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/scalp/premium-order`, { method: "POST" });
      if (!res.ok) throw new Error("Could not create order. Try again.");
      const { orderId, amount, currency, keyId } = await res.json() as { orderId: string; amount: number; currency: string; keyId: string };

      if (!window.Razorpay) throw new Error("Razorpay SDK not loaded. Refresh and retry.");

      const rz = new window.Razorpay({
        key:        keyId,
        amount,
        currency,
        name:       "TradeMaster Pro",
        description:"Signal Pulse Engine — OI Velocity Premium",
        order_id:   orderId,
        prefill:    {},
        theme:      { color: "#f59e0b" },
        handler:    () => {
          window.location.reload();
        },
      });
      rz.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[hsl(220,13%,12%)] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">🔒</div>
          <h2 className="text-white font-black text-xl">OI Velocity Alerts</h2>
          <p className="text-amber-400 text-sm mt-1">Premium Feature</p>
        </div>

        <div className="space-y-3 mb-6">
          {[
            { icon: "⚡", text: "Real-time OI Change Velocity (every 60s)" },
            { icon: "📊", text: "Grade A signals: All 3 conditions confirmed" },
            { icon: "🎯", text: "Call & Put OI short-covering detection" },
            { icon: "🔔", text: "Instant alerts with sound + visual flash" },
          ].map(f => (
            <div key={f.text} className="flex items-center gap-3 text-sm text-gray-300">
              <span className="text-lg shrink-0">{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center mb-4">
          <div className="text-amber-400 text-xs uppercase tracking-widest mb-1">Educational Access</div>
          <div className="text-white font-black text-2xl">₹499 <span className="text-sm font-normal text-gray-500">/ month</span></div>
          <div className="text-gray-500 text-xs mt-1">Paper trading & analysis only · No real trades</div>
        </div>

        {error && <p className="text-red-400 text-xs text-center mb-3">{error}</p>}

        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/40 text-black font-black rounded-xl text-sm mb-3 transition-all"
        >
          {loading ? "Opening Payment…" : "Unlock OI Velocity · ₹499/mo"}
        </button>
        <button onClick={onClose} className="w-full py-2 text-gray-600 hover:text-gray-400 text-sm">
          Continue with Grade B signals (free)
        </button>
      </div>
    </div>
  );
}

// ── Gauge Bar ─────────────────────────────────────────────────────────────────

function GaugeBar({ value, min, max, label, color = "green" }: {
  value: number; min: number; max: number; label: string; color?: string;
}) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const colorMap: Record<string, string> = {
    green: "bg-green-500", red: "bg-red-500", amber: "bg-amber-400",
    blue: "bg-blue-500", purple: "bg-purple-500",
  };
  return (
    <div>
      <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
        <span>{label}</span>
        <span className="font-mono font-bold text-white">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-[hsl(220,13%,20%)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${colorMap[color] ?? "bg-green-500"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── OI Velocity Pill (locked for free users) ──────────────────────────────────

function OIVelocityPill({ value, label, isPremium, onUnlock }: {
  value: number; label: string; isPremium: boolean; onUnlock: () => void;
}) {
  if (!isPremium) {
    return (
      <div className="flex flex-col items-center cursor-pointer" onClick={onUnlock}>
        <div className="text-[9px] text-gray-600 uppercase tracking-wide mb-0.5">{label}</div>
        <div className="text-[10px] font-black px-2 py-0.5 rounded border text-amber-400 bg-amber-500/10 border-amber-500/25 flex items-center gap-1">
          🔒 Premium
        </div>
      </div>
    );
  }
  const isPos = value > 0;
  return (
    <div className="flex flex-col items-center">
      <div className="text-[9px] text-gray-600 uppercase tracking-wide mb-0.5">{label}</div>
      <div className={`text-[10px] font-black px-2 py-0.5 rounded border font-mono ${
        isPos ? "text-green-400 bg-green-500/10 border-green-500/25"
              : "text-red-400 bg-red-500/10 border-red-500/25"
      }`}>
        {isPos ? "+" : ""}{(value / 1000).toFixed(1)}K/m
      </div>
    </div>
  );
}

// ── Momentum Alert Row ────────────────────────────────────────────────────────

function AlertRow({ signal, isNew, isPremium, onUnlock }: {
  signal: ScalpSignal; isNew: boolean; isPremium: boolean; onUnlock: () => void;
}) {
  const isBuy   = signal.dir === "BUY";
  const status  = statusConfig(signal.status);
  const [glow, setGlow] = useState(isNew);

  useEffect(() => {
    if (!isNew) return;
    const t = setTimeout(() => setGlow(false), 3500);
    return () => clearTimeout(t);
  }, [isNew]);

  const pnlPct = signal.exitPrice
    ? isBuy
      ? ((signal.exitPrice - signal.entry) / signal.entry) * 100
      : ((signal.entry - signal.exitPrice) / signal.entry) * 100
    : null;

  const isGradeA = signal.grade === "A";

  return (
    <div className={`rounded-xl p-3 border transition-all duration-500 ${
      glow
        ? isBuy ? "bg-green-950/60 border-green-500/60 shadow-lg shadow-green-900/30"
                : "bg-red-950/60 border-red-500/60 shadow-lg shadow-red-900/30"
        : "bg-[hsl(220,13%,12%)] border-[hsl(220,13%,20%)]"
    }`}>
      <div className="flex items-start gap-3 flex-wrap">

        {/* Direction + Grade */}
        <div className="flex flex-col gap-1 min-w-[100px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
              isBuy ? "text-green-400 bg-green-500/20 border-green-500/40"
                    : "text-red-400 bg-red-500/20 border-red-500/40"
            }`}>
              {isBuy ? "▲ BUY" : "▼ SELL"}
            </span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
              isGradeA
                ? "text-amber-400 bg-amber-500/15 border-amber-500/30"
                : "text-blue-400 bg-blue-500/15 border-blue-500/30"
            }`} title={isGradeA ? "All 3 conditions: Price + OI Velocity + Volume" : "2 of 3: Price + Volume"}>
              {isGradeA ? "★ Grade A" : "◆ Grade B"}
            </span>
          </div>
          <div className="text-white font-black text-sm">{signal.index}</div>
          <div className="text-[10px] text-gray-500 font-mono">{signal.optionName}</div>
        </div>

        {/* Prices */}
        <div className="flex-1 min-w-[220px]">
          <div className="grid grid-cols-4 gap-2 text-xs font-mono">
            <div>
              <div className="text-[9px] text-gray-600 uppercase">Entry</div>
              <div className="text-white font-bold">{fmt(signal.entry)}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-600 uppercase">Proj. Support</div>
              <div className={`font-bold ${signal.trailingSlActive ? "text-amber-400" : "text-red-400"}`}>
                {fmt(signal.stopLoss)}
                {signal.trailingSlActive && <span className="text-[8px] ml-1 text-amber-300">●trail</span>}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-gray-600 uppercase">Proj. R1</div>
              <div className="text-green-400 font-bold">{fmt(signal.target1)}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-600 uppercase">Proj. R2</div>
              <div className="text-emerald-400 font-bold">{fmt(signal.target2)}</div>
            </div>
          </div>
          {/* Indicators */}
          <div className="flex flex-wrap gap-2 mt-1.5 text-[10px]">
            <span className="text-gray-600">VWAP <span className="text-gray-400 font-mono">{fmt(signal.vwap)}</span></span>
            <span className="text-gray-600">RSI <span className="font-mono text-gray-400">{signal.rsi7}</span></span>
            <span className="text-gray-600">Vol <span className={`font-mono font-bold ${signal.volumeRatio >= 1.5 ? "text-amber-400" : "text-gray-400"}`}>{signal.volumeRatio}×</span></span>
            {isPremium && signal.oiVelocity !== 0 && (
              <span className="text-gray-600">OI Vel <span className={`font-mono font-bold ${signal.oiVelocity < 0 ? "text-green-400" : "text-red-400"}`}>{(signal.oiVelocity/1000).toFixed(1)}K/m</span></span>
            )}
            {!isPremium && isGradeA && (
              <span className="text-amber-500/60 cursor-pointer hover:text-amber-400 transition-colors" onClick={onUnlock}>🔒 OI Vel (Premium)</span>
            )}
          </div>
        </div>

        {/* Status + Time Taken */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${status.cls}`}>{status.label}</span>
          {pnlPct !== null && (
            <span className={`text-xs font-black font-mono ${pnlPct >= 0 ? "text-green-400" : "text-red-400"}`}>
              {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
            </span>
          )}
          <div className="text-[9px] text-gray-600 font-mono">Entry {timeStr(signal.createdAt)}</div>
          {signal.closedAt && (
            <div className="text-[9px] text-gray-500 font-mono">Closed {timeStr(signal.closedAt)} · {timeDiff(signal.createdAt, signal.closedAt)}</div>
          )}
          {!signal.closedAt && signal.status === "ACTIVE" && (
            <div className="text-[9px] text-amber-500/60 font-mono">Open {timeDiff(signal.createdAt)}</div>
          )}
        </div>
      </div>

      {/* Signal Reason */}
      <div className="mt-2 text-[10px] text-gray-600 border-t border-[hsl(220,13%,18%)] pt-1.5">
        💡 {signal.reason}
      </div>
    </div>
  );
}

// ── Trade Ledger Table (spec format) ──────────────────────────────────────────

function TradeLedger({ signals }: { signals: ScalpSignal[] }) {
  const closed = signals.filter(s => s.status !== "ACTIVE" && s.status !== "EXPIRED").slice(0, 20);
  if (closed.length === 0) return null;

  return (
    <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-4 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-white font-black text-sm">📋 Trade Ledger</span>
        <span className="text-[10px] text-gray-600">Auto-tracked · Paper trades only</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-[10px] text-gray-600 uppercase tracking-wide border-b border-[hsl(220,13%,18%)]">
              <th className="text-left pb-2">Momentum Alert</th>
              <th className="text-left pb-2">Entry Type</th>
              <th className="text-left pb-2">Entry</th>
              <th className="text-left pb-2">Exit</th>
              <th className="text-left pb-2">Result</th>
              <th className="text-right pb-2">Time Taken</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(220,13%,16%)]">
            {closed.map(s => {
              const isBuy = s.dir === "BUY";
              const pnlPct = s.exitPrice
                ? isBuy
                  ? ((s.exitPrice - s.entry) / s.entry * 100)
                  : ((s.entry - s.exitPrice) / s.entry * 100)
                : 0;
              const isWin = s.status === "T1_HIT" || s.status === "T2_HIT";
              const entryType = s.grade === "A"
                ? (s.oiVelocity !== 0 ? "Volume + OI Spike" : "Volume Breakout")
                : (s.rsi7 < 40 || s.rsi7 > 60 ? "9 EMA Cross" : "VWAP + 9EMA");

              return (
                <tr key={s.id} className="text-gray-400">
                  <td className="py-2">
                    <div className="text-white font-bold">{s.optionName}</div>
                    <div className={`text-[10px] ${isBuy ? "text-green-500" : "text-red-500"}`}>
                      {isBuy ? "▲ BUY" : "▼ SELL"} · {s.index}
                    </div>
                  </td>
                  <td className="py-2 text-gray-400">{entryType}</td>
                  <td className="py-2">{fmt(s.entry)}</td>
                  <td className="py-2">{s.exitPrice ? fmt(s.exitPrice) : "—"}</td>
                  <td className="py-2">
                    <span className={`font-black text-xs px-1.5 py-0.5 rounded ${
                      isWin
                        ? "text-green-400 bg-green-500/10"
                        : "text-red-400 bg-red-500/10"
                    }`}>
                      {isWin ? `+${pnlPct.toFixed(2)}%` : `${pnlPct.toFixed(2)}%`}
                      {" "}
                      <span className="font-normal text-[10px]">
                        {s.status === "T2_HIT" ? "Proj. R2 Hit" : s.status === "T1_HIT" ? "Proj. R1 Hit" : "Support Hit"}
                      </span>
                    </span>
                  </td>
                  <td className="py-2 text-right text-[10px] text-gray-600">
                    {s.closedAt ? timeDiff(s.createdAt, s.closedAt) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Live Scoreboard ───────────────────────────────────────────────────────────

function Scoreboard({ stats, isMarketOpen, isPrimeWindow }: {
  stats: ScalpStats; isMarketOpen: boolean; isPrimeWindow: boolean;
}) {
  const closed   = stats.t1Hit + stats.t2Hit + stats.slHit;
  const accuracy = closed > 0 ? Math.round(((stats.t1Hit + stats.t2Hit) / closed) * 100) : 0;

  return (
    <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-4 mb-5">
      {/* Header row */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span className="text-white font-black text-sm">📊 Today's Performance</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isMarketOpen ? "bg-green-500 animate-pulse" : "bg-gray-600"}`} />
          <span className={`text-[10px] font-bold ${isMarketOpen ? "text-green-400" : "text-gray-600"}`}>
            {isMarketOpen ? (isPrimeWindow ? "⚡ Prime Window" : "Market Open") : "Market Closed"}
          </span>
        </div>
        {stats.lastUpdated && (
          <span className="text-[10px] text-gray-600 ml-auto font-mono">{timeStr(stats.lastUpdated)}</span>
        )}
      </div>

      {/* Big accuracy banner */}
      <div className="flex items-center justify-between mb-4 bg-[hsl(220,13%,16%)] rounded-xl px-4 py-3">
        <div className="text-center">
          <div className={`text-3xl font-black font-mono ${accuracy >= 70 ? "text-green-400" : accuracy >= 50 ? "text-amber-400" : "text-red-400"}`}>
            {accuracy}%
          </div>
          <div className="text-[10px] text-gray-600 uppercase tracking-wide">Today's Accuracy</div>
        </div>
        <div className="w-px bg-[hsl(220,13%,22%)] h-10" />
        <div className="text-center">
          <div className={`text-2xl font-black font-mono ${stats.netPointsNifty >= 0 ? "text-green-400" : "text-red-400"}`}>
            {stats.netPointsNifty >= 0 ? "+" : ""}{stats.netPointsNifty.toFixed(1)}
          </div>
          <div className="text-[10px] text-gray-600 uppercase tracking-wide">Nifty Pts</div>
        </div>
        {stats.netPointsBankNifty !== 0 && (
          <>
            <div className="w-px bg-[hsl(220,13%,22%)] h-10" />
            <div className="text-center">
              <div className={`text-2xl font-black font-mono ${stats.netPointsBankNifty >= 0 ? "text-green-400" : "text-red-400"}`}>
                {stats.netPointsBankNifty >= 0 ? "+" : ""}{stats.netPointsBankNifty.toFixed(1)}
              </div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wide">BankNifty Pts</div>
            </div>
          </>
        )}
        <div className="w-px bg-[hsl(220,13%,22%)] h-10" />
        <div className="text-center">
          <div className="text-2xl font-black text-white">{stats.active}</div>
          <div className="text-[10px] text-gray-600 uppercase tracking-wide">Active</div>
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: "Total Alerts", value: stats.totalSignals.toString(), color: "text-white" },
          { label: "Proj. R1 Hit", value: `${stats.t1Hit}`, color: "text-green-400" },
          { label: "Proj. R2 Hit", value: `${stats.t2Hit}`, color: "text-emerald-400" },
          { label: "Support Hit",  value: `${stats.slHit}`, color: "text-red-400" },
          { label: "Win Rate",     value: `${stats.winRate}%`, color: stats.winRate >= 70 ? "text-green-400" : stats.winRate >= 50 ? "text-amber-400" : "text-red-400" },
        ].map(s => (
          <div key={s.label} className="bg-[hsl(220,13%,16%)] rounded-lg px-3 py-2 text-center">
            <div className={`font-black text-lg leading-tight ${s.color}`}>{s.value}</div>
            <div className="text-[9px] text-gray-600 uppercase tracking-wide mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Index Panel ───────────────────────────────────────────────────────────────

function IndexPanel({ name, data, vwap, rsi, ema9, ema21, volRatio, callVel, putVel, momentum, isPremium, onUnlock }: {
  name: string;
  data: { price: number; change: number; changePct: number };
  vwap: number; rsi: number; ema9: number; ema21: number;
  volRatio: number; callVel: number; putVel: number;
  momentum: { rsiSpeed: number; burst: boolean };
  isPremium: boolean;
  onUnlock: () => void;
}) {
  const isUp  = data.change >= 0;
  const aboveVwap   = data.price > vwap;
  const aboveEma9   = data.price > ema9;
  const emaBullish  = ema9 > ema21;
  const volOk       = volRatio >= 1.5;

  return (
    <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">{name}</div>
          <div className={`text-xl font-black font-mono ${isUp ? "text-green-400" : "text-red-400"}`}>
            {fmt(data.price)}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-bold ${isUp ? "text-green-400" : "text-red-400"}`}>
            {isUp ? "▲" : "▼"} {fmt(Math.abs(data.change))} ({Math.abs(data.changePct).toFixed(2)}%)
          </div>
          <div className="flex gap-1 justify-end mt-1 flex-wrap">
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${aboveVwap ? "text-green-400 bg-green-500/10 border-green-500/25" : "text-red-400 bg-red-500/10 border-red-500/25"}`}>
              {aboveVwap ? "▲" : "▼"} VWAP
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${aboveEma9 ? "text-green-400 bg-green-500/10 border-green-500/25" : "text-red-400 bg-red-500/10 border-red-500/25"}`}>
              {aboveEma9 ? "▲" : "▼"} 9EMA
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${emaBullish ? "text-green-400 bg-green-500/10 border-green-500/25" : "text-red-400 bg-red-500/10 border-red-500/25"}`}>
              {emaBullish ? "9>21" : "9<21"}
            </span>
            {volOk && (
              <span className="text-[9px] px-1.5 py-0.5 rounded border font-bold text-amber-400 bg-amber-500/10 border-amber-500/25">
                Vol {volRatio.toFixed(1)}×
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Gauges */}
      <div className="space-y-1.5 mb-3">
        <GaugeBar value={rsi} min={0} max={100} label="RSI (7)"
          color={rsi > 70 ? "red" : rsi > 55 ? "green" : rsi < 30 ? "red" : "amber"} />
        <GaugeBar value={Math.min(3, volRatio)} min={0} max={3} label="Volume ×avg (need >1.5)"
          color={volRatio >= 1.5 ? "amber" : "blue"} />
      </div>

      {/* VWAP + EMA row */}
      <div className="grid grid-cols-3 gap-2 text-[10px] mb-3">
        <div className="bg-[hsl(220,13%,16%)] rounded-lg p-1.5 text-center">
          <div className="text-gray-600 uppercase text-[8px] tracking-wide">VWAP</div>
          <div className="text-white font-mono font-bold">{fmt(vwap)}</div>
        </div>
        <div className="bg-[hsl(220,13%,16%)] rounded-lg p-1.5 text-center">
          <div className="text-gray-600 uppercase text-[8px] tracking-wide">9 EMA</div>
          <div className="text-blue-400 font-mono font-bold">{fmt(ema9)}</div>
        </div>
        <div className="bg-[hsl(220,13%,16%)] rounded-lg p-1.5 text-center">
          <div className="text-gray-600 uppercase text-[8px] tracking-wide">21 EMA</div>
          <div className="text-purple-400 font-mono font-bold">{fmt(ema21)}</div>
        </div>
      </div>

      {/* OI Velocity — locked for free users */}
      <div className="flex justify-around py-2 bg-[hsl(220,13%,16%)] rounded-lg mb-2">
        <OIVelocityPill value={callVel} label="Call OI Vel" isPremium={isPremium} onUnlock={onUnlock} />
        <div className="w-px bg-[hsl(220,13%,22%)]" />
        <OIVelocityPill value={putVel}  label="Put OI Vel"  isPremium={isPremium} onUnlock={onUnlock} />
      </div>

      {/* Momentum burst */}
      {momentum.burst && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5 animate-pulse">
          <span className="text-amber-400 text-xs font-black">⚡ RSI BURST</span>
          <span className="text-amber-300 text-[10px]">+{momentum.rsiSpeed.toFixed(1)} pts/min</span>
        </div>
      )}
    </div>
  );
}

// ── Condition Checklist (helps users understand Grade A vs B) ─────────────────

function ConditionChecklist({ live, index }: { live: LiveData; index: "nifty" | "banknifty" }) {
  const d = index === "nifty" ? {
    price: live.nifty.price, vwap: live.vwapNifty, ema9: live.ema9Nifty,
    callVel: live.callOiVelocityNifty, putVel: live.putOiVelocityNifty,
    volRatio: live.volumeRatioNifty,
  } : {
    price: live.banknifty.price, vwap: live.vwapBankNifty, ema9: live.ema9BankNifty,
    callVel: live.callOiVelocityBankNifty, putVel: live.putOiVelocityBankNifty,
    volRatio: live.volumeRatioBankNifty,
  };

  const c1 = d.price > d.vwap && d.price > d.ema9;
  const c2 = (d.callVel < -500 && d.putVel > 500) || (d.putVel < -500 && d.callVel > 500);
  const c3 = d.volRatio >= 1.5;

  return (
    <div className="space-y-1">
      {[
        { label: "Cond 1 · Price > 9EMA & VWAP", ok: c1 },
        { label: "Cond 2 · OI Velocity confirms", ok: c2 },
        { label: "Cond 3 · Volume >150% avg",     ok: c3 },
      ].map(c => (
        <div key={c.label} className="flex items-center gap-2 text-[10px]">
          <span className={c.ok ? "text-green-400" : "text-gray-700"}>
            {c.ok ? "✓" : "○"}
          </span>
          <span className={c.ok ? "text-gray-300" : "text-gray-700"}>{c.label}</span>
          {c.ok && <span className="text-green-500/60 text-[9px]">✓ Met</span>}
        </div>
      ))}
      <div className={`text-[10px] font-black mt-1 ${c1 && c2 && c3 ? "text-green-400" : c1 && c3 ? "text-blue-400" : "text-gray-600"}`}>
        {c1 && c2 && c3 ? "→ Grade A Alert ready" : c1 && c3 ? "→ Grade B Alert ready" : "→ No alert conditions met"}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function ScalpDashboard() {
  const [accepted,  setAccepted]  = useState(() => sessionStorage.getItem("scalp-disclaimer") === "1");
  const [showPrem,  setShowPrem]  = useState(false);
  const [isPremium, setIsPremium] = useState(() => localStorage.getItem("scalp-premium") === "1");

  const [signals,   setSignals]   = useState<ScalpSignal[]>([]);
  const [stats,     setStats]     = useState<ScalpStats | null>(null);
  const [live,      setLive]      = useState<LiveData | null>(null);
  const [newIds,    setNewIds]    = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);
  const [soundOn,   setSoundOn]   = useState(true);
  const [filter,    setFilter]    = useState<"ALL" | "NIFTY" | "BANKNIFTY" | "ACTIVE">("ALL");
  const esRef   = useRef<EventSource | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  function handleAccept() {
    sessionStorage.setItem("scalp-disclaimer", "1");
    setAccepted(true);
  }
  function handleUnlock() { setShowPrem(true); }

  // Load Razorpay SDK
  useEffect(() => {
    if (document.querySelector('script[src*="razorpay"]')) return;
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    document.head.appendChild(s);
  }, []);

  const addSignal = useCallback((sig: ScalpSignal) => {
    const isNew = !seenIds.current.has(sig.id);
    seenIds.current.add(sig.id);
    setSignals(prev => {
      const idx = prev.findIndex(s => s.id === sig.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = sig; return n; }
      return [sig, ...prev].slice(0, 50);
    });
    if (isNew) {
      setNewIds(prev => new Set(prev).add(sig.id));
      if (soundOn) playSignalSound(sig.dir);
      setTimeout(() => setNewIds(prev => { const s = new Set(prev); s.delete(sig.id); return s; }), 3500);
    }
  }, [soundOn]);

  useEffect(() => {
    function connect() {
      const es = new EventSource(`${API_BASE}/scalp/stream`);
      esRef.current = es;
      es.onopen  = () => setConnected(true);
      es.onerror = () => {
        setConnected(false);
        es.close();
        setTimeout(connect, 5000);
      };
      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as { type: string; signal?: ScalpSignal; stats?: ScalpStats; live?: LiveData; tradeId?: string; newStatus?: string };
          if (msg.type === "signal"      && msg.signal) addSignal(msg.signal);
          if (msg.type === "stats"       && msg.stats)  setStats(msg.stats);
          if (msg.type === "live"        && msg.live)   setLive(msg.live);
          if (msg.type === "tradeUpdate" && msg.tradeId) {
            if (msg.newStatus === "T1_HIT" && soundOn) playT1Sound();
            setSignals(prev => prev.map(s => s.id === msg.tradeId ? { ...s, status: msg.newStatus as TradeStatus } : s));
          }
        } catch { /* ignore */ }
      };
    }

    fetch(`${API_BASE}/scalp/snapshot`)
      .then(r => r.json())
      .then((snap: { stats?: ScalpStats; signals?: ScalpSignal[]; live?: LiveData }) => {
        if (snap.stats)   setStats(snap.stats);
        if (snap.live)    setLive(snap.live);
        if (snap.signals) snap.signals.forEach(s => seenIds.current.add(s.id));
        setSignals(snap.signals?.slice(0, 50) ?? []);
      }).catch(() => {});

    connect();
    return () => { esRef.current?.close(); };
  }, [addSignal, soundOn]);

  const filtered = signals.filter(s => {
    if (filter === "ALL")    return true;
    if (filter === "ACTIVE") return s.status === "ACTIVE";
    return s.index === filter;
  });

  const hasLive = live && live.nifty && live.banknifty;

  if (!accepted) return <DisclaimerPopup onAccept={handleAccept} />;

  return (
    <div className="min-h-screen bg-[hsl(220,13%,9%)]">
      {/* Load Razorpay */}
      {showPrem && <PremiumModal onClose={() => setShowPrem(false)} />}

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-2xl font-black text-white">⚡ Signal Pulse Engine</h1>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 uppercase tracking-widest">
                Momentum Alerts
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${connected ? "bg-green-500/15 border-green-500/30 text-green-400 animate-pulse" : "bg-gray-700/20 border-gray-700 text-gray-600"}`}>
                {connected ? "● Live" : "○ Reconnecting"}
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              Educational tool · Paper trade only · Not SEBI registered
            </p>
            <p className="text-[10px] text-gray-700 mt-0.5">
              Cond 1: 1-min candle breaks 5-min H/L + 9EMA + VWAP · Cond 2: OI Velocity (Premium) · Cond 3: Vol &gt;150% avg
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isPremium && (
              <button
                onClick={handleUnlock}
                className="text-xs px-3 py-1.5 rounded-lg border font-bold bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all"
              >
                🔒 Unlock OI Velocity
              </button>
            )}
            {isPremium && (
              <span className="text-xs px-3 py-1.5 rounded-lg border font-bold bg-amber-500/10 border-amber-500/30 text-amber-400">
                ⭐ Premium
              </span>
            )}
            <button
              onClick={() => setSoundOn(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${soundOn ? "text-green-400 bg-green-500/10 border-green-500/30" : "text-gray-600 bg-[hsl(220,13%,14%)] border-[hsl(220,13%,22%)]"}`}
            >
              {soundOn ? "🔔 Sound On" : "🔕 Sound Off"}
            </button>
          </div>
        </div>

        {/* Momentum burst banners */}
        {hasLive && (live.momentum.nifty.burst || live.momentum.banknifty.burst) && (
          <div className="mb-4 flex flex-wrap gap-2">
            {live.momentum.nifty.burst && (
              <div className="flex-1 min-w-[200px] bg-amber-500/10 border border-amber-500/40 rounded-xl px-4 py-2 flex items-center gap-3 animate-pulse">
                <span className="text-2xl">⚡</span>
                <div>
                  <div className="text-amber-400 font-black text-sm">NIFTY Momentum Burst!</div>
                  <div className="text-amber-300 text-xs">RSI accelerated +{live.momentum.nifty.rsiSpeed.toFixed(1)} pts — signal window open</div>
                </div>
              </div>
            )}
            {live.momentum.banknifty.burst && (
              <div className="flex-1 min-w-[200px] bg-amber-500/10 border border-amber-500/40 rounded-xl px-4 py-2 flex items-center gap-3 animate-pulse">
                <span className="text-2xl">⚡</span>
                <div>
                  <div className="text-amber-400 font-black text-sm">BANKNIFTY Momentum Burst!</div>
                  <div className="text-amber-300 text-xs">RSI accelerated +{live.momentum.banknifty.rsiSpeed.toFixed(1)} pts — signal window open</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scoreboard */}
        {stats && (
          <Scoreboard
            stats={stats}
            isMarketOpen={live?.isMarketOpen ?? false}
            isPrimeWindow={live?.isPrimeWindow ?? false}
          />
        )}

        {/* Index Panels */}
        {hasLive && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
            <div>
              <IndexPanel
                name="NIFTY 50"
                data={live.nifty}
                vwap={live.vwapNifty}
                rsi={live.rsiNifty}
                ema9={live.ema9Nifty}
                ema21={live.ema21Nifty}
                volRatio={live.volumeRatioNifty}
                callVel={live.callOiVelocityNifty}
                putVel={live.putOiVelocityNifty}
                momentum={live.momentum.nifty}
                isPremium={isPremium}
                onUnlock={handleUnlock}
              />
              <div className="mt-2 bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,18%)] rounded-xl px-4 py-3">
                <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-2">Signal Conditions — NIFTY</div>
                <ConditionChecklist live={live} index="nifty" />
              </div>
            </div>
            <div>
              <IndexPanel
                name="BANK NIFTY"
                data={live.banknifty}
                vwap={live.vwapBankNifty}
                rsi={live.rsiBankNifty}
                ema9={live.ema9BankNifty}
                ema21={live.ema21BankNifty}
                volRatio={live.volumeRatioBankNifty}
                callVel={live.callOiVelocityBankNifty}
                putVel={live.putOiVelocityBankNifty}
                momentum={live.momentum.banknifty}
                isPremium={isPremium}
                onUnlock={handleUnlock}
              />
              <div className="mt-2 bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,18%)] rounded-xl px-4 py-3">
                <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-2">Signal Conditions — BANKNIFTY</div>
                <ConditionChecklist live={live} index="banknifty" />
              </div>
            </div>
          </div>
        )}

        {/* Filter tabs + Alerts */}
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <span className="text-white font-black text-sm">📡 Momentum Alerts</span>
          <div className="flex gap-1 ml-auto">
            {(["ALL", "ACTIVE", "NIFTY", "BANKNIFTY"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`text-[10px] px-2 py-1 rounded-lg border font-bold transition-all ${
                filter === f
                  ? "text-white bg-[hsl(220,13%,22%)] border-[hsl(220,13%,30%)]"
                  : "text-gray-600 bg-[hsl(220,13%,12%)] border-[hsl(220,13%,18%)] hover:text-gray-400"
              }`}>{f}</button>
            ))}
          </div>
        </div>

        <div className="space-y-2 mb-6">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-700">
              <div className="text-4xl mb-3">📡</div>
              <div className="font-bold text-gray-600">Scanning for Momentum Alerts…</div>
              <div className="text-xs mt-1 text-gray-700">Watching for 5-min H/L breakout · 9EMA + VWAP + Volume convergence</div>
              <div className="text-xs text-gray-800 mt-0.5">Prime windows: 09:15–10:30 & 13:30–15:30 IST</div>
            </div>
          ) : (
            filtered.map(s => (
              <AlertRow
                key={s.id}
                signal={s}
                isNew={newIds.has(s.id)}
                isPremium={isPremium}
                onUnlock={handleUnlock}
              />
            ))
          )}
        </div>

        {/* Trade Ledger */}
        <TradeLedger signals={signals} />

        {/* Footer disclaimer */}
        <div className="text-center text-[10px] text-gray-800 pb-4">
          Educational analysis tool only · Paper trade only · Not SEBI registered · Past accuracy ≠ future results
        </div>
      </div>
    </div>
  );
}
