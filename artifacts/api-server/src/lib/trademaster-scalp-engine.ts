/**
 * TradeMaster — Market Intent Scalper v2
 *
 * Philosophy: Stop looking at indicators — look at INTENT.
 * Signals only fire when Big Money is actually pushing the market.
 *
 * ── 4-Filter Structure ──────────────────────────────────────────────────────
 *   Cond 1 (Structure Guard):  Price > VWAP-15 AND Price > H1 Order Block
 *   Cond 2 (OI Z-Score):       Put OI Z-Score > dynamic threshold (2.0–3.0)
 *                               Massive Put writing/support = smart money BUY
 *   Cond 3 (Momentum Burst):   Volume > 3× avg-14 AND Liquidity Sweep detected
 *                               OR 5-min High Breakout confirmed
 *   Cond 4 (Delta Guard):      Volume Delta positive (no absorption in progress)
 *
 * ── Grade System ────────────────────────────────────────────────────────────
 *   Grade S (AAA): All 4 + Z-Score > 2.5 + 5-min breakout → highest trust
 *   Grade A (AA):  Cond 1 + 2 + 3 (OI intent + structure + momentum)
 *   Grade B (B):   Cond 1 + 3 only (volume momentum, no OI confirmation)
 *
 * ── Exit Signal ─────────────────────────────────────────────────────────────
 *   Volume Delta turns negative while price rising = Absorption → exit caution
 *
 * ── Key Numbers ─────────────────────────────────────────────────────────────
 *   T1 = +0.25% · T2 = +0.50% · SL = ATR(14) × 1.5 dynamic
 *   Data: Upstox REST LTP (1s polling) + H1 candle fetch every 30 min
 */

import { logger } from "./logger";
import { EventEmitter } from "events";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SignalGrade  = "S" | "A" | "B";
export type SignalDir    = "BUY" | "SELL";
export type TradeStatus  = "ACTIVE" | "T1_HIT" | "T2_HIT" | "SL_HIT" | "EXPIRED";

export interface ScalpSignal {
  id:              string;
  index:           "NIFTY" | "BANKNIFTY";
  dir:             SignalDir;
  grade:           SignalGrade;
  setupLabel:      string;   // "AAA High Vol + OI", "AA Short Covering", "B Volume Momentum"
  optionName:      string;
  entry:           number;
  stopLoss:        number;   // ATR(14) × 1.5 dynamic SL
  target1:         number;   // +0.25%
  target2:         number;   // +0.50%
  spotAtEntry:     number;
  vwap15:          number;
  ema9:            number;
  atr14:           number;
  h1Support:       number;   // H1 Order Block level
  oiZScore:        number;   // Put OI Z-Score at entry
  oiVelocityCall:  number;
  oiVelocityPut:   number;
  liquiditySweep:  boolean;  // Liquidity sweep triggered
  vol3x:           boolean;  // Volume > 3× avg14
  fiveMinBreakout: boolean;  // Price broke 5-min high
  volumeDelta:     number;   // Cumulative VD at entry
  confidence:      number;   // 0–100 composite score
  reason:          string;
  status:          TradeStatus;
  trailingSlActive: boolean;
  createdAt:       Date;
  closedAt?:       Date;
  exitPrice?:      number;
  durationMs?:     number;
}

export interface AvoidedSignal {
  id:        string;
  index:     "NIFTY" | "BANKNIFTY";
  dir:       SignalDir;
  timestamp: Date;
  reason:    string;
  cond1Met:  boolean;   // Structure Guard
  cond2Met:  boolean;   // OI Z-Score
  cond3Met:  boolean;   // Volume Burst
  cond4Met:  boolean;   // Delta Guard
  oiZScore:  number;
}

export interface SentimentReading {
  score:  number;  // 0–100 (0=Extreme Fear, 100=Extreme Greed)
  label:  "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";
  pcr:    number;
  color:  "red" | "orange" | "gray" | "lime" | "green";
}

export interface ScalpStats {
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
  livePointsCaptured: number;  // sum of all closed P&L in points
  autoOIThreshold:    number;  // dynamic Z-score threshold (2.0–3.0)
  lastUpdated:        Date;
}

export interface AbsorptionAlert {
  index:    "NIFTY" | "BANKNIFTY";
  signalId: string;
  timestamp: Date;
  msg:      string;
}

export interface LiveData {
  nifty:     { price: number; change: number; changePct: number };
  banknifty: { price: number; change: number; changePct: number };
  // Structure
  vwap15Nifty:        number;
  vwap15BankNifty:    number;
  ema9Nifty:          number;
  ema9BankNifty:      number;
  h1SupportNifty:     number;
  h1SupportBankNifty: number;
  // Intent
  oiZScoreNifty:     number;
  oiZScoreBankNifty: number;
  callOiVelocityNifty:     number;
  putOiVelocityNifty:      number;
  callOiVelocityBankNifty: number;
  putOiVelocityBankNifty:  number;
  pcrNifty:     number;
  pcrBankNifty: number;
  // Sentiment
  sentimentNifty:     SentimentReading;
  sentimentBankNifty: SentimentReading;
  // Momentum
  atr14Nifty:       number;
  atr14BankNifty:   number;
  vol3xNifty:       boolean;
  vol3xBankNifty:   boolean;
  liquiditySweepNifty:     boolean;
  liquiditySweepBankNifty: boolean;
  fiveMinHighNifty:         number;
  fiveMinHighBankNifty:     number;
  fiveMinBreakoutNifty:     boolean;
  fiveMinBreakoutBankNifty: boolean;
  volumeDeltaNifty:         number;
  volumeDeltaBankNifty:     number;
  // Conditions
  cond1Nifty: boolean;
  cond2Nifty: boolean;
  cond3Nifty: boolean;
  cond4Nifty: boolean;
  cond1BankNifty: boolean;
  cond2BankNifty: boolean;
  cond3BankNifty: boolean;
  cond4BankNifty: boolean;
  // Meta
  isMarketOpen:   boolean;
  isPrimeWindow:  boolean;
  avoidedSignals: AvoidedSignal[];
  absorptionAlerts: AbsorptionAlert[];
  autoOIThreshold:  number;
  lastUpdated:    Date;
}

