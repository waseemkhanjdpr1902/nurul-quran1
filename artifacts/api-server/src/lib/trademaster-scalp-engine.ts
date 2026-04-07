/**
 * TradeMaster — Structural Scalper Engine
 *
 * Structural Filters (all 3 must align for Grade A):
 *   Cond 1 (Price):   Price > VWAP-15min AND Price > 9 EMA (1-min)
 *   Cond 2 (OI Pulse): Put OI velocity ≥ 2× Call OI velocity (BUY)
 *   Cond 3 (Volume):   Current 1-min volume is highest of last 10 candles
 *
 * T1 = 0.25%  |  T2 = 0.50%  |  SL = ATR(14) × 1.5 dynamic
 *
 * Data: Upstox REST LTP (1s polling) — builds 1-min OHLCV candles in-process.
 *       OI Chain fetched every 60s via Upstox REST.
 */

import { logger } from "./logger";
import { EventEmitter } from "events";

// ── Types ────────────────────────────────────────────────────────────────────

export type SignalGrade  = "A" | "B";
export type SignalDir    = "BUY" | "SELL";
export type TradeStatus  = "ACTIVE" | "T1_HIT" | "T2_HIT" | "SL_HIT" | "EXPIRED";

export interface ScalpSignal {
  id:             string;
  index:          "NIFTY" | "BANKNIFTY";
  dir:            SignalDir;
  grade:          SignalGrade;
  optionName:     string;
  entry:          number;
  stopLoss:       number;   // ATR-based dynamic SL
  target1:        number;   // +0.25%
  target2:        number;   // +0.50%
  spotAtEntry:    number;
  vwap15:         number;   // 15-min VWAP at entry
  ema9:           number;
  atr14:          number;   // ATR at entry
  oiVelocityCall: number;
  oiVelocityPut:  number;
  volumePeak:     boolean;  // true if vol was highest of last 10
  confidence:     number;   // 0–100 score
  reason:         string;
  avoidReason?:   string;   // set if signal was considered but filtered out
  status:         TradeStatus;
  trailingSlActive: boolean;
  createdAt:      Date;
  closedAt?:      Date;
  exitPrice?:     number;
  durationMs?:    number;   // ms from entry to close
}

export interface AvoidedSignal {
  id:         string;
  index:      "NIFTY" | "BANKNIFTY";
  dir:        SignalDir;
  timestamp:  Date;
  reason:     string;
  cond1Met:   boolean;
  cond2Met:   boolean;
  cond3Met:   boolean;
}

export interface ScalpStats {
  totalSignals:       number;
  t1Hit:              number;
  t2Hit:              number;
  slHit:              number;
  active:             number;
  winRate:            number;
  last10:             Array<"T1_HIT" | "T2_HIT" | "SL_HIT" | "EXPIRED">;
  netPointsNifty:     number;
  netPointsBankNifty: number;
  avgDurationWinMs:   number;  // avg ms for winning trades
  lastUpdated:        Date;
}

export interface LiveData {
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
  cond1Nifty: boolean;      // Price > VWAP15 AND > EMA9
  cond2Nifty: boolean;      // Put OI vel ≥ 2× Call OI vel
  cond3Nifty: boolean;      // Vol = highest of last 10
  cond1BankNifty: boolean;
  cond2BankNifty: boolean;
  cond3BankNifty: boolean;
  momentumBurst: { nifty: boolean; banknifty: boolean };
  isMarketOpen:  boolean;
  isPrimeWindow: boolean;
  avoidedSignals: AvoidedSignal[];
  lastUpdated:   Date;
}

export interface ScalpUpdate {
  type:      "signal" | "stats" | "live" | "tradeUpdate" | "avoided";
  signal?:   ScalpSignal;
  stats?:    ScalpStats;
  live?:     LiveData;
  avoided?:  AvoidedSignal;
  tradeId?:  string;
  newStatus?: TradeStatus;
}

// ── SSE Emitter ───────────────────────────────────────────────────────────────

export const scalpEmitter = new EventEmitter();
scalpEmitter.setMaxListeners(100);

