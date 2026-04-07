import { db } from "@workspace/db";
import { tradeMasterSignals } from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { logger } from "./logger";

// ── Price fetching ────────────────────────────────────────────────────────────

/** NSE index symbols via Yahoo Finance (no key needed) */
const YAHOO_INDEX_MAP: Record<string, string> = {
  nifty:     "^NSEI",
  banknifty: "^NSEBANK",
  intraday:  "^NSEI",
};

/** Equity symbol: extract from asset_name, e.g. "RELIANCE" → "RELIANCE.NS" */
function toYahooEquity(assetName: string): string | null {
  const upper = assetName.toUpperCase().split(/\s/)[0];
  if (!upper || upper.length < 2) return null;
  const known: Record<string, string> = {
    RELIANCE: "RELIANCE.NS", HDFCBANK: "HDFCBANK.NS", "HDFC BANK": "HDFCBANK.NS",
    ICICIBANK: "ICICIBANK.NS", "ICICI BANK": "ICICIBANK.NS", TCS: "TCS.NS",
    INFY: "INFY.NS", INFOSYS: "INFY.NS", AXISBANK: "AXISBANK.NS",
    "AXIS BANK": "AXISBANK.NS", SBIN: "SBIN.NS", SBI: "SBIN.NS",
    WIPRO: "WIPRO.NS", TATASTEEL: "TATASTEEL.NS", BAJAJFINSV: "BAJAJFINSV.NS",
    BAJAJFINANCE: "BAJAJFINANCE.NS", HINDUNILVR: "HINDUNILVR.NS", MARUTI: "MARUTI.NS",
    KOTAKBANK: "KOTAKBANK.NS", NTPC: "NTPC.NS", ONGC: "ONGC.NS", POWERGRID: "POWERGRID.NS",
    SUNPHARMA: "SUNPHARMA.NS", TECHM: "TECHM.NS", TITAN: "TITAN.NS",
    ULTRACEMENT: "ULTRACEMCO.NS", ITC: "ITC.NS",
  };
  return known[upper] ?? `${upper}.NS`;
}

