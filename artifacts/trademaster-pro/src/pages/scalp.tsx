/**
 * Structural Scalper Dashboard
 * Filters: Price > VWAP-15 & 9EMA · Put OI vel ≥ 2× Call OI vel · Vol = 10-candle peak
 * T1 = 0.25% · T2 = 0.50% · SL = ATR(14) × 1.5 dynamic
 */

import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = "/api/trademaster";

// ── Types ─────────────────────────────────────────────────────────────────────

type TradeStatus = "ACTIVE" | "T1_HIT" | "T2_HIT" | "SL_HIT" | "EXPIRED";
type SignalGrade = "A" | "B";
type SignalDir   = "BUY" | "SELL";

interface ScalpSignal {
  id:             string;
  index:          "NIFTY" | "BANKNIFTY";
  dir:            SignalDir;
  grade:          SignalGrade;
  optionName:     string;
  entry:          number;
  stopLoss:       number;
  target1:        number;
  target2:        number;
  spotAtEntry:    number;
  vwap15:         number;
  ema9:           number;
  atr14:          number;
  oiVelocityCall: number;
  oiVelocityPut:  number;
  volumePeak:     boolean;
  confidence:     number;
  reason:         string;
  status:         TradeStatus;
  trailingSlActive: boolean;
  createdAt:      string;
  closedAt?:      string;
  exitPrice?:     number;
  durationMs?:    number;
}

interface AvoidedSignal {
  id:        string;
  index:     "NIFTY" | "BANKNIFTY";
  dir:       SignalDir;
  timestamp: string;
  reason:    string;
  cond1Met:  boolean;
  cond2Met:  boolean;
  cond3Met:  boolean;
}

interface ScalpStats {
  totalSignals:       number;
  t1Hit:              number;
  t2Hit:              number;
  slHit:              number;
  active:             number;
  winRate:            number;
  last10:             Array<"T1_HIT" | "T2_HIT" | "SL_HIT" | "EXPIRED">;
  netPointsNifty:     number;
  netPointsBankNifty: number;
  avgDurationWinMs:   number;
  lastUpdated:        string;
}

interface LiveData {
  nifty:     { price: number; change: number; changePct: number };
  banknifty: { price: number; change: number; changePct: number };
  vwap15Nifty:      number;
  vwap15BankNifty:  number;
  ema9Nifty:        number;
  ema9BankNifty:    number;
  atr14Nifty:       number;
  atr14BankNifty:   number;
  callOiVelocityNifty:     number;
  putOiVelocityNifty:      number;
  callOiVelocityBankNifty: number;
  putOiVelocityBankNifty:  number;
  volumePeakNifty:     boolean;
  volumePeakBankNifty: boolean;
  cond1Nifty: boolean;
  cond2Nifty: boolean;
  cond3Nifty: boolean;
  cond1BankNifty: boolean;
  cond2BankNifty: boolean;
  cond3BankNifty: boolean;
  momentumBurst: { nifty: boolean; banknifty: boolean };
  isMarketOpen:  boolean;
  isPrimeWindow: boolean;
  avoidedSignals?: AvoidedSignal[];
  lastUpdated:   string;
}

// ── Sound ─────────────────────────────────────────────────────────────────────

function playT1Sound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    [[523, 0], [659, 0.15], [784, 0.3]].forEach(([f, t]) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.frequency.value = f; o.type = "sine";
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.25);
    });
  } catch { /* ignore */ }
}

