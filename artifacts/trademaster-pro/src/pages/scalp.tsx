/**
 * Market Intent Scalper v2 — Dashboard
 * Stop looking at indicators — look at INTENT.
 * Signals only fire when Big Money is pushing the market.
 *
 * 4-Filter Engine:
 *   C1: Price > VWAP-15 AND H1 Order Block (Trend Guard)
 *   C2: Put OI Z-Score > 2.0 (dynamic 2.0–3.0) — Massive Put writing/support
 *   C3: Volume > 3× avg-14 AND Liquidity Sweep/5-min Breakout
 *   C4: Volume Delta positive (no absorption in progress)
 *
 * Grade S (AAA): All 4 + Z-Score > 2.5 + 5-min breakout
 * Grade A (AA):  C1 + C2 + C3
 * Grade B (B):   C1 + C3 only (no OI Z-Score)
 */

import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = "/api/trademaster";

// ── Types ─────────────────────────────────────────────────────────────────────

type TradeStatus = "ACTIVE" | "T1_HIT" | "T2_HIT" | "SL_HIT" | "EXPIRED";
type SignalGrade = "S" | "A" | "B";
type SignalDir   = "BUY" | "SELL";

interface ScalpSignal {
  id:              string;
  index:           "NIFTY" | "BANKNIFTY";
  dir:             SignalDir;
  grade:           SignalGrade;
  setupLabel:      string;
  optionName:      string;
  entry:           number;
  stopLoss:        number;
  target1:         number;
  target2:         number;
  spotAtEntry:     number;
  vwap15:          number;
  ema9:            number;
  atr14:           number;
  h1Support:       number;
  oiZScore:        number;
  oiVelocityCall:  number;
  oiVelocityPut:   number;
  liquiditySweep:  boolean;
  vol3x:           boolean;
  fiveMinBreakout: boolean;
  volumeDelta:     number;
  confidence:      number;
  reason:          string;
  status:          TradeStatus;
  trailingSlActive: boolean;
  createdAt:       string;
  closedAt?:       string;
  exitPrice?:      number;
  durationMs?:     number;
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
  cond4Met:  boolean;
  oiZScore:  number;
}

interface SentimentReading {
  score: number;
  label: "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";
  pcr:   number;
  color: "red" | "orange" | "gray" | "lime" | "green";
}

interface AbsorptionAlert {
  index:     "NIFTY" | "BANKNIFTY";
  signalId:  string;
  timestamp: string;
  msg:       string;
}

interface ScalpStats {
  totalSignals:       number;
  t1Hit:              number;
  t2Hit:              number;
  slHit:              number;
  active:             number;
  winRate:            number;
  last20:             Array<"T1_HIT" | "T2_HIT" | "SL_HIT" | "EXPIRED">;
  netPointsNifty:     number;
  netPointsBankNifty: number;
  avgDurationWinMs:   number;
  livePointsCaptured: number;
  autoOIThreshold:    number;
  lastUpdated:        string;
}

interface LiveData {
  nifty:     { price: number; change: number; changePct: number };
  banknifty: { price: number; change: number; changePct: number };
  vwap15Nifty:        number;
  vwap15BankNifty:    number;
  ema9Nifty:          number;
  ema9BankNifty:      number;
  h1SupportNifty:     number;
  h1SupportBankNifty: number;
  oiZScoreNifty:      number;
  oiZScoreBankNifty:  number;
  callOiVelocityNifty:     number;
  putOiVelocityNifty:      number;
  callOiVelocityBankNifty: number;
  putOiVelocityBankNifty:  number;
  pcrNifty:     number;
  pcrBankNifty: number;
  sentimentNifty:     SentimentReading;
  sentimentBankNifty: SentimentReading;
  atr14Nifty:         number;
  atr14BankNifty:     number;
  vol3xNifty:         boolean;
  vol3xBankNifty:     boolean;
  liquiditySweepNifty:      boolean;
  liquiditySweepBankNifty:  boolean;
  fiveMinHighNifty:         number;
  fiveMinHighBankNifty:     number;
  fiveMinBreakoutNifty:     boolean;
  fiveMinBreakoutBankNifty: boolean;
  volumeDeltaNifty:         number;
  volumeDeltaBankNifty:     number;
  cond1Nifty: boolean;
  cond2Nifty: boolean;
  cond3Nifty: boolean;
  cond4Nifty: boolean;
  cond1BankNifty: boolean;
  cond2BankNifty: boolean;
  cond3BankNifty: boolean;
  cond4BankNifty: boolean;
  isMarketOpen:   boolean;
  isPrimeWindow:  boolean;
  avoidedSignals?:    AvoidedSignal[];
  absorptionAlerts?:  AbsorptionAlert[];
  autoOIThreshold:    number;
  lastUpdated:    string;
}

// ── Audio ─────────────────────────────────────────────────────────────────────

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
function signColor(sentColor: SentimentReading["color"]) {
  return { red: "#ef4444", orange: "#f97316", gray: "#6b7280", lime: "#84cc16", green: "#22c55e" }[sentColor] ?? "#6b7280";
}

// ── Disclaimer Popup ──────────────────────────────────────────────────────────

