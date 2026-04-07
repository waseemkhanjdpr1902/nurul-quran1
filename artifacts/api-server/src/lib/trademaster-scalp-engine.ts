/**
 * TradeMaster HFT Scalping Engine
 * Real-time signal generation for Nifty 50 and Bank Nifty
 *
 * Signal Logic (Convergence):
 *  Grade A: Price Action + OI Pulse + V-Force (all 3)  → 90%+ accuracy target
 *  Grade B: Price Action + Volume (2 of 3)              → 70%+ accuracy target
 *
 * Time Filter: 09:15–10:30 and 13:30–15:30 IST only (avoid sideways zone)
 */

import { logger } from "./logger";
import { EventEmitter } from "events";

// ── Types ────────────────────────────────────────────────────────────────────

export type SignalGrade = "A" | "B";
export type SignalDir   = "BUY" | "SELL";
export type TradeStatus = "ACTIVE" | "T1_HIT" | "T2_HIT" | "SL_HIT" | "EXPIRED";

export interface ScalpSignal {
  id:          string;
  index:       "NIFTY" | "BANKNIFTY";
  dir:         SignalDir;
  grade:       SignalGrade;
  optionName:  string;        // e.g. "BANKNIFTY 48200 CE"
  entry:       number;
  stopLoss:    number;        // low of signal candle
  target1:     number;        // +0.3% or RSI 75/25
  target2:     number;        // +0.6%
  spotAtEntry: number;
  vwap:        number;
  rsi7:        number;
  oiVelocity:  number;        // Call OI velocity (negative = unwinding)
  volumeRatio: number;        // current vol / 20-period avg
  reason:      string;
  status:      TradeStatus;
  trailingSlActive: boolean;
  createdAt:   Date;
  closedAt?:   Date;
  exitPrice?:  number;
}

export interface ScalpStats {
  totalSignals: number;
  t1Hit:        number;
  t2Hit:        number;
  slHit:        number;
  active:       number;
  winRate:      number;       // % of closed signals that hit T1+
  netPointsNifty:   number;
  netPointsBankNifty: number;
  lastUpdated:  Date;
}

export interface LiveData {
  nifty:     { price: number; change: number; changePct: number };
  banknifty: { price: number; change: number; changePct: number };
  vwapNifty: number;
  vwapBankNifty: number;
  rsiNifty:  number;
  rsiBankNifty: number;
  ema9Nifty: number;
  ema21Nifty: number;
  ema9BankNifty: number;
  ema21BankNifty: number;
  atmCallOiNifty: number;
  atmPutOiNifty:  number;
  atmCallOiBankNifty: number;
  atmPutOiBankNifty:  number;
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
  isPrimeWindow: boolean;    // 09:15–10:30 or 13:30–15:30
  lastUpdated:   Date;
}

export interface ScalpUpdate {
  type:     "signal" | "stats" | "live" | "tradeUpdate";
  signal?:  ScalpSignal;
  stats?:   ScalpStats;
  live?:    LiveData;
  tradeId?: string;
  newStatus?: TradeStatus;
}

// ── SSE Emitter (used by route handlers) ─────────────────────────────────────

export const scalpEmitter = new EventEmitter();
scalpEmitter.setMaxListeners(100);

// ── In-memory state ───────────────────────────────────────────────────────────

const MAX_CANDLES = 200;

interface Candle { o: number; h: number; l: number; c: number; v: number; ts: number }
interface OISnapshot { callOi: number; putOi: number; ts: number }