export interface ScalpUpdate {
  type:       "signal" | "stats" | "live" | "tradeUpdate" | "avoided" | "absorption";
  signal?:    ScalpSignal;
  stats?:     ScalpStats;
  live?:      LiveData;
  avoided?:   AvoidedSignal;
  absorption?: AbsorptionAlert;
  tradeId?:   string;
  newStatus?: TradeStatus;
}

// ── SSE Emitter ───────────────────────────────────────────────────────────────

export const scalpEmitter = new EventEmitter();
scalpEmitter.setMaxListeners(100);

// ── In-memory state ───────────────────────────────────────────────────────────

interface Candle { o: number; h: number; l: number; c: number; v: number; ts: number }
interface OISnapshot { callOi: number; putOi: number; callVel: number; putVel: number; ts: number }

function mkState() {
  return {
    candles1m:       [] as Candle[],
    partialCandle:   null as Candle | null,
    ema9:            0,
    atr14:           0,
    prevClose:       0,
    rsiGains:        [] as number[],
    rsiLosses:       [] as number[],
    rsi7:            50,
    prevRsi:         50,
    oiSnapshots:     [] as OISnapshot[],
    oiVelHistory:    [] as number[],   // Put OI velocity history for Z-Score
    atmStrike:       0,
    h1Support:       0,    // H1 Order Block level (fetch every 30 min)
    volumeDelta:     0,    // Cumulative VD for the day (reset each morning)
    dayVDReset:      "",   // YYYY-MM-DD of last reset
    dayOpen:         0,
  };
}

const state = {
  nifty:     mkState(),
  banknifty: mkState(),
  signals:   [] as ScalpSignal[],
  avoided:   [] as AvoidedSignal[],
  absorptionAlerts: [] as AbsorptionAlert[],
  lastSignalAt: { NIFTY: 0, BANKNIFTY: 0 } as Record<string, number>,
  dayOpen:   { nifty: 0, banknifty: 0 },
  // Dynamic OI Z-Score threshold (auto-adjusts based on SL rate)
  autoOIThreshold: 2.0,
  lastThresholdAdjust: 0,
};

const SIGNAL_COOLDOWN_MS = 3 * 60 * 1000;
const H1_FETCH_INTERVAL  = 30 * 60 * 1000;

// ── IST Helpers ───────────────────────────────────────────────────────────────

function nowIST(): Date {
  return new Date(Date.now() + 5.5 * 3600000);
}
function todayISTStr(): string {
  return nowIST().toISOString().slice(0, 10);
}
function isMarketOpen(): boolean {
  const ist = nowIST();
  if (ist.getUTCDay() === 0 || ist.getUTCDay() === 6) return false;
  const m = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return m >= 555 && m <= 930;
}
function isPrimeWindow(): boolean {
  const ist = nowIST();
  if (ist.getUTCDay() === 0 || ist.getUTCDay() === 6) return false;
  const m = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return (m >= 555 && m <= 630) || (m >= 810 && m <= 930);
}
function currentMinuteTS(): number {
  return Math.floor(Date.now() / 60000) * 60000;
}
function nearestThursday(): string {
  const ist = nowIST();
  const d = ist.getUTCDay();
  const ahead = (4 - d + 7) % 7;
  const next = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + ahead));
  return next.toISOString().slice(0, 10);
}

// ── Statistical Helpers ───────────────────────────────────────────────────────

function calcEMA(prev: number, price: number, period: number): number {
  if (prev === 0) return price;
  return price * (2 / (period + 1)) + prev * (1 - 2 / (period + 1));
}

function calcATR(candles: Candle[], prevClose: number): number {
  if (candles.length < 2) return 0;
  const slice = candles.slice(-14);
  const trs = slice.map((c, i) => {
    const prev = i > 0 ? slice[i-1].c : prevClose;
    return Math.max(c.h - c.l, Math.abs(c.h - prev), Math.abs(c.l - prev));
  });
  return trs.reduce((a,b) => a+b, 0) / trs.length;
}

function calc15mVWAP(candles: Candle[]): number {
  const last15 = candles.slice(-15);
  if (last15.length === 0) return 0;
  let num = 0, den = 0;
  for (const c of last15) {
    const tp = (c.h + c.l + c.c) / 3;
    num += tp * c.v; den += c.v;
  }
  return den > 0 ? num / den : (last15[last15.length-1]?.c ?? 0);
}

// OI Z-Score: how many std-deviations above mean is the current velocity?
function calcOIZScore(velocityHistory: number[]): number {
  if (velocityHistory.length < 4) return 0;
  const n    = velocityHistory.length;
  const mean = velocityHistory.reduce((a,b) => a+b, 0) / n;
  const variance = velocityHistory.reduce((a,b) => a + (b - mean) ** 2, 0) / n;
  const std  = Math.sqrt(variance);
  if (std < 1) return 0;
  const current = velocityHistory[n - 1];
  return parseFloat(((current - mean) / std).toFixed(2));
}

// Liquidity Sweep (BUY): candle dips below N-candle recent low then closes above
function detectLiquiditySweep(candles: Candle[], dir: SignalDir): boolean {
  if (candles.length < 8) return false;
  const last      = candles[candles.length - 1];
  const lookback  = candles.slice(-8, -1);
  if (dir === "BUY") {
    const recentLow = Math.min(...lookback.map(c => c.l));
    return last.l < recentLow && last.c > recentLow;
  } else {
    const recentHigh = Math.max(...lookback.map(c => c.h));
    return last.h > recentHigh && last.c < recentHigh;
  }
}

