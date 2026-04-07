/**
 * TradeMaster Intraday Auto-Signal Generator
 * Runs every 15 minutes during market hours (9:15–15:30 IST, weekdays)
 * Sources: PCR+VWAP (options), Equity scanner (stocks)
 * Deduplicates by asset_name — never creates duplicate active signals
 */

import { db } from "@workspace/db";
import { tradeMasterSignals } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

// ── IST helpers ───────────────────────────────────────────────────────────────

function nowIST(): Date {
  return new Date(Date.now() + 5.5 * 3600000);
}

function isMarketHours(): boolean {
  const ist = nowIST();
  const h = ist.getUTCHours(), m = ist.getUTCMinutes(), dow = ist.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  const mins = h * 60 + m;
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}

function fmtExpiry(seg: string): string {
  // Returns next Thursday (NIFTY/BANKNIFTY) as DD-MMM
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const ist = nowIST();
  const date = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
  const day = date.getUTCDay();
  const daysToThursday = day <= 4 ? 4 - day : 11 - day;
  date.setUTCDate(date.getUTCDate() + (daysToThursday === 0 ? 7 : daysToThursday));
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${months[date.getUTCMonth()]}${dd}`;
}

// ── Active signal deduplication ───────────────────────────────────────────────

async function getActiveAssetNames(): Promise<Set<string>> {
  const active = await db
    .select({ assetName: tradeMasterSignals.assetName })
    .from(tradeMasterSignals)
    .where(eq(tradeMasterSignals.status, "active"));
  return new Set(active.map(r => r.assetName.toUpperCase().trim()));
}

// ── Upstox PCR + VWAP signal source ──────────────────────────────────────────

interface OptionChainStrike {
  strikePrice: number;
  callLTP: number;
  putLTP: number;
  callOI: number;
  putOI: number;
}

async function fetchPCRAndVWAP(seg: string, token: string): Promise<{
  pcr: number | null; ltp: number | null; vwap: number | null;
  atmStrike: number; atmCeLTP: number; atmPeLTP: number;
  expiry: string;
} | null> {
  try {
    const instrumentKey = seg === "NIFTY" ? "NSE_INDEX|Nifty 50" : "NSE_INDEX|Nifty Bank";

    // Get option chain
    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    const ist = nowIST();
    const date = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
    const day = date.getUTCDay();
    const daysToThursday = day <= 4 ? 4 - day : 11 - day;
    date.setUTCDate(date.getUTCDate() + (daysToThursday === 0 ? 7 : daysToThursday));
    const expiry = `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}-${String(date.getUTCDate()).padStart(2,"0")}`;
    const expiryLabel = `${months[date.getUTCMonth()]}${String(date.getUTCDate()).padStart(2,"0")}`;

    const chainUrl = `https://api.upstox.com/v2/option/chain?instrument_key=${encodeURIComponent(instrumentKey)}&expiry_date=${expiry}`;
    const chainResp = await fetch(chainUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!chainResp.ok) return null;
    const chainData = await chainResp.json() as { data?: unknown[] };
    if (!Array.isArray(chainData.data) || chainData.data.length === 0) return null;

    // Parse strikes
    type RawStrike = Record<string, Record<string, number>>;
    const strikes: OptionChainStrike[] = (chainData.data as RawStrike[]).map(d => ({
      strikePrice: d.strike_price ?? 0,
      callLTP: d.call_options?.market_data?.ltp ?? 0,
      putLTP:  d.put_options?.market_data?.ltp  ?? 0,
      callOI:  d.call_options?.market_data?.oi   ?? 0,
      putOI:   d.put_options?.market_data?.oi    ?? 0,
    })).filter(s => s.strikePrice > 0);

    // PCR
    const totalCEOI = strikes.reduce((s,r) => s + r.callOI, 0);
    const totalPEOI = strikes.reduce((s,r) => s + r.putOI, 0);
    const pcr = totalCEOI > 0 ? totalPEOI / totalCEOI : null;

    // ATM = strike where |CE LTP - PE LTP| is minimised
    let atmStrike = 0, atmCeLTP = 0, atmPeLTP = 0, minDiff = Infinity;
    for (const s of strikes) {
      if (s.callLTP <= 0 || s.putLTP <= 0) continue;
      const diff = Math.abs(s.callLTP - s.putLTP);
      if (diff < minDiff) { minDiff = diff; atmStrike = s.strikePrice; atmCeLTP = s.callLTP; atmPeLTP = s.putLTP; }
    }

    // LTP from candle API
    const candleUrl = `https://api.upstox.com/v3/historical-candle/intraday/${seg}/5minute`;
    const candleResp = await fetch(candleUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    let ltp: number | null = null;
    let vwap: number | null = null;
    if (candleResp.ok) {
      const candleData = await candleResp.json() as { data?: { candles?: number[][] } };
      const candles = candleData.data?.candles ?? [];
      if (candles.length >= 5) {
        // candle: [ts, open, high, low, close, volume]
        ltp = candles[candles.length - 1][4];
        // VWAP = sum(typical_price * volume) / sum(volume)
        let tvSum = 0, volSum = 0;
        for (const c of candles) {
          const tp = (c[2] + c[3] + c[4]) / 3;
          const vol = c[5] ?? 0;
          tvSum += tp * vol;
          volSum += vol;
        }
        vwap = volSum > 0 ? tvSum / volSum : null;
      }
    }

    return { pcr, ltp, vwap, atmStrike, atmCeLTP, atmPeLTP, expiry: expiryLabel };
  } catch (err) {
    logger.warn({ err, seg }, "[AutoSignal] PCR+VWAP fetch failed");
    return null;
  }
}