const state = {
  nifty: {
    candles1m: [] as Candle[],
    partialCandle: null as Candle | null,
    vwapNum: 0, vwapDen: 0,      // VWAP running sums
    ema9: 0, ema21: 0,
    rsi7: 50,
    rsiGains: [] as number[], rsiLosses: [] as number[],
    prevClose: 0,
    prevRsi: 50,
    volAvg20: [] as number[],    // last 20 1-min volumes for avg
    oiSnapshots: [] as OISnapshot[],
    atmStrike: 0,
  },
  banknifty: {
    candles1m: [] as Candle[],
    partialCandle: null as Candle | null,
    vwapNum: 0, vwapDen: 0,
    ema9: 0, ema21: 0,
    rsi7: 50,
    rsiGains: [] as number[], rsiLosses: [] as number[],
    prevClose: 0,
    prevRsi: 50,
    volAvg20: [] as number[],
    oiSnapshots: [] as OISnapshot[],
    atmStrike: 0,
  },
  lastPrice: { nifty: 0, banknifty: 0 },
  dayOpen:   { nifty: 0, banknifty: 0 },
  signals:   [] as ScalpSignal[],
  lastSignalAt: { NIFTY: 0, BANKNIFTY: 0 } as Record<string, number>,
  lastOiFetch: 0,
};

const SIGNAL_COOLDOWN_MS = 5 * 60 * 1000; // 5 min between signals for same index
const OI_FETCH_INTERVAL  = 60 * 1000;      // fetch OI every 60 sec

// ── IST Helpers ───────────────────────────────────────────────────────────────

function nowIST(): Date {
  return new Date(Date.now() + 5.5 * 3600000);
}

function isMarketOpen(): boolean {
  const ist = nowIST();
  const h = ist.getUTCHours(), m = ist.getUTCMinutes(), d = ist.getUTCDay();
  if (d === 0 || d === 6) return false;   // weekend
  const mins = h * 60 + m;
  return mins >= 555 && mins <= 930;       // 09:15–15:30
}

function isPrimeWindow(): boolean {
  const ist = nowIST();
  const h = ist.getUTCHours(), m = ist.getUTCMinutes(), d = ist.getUTCDay();
  if (d === 0 || d === 6) return false;
  const mins = h * 60 + m;
  return (mins >= 555 && mins <= 630) ||   // 09:15–10:30
         (mins >= 810 && mins <= 930);      // 13:30–15:30
}

function currentMinuteTS(): number {
  const now = Date.now();
  return Math.floor(now / 60000) * 60000;
}

// ── ATM Strike Calculation ────────────────────────────────────────────────────

function roundToATM(price: number, stepSize: number): number {
  return Math.round(price / stepSize) * stepSize;
}

// ── EMA Calculation ──────────────────────────────────────────────────────────

function calcEMA(prev: number, price: number, period: number): number {
  if (prev === 0) return price;
  const k = 2 / (period + 1);
  return price * k + prev * (1 - k);
}

// ── RSI Calculation (7-period Wilder) ────────────────────────────────────────