function DisclaimerPopup({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="bg-[hsl(220,13%,11%)] border border-[hsl(220,13%,22%)] rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🎯</span>
          <div>
            <h2 className="text-white font-black text-lg">Market Intent Scalper v2</h2>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">Educational Tool — Read Before Proceeding</p>
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4 mb-4 text-sm space-y-1.5">
          <p className="font-bold text-red-400 text-xs">⚠ NOT a SEBI-registered tool. Educational data analysis only.</p>
          <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
            <li>OI Z-Score, Liquidity Sweep, Volume Delta are pattern detections — not buy/sell recommendations.</li>
            <li>H1 Order Block and PCR Sentiment Meter are algorithmic estimates, not guaranteed levels.</li>
            <li>Paper trade only. Real trading carries substantial risk of capital loss.</li>
            <li>Past signal accuracy (including "Grade S") does not guarantee future results.</li>
          </ul>
        </div>
        <label className="flex items-start gap-3 cursor-pointer mb-5">
          <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="mt-0.5 accent-amber-500 w-4 h-4 shrink-0" />
          <span className="text-xs text-gray-400">I understand this is an educational analysis tool. I will paper trade only and not rely on it as financial advice.</span>
        </label>
        <button disabled={!checked} onClick={onAccept}
          className={`w-full py-3 rounded-xl font-black text-sm transition-all ${checked ? "bg-amber-500 hover:bg-amber-400 text-black" : "bg-[hsl(220,13%,18%)] text-gray-600 cursor-not-allowed"}`}>
          {checked ? "Enter Market Intent Scalper →" : "Check the box above to continue"}
        </button>
      </div>
    </div>
  );
}

// ── PCR Sentiment Meter ───────────────────────────────────────────────────────