function playSignalSound(dir: SignalDir) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = dir === "BUY" ? 880 : 440; o.type = "square";
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.start(); o.stop(ctx.currentTime + 0.35);
  } catch { /* ignore */ }
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(n: number, d = 2) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" });
}
function durationStr(ms: number) {
  if (!ms) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.floor(s/60)}m ${s%60}s`;
  return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
}

// ── Disclaimer Popup ──────────────────────────────────────────────────────────

function DisclaimerPopup({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="bg-[hsl(220,13%,11%)] border border-[hsl(220,13%,22%)] rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🏗</span>
          <div>
            <h2 className="text-white font-black text-lg">Structural Scalper</h2>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">Educational Tool — Read Before Proceeding</p>
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4 mb-4 text-sm space-y-1.5">
          <p className="font-bold text-red-400 text-xs">⚠ NOT a SEBI-registered tool. Educational data analysis only.</p>
          <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
            <li>"Momentum Alerts" are algorithmic pattern detections — not buy/sell recommendations.</li>
            <li>"Projected Resistance / Support" are statistical estimates, not guaranteed levels.</li>
            <li>Paper trade only. Real trading carries substantial risk of capital loss.</li>
            <li>Past signal accuracy does not guarantee future results.</li>
          </ul>
        </div>
        <label className="flex items-start gap-3 cursor-pointer mb-5">
          <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="mt-0.5 accent-amber-500 w-4 h-4 shrink-0" />
          <span className="text-xs text-gray-400">I understand this is an educational analysis tool. I will paper trade only and not rely on it as financial advice.</span>
        </label>
        <button disabled={!checked} onClick={onAccept}
          className={`w-full py-3 rounded-xl font-black text-sm transition-all ${checked ? "bg-amber-500 hover:bg-amber-400 text-black" : "bg-[hsl(220,13%,18%)] text-gray-600 cursor-not-allowed"}`}>
          {checked ? "Enter Structural Scalper →" : "Check the box above to continue"}
        </button>
      </div>
    </div>
  );
}

// ── Confidence Meter ──────────────────────────────────────────────────────────

function ConfidenceMeter({ value, grade }: { value: number; grade: SignalGrade }) {
  const pct  = Math.min(100, Math.max(0, value));
  const color = pct >= 85 ? "bg-green-500" : pct >= 70 ? "bg-emerald-500" : pct >= 55 ? "bg-amber-400" : "bg-orange-500";
  const label = pct >= 85 ? "Very High" : pct >= 70 ? "High" : pct >= 55 ? "Moderate" : "Low";

  return (
    <div className="min-w-[100px]">
      <div className="flex items-center justify-between text-[9px] text-gray-500 mb-1">
        <span>Confidence</span>
        <span className={`font-black ${pct >= 70 ? "text-green-400" : "text-amber-400"}`}>{pct}% · {label}</span>
      </div>
      <div className="h-1.5 bg-[hsl(220,13%,20%)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-1 mt-1">
        <span className={`text-[8px] px-1 py-0.5 rounded font-black ${
          grade === "A"
            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            : "bg-blue-500/15 text-blue-400 border border-blue-500/25"
        }`}>{grade === "A" ? "★ Grade A" : "◆ Grade B"}</span>
        {grade === "A" && <span className="text-[8px] text-gray-700">All 3 filters confirmed</span>}
      </div>
    </div>
  );
}

// ── Last 10 Signals Strip ─────────────────────────────────────────────────────

function Last10Strip({ last10 }: { last10: Array<"T1_HIT" | "T2_HIT" | "SL_HIT" | "EXPIRED"> }) {
  if (last10.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[9px] text-gray-600 uppercase tracking-wide mr-1">Last {last10.length}:</span>
      {last10.map((s, i) => (
        <span key={i} className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
          s === "T2_HIT" ? "bg-emerald-500/20 text-emerald-400" :
          s === "T1_HIT" ? "bg-green-500/20 text-green-400" :
          s === "SL_HIT" ? "bg-red-500/20 text-red-400" :
          "bg-gray-700/20 text-gray-600"
        }`}>
          {s === "T2_HIT" ? "✓✓" : s === "T1_HIT" ? "✓" : s === "SL_HIT" ? "✗" : "○"}
        </span>
      ))}
    </div>
  );
}

// ── Structural Filter Checklist ───────────────────────────────────────────────

function FilterChecklist({ c1, c2, c3, vwap15, ema9, putVel, callVel, isVolPeak }: {
  c1: boolean; c2: boolean; c3: boolean;
  vwap15: number; ema9: number; putVel: number; callVel: number; isVolPeak: boolean;
}) {
  const grade = c1 && c2 && c3 ? "A" : c1 && c3 ? "B" : null;
  const oiRatio = Math.abs(callVel) > 0 ? Math.abs(putVel) / Math.abs(callVel) : 0;

  return (
    <div className="bg-[hsl(220,13%,14%)] rounded-xl p-3 space-y-2">
      {[
        {
          num: 1, met: c1, label: "Price > VWAP-15 & 9 EMA",
          detail: c1 ? `✓ Above VWAP-15 (${fmt(vwap15)}) & EMA-9 (${fmt(ema9)})` : `○ Not above VWAP-15 or EMA-9`,
        },
        {
          num: 2, met: c2, label: "Put OI vel ≥ 2× Call OI vel",
          detail: c2 ? `✓ Put: ${(putVel/1000).toFixed(1)}K/m = ${oiRatio.toFixed(1)}× Call` : `○ Put vel ${(putVel/1000).toFixed(1)}K/m (need 2× of Call ${(callVel/1000).toFixed(1)}K/m)`,
        },
        {
          num: 3, met: c3, label: "Volume = 10-candle peak",
          detail: c3 ? "✓ Current candle is highest volume in 10 mins" : "○ Volume not the highest of last 10 candles",
        },
      ].map(row => (
        <div key={row.num} className="flex items-start gap-2">
          <span className={`text-[10px] font-black w-4 shrink-0 mt-0.5 ${row.met ? "text-green-400" : "text-gray-700"}`}>
            {row.met ? "✓" : "○"}
          </span>
          <div>
            <div className={`text-[10px] font-bold ${row.met ? "text-gray-300" : "text-gray-600"}`}>
              Cond {row.num}: {row.label}
            </div>
            <div className={`text-[9px] ${row.met ? "text-gray-500" : "text-gray-700"}`}>{row.detail}</div>
          </div>
        </div>
      ))}
      <div className={`text-[10px] font-black pt-1 border-t border-[hsl(220,13%,20%)] ${
        grade === "A" ? "text-green-400" : grade === "B" ? "text-blue-400" : "text-gray-700"
      }`}>
        {grade === "A" ? "→ Grade A Alert ready (all 3 conditions)" :
         grade === "B" ? "→ Grade B Alert ready (Cond 1+3, OI pending)" :
                         "→ No alert — conditions not met"}
      </div>
    </div>
  );
}