// Volume > 3× 14-candle average
function isVol3x(candles: Candle[], currentVol: number): boolean {
  if (candles.length < 5) return false;
  const last14 = candles.slice(-Math.min(14, candles.length));
  const avg = last14.reduce((a,c) => a + c.v, 0) / last14.length;
  return avg > 0 && currentVol > 3 * avg;
}

// Volume OI velocity from snapshots
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

// 5-min High from last two 5-min buckets of 1-min candles
function calc5mHighBreakout(candles1m: Candle[], currentPrice: number): { prev5mHigh: number; breakout: boolean } {
  if (candles1m.length < 10) return { prev5mHigh: 0, breakout: false };
  const prevBucket = candles1m.slice(-10, -5);
  if (prevBucket.length === 0) return { prev5mHigh: 0, breakout: false };
  const prev5mHigh = Math.max(...prevBucket.map(c => c.h));
  return { prev5mHigh, breakout: currentPrice > prev5mHigh };
}

// PCR Sentiment Meter
function calcSentiment(callOi: number, putOi: number): SentimentReading {
  if (callOi === 0) return { score: 50, label: "Neutral", pcr: 0, color: "gray" };
  const pcr = putOi / callOi;
  if (pcr > 1.5) return { score: 15, label: "Extreme Fear",  pcr, color: "red" };
  if (pcr > 1.1) return { score: 35, label: "Fear",          pcr, color: "orange" };
  if (pcr > 0.7) return { score: 50, label: "Neutral",       pcr, color: "gray" };
  if (pcr > 0.5) return { score: 70, label: "Greed",         pcr, color: "lime" };
  return           { score: 85, label: "Extreme Greed",      pcr, color: "green" };
}

function roundATM(price: number, step: number): number {
  return Math.round(price / step) * step;
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,5);
}

// ── Confidence Score (0–100) ──────────────────────────────────────────────────

