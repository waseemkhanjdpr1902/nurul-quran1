import { db } from "@workspace/db";
import { tradeMasterSignals } from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { logger } from "./logger";

// ── IST helpers ───────────────────────────────────────────────────────────────

function nowIST(): Date {
  return new Date(Date.now() + 5.5 * 3600000);
}

function todayISTStr(): string {
  return nowIST().toISOString().slice(0, 10);
}

function isMarketOpen(): boolean {
  const ist = nowIST();
  const h = ist.getUTCHours(), m = ist.getUTCMinutes(), dow = ist.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  const mins = h * 60 + m;
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}

// ── Option expiry parsing ─────────────────────────────────────────────────────

function isOptionSignal(assetName: string): boolean {
  return /\b(CE|PE)\b/.test(assetName.toUpperCase());
}

function parseOptionExpiry(assetName: string): Date | null {
  const months: Record<string, number> = {
    JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11
  };
  const upper = assetName.toUpperCase();

  // Pattern: APR09, APR29 (month + day)
  const m1 = upper.match(/([A-Z]{3})(\d{2})\s*$/);
  if (m1) {
    const mo = months[m1[1]];
    if (mo !== undefined) {
      const day = parseInt(m1[2], 10);
      const now = nowIST();
      const year = now.getMonth() > mo ? now.getFullYear() + 1 : now.getFullYear();
      return new Date(Date.UTC(year, mo, day, 10, 0, 0));
    }
  }

  // Pattern: APR 2024 (monthly expiry — last Thursday)
  const m2 = upper.match(/([A-Z]{3})\s+(\d{4})/);
  if (m2) {
    const mo = months[m2[1]];
    const year = parseInt(m2[2], 10);
    if (mo !== undefined && !isNaN(year)) {
      const lastDay = new Date(Date.UTC(year, mo + 1, 0));
      while (lastDay.getUTCDay() !== 4) lastDay.setUTCDate(lastDay.getUTCDate() - 1);
      lastDay.setUTCHours(10, 0, 0, 0);
      return lastDay;
    }
  }

  return null;
}

// ── Yahoo Finance price fetch ──────────────────────────────────────────────────
//
// Used for equity, commodity, and currency segments only.
// NOTE: Yahoo Finance returns 15–30 min delayed data for Indian markets.
// We apply a 1.5% safety buffer beyond SL/target to prevent false triggers.

const YAHOO_SYMBOL_MAP: Record<string, string> = {
  // Equity — NSE
  "RELIANCE INDUSTRIES": "RELIANCE.NS", "RELIANCE": "RELIANCE.NS",
  "HDFC BANK": "HDFCBANK.NS",   "HDFCBANK": "HDFCBANK.NS",
  "ICICI BANK": "ICICIBANK.NS", "ICICIBANK": "ICICIBANK.NS",
  "AXIS BANK": "AXISBANK.NS",   "AXISBANK": "AXISBANK.NS",
  "SBI": "SBIN.NS",             "STATE BANK": "SBIN.NS",
  "WIPRO": "WIPRO.NS",          "INFOSYS": "INFY.NS",       "INFY": "INFY.NS",
  "TCS": "TCS.NS",              "TATA STEEL": "TATASTEEL.NS","TATASTEEL": "TATASTEEL.NS",
  "ITC": "ITC.NS",              "KOTAK BANK": "KOTAKBANK.NS","KOTAKBANK": "KOTAKBANK.NS",
  "TECH MAHINDRA": "TECHM.NS",  "TECHM": "TECHM.NS",
  "MARUTI": "MARUTI.NS",        "BAJAJ FINANCE": "BAJAJFIN.NS","BAJAJFINANCE": "BAJAJFIN.NS",
  // Commodity (MCX)
  "GOLD": "GC=F",       "SILVER": "SI=F",
  "CRUDE OIL": "CL=F",  "CRUDE": "CL=F",
  "NATURAL GAS": "NG=F","NATGAS": "NG=F",
  "COPPER": "HG=F",
  // Currency
  "USDINR": "USDINR=X", "USD/INR": "USDINR=X", "USD-INR": "USDINR=X",
  "EURINR": "EURINR=X", "EUR/INR": "EURINR=X",
  "GBPINR": "GBPINR=X", "GBP/INR": "GBPINR=X",
};

