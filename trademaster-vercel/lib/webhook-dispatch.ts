import { query } from "./db";
import type { SignalResult } from "./signal-engine";

interface WebhookRow {
  id: number;
  name: string;
  url: string;
  platform: "generic" | "sensibull" | "tradetron";
  secret: string | null;
  is_active: boolean;
}

function buildPayload(platform: WebhookRow["platform"], signal: SignalResult, prev: string): object {
  const action = signal.signal === "buy" ? "BUY" : signal.signal === "sell" ? "SELL" : "NEUTRAL";
  const timestamp = new Date().toISOString();

  if (platform === "sensibull") {
    return {
      strategy: signal.segment,
      action,
      underlying: signal.segment,
      expiry: "current_week",
      strike: "ATM",
      option_type: action === "BUY" ? "CE" : "PE",
      ltp: signal.price,
      rsi: signal.rsi,
      pcr: signal.pcr,
      timestamp,
      alert_type: "SIGNAL_CHANGE",
      prev_signal: prev,
    };
  }

  if (platform === "tradetron") {
    return {
      _tag: "tradetron",
      condition: action,
      symbol: signal.segment,
      price: signal.price,
      ema9: signal.ema9,
      vwap: signal.vwap,
      rsi: signal.rsi,
      volume_ratio: signal.volumeRatio,
      volume_spike: signal.volumeConfirmed,
      timestamp,
    };
  }

  return {
    segment: signal.segment,
    signal: signal.signal,
    prev_signal: prev,
    price: signal.price,
    ema9: signal.ema9,
    vwap: signal.vwap,
    rsi: signal.rsi,
    pcr: signal.pcr,
    volume_ratio: signal.volumeRatio,
    volume_confirmed: signal.volumeConfirmed,
    delta: signal.delta,
    candle_high: signal.candleHigh,
    candle_low: signal.candleLow,
    data_lag: signal.dataLag,
    timestamp,
  };
}

export async function dispatchWebhooks(signal: SignalResult, prevSignal: string): Promise<void> {
  let webhooks: WebhookRow[] = [];
  try {
    webhooks = await query<WebhookRow>(
      "SELECT id, name, url, platform, secret, is_active FROM trademaster_webhooks WHERE is_active = true"
    );
  } catch {
    return;
  }
  if (webhooks.length === 0) return;

  await Promise.allSettled(
    webhooks.map(async (wh) => {
      const payload = buildPayload(wh.platform, signal, prevSignal);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (wh.secret) headers["X-Webhook-Secret"] = wh.secret;

      let statusCode = 0;
      try {
        const resp = await fetch(wh.url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(8000),
        });
        statusCode = resp.status;
      } catch {
        statusCode = 0;
      }

      await query(
        "UPDATE trademaster_webhooks SET last_fired_at = NOW(), last_status_code = $1 WHERE id = $2",
        [statusCode, wh.id]
      ).catch(() => {});
    })
  );
}