// ── In-memory state ───────────────────────────────────────────────────────────

interface Candle { o: number; h: number; l: number; c: number; v: number; ts: number }
interface OISnapshot { callOi: number; putOi: number; ts: number }

function mkState() {
  return {
    candles1m:     [] as Candle[],
    partialCandle: null as Candle | null,
    // 15-min VWAP: rolling sum over last 15 completed 1-min candles
    vwap15Num: 0, vwap15Den: 0,
    // EMA
    ema9: 0, ema21: 0,
    // RSI-7
    rsi7: 50, rsiGains: [] as number[], rsiLosses: [] as number[],
    prevRsi: 50,
    // ATR-14
    atr14: 0,
    prevClose: 0,
    // OI
    oiSnapshots: [] as OISnapshot[],
    atmStrike: 0,
  };
}

const state = {
  nifty:     mkState(),
  banknifty: mkState(),
  dayOpen:   { nifty: 0, banknifty: 0 },
  signals:   [] as ScalpSignal[],
  avoided:   [] as AvoidedSignal[],
  lastSignalAt: { NIFTY: 0, BANKNIFTY: 0 } as Record<string, number>,
};

const SIGNAL_COOLDOWN_MS = 3 * 60 * 1000;  // 3 min cooldown
const OI_FETCH_INTERVAL  = 60 * 1000;

// ── IST Helpers ───────────────────────────────────────────────────────────────

function nowIST(): Date {
  return new Date(Date.now() + 5.5 * 3600000);
}

function isMarketOpen(): boolean {
  const ist = nowIST();
  const d = ist.getUTCDay();
  if (d === 0 || d === 6) return false;
  const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return mins >= 555 && mins <= 930;  // 09:15–15:30
}

function isPrimeWindow(): boolean {
  const ist = nowIST();
  if (ist.getUTCDay() === 0 || ist.getUTCDay() === 6) return false;
  const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return (mins >= 555 && mins <= 630) || (mins >= 810 && mins <= 930);
}

function currentMinuteTS(): number {
  return Math.floor(Date.now() / 60000) * 60000;
}

// ── EMA ───────────────────────────────────────────────────────────────────────

function calcEMA(prev: number, price: number, period: number): number {
  if (prev === 0) return price;
  const k = 2 / (period + 1);
  return price * k + prev * (1 - k);
}

// ── ATR (14-period True Range) ────────────────────────────────────────────────

function calcATR(candles: Candle[], prevClose: number): number {
  if (candles.length < 2) return 0;
  const trs: number[] = [];
  for (let i = Math.max(0, candles.length - 14); i < candles.length; i++) {
    const c = candles[i];
    const prev = i > 0 ? candles[i-1].c : prevClose;
    const tr = Math.max(c.h - c.l, Math.abs(c.h - prev), Math.abs(c.l - prev));
    trs.push(tr);
  }
  return trs.reduce((a, b) => a + b, 0) / trs.length;
}

// ── 15-min VWAP (rolling last 15 completed 1-min candles) ─────────────────────

function calc15mVWAP(candles: Candle[]): number {
  const last15 = candles.slice(-15);
  if (last15.length === 0) return 0;
  let num = 0, den = 0;
  for (const c of last15) {
    const typical = (c.h + c.l + c.c) / 3;
    num += typical * c.v;
    den += c.v;
  }
  return den > 0 ? num / den : last15[last15.length - 1]?.c ?? 0;
}

// ── Volume Peak (highest volume of last 10 candles) ───────────────────────────

function isVolumePeak(candles: Candle[], currentVol: number): boolean {
  if (candles.length < 2) return false;
  const last10 = candles.slice(-10);
  const maxVol = Math.max(...last10.map(c => c.v));
  return currentVol >= maxVol;
}

// ── OI Velocity ───────────────────────────────────────────────────────────────