function resolveYahooSymbol(assetName: string): string | null {
  const upper = assetName.toUpperCase().trim();
  // Direct map lookup
  for (const [key, sym] of Object.entries(YAHOO_SYMBOL_MAP)) {
    if (upper.includes(key)) return sym;
  }
  // Guess .NS for equity-looking names (all caps, no spaces, 2-10 chars)
  if (/^[A-Z&]{2,10}$/.test(upper.split(" ")[0])) {
    return `${upper.split(" ")[0]}.NS`;
  }
  return null;
}

async function fetchYahooPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=15m&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json() as Record<string, unknown>;
    const result0 = (json as { chart?: { result?: { indicators?: { quote?: { close?: (number|null)[] }[] } }[] } }).chart?.result?.[0];
    const closes = result0?.indicators?.quote?.[0]?.close ?? [];
    // Get last valid close (Yahoo sometimes returns null for the current candle)
    for (let i = closes.length - 1; i >= 0; i--) {
      if (closes[i] != null && closes[i]! > 0) return closes[i];
    }
    return null;
  } catch {
    return null;
  }
}

// ── Safety buffer — how far past SL/target before we auto-close ───────────────
// Using 1.5% buffer to account for Yahoo's data delay.
const PRICE_BUFFER_PCT = 0.015;

function shouldAutoCloseSL(dir: "buy" | "sell", currentPrice: number, sl: number): boolean {
  if (dir === "buy") {
    // Breached SL with 1.5% buffer (price is 1.5% below SL)
    return currentPrice < sl * (1 - PRICE_BUFFER_PCT);
  } else {
    return currentPrice > sl * (1 + PRICE_BUFFER_PCT);
  }
}

function shouldAutoCloseTarget(dir: "buy" | "sell", currentPrice: number, target: number): boolean {
  if (dir === "buy") {
    return currentPrice > target * (1 + PRICE_BUFFER_PCT * 0.5); // 0.75% buffer for target
  } else {
    return currentPrice < target * (1 - PRICE_BUFFER_PCT * 0.5);
  }
}

// ── Segments that support price-based auto-evaluation ─────────────────────────
const PRICE_EVAL_SEGMENTS = new Set(["equity", "commodity", "currency"]);
// Nifty/BankNifty are index signals — managed manually (admin closes via UI)
// Futures — manually managed (admin panel)

// ── Main evaluator ────────────────────────────────────────────────────────────

