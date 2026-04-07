import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, query } from "@/lib/db";
import { computeSignal, SEGMENTS, type SignalResult } from "@/lib/signal-engine";
import { dispatchWebhooks } from "@/lib/webhook-dispatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const verifyCron = req.headers.get("x-vercel-cron");
    if (!verifyCron && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await ensureSchema();
  } catch (err) {
    console.error("[generate-signals] Schema init failed:", err);
    return NextResponse.json({ ok: false, error: "DB schema error" }, { status: 500 });
  }

  const results: {
    segment: string;
    signal: string;
    prevSignal: string;
    stateChanged: boolean;
    dataLag: boolean;
  }[] = [];

  await Promise.allSettled(
    SEGMENTS.map(async (segment) => {
      let computed: SignalResult;
      try {
        computed = await computeSignal(segment);
      } catch (err) {
        console.error(`[generate-signals] computeSignal failed for ${segment}:`, err);
        results.push({ segment, signal: "neutral", prevSignal: "unknown", stateChanged: false, dataLag: true });
        return;
      }

      const prevRows = await query<{ signal: string }>(
        "SELECT signal FROM trademaster_signal_states WHERE segment = $1",
        [segment]
      );
      const prevSignal = prevRows[0]?.signal ?? "none";
      const stateChanged = prevSignal !== computed.signal;

      await query(
        `INSERT INTO trademaster_signal_states
           (symbol, segment, signal, price, ema9, vwap, rsi, pcr, volume_ratio,
            volume_confirmed, delta, candle_high, candle_low, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
         ON CONFLICT (segment) DO UPDATE SET
           symbol=EXCLUDED.symbol, signal=EXCLUDED.signal, price=EXCLUDED.price,
           ema9=EXCLUDED.ema9, vwap=EXCLUDED.vwap, rsi=EXCLUDED.rsi,
           pcr=EXCLUDED.pcr, volume_ratio=EXCLUDED.volume_ratio,
           volume_confirmed=EXCLUDED.volume_confirmed, delta=EXCLUDED.delta,
           candle_high=EXCLUDED.candle_high, candle_low=EXCLUDED.candle_low,
           updated_at=NOW()`,
        [
          computed.symbol, computed.segment, computed.signal, computed.price,
          computed.ema9, computed.vwap, computed.rsi, computed.pcr,
          computed.volumeRatio, computed.volumeConfirmed, computed.delta,
          computed.candleHigh, computed.candleLow,
        ]
      );

      if (stateChanged && computed.signal !== "neutral" && !computed.dataLag) {
        await dispatchWebhooks(computed, prevSignal).catch(console.error);
      }

      results.push({
        segment,
        signal: computed.signal,
        prevSignal,
        stateChanged,
        dataLag: computed.dataLag,
      });
    })
  );

  return NextResponse.json({ ok: true, results, generatedAt: new Date().toISOString() });
}
