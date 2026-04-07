import { db } from "@workspace/db";
import { tradeMasterSignals } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
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

  // Pattern: APR30, APR29 with day > 28 (monthly expiry)
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

// ── Main evaluator ────────────────────────────────────────────────────────────
//
// DESIGN DECISION: Price-based auto-evaluation (Yahoo Finance) is DISABLED.
// Reason: Yahoo Finance returns delayed/stale data for Indian markets, causing
// false SL triggers on perfectly valid signals (e.g. SELL signals closed at SL
// when Yahoo returns old pre-crash prices). 
//
// This evaluator now ONLY handles:
//   1. Options expiry — close expired contracts
//   2. Intraday expiry — close signals not carried overnight
//
// Index/equity/futures signals must be manually closed by the admin via
// the Performance page or admin panel. This ensures 100% accuracy of the
// historical record.

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
          logger.info({ signalId: signal.id, assetName: signal.assetName }, "Option expired — closing");
        }
      }

      // ── 2. Intraday: expire at end of same trading day ───────────────────
      else if (signal.segment === "intraday") {
        const marketCloseToday = new Date(Date.now() + 5.5 * 3600000);
        marketCloseToday.setUTCHours(10, 0, 0, 0); // 10:00 UTC = 15:30 IST
        const sameDay = createdISTDate === nowISTDate;
        const dayOld = createdISTDate < nowISTDate;

        if (dayOld || (!marketOpen && sameDay && now > marketCloseToday)) {
          newStatus = "sl_hit";
          exitPrice = parseFloat(signal.entryPrice);
          logger.info({ signalId: signal.id, assetName: signal.assetName }, "Intraday expired at close");
        }
      }

      // ── 3. Index/Equity/Futures — NO auto-evaluation ─────────────────────
      // These are managed manually by admin to ensure accuracy of the record.
      // Do NOT trigger SL/target based on Yahoo Finance (data is unreliable).

      if (newStatus) {
        await db
          .update(tradeMasterSignals)
          .set({
            status: newStatus,
            closedAt: now,
            exitPrice: exitPrice != null ? exitPrice.toFixed(4) : null,
          })
          .where(eq(tradeMasterSignals.id, signal.id));
        logger.info({ signalId: signal.id, newStatus, exitPrice }, "Signal auto-closed");
      }
    }
  } catch (err) {
    logger.error({ err }, "Error in evaluateActiveSignals");
  }
}

export function startSignalEvaluator(intervalMs = 5 * 60 * 1000): void {
  logger.info("Signal evaluator started — options expiry + intraday only (no Yahoo price checks)");
  void evaluateActiveSignals();
  setInterval(() => { void evaluateActiveSignals(); }, intervalMs);
}
