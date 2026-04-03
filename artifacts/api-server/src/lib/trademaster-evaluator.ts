import { db } from "@workspace/db";
import { tradeMasterSignals } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

type FinnhubQuote = { c: number; h: number; l: number };

type SymbolInfo = { symbol: string; key: string };

const INDEX_SYMBOLS: SymbolInfo[] = [
  { symbol: "NSE:NIFTY50", key: "nifty" },
  { symbol: "NSE:BANKNIFTY", key: "banknifty" },
];

async function fetchPrice(symbol: string, token: string): Promise<number | null> {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return null;
    const data = await resp.json() as FinnhubQuote;
    return typeof data.c === "number" && data.c > 0 ? data.c : null;
  } catch {
    return null;
  }
}

export async function evaluateActiveSignals(): Promise<void> {
  const finnhubToken = process.env.FINNHUB_API_KEY;
  if (!finnhubToken) return;

  for (const { symbol, key } of INDEX_SYMBOLS) {
    const price = await fetchPrice(symbol, finnhubToken);
    if (price === null) continue;

    try {
      const activeSignals = await db
        .select()
        .from(tradeMasterSignals)
        .where(and(eq(tradeMasterSignals.segment, key as "nifty" | "banknifty"), eq(tradeMasterSignals.status, "active")));

      for (const signal of activeSignals) {
        const entry = parseFloat(signal.entryPrice);
        const sl = parseFloat(signal.stopLoss);
        const t1 = parseFloat(signal.target1);

        let newStatus: "target_hit" | "sl_hit" | null = null;

        if (signal.signalType === "buy") {
          if (price >= t1) newStatus = "target_hit";
          else if (price <= sl) newStatus = "sl_hit";
        } else {
          if (price <= t1) newStatus = "target_hit";
          else if (price >= sl) newStatus = "sl_hit";
        }

        if (newStatus) {
          await db
            .update(tradeMasterSignals)
            .set({ status: newStatus })
            .where(eq(tradeMasterSignals.id, signal.id));
          logger.info({ signalId: signal.id, assetName: signal.assetName, newStatus, price }, "Auto-evaluated signal status");
        }
      }
    } catch (err) {
      logger.error({ err, segment: key }, "Error evaluating signals for segment");
    }
  }
}

export function startSignalEvaluator(intervalMs = 5 * 60 * 1000): void {
  logger.info("Signal auto-evaluator started (runs every 5 minutes)");
  void evaluateActiveSignals();
  setInterval(() => { void evaluateActiveSignals(); }, intervalMs);
}