// ── Signal Accuracy Card (spec's "Accuracy Meter") ────────────────────────────

function AccuracyCard({ sig, isNew, isPremium, onUnlock }: {
  sig: ScalpSignal; isNew: boolean; isPremium: boolean; onUnlock: () => void;
}) {
  const isBuy = sig.dir === "BUY";
  const [glow, setGlow] = useState(isNew);

  useEffect(() => {
    if (!isNew) return;
    const t = setTimeout(() => setGlow(false), 4000);
    return () => clearTimeout(t);
  }, [isNew]);

  const pnlPct = sig.exitPrice
    ? ((isBuy ? sig.exitPrice - sig.entry : sig.entry - sig.exitPrice) / sig.entry) * 100
    : null;

  const outcomeLabel = sig.status === "T2_HIT" ? "Proj. Resistance 2 Hit" :
                       sig.status === "T1_HIT" ? "Proj. Resistance 1 Hit" :
                       sig.status === "SL_HIT" ? "Proj. Support Hit" :
                       sig.status === "ACTIVE"  ? "In Progress" : "Expired";

  const outcomeColor = sig.status === "T2_HIT" ? "text-emerald-400" :
                       sig.status === "T1_HIT" ? "text-green-400" :
                       sig.status === "SL_HIT" ? "text-red-400" :
                       sig.status === "ACTIVE"  ? "text-amber-400" : "text-gray-600";

  return (
    <div className={`rounded-xl border transition-all duration-500 overflow-hidden ${
      glow
        ? isBuy ? "bg-green-950/50 border-green-500/50 shadow-lg shadow-green-900/20"
                : "bg-red-950/50 border-red-500/50 shadow-lg shadow-red-900/20"
        : "bg-[hsl(220,13%,12%)] border-[hsl(220,13%,20%)]"
    }`}>
      {/* Top strip */}
      <div className={`h-0.5 ${isBuy ? "bg-green-500" : "bg-red-500"}`} />

      <div className="p-3">
        <div className="flex items-start gap-3 flex-wrap">

          {/* Left: Direction + Name */}
          <div className="min-w-[110px]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                isBuy ? "bg-green-500/20 text-green-400 border border-green-500/40"
                      : "bg-red-500/20 text-red-400 border border-red-500/40"
              }`}>{isBuy ? "▲ BUY" : "▼ SELL"}</span>
              <span className="text-[9px] text-gray-500 font-mono">{sig.index}</span>
            </div>
            <div className="text-white font-black text-sm leading-tight">{sig.optionName}</div>
            <div className="text-[9px] text-gray-600 mt-0.5">Entry {timeStr(sig.createdAt)}</div>
          </div>

          {/* Center: Prices grid */}
          <div className="flex-1 min-w-[200px]">
            <div className="grid grid-cols-4 gap-2 font-mono text-xs mb-2">
              <div>
                <div className="text-[8px] text-gray-600 uppercase">Entry</div>
                <div className="text-white font-bold">{fmt(sig.entry)}</div>
              </div>
              <div>
                <div className="text-[8px] text-gray-600 uppercase">ATR SL</div>
                <div className={`font-bold ${sig.trailingSlActive ? "text-amber-400" : "text-red-400"}`}>
                  {fmt(sig.stopLoss)}
                  {sig.trailingSlActive && <span className="text-[7px] ml-0.5 text-amber-300">●BE</span>}
                </div>
              </div>
              <div>
                <div className="text-[8px] text-gray-600 uppercase">R1 +0.25%</div>
                <div className="text-green-400 font-bold">{fmt(sig.target1)}</div>
              </div>
              <div>
                <div className="text-[8px] text-gray-600 uppercase">R2 +0.50%</div>
                <div className="text-emerald-400 font-bold">{fmt(sig.target2)}</div>
              </div>
            </div>

            {/* Key indicators row */}
            <div className="flex flex-wrap gap-2 text-[9px]">
              <span className="text-gray-600">VWAP-15 <span className="text-gray-400 font-mono">{fmt(sig.vwap15)}</span></span>
              <span className="text-gray-600">EMA-9 <span className="text-blue-400 font-mono">{fmt(sig.ema9)}</span></span>
              <span className="text-gray-600">ATR <span className="text-orange-400 font-mono">{fmt(sig.atr14)}</span></span>
              {sig.volumePeak && <span className="text-amber-400 font-bold">⚡ Vol Peak</span>}
              {isPremium ? (
                <span className="text-gray-600">
                  Put OI <span className={`font-mono font-bold ${sig.oiVelocityPut > 0 ? "text-green-400" : "text-gray-500"}`}>
                    {(sig.oiVelocityPut/1000).toFixed(1)}K/m
                  </span>
                </span>
              ) : (
                <span className="text-amber-500/50 cursor-pointer hover:text-amber-400 transition-colors text-[9px]" onClick={onUnlock}>🔒 OI Vel</span>
              )}
            </div>
          </div>

          {/* Right: Confidence + Status */}
          <div className="shrink-0 flex flex-col gap-2 items-end">
            <ConfidenceMeter value={sig.confidence} grade={sig.grade} />
            <span className={`text-[10px] font-black ${outcomeColor}`}>{outcomeLabel}</span>
            {pnlPct !== null && (
              <span className={`text-xs font-black font-mono ${pnlPct >= 0 ? "text-green-400" : "text-red-400"}`}>
                {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
              </span>
            )}
            {sig.durationMs ? (
              <span className="text-[9px] text-gray-600 font-mono">⏱ {durationStr(sig.durationMs)}</span>
            ) : sig.status === "ACTIVE" ? (
              <span className="text-[9px] text-amber-500/60 font-mono">● Live</span>
            ) : null}
          </div>
        </div>

        {/* Reason row */}
        <div className="mt-2 pt-1.5 border-t border-[hsl(220,13%,17%)] text-[9px] text-gray-600">
          💡 {sig.reason}
        </div>
      </div>
    </div>
  );
}

// ── Signal Avoided Log ────────────────────────────────────────────────────────

function AvoidedLog({ signals }: { signals: AvoidedSignal[] }) {
  if (signals.length === 0) return null;
  return (
    <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-blue-400 font-black text-sm">🛡 SL Prevention Log</span>
        <span className="text-[10px] text-gray-600">Signals filtered out to protect accuracy</span>
      </div>
      <div className="space-y-2">
        {signals.map(a => (
          <div key={a.id} className="flex items-start gap-3 text-xs border-l-2 border-blue-500/30 pl-3">
            <div className="shrink-0 text-[9px] text-gray-600 font-mono w-12">{timeStr(a.timestamp)}</div>
            <div>
              <span className={`text-[9px] font-black mr-1 ${a.dir === "BUY" ? "text-green-500" : "text-red-500"}`}>
                {a.dir} {a.index}
              </span>
              <span className="text-gray-500 text-[9px]">— Signal avoided: </span>
              <span className="text-blue-400 text-[9px]">{a.reason}</span>
            </div>
            <div className="shrink-0 flex gap-1 ml-auto">
              {[a.cond1Met, a.cond2Met, a.cond3Met].map((met, i) => (
                <span key={i} className={`text-[8px] px-1 rounded ${met ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                  C{i+1}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Razorpay Premium Modal ────────────────────────────────────────────────────

declare global { interface Window { Razorpay: new (opts: Record<string, unknown>) => { open(): void }; } }

function PremiumModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handlePay() {
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_BASE}/scalp/premium-order`, { method: "POST" });
      if (!res.ok) throw new Error("Could not create order.");
      const { orderId, amount, currency, keyId } = await res.json() as { orderId: string; amount: number; currency: string; keyId: string };
      if (!window.Razorpay) throw new Error("Payment SDK not loaded. Refresh and retry.");
      new window.Razorpay({
        key: keyId, amount, currency, name: "TradeMaster Pro",
        description: "Structural Scalper — OI Velocity Premium", order_id: orderId,
        theme: { color: "#f59e0b" }, handler: () => { window.location.reload(); },
      }).open();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[hsl(220,13%,12%)] border border-amber-500/30 rounded-2xl max-w-sm w-full p-6">
        <div className="text-center mb-4">
          <div className="text-3xl mb-1">🔒</div>
          <h2 className="text-white font-black">OI Velocity Data</h2>
          <p className="text-amber-400 text-xs mt-1">Grade A Premium Feature</p>
        </div>
        <ul className="space-y-2 mb-5 text-xs text-gray-400">
          {["Put OI velocity vs Call OI velocity (60s refresh)","Grade A filter: Put ≥ 2× Call velocity","Real OI short-covering detection","Signal reason explains exact OI numbers"].map(f => (
            <li key={f} className="flex gap-2"><span className="text-amber-400">✓</span>{f}</li>
          ))}
        </ul>
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 text-center mb-4">
          <div className="text-white font-black text-2xl">₹499 <span className="text-sm font-normal text-gray-500">/mo</span></div>
          <div className="text-gray-600 text-[10px]">Educational access · Paper trading only</div>
        </div>
        {error && <p className="text-red-400 text-xs text-center mb-3">{error}</p>}
        <button onClick={handlePay} disabled={loading}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-black rounded-xl text-sm mb-2">
          {loading ? "Opening…" : "Unlock OI Velocity · ₹499/mo"}
        </button>
        <button onClick={onClose} className="w-full py-1.5 text-gray-600 hover:text-gray-400 text-xs">
          Continue free (Grade B signals)
        </button>
      </div>
    </div>
  );
}

// ── Index Live Panel ──────────────────────────────────────────────────────────

function IndexPanel({ name, price, change, changePct, vwap15, ema9, atr14, callVel, putVel, volPeak, c1, c2, c3 }: {
  name: string; price: number; change: number; changePct: number;
  vwap15: number; ema9: number; atr14: number;
  callVel: number; putVel: number; volPeak: boolean;
  c1: boolean; c2: boolean; c3: boolean;
}) {
  const isUp = change >= 0;
  return (
    <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{name}</div>
          <div className={`text-2xl font-black font-mono ${isUp ? "text-green-400" : "text-red-400"}`}>{fmt(price)}</div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-bold ${isUp ? "text-green-400" : "text-red-400"}`}>
            {isUp ? "▲" : "▼"} {fmt(Math.abs(change))} ({Math.abs(changePct).toFixed(2)}%)
          </div>
          <div className="flex gap-1 justify-end mt-1.5">
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${c1 ? "text-green-400 bg-green-500/10 border-green-500/25" : "text-gray-700 bg-[hsl(220,13%,16%)] border-[hsl(220,13%,22%)]"}`}>
              C1{c1 ? "✓" : "○"}
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${c2 ? "text-green-400 bg-green-500/10 border-green-500/25" : "text-gray-700 bg-[hsl(220,13%,16%)] border-[hsl(220,13%,22%)]"}`}>
              C2{c2 ? "✓" : "○"}
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${c3 ? "text-amber-400 bg-amber-500/10 border-amber-500/25" : "text-gray-700 bg-[hsl(220,13%,16%)] border-[hsl(220,13%,22%)]"}`}>
              C3{c3 ? "✓" : "○"}
            </span>
          </div>
        </div>
      </div>

      {/* Key levels */}
      <div className="grid grid-cols-3 gap-2 text-[10px] mb-3">
        <div className="bg-[hsl(220,13%,16%)] rounded-lg p-2 text-center">
          <div className="text-[8px] text-gray-600 uppercase">VWAP-15</div>
          <div className={`font-mono font-bold ${price > vwap15 ? "text-green-400" : "text-red-400"}`}>{fmt(vwap15)}</div>
        </div>
        <div className="bg-[hsl(220,13%,16%)] rounded-lg p-2 text-center">
          <div className="text-[8px] text-gray-600 uppercase">9 EMA</div>
          <div className={`font-mono font-bold ${price > ema9 ? "text-blue-400" : "text-orange-400"}`}>{fmt(ema9)}</div>
        </div>
        <div className="bg-[hsl(220,13%,16%)] rounded-lg p-2 text-center">
          <div className="text-[8px] text-gray-600 uppercase">ATR(14)</div>
          <div className="text-orange-400 font-mono font-bold">{fmt(atr14)}</div>
        </div>
      </div>

      {/* OI velocity */}
      <div className="grid grid-cols-2 gap-2 text-center mb-2">
        <div className={`bg-[hsl(220,13%,16%)] rounded-lg p-1.5 ${callVel > 0 ? "border border-red-500/15" : callVel < 0 ? "border border-green-500/15" : ""}`}>
          <div className="text-[8px] text-gray-600 uppercase">Call OI Vel</div>
          <div className={`text-[10px] font-mono font-bold ${callVel < 0 ? "text-green-400" : callVel > 0 ? "text-red-400" : "text-gray-500"}`}>
            {callVel !== 0 ? `${callVel > 0 ? "+" : ""}${(callVel/1000).toFixed(1)}K/m` : "—"}
          </div>
        </div>
        <div className={`bg-[hsl(220,13%,16%)] rounded-lg p-1.5 ${putVel > 0 ? "border border-green-500/20" : ""}`}>
          <div className="text-[8px] text-gray-600 uppercase">Put OI Vel</div>
          <div className={`text-[10px] font-mono font-bold ${putVel > 0 ? "text-green-400" : putVel < 0 ? "text-red-400" : "text-gray-500"}`}>
            {putVel !== 0 ? `${putVel > 0 ? "+" : ""}${(putVel/1000).toFixed(1)}K/m` : "—"}
          </div>
        </div>
      </div>

      {/* Volume peak indicator */}
      {volPeak && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-1.5 text-center">
          <span className="text-amber-400 text-xs font-black">⚡ Volume Peak — 10-candle high</span>
        </div>
      )}
    </div>
  );
}

// ── Performance Scoreboard ────────────────────────────────────────────────────

function Scoreboard({ stats, live, connected }: { stats: ScalpStats; live: LiveData | null; connected: boolean }) {
  const closed   = stats.t1Hit + stats.t2Hit + stats.slHit;
  const accuracy = closed > 0 ? Math.round(((stats.t1Hit + stats.t2Hit) / closed) * 100) : 0;

  return (
    <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-4 mb-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span className="text-white font-black text-sm">📊 Live Performance</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${live?.isMarketOpen ? "bg-green-500 animate-pulse" : "bg-gray-600"}`} />
          <span className={`text-[10px] font-bold ${live?.isMarketOpen ? "text-green-400" : "text-gray-600"}`}>
            {live?.isMarketOpen ? (live.isPrimeWindow ? "⚡ Prime Window" : "Market Open") : "Market Closed"}
          </span>
        </div>
        <div className={`ml-auto flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded-lg border ${
          connected ? "text-green-400 border-green-500/25 bg-green-500/5" : "text-gray-600 border-gray-700/25"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-gray-600"}`} />
          {connected ? "SSE Connected" : "Reconnecting…"}
        </div>
      </div>

      {/* Big metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div className="bg-[hsl(220,13%,16%)] rounded-xl p-3 text-center">
          <div className={`text-3xl font-black font-mono ${accuracy >= 70 ? "text-green-400" : accuracy >= 50 ? "text-amber-400" : "text-red-400"}`}>
            {accuracy}%
          </div>
          <div className="text-[9px] text-gray-600 uppercase tracking-wide">Today's Win Rate</div>
        </div>
        <div className="bg-[hsl(220,13%,16%)] rounded-xl p-3 text-center">
          <div className="text-3xl font-black text-amber-400">{stats.active}</div>
          <div className="text-[9px] text-gray-600 uppercase tracking-wide">Active</div>
        </div>
        <div className="bg-[hsl(220,13%,16%)] rounded-xl p-3 text-center">
          <div className={`text-3xl font-black font-mono ${stats.netPointsNifty >= 0 ? "text-green-400" : "text-red-400"}`}>
            {stats.netPointsNifty >= 0 ? "+" : ""}{stats.netPointsNifty.toFixed(1)}
          </div>
          <div className="text-[9px] text-gray-600 uppercase tracking-wide">Nifty Pts</div>
        </div>
        <div className="bg-[hsl(220,13%,16%)] rounded-xl p-3 text-center">
          <div className="text-[10px] text-gray-600 uppercase mb-1">Avg Win Time</div>
          <div className="text-lg font-black text-blue-400">{durationStr(stats.avgDurationWinMs)}</div>
          <div className="text-[9px] text-gray-600">per winning trade</div>
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mb-3">
        {[
          { label: "Total", v: stats.totalSignals, c: "text-white" },
          { label: "R1 Hit", v: stats.t1Hit, c: "text-green-400" },
          { label: "R2 Hit", v: stats.t2Hit, c: "text-emerald-400" },
          { label: "SL Hit", v: stats.slHit, c: "text-red-400" },
          { label: "Win Rate", v: `${stats.winRate}%`, c: stats.winRate >= 70 ? "text-green-400" : stats.winRate >= 50 ? "text-amber-400" : "text-red-400" },
        ].map(s => (
          <div key={s.label} className="bg-[hsl(220,13%,16%)] rounded-lg px-2 py-1.5 text-center">
            <div className={`font-black text-base ${s.c}`}>{s.v}</div>
            <div className="text-[8px] text-gray-700 uppercase">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Last 10 strip */}
      {stats.last10.length > 0 && <Last10Strip last10={stats.last10} />}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function ScalpDashboard() {
  const [accepted,  setAccepted]  = useState(() => sessionStorage.getItem("scalp-disclaimer") === "1");
  const [showPrem,  setShowPrem]  = useState(false);
  const [isPremium, setIsPremium] = useState(() => localStorage.getItem("scalp-premium") === "1");

  const [signals,   setSignals]   = useState<ScalpSignal[]>([]);
  const [avoided,   setAvoided]   = useState<AvoidedSignal[]>([]);
  const [stats,     setStats]     = useState<ScalpStats | null>(null);
  const [live,      setLive]      = useState<LiveData | null>(null);
  const [newIds,    setNewIds]    = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);
  const [soundOn,   setSoundOn]   = useState(true);
  const [filter,    setFilter]    = useState<"ALL" | "ACTIVE" | "NIFTY" | "BANKNIFTY">("ALL");
  const esRef   = useRef<EventSource | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

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
      setTimeout(() => setNewIds(prev => { const s = new Set(prev); s.delete(sig.id); return s; }), 4000);
    }
  }, [soundOn]);

  useEffect(() => {
    function connect() {
      const es = new EventSource(`${API_BASE}/scalp/stream`);
      esRef.current = es;
      es.onopen  = () => setConnected(true);
      es.onerror = () => { setConnected(false); es.close(); setTimeout(connect, 5000); };
      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as { type: string; signal?: ScalpSignal; stats?: ScalpStats; live?: LiveData; avoided?: AvoidedSignal; tradeId?: string; newStatus?: string };
          if (msg.type === "signal"      && msg.signal)  addSignal(msg.signal);
          if (msg.type === "stats"       && msg.stats)   setStats(msg.stats);
          if (msg.type === "live"        && msg.live)    { setLive(msg.live); if (msg.live.avoidedSignals) setAvoided(msg.live.avoidedSignals); }
          if (msg.type === "avoided"     && msg.avoided) setAvoided(prev => [msg.avoided!, ...prev].slice(0, 10));
          if (msg.type === "tradeUpdate" && msg.tradeId) {
            if (msg.newStatus === "T1_HIT" && soundOn) playT1Sound();
            setSignals(prev => prev.map(s => s.id === msg.tradeId ? { ...s, status: msg.newStatus as TradeStatus } : s));
          }
        } catch { /* ignore */ }
      };
    }

    fetch(`${API_BASE}/scalp/snapshot`)
      .then(r => r.json())
      .then((snap: { stats?: ScalpStats; signals?: ScalpSignal[]; live?: LiveData; avoided?: AvoidedSignal[] }) => {
        if (snap.stats)   setStats(snap.stats);
        if (snap.live)    setLive(snap.live);
        if (snap.signals) { snap.signals.forEach(s => seenIds.current.add(s.id)); setSignals(snap.signals.slice(0, 50)); }
        if (snap.avoided) setAvoided(snap.avoided);
      }).catch(() => {});

    connect();
    return () => { esRef.current?.close(); };
  }, [addSignal, soundOn]);

  const filtered = signals.filter(s =>
    filter === "ALL"    ? true :
    filter === "ACTIVE" ? s.status === "ACTIVE" :
    s.index === filter
  );

  const hasLive = live && live.nifty && live.banknifty;

  if (!accepted) return <DisclaimerPopup onAccept={() => { sessionStorage.setItem("scalp-disclaimer", "1"); setAccepted(true); }} />;

  return (
    <div className="min-h-screen bg-[hsl(220,13%,9%)]">
      {showPrem && <PremiumModal onClose={() => setShowPrem(false)} />}

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-2xl font-black text-white">🏗 Structural Scalper</h1>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 uppercase tracking-wider">
                Momentum Alerts
              </span>
            </div>
            <p className="text-[10px] text-gray-600">
              C1: Price &gt; VWAP-15 &amp; 9EMA · C2: Put OI vel ≥ 2× Call OI · C3: Vol = 10-candle peak
            </p>
            <p className="text-[10px] text-gray-700 mt-0.5">
              T1 = +0.25% · T2 = +0.50% · ATR(14)×1.5 dynamic SL · 1s data polling
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isPremium && (
              <button onClick={() => setShowPrem(true)}
                className="text-xs px-3 py-1.5 rounded-lg border font-bold bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all">
                🔒 Unlock OI Velocity
              </button>
            )}
            {isPremium && (
              <span className="text-xs px-3 py-1.5 rounded-lg border font-bold bg-amber-500/10 border-amber-500/30 text-amber-400">⭐ Premium</span>
            )}
            <button onClick={() => setSoundOn(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${soundOn ? "text-green-400 bg-green-500/10 border-green-500/30" : "text-gray-600 bg-[hsl(220,13%,14%)] border-[hsl(220,13%,22%)]"}`}>
              {soundOn ? "🔔 Sound" : "🔕 Muted"}
            </button>
          </div>
        </div>

        {/* Scoreboard */}
        {stats && <Scoreboard stats={stats} live={live} connected={connected} />}

        {/* Index Panels + Filter Checklists */}
        {hasLive && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
            <div className="space-y-2">
              <IndexPanel
                name="NIFTY 50" price={live.nifty.price} change={live.nifty.change} changePct={live.nifty.changePct}
                vwap15={live.vwap15Nifty} ema9={live.ema9Nifty} atr14={live.atr14Nifty}
                callVel={live.callOiVelocityNifty} putVel={live.putOiVelocityNifty} volPeak={live.volumePeakNifty}
                c1={live.cond1Nifty} c2={live.cond2Nifty} c3={live.cond3Nifty}
              />
              <FilterChecklist
                c1={live.cond1Nifty} c2={live.cond2Nifty} c3={live.cond3Nifty}
                vwap15={live.vwap15Nifty} ema9={live.ema9Nifty}
                putVel={live.putOiVelocityNifty} callVel={live.callOiVelocityNifty}
                isVolPeak={live.volumePeakNifty}
              />
            </div>
            <div className="space-y-2">
              <IndexPanel
                name="BANK NIFTY" price={live.banknifty.price} change={live.banknifty.change} changePct={live.banknifty.changePct}
                vwap15={live.vwap15BankNifty} ema9={live.ema9BankNifty} atr14={live.atr14BankNifty}
                callVel={live.callOiVelocityBankNifty} putVel={live.putOiVelocityBankNifty} volPeak={live.volumePeakBankNifty}
                c1={live.cond1BankNifty} c2={live.cond2BankNifty} c3={live.cond3BankNifty}
              />
              <FilterChecklist
                c1={live.cond1BankNifty} c2={live.cond2BankNifty} c3={live.cond3BankNifty}
                vwap15={live.vwap15BankNifty} ema9={live.ema9BankNifty}
                putVel={live.putOiVelocityBankNifty} callVel={live.callOiVelocityBankNifty}
                isVolPeak={live.volumePeakBankNifty}
              />
            </div>
          </div>
        )}

        {/* SL Prevention Log */}
        {avoided.length > 0 && <AvoidedLog signals={avoided} />}

        {/* Momentum Alerts */}
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <span className="text-white font-black text-sm">📡 Momentum Alerts</span>
          <div className="flex gap-1 ml-auto">
            {(["ALL", "ACTIVE", "NIFTY", "BANKNIFTY"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold transition-all ${
                filter === f
                  ? "text-white bg-[hsl(220,13%,22%)] border-[hsl(220,13%,30%)]"
                  : "text-gray-600 bg-[hsl(220,13%,12%)] border-[hsl(220,13%,18%)] hover:text-gray-400"
              }`}>{f}</button>
            ))}
          </div>
        </div>

        <div className="space-y-2 mb-8">
          {filtered.length === 0 ? (
            <div className="text-center py-14 text-gray-700">
              <div className="text-4xl mb-3">🏗</div>
              <div className="font-bold text-gray-600">Structural Filters Scanning…</div>
              <div className="text-xs mt-1 text-gray-700">Watching: Price &gt; VWAP-15 + 9EMA · Put OI 2× Call OI · Vol 10-candle peak</div>
              <div className="text-xs text-gray-800 mt-0.5">Prime windows: 09:15–10:30 & 13:30–15:30 IST</div>
            </div>
          ) : (
            filtered.map(s => (
              <AccuracyCard
                key={s.id}
                sig={s}
                isNew={newIds.has(s.id)}
                isPremium={isPremium}
                onUnlock={() => setShowPrem(true)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[9px] text-gray-800 pb-6">
          Educational analysis · Paper trade only · Not SEBI registered · Past accuracy ≠ future results
        </div>
      </div>
    </div>
  );
}
