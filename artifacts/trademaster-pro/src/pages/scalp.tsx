/**
 * TradeMaster HFT Scalping Dashboard
 * Real-time scalp signals for Nifty 50 & Bank Nifty
 * Grade A: 90%+ accuracy target | Grade B: 70%+ accuracy target
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

// ── Sound (Web Audio API) ─────────────────────────────────────────────────────

function playT1Sound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const playTone = (freq: number, start: number, dur: number, gain = 0.3) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g);
      g.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      g.gain.setValueAtTime(gain, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime  + start + dur + 0.1);
    };
    playTone(523, 0,    0.15);
    playTone(659, 0.15, 0.15);
    playTone(784, 0.30, 0.25);
  } catch { /* ignore */ }
}

function playSignalSound(dir: SignalDir) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.frequency.value = dir === "BUY" ? 880 : 440;
    osc.type = "square";
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch { /* ignore */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPts(pts: number): string {
  const sign = pts >= 0 ? "+" : "";
  return `${sign}${pts.toFixed(1)} pts`;
}

function timeStr(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata"
  });
}

function statusConfig(status: TradeStatus) {
  switch (status) {
    case "ACTIVE":  return { label: "🟡 Active",   cls: "text-amber-400 border-amber-500/40 bg-amber-500/10" };
    case "T1_HIT":  return { label: "🎯 T1 Hit",   cls: "text-green-400 border-green-500/40 bg-green-500/10" };
    case "T2_HIT":  return { label: "🚀 T2 Hit",   cls: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" };
    case "SL_HIT":  return { label: "❌ SL Hit",   cls: "text-red-400 border-red-500/40 bg-red-500/10" };
    case "EXPIRED": return { label: "💤 Expired",  cls: "text-gray-500 border-gray-700/40 bg-gray-700/10" };
  }
}

// ── Live Gauge Bar ────────────────────────────────────────────────────────────

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

// ── OI Velocity Pill ──────────────────────────────────────────────────────────

function OIVelocityPill({ value, label }: { value: number; label: string }) {
  const isPos = value > 0;
  return (
    <div className="flex flex-col items-center">
      <div className="text-[9px] text-gray-600 uppercase tracking-wide mb-0.5">{label}</div>
      <div className={`text-[10px] font-black px-2 py-0.5 rounded border font-mono ${
        isPos
          ? "text-green-400 bg-green-500/10 border-green-500/25"
          : "text-red-400 bg-red-500/10 border-red-500/25"
      }`}>
        {isPos ? "+" : ""}{(value / 1000).toFixed(1)}K/m
      </div>
    </div>
  );
}

// ── Signal Row ────────────────────────────────────────────────────────────────

function SignalRow({ signal, isNew }: { signal: ScalpSignal; isNew: boolean }) {
  const isBuy = signal.dir === "BUY";
  const status = statusConfig(signal.status);
  const [highlight, setHighlight] = useState(isNew);

  useEffect(() => {
    if (isNew) {
      const t = setTimeout(() => setHighlight(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isNew]);

  const pnlPct = signal.exitPrice
    ? isBuy
      ? ((signal.exitPrice - signal.entry) / signal.entry) * 100
      : ((signal.entry - signal.exitPrice) / signal.entry) * 100
    : null;

  return (
    <div className={`rounded-lg p-3 border transition-all duration-500 ${
      highlight
        ? isBuy ? "bg-green-950/60 border-green-500/60 shadow-lg shadow-green-900/30" : "bg-red-950/60 border-red-500/60 shadow-lg shadow-red-900/30"
        : "bg-[hsl(220,13%,12%)] border-[hsl(220,13%,20%)]"
    }`}>
      <div className="flex items-start gap-3 flex-wrap">
        {/* Direction + Index */}
        <div className="flex flex-col gap-1 min-w-[90px]">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
              isBuy ? "text-green-400 bg-green-500/20 border-green-500/40" : "text-red-400 bg-red-500/20 border-red-500/40"
            }`}>
              {isBuy ? "▲ BUY" : "▼ SELL"}
            </span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
              signal.grade === "A"
                ? "text-amber-400 bg-amber-500/15 border-amber-500/30"
                : "text-blue-400 bg-blue-500/15 border-blue-500/30"
            }`}>
              {signal.grade === "A" ? "★ A" : "◆ B"}
            </span>
          </div>
          <div className="text-white font-black text-sm leading-tight">{signal.index}</div>
          <div className="text-[10px] text-gray-500 font-mono">{signal.optionName}</div>
        </div>

        {/* Prices */}
        <div className="flex-1 min-w-[200px]">
          <div className="grid grid-cols-4 gap-2 text-xs font-mono">
            <div>
              <div className="text-[9px] text-gray-600 uppercase">Entry</div>
              <div className="text-white font-bold">{fmt(signal.entry)}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-600 uppercase">SL</div>
              <div className={`font-bold ${signal.trailingSlActive ? "text-amber-400" : "text-red-400"}`}>
                {fmt(signal.stopLoss)}
                {signal.trailingSlActive && <span className="text-[8px] ml-1 text-amber-300">●trail</span>}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-gray-600 uppercase">T1</div>
              <div className="text-green-400 font-bold">{fmt(signal.target1)}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-600 uppercase">T2</div>
              <div className="text-emerald-400 font-bold">{fmt(signal.target2)}</div>
            </div>
          </div>
          {/* Indicators row */}
          <div className="flex flex-wrap gap-2 mt-1.5 text-[10px]">
            <span className="text-gray-600">VWAP <span className="text-gray-400 font-mono">{fmt(signal.vwap)}</span></span>
            <span className="text-gray-600">RSI <span className="font-mono text-gray-400">{signal.rsi7}</span></span>
            <span className="text-gray-600">Vol <span className={`font-mono font-bold ${signal.volumeRatio >= 2 ? "text-amber-400" : "text-gray-400"}`}>{signal.volumeRatio}×</span></span>
            {signal.oiVelocity !== 0 && (
              <span className="text-gray-600">OI Vel <span className={`font-mono font-bold ${signal.oiVelocity < 0 ? "text-green-400" : "text-red-400"}`}>{(signal.oiVelocity/1000).toFixed(1)}K/m</span></span>
            )}
          </div>
        </div>

        {/* Status + P&L */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${status.cls}`}>{status.label}</span>
          {pnlPct !== null && (
            <span className={`text-xs font-black font-mono ${pnlPct >= 0 ? "text-green-400" : "text-red-400"}`}>
              {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
            </span>
          )}
          <div className="text-[9px] text-gray-600 font-mono">{timeStr(signal.createdAt)}</div>
          {signal.closedAt && (
            <div className="text-[9px] text-gray-700 font-mono">→ {timeStr(signal.closedAt)}</div>
          )}
        </div>
      </div>

      {/* Reason */}
      <div className="mt-2 text-[10px] text-gray-600 italic border-t border-[hsl(220,13%,18%)] pt-1.5">
        💡 {signal.reason}
      </div>
    </div>
  );
}

// ── Live Index Panel ──────────────────────────────────────────────────────────

function IndexPanel({ name, data, vwap, rsi, ema9, ema21, volRatio, callVel, putVel, momentum }: {
  name: string;
  data: { price: number; change: number; changePct: number };
  vwap: number; rsi: number; ema9: number; ema21: number;
  volRatio: number; callVel: number; putVel: number;
  momentum: { rsiSpeed: number; burst: boolean };
}) {
  const isUp  = data.change >= 0;
  const aboveVwap = data.price > vwap;
  const emaBullish = ema9 > ema21;

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
          <div className="flex gap-1 justify-end mt-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${aboveVwap ? "text-green-400 bg-green-500/10 border-green-500/25" : "text-red-400 bg-red-500/10 border-red-500/25"}`}>
              {aboveVwap ? "▲ VWAP" : "▼ VWAP"}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${emaBullish ? "text-green-400 bg-green-500/10 border-green-500/25" : "text-red-400 bg-red-500/10 border-red-500/25"}`}>
              {emaBullish ? "9>21 ▲" : "9<21 ▼"}
            </span>
          </div>
        </div>
      </div>

      {/* Indicators */}
      <div className="space-y-1.5 mb-3">
        <GaugeBar value={rsi} min={0} max={100} label="RSI (7)"
          color={rsi > 70 ? "red" : rsi > 55 ? "green" : rsi < 30 ? "red" : "amber"} />
        <GaugeBar value={Math.min(3, volRatio)} min={0} max={3} label="Volume ×avg"
          color={volRatio >= 2 ? "amber" : "blue"} />
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

      {/* OI Velocity */}
      <div className="flex justify-around py-2 bg-[hsl(220,13%,16%)] rounded-lg mb-2">
        <OIVelocityPill value={callVel} label="Call OI Vel" />
        <div className="w-px bg-[hsl(220,13%,22%)]" />
        <OIVelocityPill value={putVel}  label="Put OI Vel" />
      </div>

      {/* Momentum burst */}
      {momentum.burst && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5 animate-pulse">
          <span className="text-amber-400 text-xs font-black">⚡ RSI BURST</span>
          <span className="text-amber-300 text-[10px]">+{momentum.rsiSpeed.toFixed(1)} pts/min — Momentum active!</span>
        </div>
      )}
    </div>
  );
}

// ── Scoreboard ────────────────────────────────────────────────────────────────

function Scoreboard({ stats, isMarketOpen, isPrimeWindow }: {
  stats: ScalpStats; isMarketOpen: boolean; isPrimeWindow: boolean;
}) {
  const closed = stats.t1Hit + stats.t2Hit + stats.slHit;

  return (
    <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-4 mb-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-white font-black text-sm">📊 Live Scoreboard</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isMarketOpen ? "bg-green-500 animate-pulse" : "bg-gray-600"}`} />
          <span className={`text-[10px] font-bold ${isMarketOpen ? "text-green-400" : "text-gray-600"}`}>
            {isMarketOpen ? (isPrimeWindow ? "⚡ Prime Window" : "Market Open") : "Market Closed"}
          </span>
        </div>
        {stats.lastUpdated && (
          <span className="text-[10px] text-gray-600 ml-auto font-mono">
            {timeStr(stats.lastUpdated)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { icon: "📈", label: "Total Signals", value: stats.totalSignals.toString(), color: "text-white" },
          { icon: "🟡", label: "Active",       value: stats.active.toString(),        color: "text-amber-400" },
          { icon: "🎯", label: "T1 Hit",       value: `${stats.t1Hit} (${closed > 0 ? Math.round((stats.t1Hit/closed)*100) : 0}%)`, color: "text-green-400" },
          { icon: "🚀", label: "T2 Hit",       value: `${stats.t2Hit} (${closed > 0 ? Math.round((stats.t2Hit/closed)*100) : 0}%)`, color: "text-emerald-400" },
          { icon: "❌", label: "SL Hit",       value: `${stats.slHit} (${closed > 0 ? Math.round((stats.slHit/closed)*100) : 0}%)`, color: "text-red-400" },
          { icon: "🎯", label: "Win Rate",     value: `${stats.winRate}%`,            color: stats.winRate >= 70 ? "text-green-400" : stats.winRate >= 50 ? "text-amber-400" : "text-red-400" },
          { icon: "💰", label: "Net (Nifty)",  value: fmtPts(stats.netPointsNifty),  color: stats.netPointsNifty >= 0 ? "text-green-400" : "text-red-400" },
        ].map(s => (
          <div key={s.label} className="bg-[hsl(220,13%,16%)] rounded-lg px-3 py-2 text-center">
            <div className="text-base mb-0.5">{s.icon}</div>
            <div className={`font-black text-sm leading-tight ${s.color}`}>{s.value}</div>
            <div className="text-[9px] text-gray-600 uppercase tracking-wide mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Net BankNifty */}
      {stats.netPointsBankNifty !== 0 && (
        <div className={`mt-2 text-center text-[10px] font-mono font-bold ${stats.netPointsBankNifty >= 0 ? "text-green-400" : "text-red-400"}`}>
          BankNifty Net: {fmtPts(stats.netPointsBankNifty)}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ScalpDashboard() {
  const [signals,   setSignals]   = useState<ScalpSignal[]>([]);
  const [stats,     setStats]     = useState<ScalpStats | null>(null);
  const [live,      setLive]      = useState<LiveData | null>(null);
  const [newIds,    setNewIds]    = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);
  const [soundOn,   setSoundOn]   = useState(true);
  const [filter,    setFilter]    = useState<"ALL" | "NIFTY" | "BANKNIFTY" | "ACTIVE">("ALL");
  const esRef = useRef<EventSource | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  const addSignal = useCallback((sig: ScalpSignal) => {
    const isNewSig = !seenIds.current.has(sig.id);
    seenIds.current.add(sig.id);

    setSignals(prev => {
      const idx = prev.findIndex(s => s.id === sig.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = sig;
        return next;
      }
      return [sig, ...prev].slice(0, 50);
    });

    if (isNewSig) {
      setNewIds(prev => new Set(prev).add(sig.id));
      if (soundOn) playSignalSound(sig.dir);
      setTimeout(() => setNewIds(prev => { const s = new Set(prev); s.delete(sig.id); return s; }), 3500);
    }
  }, [soundOn]);

  // SSE Connection
  useEffect(() => {
    function connect() {
      const es = new EventSource(`${API_BASE}/scalp/stream`);
      esRef.current = es;

      es.onopen = () => setConnected(true);
      es.onerror = () => {
        setConnected(false);
        es.close();
        setTimeout(connect, 5000);
      };

      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as { type: string; signal?: ScalpSignal; stats?: ScalpStats; live?: LiveData; tradeId?: string; newStatus?: string };
          if (msg.type === "signal"      && msg.signal)  addSignal(msg.signal);
          if (msg.type === "stats"       && msg.stats)   setStats(msg.stats);
          if (msg.type === "live"        && msg.live)    setLive(msg.live);
          if (msg.type === "tradeUpdate" && msg.tradeId) {
            if (msg.newStatus === "T1_HIT" && soundOn) playT1Sound();
            setSignals(prev => prev.map(s =>
              s.id === msg.tradeId ? { ...s, status: msg.newStatus as TradeStatus } : s
            ));
          }
        } catch { /* ignore */ }
      };
    }

    // Fetch initial snapshot
    fetch(`${API_BASE}/scalp/snapshot`)
      .then(r => r.json())
      .then((snap: { stats?: ScalpStats; signals?: ScalpSignal[]; live?: LiveData }) => {
        if (snap.stats)   setStats(snap.stats);
        if (snap.live)    setLive(snap.live);
        if (snap.signals) snap.signals.forEach(s => { seenIds.current.add(s.id); });
        setSignals(snap.signals?.slice(0, 50) ?? []);
      })
      .catch(() => {});

    connect();
    return () => { esRef.current?.close(); };
  }, [addSignal, soundOn]);

  const filteredSignals = signals.filter(s => {
    if (filter === "ALL")      return true;
    if (filter === "ACTIVE")   return s.status === "ACTIVE";
    return s.index === filter;
  });

  const hasLive = live && live.nifty && live.banknifty;

  return (
    <div className="min-h-screen bg-[hsl(220,13%,9%)]">
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Page Header */}
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-white">⚡ HFT Scalp Dashboard</h1>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 uppercase tracking-widest animate-pulse">
                Live
              </span>
            </div>
            <p className="text-sm text-gray-500">
              1–5 min scalp signals · Grade A (90%+ accuracy) · Grade B (70%+ accuracy) · Auto-trailing SL
            </p>
            <p className="text-[10px] text-gray-700 mt-0.5">
              Prime windows: 09:15–10:30 & 13:30–15:30 IST · Signal filter: 9 EMA + VWAP + OI Velocity + Volume Spike
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* SSE status */}
            <div className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg border ${connected ? "text-green-400 border-green-500/30 bg-green-500/10" : "text-gray-600 border-gray-700/30"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-gray-600"}`} />
              {connected ? "Connected" : "Reconnecting…"}
            </div>
            {/* Sound toggle */}
            <button
              onClick={() => setSoundOn(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${soundOn ? "text-green-400 bg-green-500/10 border-green-500/30" : "text-gray-600 bg-[hsl(220,13%,14%)] border-[hsl(220,13%,22%)]"}`}
            >
              {soundOn ? "🔔 Sound On" : "🔕 Sound Off"}
            </button>
          </div>
        </div>

        {/* Momentum burst alerts */}
        {hasLive && (live.momentum.nifty.burst || live.momentum.banknifty.burst) && (
          <div className="mb-4 flex flex-wrap gap-2">
            {live.momentum.nifty.burst && (
              <div className="flex-1 min-w-[200px] bg-amber-500/10 border border-amber-500/40 rounded-xl px-4 py-2 flex items-center gap-3 animate-pulse">
                <span className="text-2xl">⚡</span>
                <div>
                  <div className="text-amber-400 font-black text-sm">NIFTY RSI Momentum Burst!</div>
                  <div className="text-amber-300 text-xs">RSI moved +{live.momentum.nifty.rsiSpeed.toFixed(1)} pts — momentum is ACCELERATING. Watch for continuation.</div>
                </div>
              </div>
            )}
            {live.momentum.banknifty.burst && (
              <div className="flex-1 min-w-[200px] bg-amber-500/10 border border-amber-500/40 rounded-xl px-4 py-2 flex items-center gap-3 animate-pulse">
                <span className="text-2xl">⚡</span>
                <div>
                  <div className="text-amber-400 font-black text-sm">BANKNIFTY RSI Momentum Burst!</div>
                  <div className="text-amber-300 text-xs">RSI moved +{live.momentum.banknifty.rsiSpeed.toFixed(1)} pts — momentum is ACCELERATING.</div>
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

        {/* Live Index Panels */}
        {hasLive ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <IndexPanel
              name="Nifty 50"
              data={live.nifty}
              vwap={live.vwapNifty}
              rsi={live.rsiNifty}
              ema9={live.ema9Nifty}
              ema21={live.ema21Nifty}
              volRatio={live.volumeRatioNifty}
              callVel={live.callOiVelocityNifty}
              putVel={live.putOiVelocityNifty}
              momentum={live.momentum.nifty}
            />
            <IndexPanel
              name="Bank Nifty"
              data={live.banknifty}
              vwap={live.vwapBankNifty}
              rsi={live.rsiBankNifty}
              ema9={live.ema9BankNifty}
              ema21={live.ema21BankNifty}
              volRatio={live.volumeRatioBankNifty}
              callVel={live.callOiVelocityBankNifty}
              putVel={live.putOiVelocityBankNifty}
              momentum={live.momentum.banknifty}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {["Nifty 50", "Bank Nifty"].map(n => (
              <div key={n} className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-4 flex items-center justify-center h-44">
                <div className="text-center">
                  <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <div className="text-gray-600 text-xs">Connecting to market data…</div>
                  <div className="text-gray-700 text-[10px] mt-0.5">{n} — UPSTOX_ACCESS_TOKEN required</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Signals section */}
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <span className="text-white font-black text-sm">Signal Feed</span>
          <span className="text-[10px] text-gray-600">({filteredSignals.length} signals)</span>
          <div className="h-px flex-1 bg-[hsl(220,13%,18%)]" />
          {/* Filter buttons */}
          <div className="flex gap-1">
            {(["ALL", "ACTIVE", "NIFTY", "BANKNIFTY"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${filter === f ? "bg-green-600 text-white border-green-600" : "text-gray-500 bg-[hsl(220,13%,14%)] border-[hsl(220,13%,22%)] hover:text-gray-300"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {filteredSignals.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">⚡</div>
            <div className="text-gray-400 font-black text-lg">No Scalp Signals Yet</div>
            <div className="text-gray-600 text-sm mt-2 max-w-md mx-auto">
              The engine scans every 3 seconds during prime windows (09:15–10:30 & 13:30–15:30 IST).
              All 3 convergence criteria must align for a Grade A signal.
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 max-w-sm mx-auto text-[10px] text-gray-600">
              <div className="bg-[hsl(220,13%,13%)] border border-[hsl(220,13%,20%)] rounded-lg p-2">📊 Price Breakout<br /><span className="text-gray-700">5-min high break</span></div>
              <div className="bg-[hsl(220,13%,13%)] border border-[hsl(220,13%,20%)] rounded-lg p-2">📈 OI Velocity<br /><span className="text-gray-700">Unwinding detected</span></div>
              <div className="bg-[hsl(220,13%,13%)] border border-[hsl(220,13%,20%)] rounded-lg p-2">💧 Volume Spike<br /><span className="text-gray-700">2× average</span></div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSignals.map(s => (
              <SignalRow key={s.id} signal={s} isNew={newIds.has(s.id)} />
            ))}
          </div>
        )}

        {/* Grade legend + disclaimer */}
        <div className="mt-6 pt-4 border-t border-[hsl(220,13%,18%)] flex flex-wrap gap-4 text-[10px] text-gray-600">
          <span>★ Grade A = Price Action + OI Pulse + V-Force + Volume (all 4 aligned) — 90%+ accuracy target</span>
          <span>◆ Grade B = Price + Volume + VWAP + EMA (3 aligned) — 70%+ accuracy target</span>
          <span>●trail = Stop Loss auto-moved to entry after T1 hit (zero-loss protection)</span>
        </div>
        <div className="mt-3 text-center text-xs text-gray-700">
          ⚠️ Educational only. Not SEBI-registered advice. Scalp signals are high-risk short-duration plays for educational study.
        </div>
      </div>
    </div>
  );
}