function SentimentMeter({ reading, label }: { reading: SentimentReading; label: string }) {
  const pct  = reading.score;
  const col  = signColor(reading.color);
  const bg   = { red: "bg-red-500/20", orange: "bg-orange-500/20", gray: "bg-gray-500/10", lime: "bg-lime-500/20", green: "bg-green-500/20" }[reading.color];

  return (
    <div className={`rounded-xl p-3 border ${reading.color === "red" ? "border-red-500/25" : reading.color === "orange" ? "border-orange-500/25" : reading.color === "lime" ? "border-lime-500/25" : reading.color === "green" ? "border-green-500/25" : "border-[hsl(220,13%,22%)]"} ${bg}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] text-gray-500 uppercase font-bold">{label} Sentiment (PCR)</span>
        <span className="text-[9px] text-gray-600 font-mono">PCR {reading.pcr.toFixed(2)}</span>
      </div>

      {/* Gauge bar */}
      <div className="h-2 rounded-full bg-gradient-to-r from-red-500 via-orange-400 via-gray-500 via-lime-400 to-green-500 relative mb-1.5">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md transition-all duration-700"
          style={{ left: `${Math.min(95, Math.max(5, pct))}%`, backgroundColor: col }}
        />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-[7px] text-gray-700 mb-1">
        <span>Extreme Fear</span>
        <span>Fear</span>
        <span>Neutral</span>
        <span>Greed</span>
        <span>Extreme Greed</span>
      </div>

      <div className="text-center">
        <span className="text-xs font-black" style={{ color: col }}>{reading.label}</span>
        <span className="text-[9px] text-gray-600 ml-1.5">(score {pct}/100)</span>
      </div>
    </div>
  );
}

// ── OI Z-Score Badge ──────────────────────────────────────────────────────────

function ZScoreBadge({ zScore, threshold }: { zScore: number; threshold: number }) {
  const hot   = zScore >= threshold;
  const vhot  = zScore >= 2.5;
  return (
    <div className={`rounded-lg px-2 py-1.5 text-center border ${
      vhot ? "bg-purple-500/15 border-purple-500/30" :
      hot  ? "bg-green-500/15 border-green-500/30"  :
             "bg-[hsl(220,13%,16%)] border-[hsl(220,13%,22%)]"
    }`}>
      <div className="text-[8px] text-gray-600 uppercase">OI Z-Score</div>
      <div className={`text-sm font-black font-mono ${
        vhot ? "text-purple-400" : hot ? "text-green-400" : "text-gray-500"
      }`}>
        {zScore.toFixed(2)}
        {vhot && <span className="text-[8px] ml-1">★</span>}
      </div>
      <div className={`text-[7px] ${hot ? "text-green-600" : "text-gray-700"}`}>
        thresh {threshold}
      </div>
    </div>
  );
}

// ── Volume Delta Badge ────────────────────────────────────────────────────────

function VDeltaBadge({ vd }: { vd: number }) {
  const pos = vd >= 0;
  const big = Math.abs(vd) > 500000;
  return (
    <div className={`rounded-lg px-2 py-1.5 text-center border ${
      pos ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
    }`}>
      <div className="text-[8px] text-gray-600 uppercase">Vol Delta</div>
      <div className={`text-sm font-black font-mono ${pos ? "text-green-400" : "text-red-400"}`}>
        {pos ? "+" : ""}{vd >= 1000000 ? `${(vd/1000000).toFixed(1)}M` : vd >= 1000 ? `${(vd/1000).toFixed(0)}K` : vd.toFixed(0)}
      </div>
      <div className={`text-[7px] ${pos ? "text-green-700" : "text-red-700"}`}>
        {big ? (pos ? "Buy Pressure" : "Absorption!") : (pos ? "Positive" : "Negative")}
      </div>
    </div>
  );
}

// ── Confidence Meter ──────────────────────────────────────────────────────────

function ConfidenceMeter({ value, grade, setupLabel }: { value: number; grade: SignalGrade; setupLabel: string }) {
  const pct   = Math.min(100, Math.max(0, value));
  const color = grade === "S" ? "bg-gradient-to-r from-yellow-500 to-amber-400" :
                pct >= 85 ? "bg-green-500" : pct >= 70 ? "bg-emerald-500" : pct >= 55 ? "bg-amber-400" : "bg-orange-500";
  const label = pct >= 85 ? "Very High" : pct >= 70 ? "High" : pct >= 55 ? "Moderate" : "Low";

  return (
    <div className="min-w-[110px]">
      <div className="flex items-center justify-between text-[9px] text-gray-500 mb-1">
        <span>Confidence</span>
        <span className={`font-black ${grade === "S" ? "text-yellow-400" : pct >= 70 ? "text-green-400" : "text-amber-400"}`}>{pct}% · {label}</span>
      </div>
      <div className="h-1.5 bg-[hsl(220,13%,20%)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-1 mt-1">
        <span className={`text-[8px] px-1 py-0.5 rounded font-black ${
          grade === "S" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
          grade === "A" ? "bg-amber-500/20  text-amber-400  border border-amber-500/30"  :
                          "bg-blue-500/15   text-blue-400   border border-blue-500/25"
        }`}>
          {grade === "S" ? "★ Grade S" : grade === "A" ? "◆ Grade A" : "▸ Grade B"}
        </span>
      </div>
      <div className="text-[8px] text-gray-600 mt-0.5 truncate max-w-[120px]">{setupLabel}</div>
    </div>
  );
}

// ── Last 20 Signals Strip ─────────────────────────────────────────────────────

function Last20Strip({ last20 }: { last20: Array<"T1_HIT" | "T2_HIT" | "SL_HIT" | "EXPIRED"> }) {
  if (last20.length === 0) return null;
  const wins = last20.filter(s => s === "T1_HIT" || s === "T2_HIT").length;
  const wr   = Math.round((wins / last20.length) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-gray-600 uppercase tracking-wide">Last {last20.length} signals:</span>
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
          wr >= 70 ? "text-green-400 bg-green-500/10" : wr >= 50 ? "text-amber-400 bg-amber-500/10" : "text-red-400 bg-red-500/10"
        }`}>Win Rate: {wr}%</span>
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {last20.map((s, i) => (
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
    </div>
  );
}

// ── 4-Filter Checklist ────────────────────────────────────────────────────────

function FilterChecklist({ c1, c2, c3, c4, vwap15, h1Support, price, zScore, threshold, putVel, callVel, vol3x, liquidSweep, fiveMinBreakout, vd }: {
  c1: boolean; c2: boolean; c3: boolean; c4: boolean;
  vwap15: number; h1Support: number; price: number;
  zScore: number; threshold: number;
  putVel: number; callVel: number;
  vol3x: boolean; liquidSweep: boolean; fiveMinBreakout: boolean;
  vd: number;
}) {
  const grade = c1 && c2 && c3 && c4 && zScore >= 2.5 ? "S" :
                c1 && c2 && c3 ? "A" :
                c1 && c3 ? "B" : null;

  const rows = [
    {
      num: 1, met: c1, label: "Structure Guard — Price > VWAP-15 & H1 Block",
      detail: c1
        ? `✓ ${fmt(price, 0)} > VWAP ${fmt(vwap15, 0)}${h1Support > 0 ? ` > H1 Block ${fmt(h1Support, 0)}` : ""}`
        : `○ Price ${fmt(price, 0)} ≤ VWAP-15 ${fmt(vwap15, 0)}${h1Support > 0 ? ` or H1 Block ${fmt(h1Support, 0)}` : ""}`,
    },
    {
      num: 2, met: c2, label: `Put OI Z-Score > ${threshold} (Massive Put Writing)`,
      detail: c2
        ? `✓ Z-Score ${zScore.toFixed(2)} ≥ ${threshold} — Smart money PUT support detected`
        : `○ Z-Score ${zScore.toFixed(2)} < ${threshold} — Put OI not building fast enough`,
    },
    {
      num: 3, met: c3, label: "Volume > 3× avg-14 AND Sweep/Breakout",
      detail: c3
        ? `✓ Vol 3×${liquidSweep ? " + Liquidity Sweep" : ""}${fiveMinBreakout ? " + 5m High Breakout" : ""}`
        : `○ Vol ${vol3x ? "3×✓" : "not 3×"} · ${liquidSweep ? "Sweep✓" : "No Sweep"} · ${fiveMinBreakout ? "5m Break✓" : "No 5m Break"}`,
    },
    {
      num: 4, met: c4, label: "Volume Delta Positive (No Absorption)",
      detail: c4
        ? `✓ VD ${vd >= 0 ? "+" : ""}${(vd/1000).toFixed(0)}K — Buy pressure active`
        : `⚠ VD ${(vd/1000).toFixed(0)}K NEGATIVE — Absorption detected, buyers trapped`,
    },
  ];

  return (
    <div className="bg-[hsl(220,13%,14%)] rounded-xl p-3 space-y-2">
      {rows.map(row => (
        <div key={row.num} className="flex items-start gap-2">
          <span className={`text-[10px] font-black w-4 shrink-0 mt-0.5 ${
            row.met ? "text-green-400" : row.num === 4 && !row.met ? "text-orange-400" : "text-gray-700"
          }`}>
            {row.met ? "✓" : row.num === 4 && !row.met ? "⚠" : "○"}
          </span>
          <div>
            <div className={`text-[10px] font-bold ${row.met ? "text-gray-300" : "text-gray-600"}`}>
              C{row.num}: {row.label}
            </div>
            <div className={`text-[9px] ${row.met ? "text-gray-500" : row.num === 4 ? "text-orange-600" : "text-gray-700"}`}>{row.detail}</div>
          </div>
        </div>
      ))}
      <div className={`text-[10px] font-black pt-1 border-t border-[hsl(220,13%,20%)] ${
        grade === "S" ? "text-yellow-400" :
        grade === "A" ? "text-green-400" :
        grade === "B" ? "text-blue-400"  :
        "text-gray-700"
      }`}>
        {grade === "S" ? "★ Grade S — AAA All 4 conditions + Z-Score ≥ 2.5 + 5m Breakout" :
         grade === "A" ? "◆ Grade A — OI intent confirmed (C1+C2+C3)" :
         grade === "B" ? "▸ Grade B — Volume momentum (C1+C3, no OI Z-Score)" :
                         "→ No signal — conditions not met"}
      </div>
    </div>
  );
}

// ── Absorption Alert Banner ───────────────────────────────────────────────────

function AbsorptionBanner({ alerts }: { alerts: AbsorptionAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="mb-4 space-y-2">
      {alerts.slice(0, 3).map((a, i) => (
        <div key={i} className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-2.5 flex items-start gap-3">
          <span className="text-orange-400 text-sm shrink-0">⚠</span>
          <div>
            <div className="text-orange-400 text-xs font-black mb-0.5">Absorption Detected — {a.index}</div>
            <div className="text-orange-300/70 text-[10px]">{a.msg}</div>
            <div className="text-gray-700 text-[9px] mt-0.5">{timeStr(a.timestamp)}</div>
          </div>
        </div>
      ))}
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
        <span className="text-[10px] text-gray-600">Signals filtered to protect accuracy</span>
      </div>
      <div className="space-y-2">
        {signals.map(a => (
          <div key={a.id} className="flex items-start gap-3 text-xs border-l-2 border-blue-500/30 pl-3">
            <div className="shrink-0 text-[9px] text-gray-600 font-mono w-12">{timeStr(a.timestamp)}</div>
            <div className="flex-1 min-w-0">
              <span className={`text-[9px] font-black mr-1 ${a.dir === "BUY" ? "text-green-500" : "text-red-500"}`}>
                {a.dir} {a.index}
              </span>
              <span className="text-gray-500 text-[9px]">avoided: </span>
              <span className="text-blue-400 text-[9px]">{a.reason}</span>
              {a.oiZScore > 0 && <span className="text-[9px] text-gray-700 ml-1">(Z={a.oiZScore.toFixed(1)})</span>}
            </div>
            <div className="shrink-0 flex gap-1">
              {[a.cond1Met, a.cond2Met, a.cond3Met, a.cond4Met].map((met, i) => (
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

type RazorpayCtor = new (opts: Record<string, unknown>) => { open(): void };

function PremiumModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handlePay() {
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_BASE}/scalp/premium-order`, { method: "POST" });
      if (!res.ok) throw new Error("Could not create order.");
      const { orderId, amount, currency, keyId } = await res.json() as { orderId: string; amount: number; currency: string; keyId: string };
      const RazorpayClass = (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
      if (!RazorpayClass) throw new Error("Payment SDK not loaded. Refresh and retry.");
      new RazorpayClass({
        key: keyId, amount, currency, name: "TradeMaster Pro",
        description: "Market Intent Scalper v2 — OI Z-Score Premium", order_id: orderId,
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
          <h2 className="text-white font-black">OI Z-Score Premium</h2>
          <p className="text-amber-400 text-xs mt-1">Grade A & S Signal Access</p>
        </div>
        <ul className="space-y-2 mb-5 text-xs text-gray-400">
          {[
            "Put OI Z-Score (rolling mean/stddev of velocity)",
            "Grade S signals: All 4 conditions + 5-min breakout",
            "Liquidity Sweep detection (fake breakout filter)",
            "H1 Order Block trend guard",
            "Volume Delta absorption alerts",
            "PCR Sentiment Meter (0–100 scale)",
          ].map(f => (
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
          {loading ? "Opening…" : "Unlock OI Z-Score · ₹499/mo"}
        </button>
        <button onClick={onClose} className="w-full py-1.5 text-gray-600 hover:text-gray-400 text-xs">
          Continue free (Grade B signals only)
        </button>
      </div>
    </div>
  );
}

// ── Index Live Panel ──────────────────────────────────────────────────────────

function IndexPanel({
  name, price, change, changePct, vwap15, ema9, atr14,
  h1Support, zScore, threshold, callVel, putVel,
  vol3x, liquidSweep, fiveMinBreakout, volumeDelta,
  c1, c2, c3, c4,
}: {
  name: string; price: number; change: number; changePct: number;
  vwap15: number; ema9: number; atr14: number;
  h1Support: number; zScore: number; threshold: number;
  callVel: number; putVel: number;
  vol3x: boolean; liquidSweep: boolean; fiveMinBreakout: boolean; volumeDelta: number;
  c1: boolean; c2: boolean; c3: boolean; c4: boolean;
}) {
  const isUp = change >= 0;
  const condsMet = [c1, c2, c3, c4].filter(Boolean).length;
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
          {/* Condition badges */}
          <div className="flex gap-1 justify-end mt-1.5">
            {[c1, c2, c3, c4].map((met, i) => (
              <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${
                met ? "text-green-400 bg-green-500/10 border-green-500/25"
                    : i === 3 && !met ? "text-orange-600 bg-orange-500/10 border-orange-500/20"
                    : "text-gray-700 bg-[hsl(220,13%,16%)] border-[hsl(220,13%,22%)]"
              }`}>C{i+1}{met ? "✓" : "○"}</span>
            ))}
          </div>
          <div className={`text-[9px] mt-1 font-bold ${
            condsMet === 4 ? "text-yellow-400" :
            condsMet >= 3  ? "text-green-400"  :
            condsMet >= 2  ? "text-amber-400"  :
            "text-gray-700"
          }`}>
            {condsMet}/4 conditions
          </div>
        </div>
      </div>

      {/* Key levels grid */}
      <div className="grid grid-cols-4 gap-1.5 text-[10px] mb-3">
        <div className="bg-[hsl(220,13%,16%)] rounded-lg p-2 text-center">
          <div className="text-[8px] text-gray-600 uppercase">VWAP-15</div>
          <div className={`font-mono font-bold ${price > vwap15 ? "text-green-400" : "text-red-400"}`}>{fmt(vwap15, 0)}</div>
        </div>
        <div className="bg-[hsl(220,13%,16%)] rounded-lg p-2 text-center">
          <div className="text-[8px] text-gray-600 uppercase">9 EMA</div>
          <div className={`font-mono font-bold ${price > ema9 ? "text-blue-400" : "text-orange-400"}`}>{fmt(ema9, 0)}</div>
        </div>
        <div className="bg-[hsl(220,13%,16%)] rounded-lg p-2 text-center">
          <div className="text-[8px] text-gray-600 uppercase">H1 Block</div>
          <div className={`font-mono font-bold ${h1Support > 0 ? (price > h1Support ? "text-green-400" : "text-red-400") : "text-gray-600"}`}>
            {h1Support > 0 ? fmt(h1Support, 0) : "—"}
          </div>
        </div>
        <div className="bg-[hsl(220,13%,16%)] rounded-lg p-2 text-center">
          <div className="text-[8px] text-gray-600 uppercase">ATR(14)</div>
          <div className="text-orange-400 font-mono font-bold">{fmt(atr14)}</div>
        </div>
      </div>

      {/* Z-Score + VD + OI velocity */}
      <div className="grid grid-cols-4 gap-1.5 mb-2">
        <ZScoreBadge zScore={zScore} threshold={threshold} />
        <VDeltaBadge vd={volumeDelta} />
        <div className="col-span-2 grid grid-cols-2 gap-1.5">
          <div className={`bg-[hsl(220,13%,16%)] rounded-lg p-1.5 text-center ${callVel > 0 ? "border border-red-500/15" : ""}`}>
            <div className="text-[8px] text-gray-600 uppercase">Call OI Vel</div>
            <div className={`text-[10px] font-mono font-bold ${callVel < 0 ? "text-green-400" : callVel > 0 ? "text-red-400" : "text-gray-500"}`}>
              {callVel !== 0 ? `${callVel > 0 ? "+" : ""}${(callVel/1000).toFixed(1)}K/m` : "—"}
            </div>
          </div>
          <div className={`bg-[hsl(220,13%,16%)] rounded-lg p-1.5 text-center ${putVel > 0 ? "border border-green-500/20" : ""}`}>
            <div className="text-[8px] text-gray-600 uppercase">Put OI Vel</div>
            <div className={`text-[10px] font-mono font-bold ${putVel > 0 ? "text-green-400" : putVel < 0 ? "text-red-400" : "text-gray-500"}`}>
              {putVel !== 0 ? `${putVel > 0 ? "+" : ""}${(putVel/1000).toFixed(1)}K/m` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Momentum flags */}
      <div className="flex flex-wrap gap-1.5">
        {vol3x && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 font-bold">
            ⚡ Vol 3×
          </span>
        )}
        {liquidSweep && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-400 font-bold">
            🌊 Liq. Sweep
          </span>
        )}
        {fiveMinBreakout && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/25 text-green-400 font-bold">
            ▲ 5m Breakout
          </span>
        )}
      </div>
    </div>
  );
}

// ── Performance Scoreboard ────────────────────────────────────────────────────

function Scoreboard({ stats, live, connected }: { stats: ScalpStats; live: LiveData | null; connected: boolean }) {
  const closed   = stats.t1Hit + stats.t2Hit + stats.slHit;
  const wins     = stats.t1Hit + stats.t2Hit;
  const accuracy = closed > 0 ? Math.round((wins / closed) * 100) : 0;
  const threshold = live?.autoOIThreshold ?? stats.autoOIThreshold ?? 2.0;

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
        <div className="text-[9px] text-gray-700 hidden sm:block">
          OI Threshold: <span className="text-purple-400 font-mono">{threshold.toFixed(1)}</span>
          <span className="text-gray-800 ml-1">(auto-adjusting)</span>
        </div>
        <div className={`ml-auto flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded-lg border ${
          connected ? "text-green-400 border-green-500/25 bg-green-500/5" : "text-gray-600 border-gray-700/25"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-gray-600"}`} />
          {connected ? "SSE Live" : "Reconnecting…"}
        </div>
      </div>

      {/* Big metrics — 5 columns */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
        <div className="bg-[hsl(220,13%,16%)] rounded-xl p-3 text-center">
          <div className={`text-3xl font-black font-mono ${accuracy >= 70 ? "text-green-400" : accuracy >= 50 ? "text-amber-400" : "text-red-400"}`}>
            {accuracy}%
          </div>
          <div className="text-[9px] text-gray-600 uppercase tracking-wide">Win Rate</div>
        </div>

        {/* Live Points Captured */}
        <div className={`rounded-xl p-3 text-center border ${
          stats.livePointsCaptured >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"
        }`}>
          <div className={`text-2xl font-black font-mono ${stats.livePointsCaptured >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {stats.livePointsCaptured >= 0 ? "+" : ""}{stats.livePointsCaptured.toFixed(1)}
          </div>
          <div className="text-[9px] text-gray-600 uppercase tracking-wide">Live Pts Captured</div>
        </div>

        <div className="bg-[hsl(220,13%,16%)] rounded-xl p-3 text-center">
          <div className="text-3xl font-black text-amber-400">{stats.active}</div>
          <div className="text-[9px] text-gray-600 uppercase tracking-wide">Active</div>
        </div>
        <div className="bg-[hsl(220,13%,16%)] rounded-xl p-3 text-center">
          <div className={`text-2xl font-black font-mono ${stats.netPointsNifty >= 0 ? "text-green-400" : "text-red-400"}`}>
            {stats.netPointsNifty >= 0 ? "+" : ""}{stats.netPointsNifty.toFixed(1)}
          </div>
          <div className="text-[9px] text-gray-600 uppercase tracking-wide">Nifty Net Pts</div>
        </div>
        <div className="bg-[hsl(220,13%,16%)] rounded-xl p-3 text-center">
          <div className={`text-2xl font-black font-mono ${stats.netPointsBankNifty >= 0 ? "text-green-400" : "text-red-400"}`}>
            {stats.netPointsBankNifty >= 0 ? "+" : ""}{stats.netPointsBankNifty.toFixed(1)}
          </div>
          <div className="text-[9px] text-gray-600 uppercase tracking-wide">BankNifty Net Pts</div>
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-3">
        {[
          { label: "Total",    v: stats.totalSignals,  c: "text-white" },
          { label: "R1 Hit",   v: stats.t1Hit,         c: "text-green-400" },
          { label: "R2 Hit",   v: stats.t2Hit,         c: "text-emerald-400" },
          { label: "SL Hit",   v: stats.slHit,         c: "text-red-400" },
          { label: "Win Rate", v: `${stats.winRate}%`,  c: stats.winRate >= 70 ? "text-green-400" : stats.winRate >= 50 ? "text-amber-400" : "text-red-400" },
          { label: "Avg Win",  v: durationStr(stats.avgDurationWinMs), c: "text-blue-400" },
        ].map(s => (
          <div key={s.label} className="bg-[hsl(220,13%,16%)] rounded-lg px-2 py-1.5 text-center">
            <div className={`font-black text-base ${s.c}`}>{s.v}</div>
            <div className="text-[8px] text-gray-700 uppercase">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Last 20 strip */}
      {stats.last20.length > 0 && <Last20Strip last20={stats.last20} />}
    </div>
  );
}

// ── Signal Accuracy Card ──────────────────────────────────────────────────────

function AccuracyCard({ sig, isNew, isPremium, onUnlock, threshold }: {
  sig: ScalpSignal; isNew: boolean; isPremium: boolean; onUnlock: () => void; threshold: number;
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
  const pnlPts = sig.exitPrice
    ? (isBuy ? sig.exitPrice - sig.entry : sig.entry - sig.exitPrice)
    : null;

  const gradeColors = {
    S: { border: "border-yellow-500/40",  bg: "bg-yellow-950/30", strip: "bg-gradient-to-r from-yellow-500 to-amber-400" },
    A: { border: "border-amber-500/35",   bg: "bg-amber-950/20",  strip: isBuy ? "bg-green-500" : "bg-red-500" },
    B: { border: "border-blue-500/25",    bg: "bg-blue-950/15",   strip: isBuy ? "bg-green-600" : "bg-red-600" },
  };
  const gc = glow
    ? { border: isBuy ? "border-green-500/50" : "border-red-500/50",
        bg: isBuy ? "bg-green-950/50" : "bg-red-950/50",
        strip: isBuy ? "bg-green-500" : "bg-red-500" }
    : gradeColors[sig.grade];

  const outcomeLabel = sig.status === "T2_HIT" ? "Proj. Resistance 2 Hit" :
                       sig.status === "T1_HIT" ? "Proj. Resistance 1 Hit" :
                       sig.status === "SL_HIT" ? "Proj. Support Hit (SL)" :
                       sig.status === "ACTIVE"  ? "In Progress" : "Expired";
  const outcomeColor = sig.status === "T2_HIT" ? "text-emerald-400" :
                       sig.status === "T1_HIT" ? "text-green-400" :
                       sig.status === "SL_HIT" ? "text-red-400" :
                       sig.status === "ACTIVE"  ? "text-amber-400" : "text-gray-600";

  return (
    <div className={`rounded-xl border transition-all duration-500 overflow-hidden ${gc.bg} ${gc.border}`}>
      <div className={`h-0.5 ${gc.strip}`} />

      <div className="p-3">
        <div className="flex items-start gap-3 flex-wrap">

          {/* Left: Grade + Direction + Name */}
          <div className="min-w-[120px]">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                isBuy ? "bg-green-500/20 text-green-400 border border-green-500/40"
                      : "bg-red-500/20 text-red-400 border border-red-500/40"
              }`}>{isBuy ? "▲ BUY" : "▼ SELL"}</span>
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                sig.grade === "S" ? "text-yellow-400 bg-yellow-500/15 border-yellow-500/30" :
                sig.grade === "A" ? "text-amber-400 bg-amber-500/15 border-amber-500/30"  :
                                    "text-blue-400 bg-blue-500/10 border-blue-500/25"
              }`}>
                {sig.grade === "S" ? "★ S" : sig.grade === "A" ? "◆ A" : "▸ B"}
              </span>
              <span className="text-[9px] text-gray-600 font-mono">{sig.index}</span>
            </div>
            <div className="text-white font-black text-sm leading-tight">{sig.optionName}</div>
            <div className="text-[9px] text-gray-700 mt-0.5 truncate max-w-[130px]">{sig.setupLabel}</div>
            <div className="text-[9px] text-gray-600 mt-0.5">{timeStr(sig.createdAt)}</div>
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

            {/* Indicators row */}
            <div className="flex flex-wrap gap-1.5 text-[9px]">
              <span className="text-gray-600">VWAP <span className="text-gray-400 font-mono">{fmt(sig.vwap15, 0)}</span></span>
              {sig.h1Support > 0 && <span className="text-gray-600">H1 <span className={`font-mono ${sig.spotAtEntry > sig.h1Support ? "text-green-400" : "text-red-400"}`}>{fmt(sig.h1Support, 0)}</span></span>}
              <span className="text-gray-600">ATR <span className="text-orange-400 font-mono">{fmt(sig.atr14)}</span></span>
              {isPremium ? (
                <span className="text-gray-600">
                  Z-Score <span className={`font-mono font-bold ${sig.oiZScore >= threshold ? "text-purple-400" : "text-gray-500"}`}>
                    {sig.oiZScore.toFixed(2)}
                  </span>
                </span>
              ) : (
                <span className="text-amber-500/50 cursor-pointer hover:text-amber-400 text-[9px]" onClick={onUnlock}>🔒 Z-Score</span>
              )}
              {sig.liquiditySweep && <span className="text-purple-400 font-bold">🌊 Sweep</span>}
              {sig.vol3x          && <span className="text-amber-400 font-bold">⚡ 3×Vol</span>}
              {sig.fiveMinBreakout && <span className="text-green-400 font-bold">▲ 5mBo</span>}
              {sig.volumeDelta < 0 && sig.status === "ACTIVE" && (
                <span className="text-orange-400 font-bold">⚠ VD–</span>
              )}
            </div>
          </div>

          {/* Right: Confidence + Status */}
          <div className="shrink-0 flex flex-col gap-2 items-end">
            <ConfidenceMeter value={sig.confidence} grade={sig.grade} setupLabel={sig.setupLabel} />
            <span className={`text-[10px] font-black ${outcomeColor}`}>{outcomeLabel}</span>
            {pnlPts !== null && (
              <span className={`text-xs font-black font-mono ${pnlPts >= 0 ? "text-green-400" : "text-red-400"}`}>
                {pnlPts >= 0 ? "+" : ""}{pnlPts.toFixed(1)} pts ({pnlPct?.toFixed(2)}%)
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
    const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js";
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
          const msg = JSON.parse(e.data) as {
            type: string; signal?: ScalpSignal; stats?: ScalpStats; live?: LiveData;
            avoided?: AvoidedSignal; absorption?: AbsorptionAlert; tradeId?: string; newStatus?: string;
          };
          if (msg.type === "signal"      && msg.signal)  addSignal(msg.signal);
          if (msg.type === "stats"       && msg.stats)   setStats(msg.stats);
          if (msg.type === "live"        && msg.live) {
            setLive(msg.live);
            if (msg.live.avoidedSignals) setAvoided(msg.live.avoidedSignals);
          }
          if (msg.type === "avoided"     && msg.avoided)   setAvoided(prev => [msg.avoided!, ...prev].slice(0, 10));
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
  const hasLive   = live && live.nifty && live.banknifty;
  const threshold = live?.autoOIThreshold ?? stats?.autoOIThreshold ?? 2.0;
  const absorptionAlerts = live?.absorptionAlerts ?? [];

  if (!accepted) return <DisclaimerPopup onAccept={() => { sessionStorage.setItem("scalp-disclaimer", "1"); setAccepted(true); }} />;

  return (
    <div className="min-h-screen bg-[hsl(220,13%,9%)]">
      {showPrem && <PremiumModal onClose={() => setShowPrem(false)} />}

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-2xl font-black text-white">🎯 Market Intent Scalper</h1>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 uppercase tracking-wider">v2 · OI Z-Score</span>
            </div>
            <p className="text-[10px] text-gray-600">
              C1: Price &gt; VWAP-15 &amp; H1 Block · C2: Put OI Z-Score &gt; {threshold.toFixed(1)} · C3: Vol 3× + Sweep/Breakout · C4: Volume Delta+
            </p>
            <p className="text-[10px] text-gray-700 mt-0.5">
              T1 = +0.25% · T2 = +0.50% · ATR(14)×1.5 dynamic SL · Grade S/A/B system
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isPremium && (
              <button onClick={() => setShowPrem(true)}
                className="text-xs px-3 py-1.5 rounded-lg border font-bold bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all">
                🔒 Unlock OI Z-Score
              </button>
            )}
            {isPremium && (
              <span className="text-xs px-3 py-1.5 rounded-lg border font-bold bg-yellow-500/10 border-yellow-500/30 text-yellow-400">★ Premium</span>
            )}
            <button onClick={() => setSoundOn(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${soundOn ? "text-green-400 bg-green-500/10 border-green-500/30" : "text-gray-600 bg-[hsl(220,13%,14%)] border-[hsl(220,13%,22%)]"}`}>
              {soundOn ? "🔔 Sound" : "🔕 Muted"}
            </button>
          </div>
        </div>

        {/* Scoreboard */}
        {stats && <Scoreboard stats={stats} live={live} connected={connected} />}

        {/* Absorption Alerts */}
        <AbsorptionBanner alerts={absorptionAlerts} />

        {/* Index Panels + Sentiment Meters + Filter Checklists */}
        {hasLive && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
            {/* NIFTY Column */}
            <div className="space-y-2">
              <IndexPanel
                name="NIFTY 50"
                price={live.nifty.price} change={live.nifty.change} changePct={live.nifty.changePct}
                vwap15={live.vwap15Nifty} ema9={live.ema9Nifty} atr14={live.atr14Nifty}
                h1Support={live.h1SupportNifty}
                zScore={live.oiZScoreNifty} threshold={threshold}
                callVel={live.callOiVelocityNifty} putVel={live.putOiVelocityNifty}
                vol3x={live.vol3xNifty} liquidSweep={live.liquiditySweepNifty}
                fiveMinBreakout={live.fiveMinBreakoutNifty} volumeDelta={live.volumeDeltaNifty}
                c1={live.cond1Nifty} c2={live.cond2Nifty} c3={live.cond3Nifty} c4={live.cond4Nifty}
              />
              <SentimentMeter reading={live.sentimentNifty} label="NIFTY" />
              <FilterChecklist
                c1={live.cond1Nifty} c2={live.cond2Nifty} c3={live.cond3Nifty} c4={live.cond4Nifty}
                vwap15={live.vwap15Nifty} h1Support={live.h1SupportNifty} price={live.nifty.price}
                zScore={live.oiZScoreNifty} threshold={threshold}
                putVel={live.putOiVelocityNifty} callVel={live.callOiVelocityNifty}
                vol3x={live.vol3xNifty} liquidSweep={live.liquiditySweepNifty}
                fiveMinBreakout={live.fiveMinBreakoutNifty} vd={live.volumeDeltaNifty}
              />
            </div>
            {/* BANKNIFTY Column */}
            <div className="space-y-2">
              <IndexPanel
                name="BANK NIFTY"
                price={live.banknifty.price} change={live.banknifty.change} changePct={live.banknifty.changePct}
                vwap15={live.vwap15BankNifty} ema9={live.ema9BankNifty} atr14={live.atr14BankNifty}
                h1Support={live.h1SupportBankNifty}
                zScore={live.oiZScoreBankNifty} threshold={threshold}
                callVel={live.callOiVelocityBankNifty} putVel={live.putOiVelocityBankNifty}
                vol3x={live.vol3xBankNifty} liquidSweep={live.liquiditySweepBankNifty}
                fiveMinBreakout={live.fiveMinBreakoutBankNifty} volumeDelta={live.volumeDeltaBankNifty}
                c1={live.cond1BankNifty} c2={live.cond2BankNifty} c3={live.cond3BankNifty} c4={live.cond4BankNifty}
              />
              <SentimentMeter reading={live.sentimentBankNifty} label="BANKNIFTY" />
              <FilterChecklist
                c1={live.cond1BankNifty} c2={live.cond2BankNifty} c3={live.cond3BankNifty} c4={live.cond4BankNifty}
                vwap15={live.vwap15BankNifty} h1Support={live.h1SupportBankNifty} price={live.banknifty.price}
                zScore={live.oiZScoreBankNifty} threshold={threshold}
                putVel={live.putOiVelocityBankNifty} callVel={live.callOiVelocityBankNifty}
                vol3x={live.vol3xBankNifty} liquidSweep={live.liquiditySweepBankNifty}
                fiveMinBreakout={live.fiveMinBreakoutBankNifty} vd={live.volumeDeltaBankNifty}
              />
            </div>
          </div>
        )}

        {/* SL Prevention Log */}
        {avoided.length > 0 && <AvoidedLog signals={avoided} />}

        {/* Momentum Alerts */}
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <span className="text-white font-black text-sm">📡 Momentum Alerts</span>
          <span className="text-[9px] text-gray-700">Grade S/A/B signals · auto-threshold Z={threshold.toFixed(1)}</span>
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
              <div className="text-4xl mb-3">🎯</div>
              <div className="font-bold text-gray-600">Market Intent Engine Scanning…</div>
              <div className="text-xs mt-1 text-gray-700">
                Watching: Price &gt; VWAP+H1 Block · OI Z-Score &gt; {threshold.toFixed(1)} · Vol 3× · Liquidity Sweep · VD+
              </div>
              <div className="text-xs text-gray-800 mt-0.5">Prime windows: 09:15–10:30 &amp; 13:30–15:30 IST</div>
            </div>
          ) : (
            filtered.map(s => (
              <AccuracyCard
                key={s.id}
                sig={s}
                isNew={newIds.has(s.id)}
                isPremium={isPremium}
                onUnlock={() => setShowPrem(true)}
                threshold={threshold}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[9px] text-gray-800 pb-6">
          Educational analysis · Paper trade only · Not SEBI registered · OI Z-Score ≠ guaranteed signal accuracy
        </div>
      </div>
    </div>
  );
}