function calcConfidence(
  grade:       SignalGrade,
  zScore:      number,
  vol3x:       boolean,
  liquidSweep: boolean,
  fiveMinBo:   boolean,
  vdPositive:  boolean,
  vwapGap:     number,  // (price - vwap15) / vwap15
): number {
  let score = grade === "S" ? 75 : grade === "A" ? 60 : 40;

  // Z-Score bonus (2.0 = base, 3.0+ = +15)
  if (zScore >= 3.0)     score += 15;
  else if (zScore >= 2.5) score += 10;
  else if (zScore >= 2.0) score += 5;

  if (vol3x)       score += 8;
  if (liquidSweep) score += 7;
  if (fiveMinBo)   score += 7;
  if (vdPositive)  score += 5;

  // VWAP gap (stronger = higher score)
  score += Math.min(8, Math.abs(vwapGap) * 800);

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ── Auto-Threshold Adjustment ─────────────────────────────────────────────────
// If SL rate > 50% on recent signals: increase threshold
// If SL rate < 20%: can lower threshold (but only gradually)

function adjustThreshold(): void {
  const now = Date.now();
  if (now - state.lastThresholdAdjust < 30 * 60 * 1000) return;  // max every 30 min
  const closed = state.signals.filter(s => s.status !== "ACTIVE" && s.status !== "EXPIRED");
  if (closed.length < 5) return;

  const recent = closed.slice(-10);  // last 10 closed signals
  const slHits = recent.filter(s => s.status === "SL_HIT").length;
  const slRate = slHits / recent.length;

  const prev = state.autoOIThreshold;
  if (slRate > 0.5 && state.autoOIThreshold < 3.0) {
    state.autoOIThreshold = Math.min(3.0, parseFloat((state.autoOIThreshold + 0.1).toFixed(1)));
    logger.info({ slRate, prev, new: state.autoOIThreshold }, "OI Z-Score threshold raised (high SL rate)");
  } else if (slRate < 0.2 && state.autoOIThreshold > 2.0) {
    state.autoOIThreshold = Math.max(2.0, parseFloat((state.autoOIThreshold - 0.05).toFixed(2)));
    logger.info({ slRate, prev, new: state.autoOIThreshold }, "OI Z-Score threshold lowered (low SL rate)");
  }

  state.lastThresholdAdjust = now;
}

// ── Live Points Captured ──────────────────────────────────────────────────────

function calcLivePointsCaptured(): number {
  let total = 0;
  for (const s of state.signals) {
    if (!s.exitPrice || s.status === "ACTIVE") continue;
    const pts = s.dir === "BUY" ? s.exitPrice - s.entry : s.entry - s.exitPrice;
    total += pts;
  }
  return parseFloat(total.toFixed(2));
}

// ── Signal Generation ─────────────────────────────────────────────────────────

function tryGenerateSignal(
  index: "NIFTY" | "BANKNIFTY",
  s:     ReturnType<typeof mkState>,
  price: number,
): ScalpSignal | null {
  if (!isPrimeWindow()) return null;
  const now = Date.now();
  if (now - state.lastSignalAt[index] < SIGNAL_COOLDOWN_MS) return null;
  if (s.candles1m.length < 10) return null;

  adjustThreshold();

  const vwap15   = calc15mVWAP(s.candles1m);
  const ema9     = s.ema9;
  const atr14    = s.atr14;
  const partVol  = s.partialCandle?.v ?? 0;

  // OI metrics
  const callVel  = getOIVelocity(s.oiSnapshots, "call");
  const putVel   = getOIVelocity(s.oiSnapshots, "put");
  const zScore   = calcOIZScore(s.oiVelHistory);
  const lastSnap = s.oiSnapshots[s.oiSnapshots.length - 1];
  const totalCallOI = lastSnap?.callOi ?? 0;
  const totalPutOI  = lastSnap?.putOi  ?? 0;

  // Momentum metrics
  const sweep5mBreakout = calc5mHighBreakout(s.candles1m, price);
  const liqSweepBuy   = detectLiquiditySweep(s.candles1m, "BUY");
  const liqSweepSell  = detectLiquiditySweep(s.candles1m, "SELL");
  const vol3xNow      = isVol3x(s.candles1m, partVol);
  const h1Sup         = s.h1Support;

  // Day VD reset
  const today = todayISTStr();
  if (s.dayVDReset !== today) { s.volumeDelta = 0; s.dayVDReset = today; }

  const threshold = state.autoOIThreshold;

  // ── Conditions (BUY) ──────────────────────────────────────────────────────
  // C1: Price above VWAP-15 AND H1 Order Block (trend guard)
  const c1Buy = vwap15 > 0 && price > vwap15 && (h1Sup === 0 || price > h1Sup);
  // C2: Put OI Z-Score > threshold (massive put writing = smart money bullish)
  const c2Buy = zScore >= threshold && putVel > 0;
  // C3: Volume burst AND (liquidity sweep OR 5-min breakout)
  const c3Buy = vol3xNow && (liqSweepBuy || sweep5mBreakout.breakout);
  // C4: Volume Delta not turning negative (no absorption)
  const c4Buy = s.volumeDelta >= 0;

  // ── Conditions (SELL) ─────────────────────────────────────────────────────
  const callZScore = calcOIZScore([...s.oiVelHistory].map(v => -v));  // invert for call side
  const c1Sell = vwap15 > 0 && price < vwap15 && (h1Sup === 0 || price < h1Sup);
  const c2Sell = callZScore >= threshold && callVel > 0;
  const c3Sell = vol3xNow && (liqSweepSell || price < sweep5mBreakout.prev5mHigh * 0.997);
  const c4Sell = s.volumeDelta <= 0;

  // ── Grade Determination ───────────────────────────────────────────────────
  let dir: SignalDir | null = null;
  let grade: SignalGrade   = "B";
  let setupLabel  = "";
  let reason      = "";

  if (c1Buy && c2Buy && c3Buy && c4Buy && zScore >= 2.5 && sweep5mBreakout.breakout) {
    dir = "BUY"; grade = "S";
    setupLabel = "AAA — High Vol + OI Intent";
    reason = `Z-Score ${zScore.toFixed(1)} (>${threshold}) · Vol ${(partVol/1000).toFixed(0)}K = 3×avg · Liquidity Sweep + 5m Breakout (${sweep5mBreakout.prev5mHigh.toFixed(0)}) · VD positive`;
  } else if (c1Sell && c2Sell && c3Sell && c4Sell && zScore >= 2.5) {
    dir = "SELL"; grade = "S";
    setupLabel = "AAA — Call Absorption + Sell Intent";
    reason = `Call Z-Score ${callZScore.toFixed(1)} · Vol 3× · Sweep + 5m Breakdown · VD negative`;
  } else if (c1Buy && c2Buy && c3Buy) {
    dir = "BUY"; grade = "A";
    setupLabel = zScore >= 2.5 ? "AA — Short Covering" : "A — OI Support";
    reason = `Z-Score ${zScore.toFixed(1)} · Vol 3× · ${liqSweepBuy ? "Liquidity Sweep" : "5m Breakout"} · VWAP ${vwap15.toFixed(0)}`;
  } else if (c1Sell && c2Sell && c3Sell) {
    dir = "SELL"; grade = "A";
    setupLabel = "AA — OI Resistance";
    reason = `Call Z-Score ${callZScore.toFixed(1)} · Vol 3× · ${liqSweepSell ? "Sell Sweep" : "5m Break"} · VWAP ${vwap15.toFixed(0)}`;
  } else if (c1Buy && c3Buy && !c2Buy) {
    dir = "BUY"; grade = "B";
    setupLabel = "B — Volume Momentum";
    reason = `Price > VWAP-15 + H1 · Vol 3× · ${liqSweepBuy ? "Sweep" : "5m Breakout"} (OI Z-Score ${zScore.toFixed(1)} < ${threshold} — no OI confirmation)`;
  } else if (c1Sell && c3Sell && !c2Sell) {
    dir = "SELL"; grade = "B";
    setupLabel = "B — Volume Breakdown";
    reason = `Price < VWAP + H1 · Vol 3× · ${liqSweepSell ? "Sell Sweep" : "5m Break"} (no OI Z-Score confirmation)`;
  }

  // ── Avoided Signal Logging ─────────────────────────────────────────────────
  if (!dir) {
    const nearBuy  = c1Buy  && (c2Buy  || c3Buy);
    const nearSell = c1Sell && (c2Sell || c3Sell);
    if (nearBuy || nearSell) {
      const avDir: SignalDir = nearBuy ? "BUY" : "SELL";
      const c1 = nearBuy ? c1Buy : c1Sell;
      const c2 = nearBuy ? c2Buy : c2Sell;
      const c3 = nearBuy ? c3Buy : c3Sell;
      const c4 = nearBuy ? c4Buy : c4Sell;

      const missing: string[] = [];
      if (!c2) missing.push(`OI Z-Score ${zScore.toFixed(2)} < threshold ${threshold}`);
      if (!c3) missing.push(`Vol ${(partVol/1000).toFixed(0)}K not 3× avg; no sweep/breakout`);
      if (!c4) missing.push("VD absorption in progress");

      const avoided: AvoidedSignal = {
        id:        genId(), index, dir: avDir,
        timestamp: new Date(),
        reason:    `SL Prevention — missing: ${missing.join(" · ")}`,
        cond1Met: c1, cond2Met: c2, cond3Met: c3, cond4Met: c4,
        oiZScore: parseFloat(zScore.toFixed(2)),
      };
      state.avoided.unshift(avoided);
      if (state.avoided.length > 20) state.avoided.pop();
      scalpEmitter.emit("update", { type: "avoided", avoided });
    }
    return null;
  }

  // ── Levels ────────────────────────────────────────────────────────────────
  const slBuf   = atr14 > 0 ? atr14 * 1.5 : price * 0.003;
  const stopLoss = dir === "BUY" ? price - slBuf : price + slBuf;
  const target1  = dir === "BUY" ? price * 1.0025 : price * 0.9975;
  const target2  = dir === "BUY" ? price * 1.005  : price * 0.995;

  const vwapGap = vwap15 > 0 ? (price - vwap15) / vwap15 : 0;
  const confidence = calcConfidence(
    grade, zScore, vol3xNow, liqSweepBuy || liqSweepSell,
    sweep5mBreakout.breakout, dir === "BUY" ? c4Buy : c4Sell, vwapGap,
  );

  const step       = index === "NIFTY" ? 50 : 100;
  const atmStr     = roundATM(price, step);
  const optionName = `${index} ${atmStr} ${dir === "BUY" ? "CE" : "PE"}`;

  const sig: ScalpSignal = {
    id:              genId(),
    index,
    dir,
    grade,
    setupLabel,
    optionName,
    entry:           price,
    stopLoss:        parseFloat(stopLoss.toFixed(2)),
    target1:         parseFloat(target1.toFixed(2)),
    target2:         parseFloat(target2.toFixed(2)),
    spotAtEntry:     price,
    vwap15:          parseFloat(vwap15.toFixed(2)),
    ema9:            parseFloat(ema9.toFixed(2)),
    atr14:           parseFloat(atr14.toFixed(2)),
    h1Support:       parseFloat(h1Sup.toFixed(2)),
    oiZScore:        parseFloat(zScore.toFixed(2)),
    oiVelocityCall:  parseFloat(callVel.toFixed(0)),
    oiVelocityPut:   parseFloat(putVel.toFixed(0)),
    liquiditySweep:  liqSweepBuy || liqSweepSell,
    vol3x:           vol3xNow,
    fiveMinBreakout: sweep5mBreakout.breakout,
    volumeDelta:     parseFloat(s.volumeDelta.toFixed(0)),
    confidence,
    reason,
    status:          "ACTIVE",
    trailingSlActive: false,
    createdAt:       new Date(),
  };

  state.lastSignalAt[index] = now;
  state.signals.push(sig);
  logger.info({ id: sig.id, index, dir, grade, zScore, confidence }, "Market Intent signal generated");
  return sig;
}

// ── Absorption Alert (Volume Delta turned negative on active BUY signal) ──────

function checkAbsorption(niftyPrice: number, bnPrice: number) {
  for (const sig of state.signals) {
    if (sig.status !== "ACTIVE") continue;
    const s       = sig.index === "NIFTY" ? state.nifty : state.banknifty;
    const price   = sig.index === "NIFTY" ? niftyPrice : bnPrice;
    const prevVD  = sig.volumeDelta;
    const currVD  = s.volumeDelta;

    // If VD turned negative while price is above entry (rising but absorption)
    if (sig.dir === "BUY" && currVD < 0 && prevVD >= 0 && price > sig.entry * 1.001) {
      const alert: AbsorptionAlert = {
        index:     sig.index,
        signalId:  sig.id,
        timestamp: new Date(),
        msg:       `⚠ Volume Delta turned negative while price rising on ${sig.optionName} — possible absorption (trapped buyers). Consider tightening SL.`,
      };
      state.absorptionAlerts.unshift(alert);
      if (state.absorptionAlerts.length > 10) state.absorptionAlerts.pop();
      scalpEmitter.emit("update", { type: "absorption", absorption: alert });
    }
  }
}

// ── Trade Status Updater ──────────────────────────────────────────────────────

function updateActiveSignals(niftyPrice: number, bnPrice: number): boolean {
  let any = false;
  for (const s of state.signals) {
    if (s.status !== "ACTIVE") continue;
    const price = s.index === "NIFTY" ? niftyPrice : bnPrice;

    const hitT2 = s.dir === "BUY" ? price >= s.target2  : price <= s.target2;
    const hitT1 = s.dir === "BUY" ? price >= s.target1  : price <= s.target1;
    const hitSL = s.dir === "BUY" ? price <= s.stopLoss : price >= s.stopLoss;

    if (hitT2) {
      s.status = "T2_HIT"; s.closedAt = new Date(); s.exitPrice = price;
      s.durationMs = s.closedAt.getTime() - s.createdAt.getTime();
      scalpEmitter.emit("update", { type: "tradeUpdate", tradeId: s.id, newStatus: "T2_HIT" });
      any = true;
    } else if (hitT1 && !s.trailingSlActive) {
      s.trailingSlActive = true;
      s.stopLoss   = s.entry;  // trail SL to breakeven
      s.status     = "T1_HIT";
      s.durationMs = Date.now() - s.createdAt.getTime();
      scalpEmitter.emit("update", { type: "tradeUpdate", tradeId: s.id, newStatus: "T1_HIT" });
      any = true;
    } else if (hitSL) {
      s.status = "SL_HIT"; s.closedAt = new Date(); s.exitPrice = price;
      s.durationMs = s.closedAt.getTime() - s.createdAt.getTime();
      scalpEmitter.emit("update", { type: "tradeUpdate", tradeId: s.id, newStatus: "SL_HIT" });
      any = true;
    }
  }
  // Expire after 60 min
  for (const s of state.signals) {
    if (s.status === "ACTIVE" && Date.now() - s.createdAt.getTime() > 3600000) {
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
    if ((s.status === "T1_HIT" || s.status === "T2_HIT") && s.durationMs) totalWinMs += s.durationMs;
  }

  const last20 = closed
    .slice(-20)
    .map(s => s.status as "T1_HIT" | "T2_HIT" | "SL_HIT" | "EXPIRED");

  return {
    totalSignals:       state.signals.length,
    t1Hit:              state.signals.filter(s => s.status === "T1_HIT").length,
    t2Hit:              state.signals.filter(s => s.status === "T2_HIT").length,
    slHit:              state.signals.filter(s => s.status === "SL_HIT").length,
    active,
    winRate:  closed.length > 0 ? parseFloat(((wins.length / closed.length) * 100).toFixed(1)) : 0,
    last20,
    netPointsNifty:     parseFloat(netN.toFixed(2)),
    netPointsBankNifty: parseFloat(netBN.toFixed(2)),
    avgDurationWinMs:   wins.length > 0 ? Math.round(totalWinMs / wins.length) : 0,
    livePointsCaptured: calcLivePointsCaptured(),
    autoOIThreshold:    state.autoOIThreshold,
    lastUpdated:        new Date(),
  };
}

export function getScalpSignals():  ScalpSignal[]   { return [...state.signals].reverse().slice(0, 50); }
export function getAvoidedSignals(): AvoidedSignal[] { return state.avoided.slice(0, 10); }

// ── Live Snapshot Cache ───────────────────────────────────────────────────────

let _liveSnapshot: LiveData | null = null;
export function getLiveSnapshot(): LiveData | null { return _liveSnapshot; }

// ── Upstox REST Helpers ───────────────────────────────────────────────────────

async function fetchLTP(token: string): Promise<{ nifty: number; banknifty: number } | null> {
  try {
    const keys = "NSE_INDEX|Nifty 50,NSE_INDEX|Nifty Bank";
    const res  = await fetch(
      `https://api.upstox.com/v2/market-quote/ltp?instrument_key=${encodeURIComponent(keys)}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const json = await res.json() as { data?: Record<string, { last_price: number }> };
    const d    = json.data;
    if (!d) return null;
    const nifty     = d["NSE_INDEX:Nifty 50"]?.last_price   ?? 0;
    const banknifty = d["NSE_INDEX:Nifty Bank"]?.last_price ?? 0;
    return nifty && banknifty ? { nifty, banknifty } : null;
  } catch { return null; }
}

async function fetchOI(token: string, instrument: string, atmStrike: number): Promise<{ callOi: number; putOi: number } | null> {
  try {
    const expiry = nearestThursday();
    const url    = `https://api.upstox.com/v2/option/chain?instrument_key=${encodeURIComponent(instrument)}&expiry_date=${expiry}`;
    const res    = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json   = await res.json() as {
      data?: Array<{ strike_price: number; call_options?: { market_data?: { oi?: number } }; put_options?: { market_data?: { oi?: number } } }>
    };
    const chain  = json.data ?? [];
    let totalCall = 0, totalPut = 0;
    let atmCall = 0, atmPut = 0;
    for (const row of chain) {
      totalCall += row.call_options?.market_data?.oi ?? 0;
      totalPut  += row.put_options?.market_data?.oi  ?? 0;
      if (Math.abs(row.strike_price - atmStrike) < 100) {
        atmCall = row.call_options?.market_data?.oi ?? atmCall;
        atmPut  = row.put_options?.market_data?.oi  ?? atmPut;
      }
    }
    return { callOi: totalCall, putOi: totalPut };
  } catch { return null; }
}

// H1 candle fetch: returns the LOW of the last bullish 1-hour candle = H1 Order Block support
async function fetchH1Support(token: string, instrumentKey: string): Promise<number> {
  try {
    const encoded = encodeURIComponent(instrumentKey);
    const url     = `https://api.upstox.com/v3/historical-candle/intraday/${encoded}/1hour`;
    const res     = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return 0;
    const json    = await res.json() as { data?: { candles?: number[][] } };
    const candles = json.data?.candles ?? [];
    // candle: [timestamp, open, high, low, close, volume, oi]
    // Find last bullish candle (close > open) — its low = H1 Order Block support
    for (let i = candles.length - 1; i >= 0; i--) {
      const [, o, , l, c] = candles[i];
      if (c > o) return l;  // bullish candle's low = H1 support
    }
    return 0;
  } catch { return 0; }
}

// ── Candle Builder + Indicator Update ─────────────────────────────────────────

function processPrice(key: "NIFTY" | "BANKNIFTY", price: number, s: ReturnType<typeof mkState>) {
  const syntheticVol = Math.abs(price - (s.prevClose || price)) * (key === "NIFTY" ? 8000 : 4000) + 30000;
  const ts = currentMinuteTS();

  if (!s.partialCandle || s.partialCandle.ts < ts) {
    if (s.partialCandle && s.partialCandle.ts < ts) {
      const c = s.partialCandle;
      s.candles1m.push(c);
      if (s.candles1m.length > 300) s.candles1m.shift();

      // EMA update
      s.ema9 = calcEMA(s.ema9, c.c, 9);

      // ATR update
      s.atr14 = calcATR(s.candles1m, s.prevClose);

      // RSI update
      const change = c.c - (s.candles1m.length > 1 ? s.candles1m[s.candles1m.length - 2].c : c.o);
      s.rsiGains.push(Math.max(0, change)); s.rsiLosses.push(Math.max(0, -change));
      if (s.rsiGains.length > 7) { s.rsiGains.shift(); s.rsiLosses.shift(); }
      if (s.rsiGains.length === 7) {
        const avgG = s.rsiGains.reduce((a,b) => a+b, 0) / 7;
        const avgL = s.rsiLosses.reduce((a,b) => a+b, 0) / 7;
        s.rsi7 = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
      }

      // Volume Delta: bullish candle = positive VD, bearish = negative
      const cdVol = c.v;
      const cdDir = c.c >= c.o ? 1 : -1;
      s.volumeDelta += cdDir * cdVol;
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
  s.atmStrike  = roundATM(price, step);
}

// ── Main Market Poll (1s) ─────────────────────────────────────────────────────

async function pollMarket() {
  const token = process.env.UPSTOX_ACCESS_TOKEN;
  if (!token) return;

  const prices = await fetchLTP(token);
  if (!prices) return;

  const { nifty: nPrice, banknifty: bnPrice } = prices;
  if (!state.dayOpen.nifty)     state.dayOpen.nifty     = nPrice;
  if (!state.dayOpen.banknifty) state.dayOpen.banknifty = bnPrice;

  processPrice("NIFTY",     nPrice,  state.nifty);
  processPrice("BANKNIFTY", bnPrice, state.banknifty);

  const vwap15N  = calc15mVWAP(state.nifty.candles1m);
  const vwap15BN = calc15mVWAP(state.banknifty.candles1m);
  const zN       = calcOIZScore(state.nifty.oiVelHistory);
  const zBN      = calcOIZScore(state.banknifty.oiVelHistory);
  const lastSnapN  = state.nifty.oiSnapshots[state.nifty.oiSnapshots.length - 1];
  const lastSnapBN = state.banknifty.oiSnapshots[state.banknifty.oiSnapshots.length - 1];
  const totalCallN  = lastSnapN?.callOi  ?? 0;
  const totalPutN   = lastSnapN?.putOi   ?? 0;
  const totalCallBN = lastSnapBN?.callOi ?? 0;
  const totalPutBN  = lastSnapBN?.putOi  ?? 0;

  const callVelN  = getOIVelocity(state.nifty.oiSnapshots,     "call");
  const putVelN   = getOIVelocity(state.nifty.oiSnapshots,     "put");
  const callVelBN = getOIVelocity(state.banknifty.oiSnapshots, "call");
  const putVelBN  = getOIVelocity(state.banknifty.oiSnapshots, "put");

  const pcrN  = totalCallN  > 0 ? totalPutN  / totalCallN  : 0;
  const pcrBN = totalCallBN > 0 ? totalPutBN / totalCallBN : 0;
  const sentN  = calcSentiment(totalCallN, totalPutN);
  const sentBN = calcSentiment(totalCallBN, totalPutBN);

  const partVolN  = state.nifty.partialCandle?.v     ?? 0;
  const partVolBN = state.banknifty.partialCandle?.v ?? 0;

  const vol3N     = isVol3x(state.nifty.candles1m,     partVolN);
  const vol3BN    = isVol3x(state.banknifty.candles1m, partVolBN);
  const sweepN    = detectLiquiditySweep(state.nifty.candles1m,     "BUY");
  const sweepBN   = detectLiquiditySweep(state.banknifty.candles1m, "BUY");
  const bo5mN     = calc5mHighBreakout(state.nifty.candles1m,     nPrice);
  const bo5mBN    = calc5mHighBreakout(state.banknifty.candles1m, bnPrice);

  const threshold = state.autoOIThreshold;

  const c1N  = vwap15N  > 0 && nPrice  > vwap15N  && (state.nifty.h1Support  === 0 || nPrice  > state.nifty.h1Support);
  const c1BN = vwap15BN > 0 && bnPrice > vwap15BN && (state.banknifty.h1Support === 0 || bnPrice > state.banknifty.h1Support);
  const c2N  = zN  >= threshold && putVelN  > 0;
  const c2BN = zBN >= threshold && putVelBN > 0;
  const c3N  = vol3N  && (sweepN  || bo5mN.breakout);
  const c3BN = vol3BN && (sweepBN || bo5mBN.breakout);
  const c4N  = state.nifty.volumeDelta     >= 0;
  const c4BN = state.banknifty.volumeDelta >= 0;

  _liveSnapshot = {
    nifty:     { price: nPrice,  change: nPrice  - state.dayOpen.nifty,     changePct: ((nPrice  - state.dayOpen.nifty)     / state.dayOpen.nifty)     * 100 },
    banknifty: { price: bnPrice, change: bnPrice - state.dayOpen.banknifty, changePct: ((bnPrice - state.dayOpen.banknifty) / state.dayOpen.banknifty) * 100 },
    vwap15Nifty:        parseFloat(vwap15N.toFixed(2)),
    vwap15BankNifty:    parseFloat(vwap15BN.toFixed(2)),
    ema9Nifty:          parseFloat(state.nifty.ema9.toFixed(2)),
    ema9BankNifty:      parseFloat(state.banknifty.ema9.toFixed(2)),
    h1SupportNifty:     parseFloat(state.nifty.h1Support.toFixed(2)),
    h1SupportBankNifty: parseFloat(state.banknifty.h1Support.toFixed(2)),
    oiZScoreNifty:     parseFloat(zN.toFixed(2)),
    oiZScoreBankNifty: parseFloat(zBN.toFixed(2)),
    callOiVelocityNifty:     parseFloat(callVelN.toFixed(0)),
    putOiVelocityNifty:      parseFloat(putVelN.toFixed(0)),
    callOiVelocityBankNifty: parseFloat(callVelBN.toFixed(0)),
    putOiVelocityBankNifty:  parseFloat(putVelBN.toFixed(0)),
    pcrNifty:     parseFloat(pcrN.toFixed(3)),
    pcrBankNifty: parseFloat(pcrBN.toFixed(3)),
    sentimentNifty:     { ...sentN,  pcr: parseFloat(pcrN.toFixed(3)) },
    sentimentBankNifty: { ...sentBN, pcr: parseFloat(pcrBN.toFixed(3)) },
    atr14Nifty:         parseFloat((state.nifty.atr14     || 0).toFixed(2)),
    atr14BankNifty:     parseFloat((state.banknifty.atr14 || 0).toFixed(2)),
    vol3xNifty:         vol3N,
    vol3xBankNifty:     vol3BN,
    liquiditySweepNifty:     sweepN,
    liquiditySweepBankNifty: sweepBN,
    fiveMinHighNifty:         parseFloat(bo5mN.prev5mHigh.toFixed(2)),
    fiveMinHighBankNifty:     parseFloat(bo5mBN.prev5mHigh.toFixed(2)),
    fiveMinBreakoutNifty:     bo5mN.breakout,
    fiveMinBreakoutBankNifty: bo5mBN.breakout,
    volumeDeltaNifty:         parseFloat(state.nifty.volumeDelta.toFixed(0)),
    volumeDeltaBankNifty:     parseFloat(state.banknifty.volumeDelta.toFixed(0)),
    cond1Nifty: c1N, cond2Nifty: c2N, cond3Nifty: c3N, cond4Nifty: c4N,
    cond1BankNifty: c1BN, cond2BankNifty: c2BN, cond3BankNifty: c3BN, cond4BankNifty: c4BN,
    isMarketOpen:   isMarketOpen(),
    isPrimeWindow:  isPrimeWindow(),
    avoidedSignals: state.avoided.slice(0, 5),
    absorptionAlerts: state.absorptionAlerts.slice(0, 3),
    autoOIThreshold: state.autoOIThreshold,
    lastUpdated:    new Date(),
  };

  if (isMarketOpen()) {
    for (const [idx, s, price] of [
      ["NIFTY",     state.nifty,     nPrice ],
      ["BANKNIFTY", state.banknifty, bnPrice],
    ] as Array<["NIFTY" | "BANKNIFTY", ReturnType<typeof mkState>, number]>) {
      const sig = tryGenerateSignal(idx, s, price);
      if (sig) scalpEmitter.emit("update", { type: "signal", signal: sig });
    }
    checkAbsorption(nPrice, bnPrice);
  }

  const anyUpdated = updateActiveSignals(nPrice, bnPrice);
  if (anyUpdated) scalpEmitter.emit("update", { type: "stats", stats: getScalpStats() });
  scalpEmitter.emit("update", { type: "live", live: _liveSnapshot });

  state.nifty.prevRsi     = state.nifty.rsi7;
  state.banknifty.prevRsi = state.banknifty.rsi7;
}

// ── OI Poll (60s) ─────────────────────────────────────────────────────────────

async function pollOI() {
  const token = process.env.UPSTOX_ACCESS_TOKEN;
  if (!token || !isMarketOpen()) return;
  const now = Date.now();

  const [nOI, bnOI] = await Promise.all([
    fetchOI(token, "NSE_INDEX|Nifty 50",   state.nifty.atmStrike     || 24000),
    fetchOI(token, "NSE_INDEX|Nifty Bank", state.banknifty.atmStrike || 52000),
  ]);

  if (nOI) {
    const prevSnap = state.nifty.oiSnapshots[state.nifty.oiSnapshots.length - 1];
    const dtMins   = prevSnap ? (now - prevSnap.ts) / 60000 : 1;
    const callVel  = prevSnap ? (nOI.callOi - prevSnap.callOi) / Math.max(dtMins, 0.5) : 0;
    const putVel   = prevSnap ? (nOI.putOi  - prevSnap.putOi)  / Math.max(dtMins, 0.5) : 0;
    state.nifty.oiSnapshots.push({ ...nOI, callVel, putVel, ts: now });
    state.nifty.oiVelHistory.push(putVel);
    if (state.nifty.oiSnapshots.length > 20)   state.nifty.oiSnapshots.shift();
    if (state.nifty.oiVelHistory.length > 20)   state.nifty.oiVelHistory.shift();
  }
  if (bnOI) {
    const prevSnap = state.banknifty.oiSnapshots[state.banknifty.oiSnapshots.length - 1];
    const dtMins   = prevSnap ? (now - prevSnap.ts) / 60000 : 1;
    const callVel  = prevSnap ? (bnOI.callOi - prevSnap.callOi) / Math.max(dtMins, 0.5) : 0;
    const putVel   = prevSnap ? (bnOI.putOi  - prevSnap.putOi)  / Math.max(dtMins, 0.5) : 0;
    state.banknifty.oiSnapshots.push({ ...bnOI, callVel, putVel, ts: now });
    state.banknifty.oiVelHistory.push(putVel);
    if (state.banknifty.oiSnapshots.length > 20) state.banknifty.oiSnapshots.shift();
    if (state.banknifty.oiVelHistory.length > 20) state.banknifty.oiVelHistory.shift();
  }
}

// ── H1 Candle Poll (30 min) ───────────────────────────────────────────────────

async function pollH1() {
  const token = process.env.UPSTOX_ACCESS_TOKEN;
  if (!token || !isMarketOpen()) return;
  const [h1N, h1BN] = await Promise.all([
    fetchH1Support(token, "NSE_INDEX|Nifty 50"),
    fetchH1Support(token, "NSE_INDEX|Nifty Bank"),
  ]);
  if (h1N  > 0) { state.nifty.h1Support     = h1N;  logger.info({ h1N },  "H1 Order Block — Nifty"); }
  if (h1BN > 0) { state.banknifty.h1Support = h1BN; logger.info({ h1BN }, "H1 Order Block — BankNifty"); }
}

// ── Engine Lifecycle ──────────────────────────────────────────────────────────

let engineRunning  = false;
let pollInterval:  ReturnType<typeof setInterval> | null = null;
let oiInterval:    ReturnType<typeof setInterval> | null = null;
let h1Interval:    ReturnType<typeof setInterval> | null = null;

export function startScalpEngine(): void {
  if (engineRunning) return;
  engineRunning = true;
  pollInterval = setInterval(() => { pollMarket().catch(() => {}); }, 1000);
  oiInterval   = setInterval(() => { pollOI().catch(() => {}); },    60000);
  h1Interval   = setInterval(() => { pollH1().catch(() => {}); },    H1_FETCH_INTERVAL);
  pollMarket().catch(() => {});
  pollOI().catch(() => {});
  pollH1().catch(() => {});
  logger.info("Market Intent Scalper v2 — 1s LTP · 60s OI Z-Score · 30m H1 Block · ATR SL · Grade S/A/B · Auto-Threshold");
}

export function stopScalpEngine(): void {
  if (pollInterval) clearInterval(pollInterval);
  if (oiInterval)   clearInterval(oiInterval);
  if (h1Interval)   clearInterval(h1Interval);
  engineRunning = false;
}