async function fetchYahooPrice(yahooSymbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1m&range=1d`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache" },
      signal: AbortSignal.timeout(6000),
    });
    if (!resp.ok) return null;
    const json = await resp.json() as Record<string, unknown>;
    const meta = (json as Record<string, Record<string, Record<string, unknown>[]>>)?.chart?.result?.[0]?.meta as Record<string, number> | undefined;
    const price = meta?.regularMarketPrice ?? null;
    return price != null && price > 0 ? parseFloat(price.toFixed(2)) : null;
  } catch {
    return null;
  }
}

// ── Option expiry parsing ─────────────────────────────────────────────────────

/** Parse expiry date from signal asset name like "NIFTY 22900 CE APR09" or "NIFTY 23000 CE APR29" */
function parseOptionExpiry(assetName: string): Date | null {
  // Match patterns: APR09, APR29, MAY29, JUN26, APR 2025 etc.
  const months: Record<string, number> = {
    JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11
  };
  const upper = assetName.toUpperCase();

  // Pattern: APR09, APR29 (month + day, current year assumed)
  const m1 = upper.match(/([A-Z]{3})(\d{2})\s*$/);
  if (m1) {
    const mo = months[m1[1]];
    if (mo !== undefined) {
      const day = parseInt(m1[2], 10);
      const now = new Date(Date.now() + 5.5 * 3600000);
      const year = now.getMonth() > mo ? now.getFullYear() + 1 : now.getFullYear();
      return new Date(Date.UTC(year, mo, day, 10, 0, 0)); // 10:00 UTC = 15:30 IST
    }
  }

  // Pattern: APR 2025, MAY 2026 (full month + year)
  const m2 = upper.match(/([A-Z]{3})\s+(\d{4})/);
  if (m2) {
    const mo = months[m2[1]];
    const year = parseInt(m2[2], 10);
    if (mo !== undefined && !isNaN(year)) {
      // Last Thursday of the month
      const lastDay = new Date(Date.UTC(year, mo + 1, 0));
      while (lastDay.getUTCDay() !== 4) lastDay.setUTCDate(lastDay.getUTCDate() - 1);
      lastDay.setUTCHours(10, 0, 0, 0); // 15:30 IST
      return lastDay;
    }
  }

  return null;
}

/** Is it an options signal? */
function isOptionSignal(assetName: string): boolean {
  return /\b(CE|PE)\b/.test(assetName.toUpperCase());
}

// ── IST helpers ───────────────────────────────────────────────────────────────

function nowIST(): Date {
  return new Date(Date.now() + 5.5 * 3600000);
}

function isMarketOpen(): boolean {
  const ist = nowIST();
  const h = ist.getUTCHours(), m = ist.getUTCMinutes(), dow = ist.getUTCDay();
  if (dow === 0 || dow === 6) return false; // weekend
  const mins = h * 60 + m;
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}

function todayISTStr(): string {
  const ist = nowIST();
  return ist.toISOString().slice(0, 10);
}

// ── Price lookup by segment ───────────────────────────────────────────────────

const priceCache = new Map<string, { price: number; ts: number }>();
const PRICE_CACHE_TTL = 3 * 60_000;

async function getPriceForSignal(segment: string, assetName: string): Promise<number | null> {
  const cacheKey = `${segment}:${assetName.split(" ")[0]}`;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < PRICE_CACHE_TTL) return cached.price;

  let yahooSym: string | null = null;

  if (segment === "nifty")     yahooSym = "^NSEI";
  else if (segment === "banknifty") yahooSym = "^NSEBANK";
  else if (segment === "intraday") yahooSym = "^NSEI";
  else if (segment === "equity" || segment === "options") {
    if (isOptionSignal(assetName)) {
      // For options: we cannot easily get option LTP from Yahoo; use null (handled by expiry logic)
      return null;
    }
    yahooSym = toYahooEquity(assetName);
  }

  if (!yahooSym) return null;

  const price = await fetchYahooPrice(yahooSym);
  if (price != null) priceCache.set(cacheKey, { price, ts: Date.now() });
  return price;
}

// ── Main evaluator ────────────────────────────────────────────────────────────

export async function evaluateActiveSignals(): Promise<void> {
  const now = new Date();
  const nowISTDate = todayISTStr();
  const marketOpen = isMarketOpen();

  try {
    // Fetch all active signals
    const activeSignals = await db
      .select()
      .from(tradeMasterSignals)
      .where(eq(tradeMasterSignals.status, "active"));

    if (activeSignals.length === 0) return;

    // Price cache for segments (avoid fetching same index multiple times)
    const segPriceCache = new Map<string, number | null>();

    for (const signal of activeSignals) {
      let newStatus: "target_hit" | "sl_hit" | null = null;
      let exitPrice: number | null = null;
      const createdISTDate = new Date(signal.createdAt.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);

      // ── 1. Options: check expiry date ────────────────────────────────────
      if (isOptionSignal(signal.assetName)) {
        const expiryDate = parseOptionExpiry(signal.assetName);
        if (expiryDate && now > expiryDate) {
          // Contract expired — mark sl_hit (expired worthless)
          newStatus = "sl_hit";
          exitPrice = 0;
          logger.info({ signalId: signal.id, assetName: signal.assetName, expiryDate }, "Option expired — closing as sl_hit");
        }
        // Can't get live option LTP easily; skip price check for unexpired options
      }

      // ── 2. Intraday: expire at end of session (3:30 PM IST same day) ────
      else if (signal.segment === "intraday") {
        const marketCloseToday = new Date(Date.now() + 5.5 * 3600000);
        marketCloseToday.setUTCHours(10, 0, 0, 0); // 10:00 UTC = 15:30 IST
        if (!marketOpen && createdISTDate === nowISTDate && now > marketCloseToday) {
          // Intraday signal expired at close
          const price = await getPriceForSignal(signal.segment, signal.assetName);
          newStatus = "sl_hit";
          exitPrice = price ?? parseFloat(signal.entryPrice);
          logger.info({ signalId: signal.id, assetName: signal.assetName }, "Intraday signal expired at market close");
        } else if (createdISTDate < nowISTDate) {
          // Intraday signal from a previous day — expire it
          newStatus = "sl_hit";
          exitPrice = parseFloat(signal.entryPrice);
        }
      }

      // ── 3. Index / equity: check live price vs target/SL ─────────────────
      if (newStatus === null && !isOptionSignal(signal.assetName)) {
        const segKey = `${signal.segment}:${signal.assetName.split(" ")[0]}`;
        if (!segPriceCache.has(segKey)) {
          segPriceCache.set(segKey, await getPriceForSignal(signal.segment, signal.assetName));
        }
        const price = segPriceCache.get(segKey) ?? null;

        if (price !== null) {
          const sl = parseFloat(signal.stopLoss);
          const t1 = parseFloat(signal.target1);

          if (signal.signalType === "buy") {
            if (price >= t1) { newStatus = "target_hit"; exitPrice = price; }
            else if (price <= sl) { newStatus = "sl_hit"; exitPrice = price; }
          } else {
            if (price <= t1) { newStatus = "target_hit"; exitPrice = price; }
            else if (price >= sl) { newStatus = "sl_hit"; exitPrice = price; }
          }
        }
      }

      // ── 4. Apply status update if changed ─────────────────────────────────
      if (newStatus) {
        await db
          .update(tradeMasterSignals)
          .set({
            status: newStatus,
            closedAt: now,
            exitPrice: exitPrice != null ? exitPrice.toFixed(4) : null,
          })
          .where(eq(tradeMasterSignals.id, signal.id));
        logger.info({ signalId: signal.id, assetName: signal.assetName, newStatus, exitPrice }, "Signal auto-closed to history");
      }
    }
  } catch (err) {
    logger.error({ err }, "Error in evaluateActiveSignals");
  }
}

export function startSignalEvaluator(intervalMs = 5 * 60 * 1000): void {
  logger.info("Signal auto-evaluator started (runs every 5 minutes, all segments)");
  void evaluateActiveSignals();
  setInterval(() => { void evaluateActiveSignals(); }, intervalMs);
}
