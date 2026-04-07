import { NextRequest, NextResponse } from "next/server";
import { query, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  try {
    await ensureSchema();
    const rows = await query<{
      symbol: string;
      segment: string;
      signal: string;
      price: string;
      ema9: string;
      vwap: string;
      rsi: string;
      pcr: string | null;
      volume_ratio: string;
      volume_confirmed: boolean;
      delta: string | null;
      candle_high: string;
      candle_low: string;
      updated_at: string;
    }>(
      `SELECT symbol, segment, signal, price, ema9, vwap, rsi, pcr,
              volume_ratio, volume_confirmed, delta, candle_high, candle_low, updated_at
       FROM trademaster_signal_states
       ORDER BY segment`
    );

    const dataLagMs = 20 * 60 * 1000;
    const signals = rows.map((r) => ({
      ...r,
      dataLag: Date.now() - new Date(r.updated_at).getTime() > dataLagMs,
    }));

    return NextResponse.json({ ok: true, signals, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[GET /api/signals]", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch signals" }, { status: 500 });
  }
}
