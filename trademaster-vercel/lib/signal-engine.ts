export type SignalType = "buy" | "sell" | "neutral";
export type Segment = "NIFTY" | "BANKNIFTY" | "FINNIFTY";

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SignalResult {
  symbol: string;
  segment: Segment;
  signal: SignalType;
  price: number;
  ema9: number;
  vwap: number;
  rsi: number;
  pcr: number | null;
  volumeRatio: number;
  volumeConfirmed: boolean;
  delta: number;
  candleHigh: number;
  candleLow: number;
  dataLag: boolean;
  lastCandle: number;
}

const YAHOO_SYMBOLS: Record<Segment, string> = {
  NIFTY: "^NSEI",
  BANKNIFTY: "^NSEBANK",
  FINNIFTY: "NIFTY_FIN_SERVICE.NS",
};

async function fetchOHLCV(segment: Segment): Promise<OHLCV[]> {
  const symbol = encodeURIComponent(YAHOO_SYMBOLS[segment]);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m&range=2d&includePrePost=false`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) throw new Error(`Yahoo Finance error ${resp.status} for ${segment}`);
  const data = await resp.json();
  const chart = data?.chart?.result?.[0];
  if (!chart) throw new Error(`No chart data for ${segment}`);

  const timestamps: number[] = chart.timestamp ?? [];
  const quotes = chart.indicators?.quote?.[0] ?? {};
  const opens: number[] = quotes.open ?? [];
  const highs: number[] = quotes.high ?? [];
  const lows: number[] = quotes.low ?? [];
  const closes: number[] = quotes.close ?? [];
  const volumes: number[] = quotes.volume ?? [];

  const candles: OHLCV[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] == null || isNaN(closes[i])) continue;
    candles.push({
      timestamp: timestamps[i] * 1000,
      open: opens[i] ?? closes[i],
      high: highs[i] ?? closes[i],
      low: lows[i] ?? closes[i],
      close: closes[i],
      volume: volumes[i] ?? 0,
    });
  }
  return candles.slice(-60);
}

function calcEMA(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emas: number[] = [];
  let ema = values[0];
  emas.push(ema);
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    emas.push(ema);
  }
  return emas;
}

function calcVWAP(candles: OHLCV[]): number {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(9, 15, 0, 0);
  const sessionCandles = candles.filter((c) => c.timestamp >= todayStart.getTime());
  if (sessionCandles.length === 0) return candles[candles.length - 1]?.close ?? 0;

  let sumPV = 0;
  let sumV = 0;
  for (const c of sessionCandles) {
    const tp = (c.high + c.low + c.close) / 3;
    sumPV += tp * c.volume;
    sumV += c.volume;
  }
  return sumV > 0 ? sumPV / sumV : sessionCandles[sessionCandles.length - 1].close;
}

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  const changes = closes.slice(1).map((v, i) => v - closes[i]);
  const gains = changes.map((c) => Math.max(c, 0));
  const losses = changes.map((c) => Math.max(-c, 0));

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calcVolumeRatio(candles: OHLCV[]): number {
  if (candles.length < 6) return 1;
  const current = candles[candles.length - 1].volume;
  const prev5 = candles.slice(-6, -1).map((c) => c.volume);
  const avg = prev5.reduce((a, b) => a + b, 0) / prev5.length;
  return avg > 0 ? current / avg : 1;
}

function calcATMDelta(rsi: number, signal: SignalType): number {
  if (signal === "neutral") return 0.5;
  if (signal === "buy") return 0.5 + Math.min((rsi - 50) / 100, 0.25);
  return 0.5 - Math.min((50 - rsi) / 100, 0.25);
}

function determineSignal(
  price: number,
  ema9: number,
  vwap: number,
  rsi: number,
  volumeRatio: number
): SignalType {
  const volOk = volumeRatio >= 1.2;
  if (price > ema9 && price > vwap && rsi > 50 && rsi < 72 && volOk) return "buy";
  if (price < ema9 && price < vwap && rsi < 50 && rsi > 28 && volOk) return "sell";
  return "neutral";
}

async function fetchPCR(segment: Segment): Promise<number | null> {
  try {
    const nseSym = segment === "BANKNIFTY" ? "BANKNIFTY" : segment === "FINNIFTY" ? "FINNIFTY" : "NIFTY";
    const url = `https://www.nseindia.com/api/option-chain-indices?symbol=${nseSym}`;
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": "https://www.nseindia.com",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const filtered = data?.filtered;
    if (filtered) {
      const putOI = filtered.PE?.totOI ?? 0;
      const callOI = filtered.CE?.totOI ?? 0;
      return callOI > 0 ? putOI / callOI : null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function computeSignal(segment: Segment): Promise<SignalResult> {
  let dataLag = false;
  let candles: OHLCV[] = [];

  try {
    candles = await fetchOHLCV(segment);
  } catch (err) {
    console.error(`[SignalEngine] fetchOHLCV failed for ${segment}:`, err);
    dataLag = true;
    return {
      symbol: YAHOO_SYMBOLS[segment],
      segment,
      signal: "neutral",
      price: 0,
      ema9: 0,
      vwap: 0,
      rsi: 50,
      pcr: null,
      volumeRatio: 0,
      volumeConfirmed: false,
      delta: 0.5,
      candleHigh: 0,
      candleLow: 0,
      dataLag: true,
      lastCandle: 0,
    };
  }

  if (candles.length === 0) {
    dataLag = true;
  }

  const closes = candles.map((c) => c.close);
  const emas = calcEMA(closes, 9);
  const ema9 = emas[emas.length - 1];
  const vwap = calcVWAP(candles);
  const rsi = calcRSI(closes, 14);
  const volumeRatio = calcVolumeRatio(candles);
  const last = candles[candles.length - 1];
  const price = last?.close ?? 0;
  const signal = determineSignal(price, ema9, vwap, rsi, volumeRatio);
  const delta = calcATMDelta(rsi, signal);
  const pcr = await fetchPCR(segment);

  const staleMs = 15 * 60 * 1000;
  if (last && Date.now() - last.timestamp > staleMs) dataLag = true;

  return {
    symbol: YAHOO_SYMBOLS[segment],
    segment,
    signal,
    price: +price.toFixed(2),
    ema9: +ema9.toFixed(2),
    vwap: +vwap.toFixed(2),
    rsi: +rsi.toFixed(2),
    pcr,
    volumeRatio: +volumeRatio.toFixed(2),
    volumeConfirmed: volumeRatio >= 1.2,
    delta: +delta.toFixed(4),
    candleHigh: +(last?.high ?? 0).toFixed(2),
    candleLow: +(last?.low ?? 0).toFixed(2),
    dataLag,
    lastCandle: last?.timestamp ?? 0,
  };
}

export const SEGMENTS: Segment[] = ["NIFTY", "BANKNIFTY", "FINNIFTY"];