function calcRSI(
  gains: number[], losses: number[],
  currentGain: number, currentLoss: number
): number {
  gains.push(currentGain);
  losses.push(currentLoss);
  if (gains.length > 7) { gains.shift(); losses.shift(); }
  if (gains.length < 7) return 50;
  const avgGain = gains.reduce((a,b)=>a+b,0)/7;
  const avgLoss = losses.reduce((a,b)=>a+b,0)/7;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// ── VWAP Update (running) ─────────────────────────────────────────────────────

function updateVWAP(s: typeof state.nifty, price: number, volume: number): number {
  s.vwapNum += price * volume;
  s.vwapDen += volume;
  return s.vwapDen > 0 ? s.vwapNum / s.vwapDen : price;
}

// ── Volume Ratio ──────────────────────────────────────────────────────────────

function getVolumeRatio(s: typeof state.nifty, vol: number): number {
  if (s.volAvg20.length < 5) return 1;
  const avg = s.volAvg20.reduce((a,b)=>a+b,0) / s.volAvg20.length;
  return avg > 0 ? vol / avg : 1;
}

// ── OI Velocity ───────────────────────────────────────────────────────────────

function getOIVelocity(snapshots: OISnapshot[], type: "call" | "put"): number {
  if (snapshots.length < 2) return 0;
  const recent = snapshots[snapshots.length - 1];
  const ago = snapshots.length >= 4 ? snapshots[snapshots.length - 4] : snapshots[0];
  const dtMins = (recent.ts - ago.ts) / 60000;
  if (dtMins < 0.5) return 0;
  const delta = type === "call"
    ? recent.callOi - ago.callOi
    : recent.putOi  - ago.putOi;
  return delta / dtMins;
}

// ── RSI Speed (momentum burst) ────────────────────────────────────────────────

function getRSISpeed(prevRsi: number, currRsi: number): { speed: number; burst: boolean } {
  const speed = Math.abs(currRsi - prevRsi);
  return { speed, burst: speed >= 20 };  // 20+ pt move = momentum burst
}

// ── Fetch Live Market Prices ──────────────────────────────────────────────────

async function fetchLTP(token: string): Promise<{ nifty: number; banknifty: number } | null> {
  try {
    const keys = "NSE_INDEX|Nifty 50,NSE_INDEX|Nifty Bank";
    const url = `https://api.upstox.com/v2/market-quote/ltp?instrument_key=${encodeURIComponent(keys)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const json = await res.json() as { data?: Record<string, { last_price: number }> };
    const d = json.data;
    if (!d) return null;
    const nifty     = d["NSE_INDEX:Nifty 50"]?.last_price ?? 0;
    const banknifty = d["NSE_INDEX:Nifty Bank"]?.last_price ?? 0;
    return nifty && banknifty ? { nifty, banknifty } : null;
  } catch {
    return null;
  }
}

// ── Fetch Option Chain OI ─────────────────────────────────────────────────────

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
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json() as { data?: Array<{ strike_price: number; call_options?: { market_data?: { oi?: number } }; put_options?: { market_data?: { oi?: number } } }> };
    const chain = json.data ?? [];
    const row = chain.find(r => r.strike_price === atmStrike) ?? chain.find(r => Math.abs(r.strike_price - atmStrike) < 200);
    if (!row) return null;
    return {
      callOi: row.call_options?.market_data?.oi ?? 0,
      putOi:  row.put_options?.market_data?.oi  ?? 0,
    };
  } catch {
    return null;
  }
}

// ── Get nearest weekly expiry date ───────────────────────────────────────────

function nearestThursday(): string {
  const ist = nowIST();
  const d = ist.getUTCDay(); // 0=Sun...6=Sat
  let daysUntilThursday = (4 - d + 7) % 7;
  if (daysUntilThursday === 0) daysUntilThursday = 0;  // today is Thursday
  const next = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + daysUntilThursday));
  return next.toISOString().slice(0, 10);
}

// ── Generate Unique ID ────────────────────────────────────────────────────────

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Signal Generation ─────────────────────────────────────────────────────────

function tryGenerateSignal(
  index: "NIFTY" | "BANKNIFTY",
  s: typeof state.nifty,
  price: number,
  vwap: number,
  ema9: number,
  ema21: number,
  rsi7: number,
  volRatio: number,
  callOiVelocity: number,
  putOiVelocity: number,
): ScalpSignal | null {

  if (!isPrimeWindow()) return null;

  // Cooldown: no signal for same index within 5 min
  const now = Date.now();
  if (now - state.lastSignalAt[index] < SIGNAL_COOLDOWN_MS) return null;

  // Need at least 5 1-min candles to check 5-min high
  if (s.candles1m.length < 5) return null;
  const last5 = s.candles1m.slice(-5);
  const high5m = Math.max(...last5.map(c => c.h));

  // ── Criteria ──────────────────────────────────────────────────────────────

  const low5m = Math.min(...last5.map(c => c.l));

  // Condition 1 (Price): 1-min candle breaks 5-min High (BUY) or 5-min Low (SELL)
  // AND price is above 9 EMA and VWAP
  const priceBreakoutBuy  = price > high5m && price > ema9 && price > vwap;
  const priceBreakoutSell = price < low5m  && price < ema9 && price < vwap;

  // Condition 2 (Options Pulse): OI Change Velocity every 60s
  // BUY:  ATM Call OI falling (short covering) + ATM Put OI rising (long buildup)
  const oiBuy  = callOiVelocity < -500 && putOiVelocity > 500;
  // SELL: ATM Put OI falling (short covering) + ATM Call OI rising (long buildup)
  const oiSell = putOiVelocity < -500 && callOiVelocity > 500;

  // V-Force: price vs VWAP (already encoded in priceBreakout, kept as auxiliary)
  const vForceBuy  = price > vwap;
  const vForceSell = price < vwap;

  // Condition 3 (Volume): Volume > 150% of 20-period moving average
  const volumeSpike = volRatio >= 1.5;

  // EMA crossover (9 EMA vs 21 EMA)
  const emaBullish = ema9 > ema21;
  const emaBearish = ema9 < ema21;

  // RSI zone filter
  const rsiBuyZone  = rsi7 >= 45 && rsi7 <= 72;
  const rsiSellZone = rsi7 >= 28 && rsi7 <= 55;

  let dir: SignalDir | null = null;
  let grade: SignalGrade = "B";
  let reason = "";

  // ── Grade A: All 3 conditions align (Price + OI Pulse + Volume) ────────────
  // Condition 1: 1-min candle breaks 5-min H/L + above 9EMA + above VWAP
  // Condition 2: OI Velocity confirms (Call short-covering + Put long-buildup = BUY)
  // Condition 3: Volume > 150% of 20-period MA
  if (priceBreakoutBuy && oiBuy && volumeSpike && emaBullish && rsiBuyZone) {
    dir   = "BUY";
    grade = "A";
    reason = "5-min High Breakout · Call OI Short-Covering · Put OI Long-Buildup · Vol >150% avg · 9EMA > 21EMA";
  } else if (priceBreakoutSell && oiSell && volumeSpike && emaBearish && rsiSellZone) {
    dir   = "SELL";
    grade = "A";
    reason = "5-min Low Breakdown · Put OI Short-Covering · Call OI Long-Buildup · Vol >150% avg · 9EMA < 21EMA";
  }
  // ── Grade B: Price Action + Volume (OI not yet confirmed) ───────────────────
  else if (priceBreakoutBuy && volumeSpike && emaBullish && rsiBuyZone) {
    dir   = "BUY";
    grade = "B";
    reason = "5-min High Breakout + Price above 9EMA & VWAP + Vol >150% avg";
  } else if (priceBreakoutSell && volumeSpike && emaBearish && rsiSellZone) {
    dir   = "SELL";
    grade = "B";
    reason = "5-min Low Breakdown + Price below 9EMA & VWAP + Vol >150% avg";
  }

  if (!dir) return null;

  // Calculate levels — spec: T1=0.5%, T2=1%, SL=0.3%
  const stopLoss = dir === "BUY" ? price * (1 - 0.003) : price * (1 + 0.003);
  const target1  = dir === "BUY" ? price * (1 + 0.005) : price * (1 - 0.005);
  const target2  = dir === "BUY" ? price * (1 + 0.010) : price * (1 - 0.010);

  // ATM option name
  const stepSize = index === "NIFTY" ? 50 : 100;
  const atmStrike = roundToATM(price, stepSize);
  const optionName = `${index} ${atmStrike} ${dir === "BUY" ? "CE" : "PE"}`;

  const signal: ScalpSignal = {
    id:          genId(),
    index,
    dir,
    grade,
    optionName,
    entry:       price,
    stopLoss:    parseFloat(stopLoss.toFixed(2)),
    target1:     parseFloat(target1.toFixed(2)),
    target2:     parseFloat(target2.toFixed(2)),
    spotAtEntry: price,
    vwap:        parseFloat(vwap.toFixed(2)),
    rsi7:        parseFloat(rsi7.toFixed(1)),
    oiVelocity:  parseFloat(callOiVelocity.toFixed(0)),
    volumeRatio: parseFloat(volRatio.toFixed(2)),
    reason,
    status:      "ACTIVE",
    trailingSlActive: false,
    createdAt:   new Date(),
  };

  state.lastSignalAt[index] = now;
  state.signals.push(signal);

  logger.info({ signalId: signal.id, index, dir, grade, reason }, "Scalp signal generated");
  return signal;
}

// ── Update TradeLog (auto SL/T1/T2 tracking) ─────────────────────────────────

function updateActiveSignals(niftyPrice: number, bankniftyPrice: number) {
  let anyUpdated = false;
  for (const s of state.signals) {
    if (s.status !== "ACTIVE") continue;
    const price = s.index === "NIFTY" ? niftyPrice : bankniftyPrice;

    const hitSL = s.dir === "BUY"  ? price <= s.stopLoss : price >= s.stopLoss;
    const hitT1 = s.dir === "BUY"  ? price >= s.target1  : price <= s.target1;
    const hitT2 = s.dir === "BUY"  ? price >= s.target2  : price <= s.target2;

    let newStatus: TradeStatus | null = null;

    if (hitT2) {
      newStatus = "T2_HIT";
    } else if (hitT1 && !s.trailingSlActive) {
      // Auto-trail: once T1 hit, move SL to entry (no loss guaranteed)
      s.trailingSlActive = true;
      s.stopLoss = s.entry;
      newStatus = "T1_HIT";
      // Emit T1 sound event for frontend
      scalpEmitter.emit("update", { type: "tradeUpdate", tradeId: s.id, newStatus: "T1_HIT" });
      anyUpdated = true;
    } else if (hitSL && !hitT1) {
      newStatus = "SL_HIT";
    }

    if (newStatus && newStatus !== "T1_HIT") {
      s.status   = newStatus;
      s.closedAt = new Date();
      s.exitPrice = price;
      scalpEmitter.emit("update", { type: "tradeUpdate", tradeId: s.id, newStatus });
      anyUpdated = true;
    }
  }

  // Expire signals older than 1 hour that are still "ACTIVE"
  const oneHourAgo = Date.now() - 3600000;
  for (const s of state.signals) {
    if (s.status === "ACTIVE" && s.createdAt.getTime() < oneHourAgo) {
      s.status   = "EXPIRED";
      s.closedAt = new Date();
    }
  }

  return anyUpdated;
}

// ── Stats Calculation ─────────────────────────────────────────────────────────

export function getScalpStats(): ScalpStats {
  const closed = state.signals.filter(s => s.status !== "ACTIVE" && s.status !== "EXPIRED");
  const wins   = closed.filter(s => s.status === "T1_HIT" || s.status === "T2_HIT").length;
  const active = state.signals.filter(s => s.status === "ACTIVE").length;

  let netNifty = 0, netBankNifty = 0;
  for (const s of closed) {
    if (!s.exitPrice) continue;
    const pts = s.dir === "BUY"
      ? s.exitPrice - s.entry
      : s.entry - s.exitPrice;
    if (s.index === "NIFTY") netNifty += pts;
    else netBankNifty += pts;
  }

  return {
    totalSignals: state.signals.length,
    t1Hit:  state.signals.filter(s => s.status === "T1_HIT").length,
    t2Hit:  state.signals.filter(s => s.status === "T2_HIT").length,
    slHit:  state.signals.filter(s => s.status === "SL_HIT").length,
    active,
    winRate:  closed.length > 0 ? parseFloat(((wins / closed.length) * 100).toFixed(1)) : 0,
    netPointsNifty:     parseFloat(netNifty.toFixed(2)),
    netPointsBankNifty: parseFloat(netBankNifty.toFixed(2)),
    lastUpdated: new Date(),
  };
}

export function getScalpSignals(): ScalpSignal[] {
  return [...state.signals].reverse().slice(0, 50);
}

// ── Cached live snapshot ──────────────────────────────────────────────────────

let _liveSnapshot: LiveData | null = null;
export function getLiveSnapshot(): LiveData | null { return _liveSnapshot; }

// ── Main Polling Loop ─────────────────────────────────────────────────────────

let engineRunning = false;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let oiInterval: ReturnType<typeof setInterval> | null = null;

async function pollMarket() {
  const token = process.env.UPSTOX_ACCESS_TOKEN;
  if (!token) return;

  const prices = await fetchLTP(token);
  if (!prices) return;

  const { nifty: nPrice, banknifty: bnPrice } = prices;

  // Set day open on first tick
  if (!state.dayOpen.nifty)     state.dayOpen.nifty     = nPrice;
  if (!state.dayOpen.banknifty) state.dayOpen.banknifty = bnPrice;

  // Update candles for both indices
  const ts = currentMinuteTS();
  for (const [key, price, s] of [["NIFTY", nPrice, state.nifty], ["BANKNIFTY", bnPrice, state.banknifty]] as [string, number, typeof state.nifty][]) {
    // Synthetic volume (use price change as proxy — real volume needs WebSocket)
    const syntheticVol = Math.abs(price - (s.prevClose || price)) * (key === "NIFTY" ? 10000 : 5000) + 50000;

    // Update partial candle
    if (!s.partialCandle || s.partialCandle.ts < ts) {
      // Close the completed candle
      if (s.partialCandle && s.partialCandle.ts < ts) {
        s.candles1m.push(s.partialCandle);
        if (s.candles1m.length > MAX_CANDLES) s.candles1m.shift();
        // Update volume avg
        s.volAvg20.push(s.partialCandle.v);
        if (s.volAvg20.length > 20) s.volAvg20.shift();
        // RSI
        const change = s.partialCandle.c - (s.candles1m.length > 1 ? s.candles1m[s.candles1m.length-2].c : s.partialCandle.o);
        s.rsi7 = calcRSI(s.rsiGains, s.rsiLosses, Math.max(0, change), Math.max(0, -change));
        // EMA
        s.ema9  = calcEMA(s.ema9,  s.partialCandle.c, 9);
        s.ema21 = calcEMA(s.ema21, s.partialCandle.c, 21);
      }
      s.partialCandle = { o: price, h: price, l: price, c: price, v: syntheticVol, ts };
    } else {
      s.partialCandle.h = Math.max(s.partialCandle.h, price);
      s.partialCandle.l = Math.min(s.partialCandle.l, price);
      s.partialCandle.c = price;
      s.partialCandle.v += syntheticVol * 0.1;
    }

    // VWAP
    const vwap = updateVWAP(s, price, syntheticVol);

    // Volume ratio vs 20-period avg
    const volRatio = getVolumeRatio(s, s.partialCandle.v);

    // OI velocities
    const callOiVelocity = getOIVelocity(s.oiSnapshots, "call");
    const putOiVelocity  = getOIVelocity(s.oiSnapshots, "put");

    // ATM strike
    const stepSize = key === "NIFTY" ? 50 : 100;
    s.atmStrike = roundToATM(price, stepSize);

    // RSI speed for momentum alerts
    const rsiSpeedData = getRSISpeed(s.prevRsi, s.rsi7);
    s.prevRsi  = s.rsi7;
    s.prevClose = price;

    // Emit live update every tick
    if (key === "NIFTY") {
      if (!_liveSnapshot) _liveSnapshot = {} as LiveData;
      _liveSnapshot.nifty     = { price: nPrice, change: nPrice - state.dayOpen.nifty, changePct: ((nPrice - state.dayOpen.nifty) / state.dayOpen.nifty) * 100 };
      _liveSnapshot.vwapNifty = vwap;
      _liveSnapshot.rsiNifty  = s.rsi7;
      _liveSnapshot.ema9Nifty = s.ema9;
      _liveSnapshot.ema21Nifty = s.ema21;
      _liveSnapshot.callOiVelocityNifty = callOiVelocity;
      _liveSnapshot.putOiVelocityNifty  = putOiVelocity;
      _liveSnapshot.atmCallOiNifty = s.oiSnapshots[s.oiSnapshots.length-1]?.callOi ?? 0;
      _liveSnapshot.atmPutOiNifty  = s.oiSnapshots[s.oiSnapshots.length-1]?.putOi  ?? 0;
      _liveSnapshot.volumeRatioNifty = volRatio;
      if (!_liveSnapshot.momentum) _liveSnapshot.momentum = { nifty: { rsiSpeed: 0, burst: false }, banknifty: { rsiSpeed: 0, burst: false } };
      _liveSnapshot.momentum.nifty = { rsiSpeed: rsiSpeedData.speed, burst: rsiSpeedData.burst };
    } else {
      if (!_liveSnapshot) _liveSnapshot = {} as LiveData;
      _liveSnapshot.banknifty  = { price: bnPrice, change: bnPrice - state.dayOpen.banknifty, changePct: ((bnPrice - state.dayOpen.banknifty) / state.dayOpen.banknifty) * 100 };
      _liveSnapshot.vwapBankNifty = vwap;
      _liveSnapshot.rsiBankNifty  = s.rsi7;
      _liveSnapshot.ema9BankNifty  = s.ema9;
      _liveSnapshot.ema21BankNifty = s.ema21;
      _liveSnapshot.callOiVelocityBankNifty = callOiVelocity;
      _liveSnapshot.putOiVelocityBankNifty  = putOiVelocity;
      _liveSnapshot.atmCallOiBankNifty = s.oiSnapshots[s.oiSnapshots.length-1]?.callOi ?? 0;
      _liveSnapshot.atmPutOiBankNifty  = s.oiSnapshots[s.oiSnapshots.length-1]?.putOi  ?? 0;
      _liveSnapshot.volumeRatioBankNifty = volRatio;
      if (!_liveSnapshot.momentum) _liveSnapshot.momentum = { nifty: { rsiSpeed: 0, burst: false }, banknifty: { rsiSpeed: 0, burst: false } };
      _liveSnapshot.momentum.banknifty = { rsiSpeed: rsiSpeedData.speed, burst: rsiSpeedData.burst };
    }

    // Try to generate a signal
    if (isMarketOpen()) {
      const sig = tryGenerateSignal(
        key as "NIFTY" | "BANKNIFTY",
        s,
        price, vwap, s.ema9, s.ema21, s.rsi7,
        volRatio, callOiVelocity, putOiVelocity
      );
      if (sig) scalpEmitter.emit("update", { type: "signal", signal: sig });
    }
  }

  if (_liveSnapshot) {
    _liveSnapshot.isMarketOpen  = isMarketOpen();
    _liveSnapshot.isPrimeWindow = isPrimeWindow();
    _liveSnapshot.lastUpdated   = new Date();
  }

  // Track active signals
  const anyUpdated = updateActiveSignals(nPrice, bnPrice);
  if (anyUpdated) {
    scalpEmitter.emit("update", { type: "stats", stats: getScalpStats() });
  }

  // Emit live snapshot
  if (_liveSnapshot) {
    scalpEmitter.emit("update", { type: "live", live: _liveSnapshot });
  }
}

async function pollOI() {
  const token = process.env.UPSTOX_ACCESS_TOKEN;
  if (!token) return;
  if (!isMarketOpen()) return;

  const expiry = nearestThursday();

  const [niftyOI, bnOI] = await Promise.all([
    fetchOI(token, "NSE_INDEX|Nifty 50",   state.nifty.atmStrike || 24000, expiry),
    fetchOI(token, "NSE_INDEX|Nifty Bank", state.banknifty.atmStrike || 52000, expiry),
  ]);

  const now = Date.now();
  if (niftyOI) {
    state.nifty.oiSnapshots.push({ ...niftyOI, ts: now });
    if (state.nifty.oiSnapshots.length > 20) state.nifty.oiSnapshots.shift();
  }
  if (bnOI) {
    state.banknifty.oiSnapshots.push({ ...bnOI, ts: now });
    if (state.banknifty.oiSnapshots.length > 20) state.banknifty.oiSnapshots.shift();
  }
}

export function startScalpEngine(): void {
  if (engineRunning) return;
  engineRunning = true;

  // Poll market prices every 3 seconds
  pollInterval = setInterval(() => { pollMarket().catch(() => {}); }, 3000);
  // Poll OI every 60 seconds
  oiInterval = setInterval(() => { pollOI().catch(() => {}); }, OI_FETCH_INTERVAL);

  // Initial fire
  pollMarket().catch(() => {});
  pollOI().catch(() => {});

  logger.info("HFT Scalp Engine started (3s price polling + 60s OI polling)");
}

export function stopScalpEngine(): void {
  if (pollInterval) clearInterval(pollInterval);
  if (oiInterval)   clearInterval(oiInterval);
  engineRunning = false;
}