function getOIVelocity(snapshots: OISnapshot[], type: "call" | "put"): number {
  if (snapshots.length < 2) return 0;
  const recent = snapshots[snapshots.length - 1];
  const ago    = snapshots.length >= 4 ? snapshots[snapshots.length - 4] : snapshots[0];
  const dtMins = (recent.ts - ago.ts) / 60000;
  if (dtMins < 0.5) return 0;
  const delta = type === "call"
    ? recent.callOi - ago.callOi
    : recent.putOi  - ago.putOi;
  return delta / dtMins;
}

// ── RSI (7-period) ────────────────────────────────────────────────────────────

function calcRSI(gains: number[], losses: number[], g: number, l: number): number {
  gains.push(g); losses.push(l);
  if (gains.length > 7) { gains.shift(); losses.shift(); }
  if (gains.length < 7) return 50;
  const avgG = gains.reduce((a,b) => a+b, 0) / 7;
  const avgL = losses.reduce((a,b) => a+b, 0) / 7;
  if (avgL === 0) return 100;
  return 100 - (100 / (1 + avgG / avgL));
}

// ── Confidence Score (0–100) ──────────────────────────────────────────────────

function calcConfidence(
  priceVsVwap15: number,    // price / vwap15 - 1  (positive = above)
  priceVsEma9:   number,    // price / ema9 - 1
  oiRatio:       number,    // putVel / |callVel|  (>2 = strong)
  isVolPeak:     boolean,
  grade:         SignalGrade,
): number {
  let score = grade === "A" ? 60 : 40;

  // Cond 1 sub-score: how far above VWAP-15 and EMA-9
  const vwapStrength = Math.min(20, priceVsVwap15 * 2000);  // 0.01% = 20pts
  const emaStrength  = Math.min(10, priceVsEma9  * 1000);
  score += Math.max(0, vwapStrength) + Math.max(0, emaStrength);

  // Cond 2: OI ratio strength (2× = baseline, 3× = +10, 4× = +15)
  if (oiRatio >= 4)      score += 15;
  else if (oiRatio >= 3) score += 10;
  else if (oiRatio >= 2) score += 5;

  // Cond 3: Volume peak
  if (isVolPeak) score += 10;

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ── ATM Strike ────────────────────────────────────────────────────────────────

function roundToATM(price: number, step: number): number {
  return Math.round(price / step) * step;
}

function nearestThursday(): string {
  const ist = nowIST();
  const d = ist.getUTCDay();
  const daysAhead = (4 - d + 7) % 7;
  const next = new Date(Date.UTC(
    ist.getUTCFullYear(), ist.getUTCMonth(),
    ist.getUTCDate() + daysAhead
  ));
  return next.toISOString().slice(0, 10);
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

// ── Signal Generation ─────────────────────────────────────────────────────────

function tryGenerateSignal(
  index:     "NIFTY" | "BANKNIFTY",
  s:         ReturnType<typeof mkState>,
  price:     number,
  atr14:     number,
): ScalpSignal | null {

  if (!isPrimeWindow()) return null;

  const now = Date.now();
  if (now - state.lastSignalAt[index] < SIGNAL_COOLDOWN_MS) return null;
  if (s.candles1m.length < 10) return null;  // need 10 candles minimum

  const vwap15       = calc15mVWAP(s.candles1m);
  const ema9         = s.ema9;
  const callOiVel    = getOIVelocity(s.oiSnapshots, "call");
  const putOiVel     = getOIVelocity(s.oiSnapshots, "put");
  const partialVol   = s.partialCandle?.v ?? 0;

  // ── Condition 1 (Price Structure) ────────────────────────────────────────
  // BUY: Price > VWAP-15 AND Price > 9 EMA (1-min)
  const cond1Buy  = vwap15 > 0 && ema9 > 0 && price > vwap15 && price > ema9;
  // SELL: Price < VWAP-15 AND Price < 9 EMA
  const cond1Sell = vwap15 > 0 && ema9 > 0 && price < vwap15 && price < ema9;

  // ── Condition 2 (OI Velocity) ─────────────────────────────────────────────
  // BUY:  Put OI growing ≥ 2× faster than |Call OI| (bulls accumulating puts as hedge or calls unwinding)
  const absCallVel   = Math.abs(callOiVel);
  const absPutVel    = Math.abs(putOiVel);
  // BUY logic: Put OI increasing (long buildup) and its velocity ≥ 2× call OI change
  const cond2Buy  = putOiVel > 500 && absPutVel >= 2 * Math.max(absCallVel, 1);
  // SELL logic: Call OI increasing and ≥ 2× put OI change
  const cond2Sell = callOiVel > 500 && absCallVel >= 2 * Math.max(absPutVel, 1);

  // ── Condition 3 (Volume Peak) ─────────────────────────────────────────────
  const cond3 = isVolumePeak(s.candles1m, partialVol);

  // Determine direction and grade
  let dir: SignalDir | null = null;
  let grade: SignalGrade = "B";
  let reason = "";

  if (cond1Buy && cond2Buy && cond3) {
    dir = "BUY"; grade = "A";
    reason = `Price > VWAP-15 (${vwap15.toFixed(1)}) & 9EMA (${ema9.toFixed(1)}) · Put OI ${(putOiVel/1000).toFixed(1)}K/m ≥ 2× Call · Vol PEAK`;
  } else if (cond1Sell && cond2Sell && cond3) {
    dir = "SELL"; grade = "A";
    reason = `Price < VWAP-15 (${vwap15.toFixed(1)}) & 9EMA (${ema9.toFixed(1)}) · Call OI ${(callOiVel/1000).toFixed(1)}K/m ≥ 2× Put · Vol PEAK`;
  } else if (cond1Buy && cond3 && !cond2Buy) {
    dir = "BUY"; grade = "B";
    reason = `Price > VWAP-15 & EMA9 · Vol PEAK (OI velocity not yet 2× — Grade B)`;
  } else if (cond1Sell && cond3 && !cond2Sell) {
    dir = "SELL"; grade = "B";
    reason = `Price < VWAP-15 & EMA9 · Vol PEAK (OI velocity not 2× — Grade B)`;
  }

  // ── Log avoided signal if almost triggered ─────────────────────────────────
  if (!dir) {
    const almostBuy  = cond1Buy  && (cond2Buy  || cond3);
    const almostSell = cond1Sell && (cond2Sell || cond3);
    if (almostBuy || almostSell) {
      const avoidDir: SignalDir = almostBuy ? "BUY" : "SELL";
      const c1 = almostBuy ? cond1Buy  : cond1Sell;
      const c2 = almostBuy ? cond2Buy  : cond2Sell;
      const missing = [];
      if (!c2)   missing.push(`OI vel <2× (Put: ${(putOiVel/1000).toFixed(1)}K/m, Call: ${(callOiVel/1000).toFixed(1)}K/m)`);
      if (!cond3) missing.push(`Vol not peak (${(partialVol/1000).toFixed(0)}K vs candle max)`);
      const avoidReason = `SL Prevention: ${missing.join(" · ")}`;

      const avoided: AvoidedSignal = {
        id: genId(), index, dir: avoidDir, timestamp: new Date(),
        reason: avoidReason,
        cond1Met: c1, cond2Met: c2, cond3Met: cond3,
      };
      state.avoided.unshift(avoided);
      if (state.avoided.length > 20) state.avoided.pop();
      scalpEmitter.emit("update", { type: "avoided", avoided });
    }
    return null;
  }

  // ── Calculate Levels ──────────────────────────────────────────────────────
  const slBuf = atr14 > 0 ? atr14 * 1.5 : price * 0.003;
  const stopLoss = dir === "BUY" ? price - slBuf : price + slBuf;
  const target1  = dir === "BUY" ? price * 1.0025 : price * 0.9975;
  const target2  = dir === "BUY" ? price * 1.005  : price * 0.995;

  // Confidence
  const oiRatio    = putOiVel > 0 && Math.abs(callOiVel) > 0
    ? absPutVel / Math.max(absCallVel, 1)
    : cond2Buy ? 2 : 0;
  const confidence = calcConfidence(
    vwap15 > 0 ? price / vwap15 - 1 : 0,
    ema9   > 0 ? price / ema9   - 1 : 0,
    oiRatio,
    cond3,
    grade,
  );

  // ATM option name
  const step     = index === "NIFTY" ? 50 : 100;
  const atmStr   = roundToATM(price, step);
  const optionName = `${index} ${atmStr} ${dir === "BUY" ? "CE" : "PE"}`;

  const sig: ScalpSignal = {
    id:              genId(),
    index,
    dir,
    grade,
    optionName,
    entry:           price,
    stopLoss:        parseFloat(stopLoss.toFixed(2)),
    target1:         parseFloat(target1.toFixed(2)),
    target2:         parseFloat(target2.toFixed(2)),
    spotAtEntry:     price,
    vwap15:          parseFloat(vwap15.toFixed(2)),
    ema9:            parseFloat(ema9.toFixed(2)),
    atr14:           parseFloat((atr14 || 0).toFixed(2)),
    oiVelocityCall:  parseFloat(callOiVel.toFixed(0)),
    oiVelocityPut:   parseFloat(putOiVel.toFixed(0)),
    volumePeak:      cond3,
    confidence,
    reason,
    status:          "ACTIVE",
    trailingSlActive: false,
    createdAt:       new Date(),
  };

  state.lastSignalAt[index] = now;
  state.signals.push(sig);
  logger.info({ id: sig.id, index, dir, grade, confidence }, "Structural Scalp signal generated");
  return sig;
}

// ── Update Active Trades ──────────────────────────────────────────────────────

function updateActiveSignals(niftyPrice: number, bnPrice: number) {
  let any = false;
  for (const s of state.signals) {
    if (s.status !== "ACTIVE") continue;
    const price = s.index === "NIFTY" ? niftyPrice : bnPrice;

    const hitSL = s.dir === "BUY" ? price <= s.stopLoss : price >= s.stopLoss;
    const hitT2 = s.dir === "BUY" ? price >= s.target2  : price <= s.target2;
    const hitT1 = s.dir === "BUY" ? price >= s.target1  : price <= s.target1;

    if (hitT2) {
      s.status = "T2_HIT"; s.closedAt = new Date(); s.exitPrice = price;
      s.durationMs = s.closedAt.getTime() - s.createdAt.getTime();
      scalpEmitter.emit("update", { type: "tradeUpdate", tradeId: s.id, newStatus: "T2_HIT" });
      any = true;
    } else if (hitT1 && !s.trailingSlActive) {
      s.trailingSlActive = true;
      s.stopLoss = s.entry;  // trail to breakeven
      s.status   = "T1_HIT";
      s.durationMs = (new Date().getTime()) - s.createdAt.getTime();
      scalpEmitter.emit("update", { type: "tradeUpdate", tradeId: s.id, newStatus: "T1_HIT" });
      any = true;
    } else if (hitSL && !hitT1) {
      s.status = "SL_HIT"; s.closedAt = new Date(); s.exitPrice = price;
      s.durationMs = s.closedAt.getTime() - s.createdAt.getTime();
      scalpEmitter.emit("update", { type: "tradeUpdate", tradeId: s.id, newStatus: "SL_HIT" });
      any = true;
    }
  }
  // Expire after 60 min
  const cutoff = Date.now() - 3600000;
  for (const s of state.signals) {
    if (s.status === "ACTIVE" && s.createdAt.getTime() < cutoff) {
      s.status = "EXPIRED"; s.closedAt = new Date();
    }
  }
  return any;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export function getScalpStats(): ScalpStats {
  const closed = state.signals.filter(s => s.status !== "ACTIVE" && s.status !== "EXPIRED");
  const wins   = closed.filter(s => s.status === "T1_HIT" || s.status === "T2_HIT");
  const active = state.signals.filter(s => s.status === "ACTIVE").length;

  let netN = 0, netBN = 0, totalWinMs = 0;
  for (const s of closed) {
    if (!s.exitPrice) continue;
    const pts = s.dir === "BUY" ? s.exitPrice - s.entry : s.entry - s.exitPrice;
    if (s.index === "NIFTY") netN += pts; else netBN += pts;
    if ((s.status === "T1_HIT" || s.status === "T2_HIT") && s.durationMs) {
      totalWinMs += s.durationMs;
    }
  }

  // Last 10 non-expired closed signals
  const last10 = closed
    .slice(-10)
    .map(s => s.status as "T1_HIT" | "T2_HIT" | "SL_HIT" | "EXPIRED");

  return {
    totalSignals:       state.signals.length,
    t1Hit:              state.signals.filter(s => s.status === "T1_HIT").length,
    t2Hit:              state.signals.filter(s => s.status === "T2_HIT").length,
    slHit:              state.signals.filter(s => s.status === "SL_HIT").length,
    active,
    winRate:  closed.length > 0 ? parseFloat(((wins.length / closed.length) * 100).toFixed(1)) : 0,
    last10,
    netPointsNifty:     parseFloat(netN.toFixed(2)),
    netPointsBankNifty: parseFloat(netBN.toFixed(2)),
    avgDurationWinMs:   wins.length > 0 ? Math.round(totalWinMs / wins.length) : 0,
    lastUpdated:        new Date(),
  };
}

export function getScalpSignals(): ScalpSignal[]   { return [...state.signals].reverse().slice(0, 50); }
export function getAvoidedSignals(): AvoidedSignal[] { return state.avoided.slice(0, 10); }

// ── Cached live snapshot ──────────────────────────────────────────────────────

let _liveSnapshot: LiveData | null = null;
export function getLiveSnapshot(): LiveData | null { return _liveSnapshot; }

// ── REST fetch helpers ────────────────────────────────────────────────────────

async function fetchLTP(token: string): Promise<{ nifty: number; banknifty: number } | null> {
  try {
    const keys = "NSE_INDEX|Nifty 50,NSE_INDEX|Nifty Bank";
    const url  = `https://api.upstox.com/v2/market-quote/ltp?instrument_key=${encodeURIComponent(keys)}`;
    const res  = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal:  AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const json = await res.json() as { data?: Record<string, { last_price: number }> };
    const d    = json.data;
    if (!d) return null;
    const nifty     = d["NSE_INDEX:Nifty 50"]?.last_price   ?? 0;
    const banknifty = d["NSE_INDEX:Nifty Bank"]?.last_price ?? 0;
    return nifty && banknifty ? { nifty, banknifty } : null;
  } catch { return null; }
}

async function fetchOI(
  token: string,
  instrument: string,
  atmStrike: number,
  expiry: string
): Promise<{ callOi: number; putOi: number } | null> {
  try {
    const url = `https://api.upstox.com/v2/option/chain?instrument_key=${encodeURIComponent(instrument)}&expiry_date=${expiry}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal:  AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json() as {
      data?: Array<{ strike_price: number; call_options?: { market_data?: { oi?: number } }; put_options?: { market_data?: { oi?: number } } }>
    };
    const chain = json.data ?? [];
    const row   = chain.find(r => r.strike_price === atmStrike) ?? chain.find(r => Math.abs(r.strike_price - atmStrike) < 200);
    if (!row) return null;
    return {
      callOi: row.call_options?.market_data?.oi ?? 0,
      putOi:  row.put_options?.market_data?.oi  ?? 0,
    };
  } catch { return null; }
}

// ── Candle Builder + Indicator Update ────────────────────────────────────────

function processPrice(key: "NIFTY" | "BANKNIFTY", price: number, s: ReturnType<typeof mkState>) {
  const syntheticVol = Math.abs(price - (s.prevClose || price)) * (key === "NIFTY" ? 8000 : 4000) + 30000;
  const ts = currentMinuteTS();

  if (!s.partialCandle || s.partialCandle.ts < ts) {
    // Close completed candle
    if (s.partialCandle && s.partialCandle.ts < ts) {
      const c = s.partialCandle;
      s.candles1m.push(c);
      if (s.candles1m.length > 200) s.candles1m.shift();

      // RSI update
      const change = c.c - (s.candles1m.length > 1 ? s.candles1m[s.candles1m.length-2].c : c.o);
      s.rsi7 = calcRSI(s.rsiGains, s.rsiLosses, Math.max(0, change), Math.max(0, -change));

      // EMA update
      s.ema9  = calcEMA(s.ema9,  c.c, 9);
      s.ema21 = calcEMA(s.ema21, c.c, 21);

      // ATR update
      s.atr14 = calcATR(s.candles1m, s.prevClose);
    }
    s.partialCandle = { o: price, h: price, l: price, c: price, v: syntheticVol, ts };
  } else {
    s.partialCandle.h = Math.max(s.partialCandle.h, price);
    s.partialCandle.l = Math.min(s.partialCandle.l, price);
    s.partialCandle.c = price;
    s.partialCandle.v += syntheticVol * 0.08;
  }

  s.prevClose  = price;
  const step   = key === "NIFTY" ? 50 : 100;
  s.atmStrike  = roundToATM(price, step);
}

// ── Main Polling Loop ─────────────────────────────────────────────────────────

let engineRunning = false;
let pollInterval:  ReturnType<typeof setInterval> | null = null;
let oiInterval:    ReturnType<typeof setInterval> | null = null;

async function pollMarket() {
  const token = process.env.UPSTOX_ACCESS_TOKEN;
  if (!token) return;

  const prices = await fetchLTP(token);
  if (!prices) return;

  const { nifty: nPrice, banknifty: bnPrice } = prices;
  if (!state.dayOpen.nifty)     state.dayOpen.nifty     = nPrice;
  if (!state.dayOpen.banknifty) state.dayOpen.banknifty = bnPrice;

  // Process both indices
  processPrice("NIFTY",     nPrice,  state.nifty);
  processPrice("BANKNIFTY", bnPrice, state.banknifty);

  const vwap15N  = calc15mVWAP(state.nifty.candles1m);
  const vwap15BN = calc15mVWAP(state.banknifty.candles1m);

  const callVelN  = getOIVelocity(state.nifty.oiSnapshots,     "call");
  const putVelN   = getOIVelocity(state.nifty.oiSnapshots,     "put");
  const callVelBN = getOIVelocity(state.banknifty.oiSnapshots, "call");
  const putVelBN  = getOIVelocity(state.banknifty.oiSnapshots, "put");

  const partialVolN  = state.nifty.partialCandle?.v     ?? 0;
  const partialVolBN = state.banknifty.partialCandle?.v ?? 0;

  const cond1N  = vwap15N  > 0 && state.nifty.ema9  > 0 && nPrice  > vwap15N  && nPrice  > state.nifty.ema9;
  const cond1BN = vwap15BN > 0 && state.banknifty.ema9 > 0 && bnPrice > vwap15BN && bnPrice > state.banknifty.ema9;
  const cond2N  = putVelN  > 500 && Math.abs(putVelN)  >= 2 * Math.max(Math.abs(callVelN),  1);
  const cond2BN = putVelBN > 500 && Math.abs(putVelBN) >= 2 * Math.max(Math.abs(callVelBN), 1);
  const cond3N  = isVolumePeak(state.nifty.candles1m,     partialVolN);
  const cond3BN = isVolumePeak(state.banknifty.candles1m, partialVolBN);

  // Rebuild live snapshot
  _liveSnapshot = {
    nifty:     { price: nPrice,  change: nPrice  - state.dayOpen.nifty,     changePct: ((nPrice  - state.dayOpen.nifty)     / state.dayOpen.nifty)     * 100 },
    banknifty: { price: bnPrice, change: bnPrice - state.dayOpen.banknifty, changePct: ((bnPrice - state.dayOpen.banknifty) / state.dayOpen.banknifty) * 100 },
    vwap15Nifty:     parseFloat(vwap15N.toFixed(2)),
    vwap15BankNifty: parseFloat(vwap15BN.toFixed(2)),
    ema9Nifty:       parseFloat(state.nifty.ema9.toFixed(2)),
    ema9BankNifty:   parseFloat(state.banknifty.ema9.toFixed(2)),
    atr14Nifty:      parseFloat((state.nifty.atr14     || 0).toFixed(2)),
    atr14BankNifty:  parseFloat((state.banknifty.atr14 || 0).toFixed(2)),
    callOiVelocityNifty:     parseFloat(callVelN.toFixed(0)),
    putOiVelocityNifty:      parseFloat(putVelN.toFixed(0)),
    callOiVelocityBankNifty: parseFloat(callVelBN.toFixed(0)),
    putOiVelocityBankNifty:  parseFloat(putVelBN.toFixed(0)),
    volumePeakNifty:     cond3N,
    volumePeakBankNifty: cond3BN,
    cond1Nifty: cond1N, cond2Nifty: cond2N, cond3Nifty: cond3N,
    cond1BankNifty: cond1BN, cond2BankNifty: cond2BN, cond3BankNifty: cond3BN,
    momentumBurst: {
      nifty:     Math.abs(state.nifty.rsi7     - state.nifty.prevRsi)     >= 15,
      banknifty: Math.abs(state.banknifty.rsi7 - state.banknifty.prevRsi) >= 15,
    },
    isMarketOpen:  isMarketOpen(),
    isPrimeWindow: isPrimeWindow(),
    avoidedSignals: state.avoided.slice(0, 5),
    lastUpdated: new Date(),
  };

  // Try signal generation
  if (isMarketOpen()) {
    for (const [idx, s, price] of [
      ["NIFTY",     state.nifty,     nPrice ],
      ["BANKNIFTY", state.banknifty, bnPrice],
    ] as Array<["NIFTY" | "BANKNIFTY", ReturnType<typeof mkState>, number]>) {
      const sig = tryGenerateSignal(idx, s, price, s.atr14);
      if (sig) scalpEmitter.emit("update", { type: "signal", signal: sig });
    }
  }

  // Check active trades
  const anyUpdated = updateActiveSignals(nPrice, bnPrice);
  if (anyUpdated) {
    scalpEmitter.emit("update", { type: "stats", stats: getScalpStats() });
  }

  // Emit live
  scalpEmitter.emit("update", { type: "live", live: _liveSnapshot });

  state.nifty.prevRsi     = state.nifty.rsi7;
  state.banknifty.prevRsi = state.banknifty.rsi7;
}

async function pollOI() {
  const token = process.env.UPSTOX_ACCESS_TOKEN;
  if (!token || !isMarketOpen()) return;
  const expiry = nearestThursday();
  const [nOI, bnOI] = await Promise.all([
    fetchOI(token, "NSE_INDEX|Nifty 50",   state.nifty.atmStrike     || 24000, expiry),
    fetchOI(token, "NSE_INDEX|Nifty Bank", state.banknifty.atmStrike || 52000, expiry),
  ]);
  const now = Date.now();
  if (nOI)  { state.nifty.oiSnapshots.push({ ...nOI, ts: now });     if (state.nifty.oiSnapshots.length     > 20) state.nifty.oiSnapshots.shift(); }
  if (bnOI) { state.banknifty.oiSnapshots.push({ ...bnOI, ts: now }); if (state.banknifty.oiSnapshots.length > 20) state.banknifty.oiSnapshots.shift(); }
}

export function startScalpEngine(): void {
  if (engineRunning) return;
  engineRunning = true;
  // Poll LTP every 1 second (near real-time candle building)
  pollInterval = setInterval(() => { pollMarket().catch(() => {}); }, 1000);
  // OI every 60 sec
  oiInterval   = setInterval(() => { pollOI().catch(() => {}); }, OI_FETCH_INTERVAL);
  pollMarket().catch(() => {});
  pollOI().catch(() => {});
  logger.info("Structural Scalper Engine started — 1s LTP polling + 60s OI · ATR SL · T1=0.25% T2=0.50%");
}

export function stopScalpEngine(): void {
  if (pollInterval) clearInterval(pollInterval);
  if (oiInterval)   clearInterval(oiInterval);
  engineRunning = false;
}