// ── Yahoo equity scanner ──────────────────────────────────────────────────────

const EQUITY_UNIVERSE = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank" },
  { symbol: "AXISBANK.NS",  name: "Axis Bank" },
  { symbol: "SBIN.NS",      name: "SBI" },
  { symbol: "WIPRO.NS",     name: "Wipro" },
  { symbol: "TECHM.NS",     name: "Tech Mahindra" },
  { symbol: "TATASTEEL.NS", name: "Tata Steel" },
  { symbol: "ITC.NS",       name: "ITC" },
  { symbol: "KOTAKBANK.NS", name: "Kotak Bank" },
];

interface EquitySignal {
  symbol: string; name: string;
  signal: "buy" | "sell"; cmp: number; sl: number; t1: number; t2: number;
  rsi: number; reason: string;
}

async function fetchEquitySignals(): Promise<EquitySignal[]> {
  const results: EquitySignal[] = [];
  await Promise.all(EQUITY_UNIVERSE.map(async ({ symbol, name }) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=15m&range=2d`;
      const resp = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache" },
        signal: AbortSignal.timeout(7000),
      });
      if (!resp.ok) return;
      const json = await resp.json() as Record<string, unknown>;
      const result0 = (json as Record<string, Record<string, unknown>[]>)?.chart?.result?.[0] as Record<string, unknown> | undefined;
      if (!result0) return;
      const closes = ((result0.indicators as Record<string, Record<string, number[]>[]>)?.quote?.[0]?.close ?? []).filter((v): v is number => typeof v === "number");
      const highs  = ((result0.indicators as Record<string, Record<string, number[]>[]>)?.quote?.[0]?.high  ?? []).filter((v): v is number => typeof v === "number");
      const lows   = ((result0.indicators as Record<string, Record<string, number[]>[]>)?.quote?.[0]?.low   ?? []).filter((v): v is number => typeof v === "number");
      const vols   = ((result0.indicators as Record<string, Record<string, number[]>[]>)?.quote?.[0]?.volume ?? []).filter((v): v is number => typeof v === "number");
      if (closes.length < 20) return;

      const cmp = closes[closes.length - 1];

      // RSI-14
      let gains = 0, losses = 0;
      for (let i = closes.length - 14; i < closes.length; i++) {
        const delta = closes[i] - closes[i-1];
        if (delta > 0) gains += delta; else losses -= delta;
      }
      const rs = losses > 0 ? gains / losses : 100;
      const rsi = 100 - 100 / (1 + rs);

      // VWAP
      let tvSum = 0, volSum = 0;
      for (let i = 0; i < closes.length; i++) {
        const tp = (highs[i] + lows[i] + closes[i]) / 3;
        tvSum += tp * (vols[i] ?? 0);
        volSum += (vols[i] ?? 0);
      }
      const vwap = volSum > 0 ? tvSum / volSum : cmp;

      // Volume ratio
      const recentVol = vols.slice(-3).reduce((a,b) => a+b, 0) / 3;
      const avgVol = vols.slice(-15, -3).reduce((a,b) => a+b, 0) / 12;
      const volRatio = avgVol > 0 ? recentVol / avgVol : 1;

      // Simple buy/sell condition: RSI + VWAP + volume
      const isBuy  = rsi > 58 && cmp > vwap && volRatio > 1.3;
      const isSell = rsi < 42 && cmp < vwap && volRatio > 1.3;
      if (!isBuy && !isSell) return;

      const signal: "buy" | "sell" = isBuy ? "buy" : "sell";
      const recent5L = Math.min(...lows.slice(-6, -1));
      const recent5H = Math.max(...highs.slice(-6, -1));
      const slVal = signal === "buy" ? recent5L * 0.999 : recent5H * 1.001;
      const risk  = Math.abs(cmp - slVal);
      const t1val = signal === "buy" ? cmp + 1.5 * risk : cmp - 1.5 * risk;
      const t2val = signal === "buy" ? cmp + 2.5 * risk : cmp - 2.5 * risk;

      const reasons: string[] = [`RSI ${rsi.toFixed(0)}`, cmp > vwap ? "above VWAP" : "below VWAP"];
      if (volRatio > 2) reasons.push(`${volRatio.toFixed(1)}x vol surge`);

      results.push({
        symbol, name, signal, cmp: parseFloat(cmp.toFixed(2)),
        sl: parseFloat(slVal.toFixed(2)), t1: parseFloat(t1val.toFixed(2)), t2: parseFloat(t2val.toFixed(2)),
        rsi: parseFloat(rsi.toFixed(1)), reason: reasons.join(" · "),
      });
    } catch { /* skip */ }
  }));
  return results;
}

// ── Main generator tick ───────────────────────────────────────────────────────

let generatorRunning = false;

export async function runAutoSignalTick(): Promise<void> {
  if (!isMarketHours()) return;
  if (generatorRunning) return;
  generatorRunning = true;

  try {
    const activeAssets = await getActiveAssetNames();
    const token = process.env.UPSTOX_ACCESS_TOKEN ?? null;
    const inserted: string[] = [];

    // ── Source 1: PCR + VWAP options (NIFTY + BANKNIFTY) ──────────────────
    if (token) {
      for (const seg of ["NIFTY", "BANKNIFTY"] as const) {
        const data = await fetchPCRAndVWAP(seg, token);
        if (!data) continue;
        const { pcr, ltp, vwap, atmStrike, atmCeLTP, atmPeLTP, expiry } = data;

        if (pcr == null || ltp == null || vwap == null || atmStrike === 0) continue;

        const isBullish = pcr > 1.2 && ltp > vwap;
        const isBearish = pcr < 0.8 && ltp < vwap;
        if (!isBullish && !isBearish) continue;

        // CE signal
        const ceName = `${seg} ${atmStrike.toLocaleString("en-IN")} CE ${expiry}`;
        if (!activeAssets.has(ceName.toUpperCase()) && atmCeLTP > 0.5) {
          const ceSL = parseFloat((atmCeLTP * 0.65).toFixed(2));
          const ceT1 = parseFloat((atmCeLTP * 1.60).toFixed(2));
          const ceT2 = parseFloat((atmCeLTP * 2.20).toFixed(2));
          await db.insert(tradeMasterSignals).values({
            segment: "options", assetName: ceName, signalType: "buy",
            entryPrice: atmCeLTP.toFixed(4), stopLoss: ceSL.toFixed(4),
            target1: ceT1.toFixed(4), target2: ceT2.toFixed(4),
            pcr: pcr.toFixed(2), isPremium: false, createdBy: "auto-engine",
            notes: `Auto: PCR ${pcr.toFixed(2)} ${isBullish ? "(bullish)" : "(bearish)"} · LTP ₹${ltp.toFixed(0)} ${ltp > (vwap??0) ? "above" : "below"} VWAP ₹${(vwap??0).toFixed(0)} · ATM CE LTP ₹${atmCeLTP.toFixed(2)} | PE LTP ₹${atmPeLTP.toFixed(2)}`,
          });
          inserted.push(ceName);
          activeAssets.add(ceName.toUpperCase());
        }

        // PE signal
        const peName = `${seg} ${atmStrike.toLocaleString("en-IN")} PE ${expiry}`;
        if (!activeAssets.has(peName.toUpperCase()) && atmPeLTP > 0.5) {
          const peSL = parseFloat((atmPeLTP * 0.65).toFixed(2));
          const peT1 = parseFloat((atmPeLTP * 1.60).toFixed(2));
          const peT2 = parseFloat((atmPeLTP * 2.20).toFixed(2));
          await db.insert(tradeMasterSignals).values({
            segment: "options", assetName: peName, signalType: "buy",
            entryPrice: atmPeLTP.toFixed(4), stopLoss: peSL.toFixed(4),
            target1: peT1.toFixed(4), target2: peT2.toFixed(4),
            pcr: pcr.toFixed(2), isPremium: false, createdBy: "auto-engine",
            notes: `Auto: PCR ${pcr.toFixed(2)} ${isBearish ? "(bearish)" : "(bullish)"} · LTP ₹${ltp.toFixed(0)} ${ltp > (vwap??0) ? "above" : "below"} VWAP ₹${(vwap??0).toFixed(0)} · ATM CE LTP ₹${atmCeLTP.toFixed(2)} | PE LTP ₹${atmPeLTP.toFixed(2)}`,
          });
          inserted.push(peName);
          activeAssets.add(peName.toUpperCase());
        }
      }
    }

    // ── Source 2: Equity scanner ───────────────────────────────────────────
    const equitySignals = await fetchEquitySignals();
    // Take top 2 by RSI extremity
    const topEquity = equitySignals
      .sort((a, b) => {
        const aScore = a.signal === "buy" ? a.rsi : (100 - a.rsi);
        const bScore = b.signal === "buy" ? b.rsi : (100 - b.rsi);
        return bScore - aScore;
      })
      .slice(0, 2);

    for (const eq of topEquity) {
      const assetName = eq.name;
      if (activeAssets.has(assetName.toUpperCase())) continue;
      const rr = eq.sl > 0 ? Math.abs(eq.t1 - eq.cmp) / Math.abs(eq.cmp - eq.sl) : null;
      await db.insert(tradeMasterSignals).values({
        segment: "equity", assetName, signalType: eq.signal,
        entryPrice: eq.cmp.toFixed(4), stopLoss: eq.sl.toFixed(4),
        target1: eq.t1.toFixed(4), target2: eq.t2.toFixed(4),
        riskReward: rr != null ? rr.toFixed(2) : null,
        isPremium: false, createdBy: "auto-engine",
        notes: `Auto scanner: ${eq.reason}. Entry ₹${eq.cmp} · SL ₹${eq.sl} · T1 ₹${eq.t1} · T2 ₹${eq.t2}`,
      });
      inserted.push(`${assetName} (equity)`);
      activeAssets.add(assetName.toUpperCase());
    }

    if (inserted.length > 0) {
      logger.info({ inserted }, `[AutoSignal] Generated ${inserted.length} new signals`);
    } else {
      logger.info("[AutoSignal] Tick complete — no new qualifying signals");
    }
  } catch (err) {
    logger.error({ err }, "[AutoSignal] tick failed");
  } finally {
    generatorRunning = false;
  }
}

export function startAutoSignalGenerator(intervalMs = 15 * 60_000): void {
  logger.info("Auto-signal generator started (runs every 15 min during market hours 9:15–15:30 IST)");
  // Don't run on startup — wait for first interval
  setInterval(() => { void runAutoSignalTick(); }, intervalMs);
}