export async function evaluateActiveSignals(): Promise<void> {
  const now = new Date();
  const nowISTDate = todayISTStr();
  const marketOpen = isMarketOpen();

  try {
    const activeSignals = await db
      .select()
      .from(tradeMasterSignals)
      .where(eq(tradeMasterSignals.status, "active"));

    if (activeSignals.length === 0) return;

    for (const signal of activeSignals) {
      let newStatus: "target_hit" | "sl_hit" | null = null;
      let exitPrice: number | null = null;
      const createdISTDate = new Date(signal.createdAt.getTime() + 5.5 * 3600000)
        .toISOString().slice(0, 10);

      // ── 1. Options: close at contract expiry ─────────────────────────────
      if (isOptionSignal(signal.assetName)) {
        const expiryDate = parseOptionExpiry(signal.assetName);
        if (expiryDate && now > expiryDate) {
          newStatus = "sl_hit";
          exitPrice = 0;
          logger.info({ signalId: signal.id, assetName: signal.assetName }, "Option expired — closing at 0");
        }
      }

      // ── 2. Intraday: expire at end of same trading day ───────────────────
      else if (signal.segment === "intraday") {
        const marketCloseToday = new Date(Date.now() + 5.5 * 3600000);
        marketCloseToday.setUTCHours(10, 0, 0, 0); // 10:00 UTC = 15:30 IST
        const sameDay = createdISTDate === nowISTDate;
        const dayOld  = createdISTDate < nowISTDate;

        if (dayOld || (!marketOpen && sameDay && now > marketCloseToday)) {
          newStatus = "sl_hit";
          exitPrice = parseFloat(signal.entryPrice);
          logger.info({ signalId: signal.id, assetName: signal.assetName }, "Intraday expired at close — closed at entry (break-even)");
        }
      }

      // ── 3. Equity / Commodity / Currency — Yahoo Finance price check ─────
      //
      // NOTE: Yahoo Finance returns 15–30 min delayed data for Indian markets.
      // We apply a 1.5% safety buffer (shouldAutoCloseSL/shouldAutoCloseTarget)
      // to avoid false SL/target triggers on delayed data.
      //
      // Only runs during market hours to avoid off-hours noise.
      else if (PRICE_EVAL_SEGMENTS.has(signal.segment) && marketOpen) {
        const yahooSym = resolveYahooSymbol(signal.assetName);
        if (yahooSym) {
          const currentPrice = await fetchYahooPrice(yahooSym);
          if (currentPrice && currentPrice > 0) {
            const dir    = signal.signalType as "buy" | "sell";
            const entry  = parseFloat(signal.entryPrice);
            const sl     = parseFloat(signal.stopLoss);
            const t2     = signal.target2 ? parseFloat(signal.target2) : null;
            const t1     = parseFloat(signal.target1);

            if (shouldAutoCloseSL(dir, currentPrice, sl)) {
              newStatus = "sl_hit";
              exitPrice = currentPrice;
              logger.info({ signalId: signal.id, assetName: signal.assetName, currentPrice, sl }, "Equity/Commodity/Currency SL hit (Yahoo price check)");
            } else if (t2 && shouldAutoCloseTarget(dir, currentPrice, t2)) {
              newStatus = "target_hit";
              exitPrice = t2;
              logger.info({ signalId: signal.id, assetName: signal.assetName, currentPrice, t2 }, "Equity T2 hit (Yahoo price check)");
            } else if (shouldAutoCloseTarget(dir, currentPrice, t1)) {
              newStatus = "target_hit";
              exitPrice = t1;
              logger.info({ signalId: signal.id, assetName: signal.assetName, currentPrice, t1 }, "Equity T1 hit (Yahoo price check)");
            }

            if (!newStatus) {
              logger.debug({
                signalId:    signal.id,
                assetName:   signal.assetName,
                currentPrice,
                entry,
                sl,
                t1,
              }, "Equity price check — signal still active");
            }
          } else {
            logger.debug({ signalId: signal.id, assetName: signal.assetName, yahooSym }, "Equity price unavailable — keeping active");
          }
        }
      }

      // ── 4. Nifty / BankNifty / Futures — manual admin close only ─────────
      // These are managed manually by admin via the Performance page or admin panel.
      // Reason: Index signals need human judgment for re-entry and news context.

      if (newStatus) {
        await db
          .update(tradeMasterSignals)
          .set({
            status:   newStatus,
            closedAt: now,
            exitPrice: exitPrice != null ? exitPrice.toFixed(4) : null,
            updatedAt: now,
          })
          .where(eq(tradeMasterSignals.id, signal.id));
        logger.info({ signalId: signal.id, newStatus, exitPrice, assetName: signal.assetName }, "Signal auto-closed with timestamp");
      }
    }
  } catch (err) {
    logger.error({ err }, "Error in evaluateActiveSignals");
  }
}

export function startSignalEvaluator(intervalMs = 5 * 60 * 1000): void {
  logger.info("Signal evaluator started — options expiry · intraday day-end · equity/commodity/currency Yahoo price check (1.5% buffer)");
  void evaluateActiveSignals();
  setInterval(() => { void evaluateActiveSignals(); }, intervalMs);
}
