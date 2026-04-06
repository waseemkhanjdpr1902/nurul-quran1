import { Router, type IRouter, type Request, type Response } from "express";
import { createHmac } from "crypto";
import { db } from "@workspace/db";
import { tradeMasterSignals, tradeMasterSubscriptions, tradeMasterInvestmentReports, tradeMasterJournal, tradeMasterConsent } from "@workspace/db/schema";
import { eq, desc, and, sql, or, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const VALID_SEGMENTS = ["nifty", "banknifty", "options", "equity", "intraday", "commodity", "currency", "futures", "fno", "stocks"] as const;
type ValidSegment = typeof VALID_SEGMENTS[number];
const VALID_SIGNAL_TYPES = ["buy", "sell"] as const;
type ValidSignalType = typeof VALID_SIGNAL_TYPES[number];
const VALID_STATUSES = ["active", "target_hit", "sl_hit"] as const;
type ValidStatus = typeof VALID_STATUSES[number];

function isValidSegment(s: unknown): s is ValidSegment {
  return typeof s === "string" && (VALID_SEGMENTS as readonly string[]).includes(s);
}

function buildSegmentWhere(segment: string) {
  if (segment === "fno") return or(eq(tradeMasterSignals.segment, "options"), eq(tradeMasterSignals.segment, "futures"));
  if (segment === "stocks") return eq(tradeMasterSignals.segment, "equity");
  return eq(tradeMasterSignals.segment, segment);
}
function isValidSignalType(s: unknown): s is ValidSignalType {
  return typeof s === "string" && (VALID_SIGNAL_TYPES as readonly string[]).includes(s);
}
function isValidStatus(s: unknown): s is ValidStatus {
  return typeof s === "string" && (VALID_STATUSES as readonly string[]).includes(s);
}

type TickerQuote = { name: string; price: number | null; change: number | null; changePercent: number | null; high: number | null; low: number | null; marketState: string | null };
type TickerResults = Record<string, TickerQuote>;
type FinnhubQuote = { c: number; d: number; dp: number; h: number; l: number };

type SignalUpdatePayload = {
  status?: ValidStatus;
  assetName?: string;
  signalType?: ValidSignalType;
  entryPrice?: string;
  stopLoss?: string;
  target1?: string;
  target2?: string | null;
  iv?: string | null;
  pcr?: string | null;
  notes?: string | null;
  isPremium?: boolean;
  riskReward?: string | null;
};

type DbSignal = typeof tradeMasterSignals.$inferSelect;

function requireAdmin(req: Request, res: Response): boolean {
  const adminToken = process.env.TRADEMASTER_ADMIN_TOKEN;
  const authHeader = req.headers.authorization;
  if (!adminToken) { res.status(500).json({ error: "Admin token not configured" }); return false; }
  if (!authHeader || authHeader !== `Bearer ${adminToken}`) { res.status(401).json({ error: "Unauthorized" }); return false; }
  return true;
}

function calcRR(entry: number, sl: number, t1: number): string | null {
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(t1 - entry);
  return risk > 0 ? (reward / risk).toFixed(2) : null;
}

async function isSessionPremium(sessionId: string | undefined): Promise<boolean> {
  if (!sessionId || typeof sessionId !== "string") return false;
  try {
    const [sub] = await db.select().from(tradeMasterSubscriptions)
      .where(and(eq(tradeMasterSubscriptions.sessionId, sessionId), eq(tradeMasterSubscriptions.status, "active")));
    return !!sub;
  } catch { return false; }
}

function resolveAccessLevel(req: Request): "admin" | "session" | string | null {
  const adminToken = process.env.TRADEMASTER_ADMIN_TOKEN;
  const authHeader = req.headers.authorization;
  if (adminToken && authHeader === `Bearer ${adminToken}`) return "admin";
  return (req.query as Record<string, string>).sessionId ?? null;
}

function redactPremiumSignal(signal: DbSignal): DbSignal {
  return { ...signal, entryPrice: "—", stopLoss: "—", target1: "—", target2: null, riskReward: null, iv: null, pcr: null, notes: null };
}

router.get("/trademaster/admin/verify", (req: Request, res: Response): void => {
  if (!requireAdmin(req, res)) return;
  res.json({ ok: true });
});

router.get("/trademaster/config", (_req: Request, res: Response): void => {
  res.json({ razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? null });
});

router.get("/trademaster/signals", async (req: Request, res: Response): Promise<void> => {
  try {
    const { segment } = req.query as { segment?: string };
    const accessLevel = resolveAccessLevel(req);
    const isPremium = accessLevel === "admin" || await isSessionPremium(accessLevel ?? undefined);

    const where = segment && isValidSegment(segment) ? buildSegmentWhere(segment) : undefined;
    const rows = where
      ? await db.select().from(tradeMasterSignals).where(where).orderBy(desc(tradeMasterSignals.createdAt))
      : await db.select().from(tradeMasterSignals).orderBy(desc(tradeMasterSignals.createdAt));

    // TESTING MODE: all signals open — re-enable premium gating after accuracy testing
    const signals = rows.map((s) => s);
    res.json({ signals });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch signals");
    res.status(500).json({ error: "Failed to fetch signals" });
  }
});

router.get("/trademaster/signals/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const accessLevel = resolveAccessLevel(req);
    const isPremium = accessLevel === "admin" || await isSessionPremium(accessLevel ?? undefined);
    const [signal] = await db.select().from(tradeMasterSignals).where(eq(tradeMasterSignals.id, id));
    if (!signal) { res.status(404).json({ error: "Signal not found" }); return; }
    res.json({ signal: signal.isPremium && !isPremium ? redactPremiumSignal(signal) : signal });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch signal");
    res.status(500).json({ error: "Failed to fetch signal" });
  }
});

router.post("/trademaster/signals", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const { segment, assetName, signalType, entryPrice, stopLoss, target1, target2, iv, pcr, notes, isPremium } = req.body as Record<string, unknown>;
    if (!isValidSegment(segment)) { res.status(400).json({ error: "Invalid segment" }); return; }
    if (!isValidSignalType(signalType)) { res.status(400).json({ error: "Invalid signalType" }); return; }
    if (typeof assetName !== "string" || !assetName.trim()) { res.status(400).json({ error: "assetName required" }); return; }
    const entry = parseFloat(String(entryPrice));
    const sl = parseFloat(String(stopLoss));
    const t1 = parseFloat(String(target1));
    if (isNaN(entry) || isNaN(sl) || isNaN(t1)) { res.status(400).json({ error: "entryPrice, stopLoss, target1 must be numbers" }); return; }
    const [signal] = await db.insert(tradeMasterSignals).values({
      segment,
      assetName: String(assetName).trim(),
      signalType,
      entryPrice: String(entry),
      stopLoss: String(sl),
      target1: String(t1),
      target2: target2 != null && String(target2).trim() !== "" ? String(target2) : null,
      riskReward: calcRR(entry, sl, t1),
      iv: typeof iv === "string" && iv.trim() ? iv.trim() : null,
      pcr: typeof pcr === "string" && pcr.trim() ? pcr.trim() : null,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      isPremium: isPremium === true || isPremium === "true",
      status: "active",
      createdBy: "admin",
    }).returning();
    res.status(201).json({ signal });
  } catch (err) {
    req.log.error({ err }, "Failed to create signal");
    res.status(500).json({ error: "Failed to create signal" });
  }
});

router.patch("/trademaster/signals/:id", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const body = req.body as Record<string, unknown>;
    const update: SignalUpdatePayload = {};
    if ("status" in body) { if (!isValidStatus(body.status)) { res.status(400).json({ error: "Invalid status" }); return; } update.status = body.status; }
    if ("signalType" in body) { if (!isValidSignalType(body.signalType)) { res.status(400).json({ error: "Invalid signalType" }); return; } update.signalType = body.signalType; }
    if ("assetName" in body && typeof body.assetName === "string") update.assetName = body.assetName.trim();
    if ("iv" in body) update.iv = typeof body.iv === "string" && body.iv.trim() ? body.iv.trim() : null;
    if ("pcr" in body) update.pcr = typeof body.pcr === "string" && body.pcr.trim() ? body.pcr.trim() : null;
    if ("notes" in body) update.notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
    if ("isPremium" in body) update.isPremium = body.isPremium === true || body.isPremium === "true";
    let entry: number | undefined, sl: number | undefined, t1: number | undefined;
    if ("entryPrice" in body) { entry = parseFloat(String(body.entryPrice)); if (isNaN(entry)) { res.status(400).json({ error: "Invalid entryPrice" }); return; } update.entryPrice = String(entry); }
    if ("stopLoss" in body) { sl = parseFloat(String(body.stopLoss)); if (isNaN(sl)) { res.status(400).json({ error: "Invalid stopLoss" }); return; } update.stopLoss = String(sl); }
    if ("target1" in body) { t1 = parseFloat(String(body.target1)); if (isNaN(t1)) { res.status(400).json({ error: "Invalid target1" }); return; } update.target1 = String(t1); }
    if ("target2" in body) update.target2 = body.target2 != null && String(body.target2).trim() !== "" ? String(body.target2) : null;
    if (entry !== undefined && sl !== undefined && t1 !== undefined) update.riskReward = calcRR(entry, sl, t1);
    const [signal] = await db.update(tradeMasterSignals).set(update).where(eq(tradeMasterSignals.id, id)).returning();
    if (!signal) { res.status(404).json({ error: "Signal not found" }); return; }
    res.json({ signal });
  } catch (err) {
    req.log.error({ err }, "Failed to update signal");
    res.status(500).json({ error: "Failed to update signal" });
  }
});

router.delete("/trademaster/signals/:id", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [deleted] = await db.delete(tradeMasterSignals).where(eq(tradeMasterSignals.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Signal not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete signal");
    res.status(500).json({ error: "Failed to delete signal" });
  }
});

type YahooMeta = {
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketOpen?: number;
  previousClose?: number;
  chartPreviousClose?: number;
  regularMarketChange?: number;
  longName?: string;
  shortName?: string;
};
type YahooChartResponse = { chart?: { result?: { meta?: YahooMeta }[] } };

const quoteCache = new Map<string, { data: unknown; expiry: number }>();

function extractFnOUnderlying(upper: string): string {
  if (/^(BANKNIFTY|BANK\s*NIFTY)/.test(upper)) return "^NSEBANK";
  if (/^(FINNIFTY|FIN\s*NIFTY|NIFTY\s*FIN)/.test(upper)) return "^NSEMDCP50";
  if (/^(MIDCAPNIFTY|MIDCAP\s*NIFTY)/.test(upper)) return "^NSEMDCP50";
  if (/^NIFTY/.test(upper)) return "^NSEI";
  if (/^SENSEX/.test(upper)) return "^BSESN";
  const match = upper.match(/^([A-Z&]+)/);
  return match ? `${match[1]}.NS` : "^NSEI";
}

function toYahooSymbol(assetName: string, segment: string): string {
  const upper = assetName.toUpperCase().trim();
  const INDEX_MAP: Record<string, string> = {
    "NIFTY 50": "^NSEI", "NIFTY50": "^NSEI", "NIFTY": "^NSEI",
    "BANKNIFTY": "^NSEBANK", "BANK NIFTY": "^NSEBANK", "BANK NIFTY 50": "^NSEBANK",
    "FINNIFTY": "^NSEMDCP50", "FIN NIFTY": "^NSEMDCP50", "NIFTY FIN SERVICE": "^NSEMDCP50",
    "MIDCAPNIFTY": "^NSEMDCP50", "MIDCAP NIFTY": "^NSEMDCP50",
    "SENSEX": "^BSESN",
    "USDINR": "USDINR=X", "USD/INR": "USDINR=X", "USD INR": "USDINR=X",
    "EURINR": "EURINR=X", "EUR/INR": "EURINR=X",
    "GBPINR": "GBPINR=X", "GBP/INR": "GBPINR=X",
    "GOLD": "GC=F", "MCX GOLD": "GC=F", "GOLD MINI": "GC=F",
    "SILVER": "SI=F", "MCX SILVER": "SI=F",
    "CRUDEOIL": "CL=F", "CRUDE OIL": "CL=F", "MCX CRUDE": "CL=F", "CRUDE": "CL=F",
    "NATURAL GAS": "NG=F", "NATURALGAS": "NG=F", "NG": "NG=F",
    "COPPER": "HG=F",
  };
  if (INDEX_MAP[upper]) return INDEX_MAP[upper];
  // F&O: resolve to underlying index / stock — don't try to look up the contract
  if (segment === "options" || segment === "futures" || segment === "fno") {
    return extractFnOUnderlying(upper);
  }
  if (segment === "commodity") {
    if (upper.includes("GOLD")) return "GC=F";
    if (upper.includes("SILVER")) return "SI=F";
    if (upper.includes("CRUDE") || upper.includes("OIL")) return "CL=F";
    if (upper.includes("NATURAL") || upper.includes("GAS")) return "NG=F";
    if (upper.includes("COPPER")) return "HG=F";
  }
  if (segment === "currency") {
    if (upper.includes("USD")) return "USDINR=X";
    if (upper.includes("EUR")) return "EURINR=X";
    if (upper.includes("GBP")) return "GBPINR=X";
  }
  // Equity: strip expiry/option suffixes cleanly
  const stripped = upper
    .replace(/\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*\d{2,4}.*$/i, "")
    .replace(/\s+(FUT|CE|PE)$/, "")
    .replace(/\s+\d+$/, "")
    .trim();
  return `${stripped.replace(/\s+/g, "")}.NS`;
}

router.get("/trademaster/quote", async (req: Request, res: Response): Promise<void> => {
  try {
    const { symbol, assetName, segment } = req.query as { symbol?: string; assetName?: string; segment?: string };
    const sym = symbol
      ? symbol.trim()
      : assetName
        ? toYahooSymbol(assetName, segment ?? "equity")
        : null;
    if (!sym) { res.status(400).json({ error: "symbol or assetName required" }); return; }
    const symbols = sym.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10);
    const now = Date.now();
    const results: Record<string, unknown> = {};
    await Promise.all(
      symbols.map(async (s) => {
        const cached = quoteCache.get(s);
        if (cached && cached.expiry > now) { results[s] = cached.data; return; }
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?interval=1d&range=1d&includePrePost=false`;
          const resp = await fetch(url, {
            signal: AbortSignal.timeout(6000),
            headers: { "User-Agent": "Mozilla/5.0 (compatible; TradeMaster/1.0)" },
          });
          if (!resp.ok) { results[s] = null; return; }
          const json = await resp.json() as YahooChartResponse;
          const meta = json?.chart?.result?.[0]?.meta;
          if (!meta || !meta.regularMarketPrice) { results[s] = null; return; }
          const price = meta.regularMarketPrice;
          const prev = meta.previousClose ?? meta.chartPreviousClose ?? null;
          const change = meta.regularMarketChange ?? (prev != null ? price - prev : null);
          const changePercent = meta.regularMarketChangePercent ?? (prev != null && prev > 0 ? ((price - prev) / prev) * 100 : null);
          const q = {
            symbol: s, name: meta.longName ?? meta.shortName ?? s,
            price, change, changePercent,
            high: meta.regularMarketDayHigh ?? null,
            low: meta.regularMarketDayLow ?? null,
            open: meta.regularMarketOpen ?? null,
            prevClose: prev,
          };
          quoteCache.set(s, { data: q, expiry: now + 30_000 });
          results[s] = q;
        } catch { results[s] = null; }
      }),
    );
    res.json({ quotes: results });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch quote");
    res.status(500).json({ error: "Failed to fetch quote" });
  }
});

const TICKER_CACHE: { data: TickerResults | null; ts: number } = { data: null, ts: 0 };
const TICKER_TTL = 60 * 1000; // 1 minute

// ─── FMP Live Feed ───────────────────────────────────────────────────────────
// Financial Modeling Prep free-tier: US stocks only on stable/quote.
// We fetch AAPL as a proxy heartbeat: when FMP returns a valid price, the live
// data feed is confirmed active → we force marketState = "OPEN" on the ticker.
type FmpQuote = { symbol: string; price: number; name: string; change: number; changePercentage: number; volume: number; dayHigh: number; dayLow: number };

const FMP_FEED: { price: number | null; name: string | null; ts: number } = { price: null, name: null, ts: 0 };

async function fetchFmpLiveFeed(): Promise<{ price: number | null; name: string | null }> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return { price: null, name: null };
  try {
    const url = `https://financialmodelingprep.com/stable/quote?symbol=AAPL&apikey=${apiKey}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return { price: null, name: null };
    const json = await r.json() as FmpQuote[];
    const q = Array.isArray(json) && json.length > 0 ? json[0] : null;
    if (q && typeof q.price === "number" && q.price > 0) {
      FMP_FEED.price = q.price;
      FMP_FEED.name = q.name ?? "Apple Inc.";
      FMP_FEED.ts = Date.now();
      return { price: q.price, name: q.name };
    }
    return { price: null, name: null };
  } catch {
    return { price: null, name: null };
  }
}

// Start 60-second live-feed logger on server load
(function startFmpLiveFeedLogger() {
  async function tick() {
    const { price, name } = await fetchFmpLiveFeed();
    const niftyPrice = TICKER_CACHE.data?.nifty?.price;
    const niftyStr = niftyPrice != null ? `Nifty 50: ₹${niftyPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "Nifty 50: N/A";
    if (price != null) {
      logger.info(`Live Feed Active: ${name ?? "AAPL"} $${price.toFixed(2)} (FMP) | ${niftyStr} (Yahoo)`);
    } else {
      logger.info(`Live Feed: FMP unavailable | ${niftyStr} (Yahoo)`);
    }
  }
  // Delay first tick slightly so server is fully up
  setTimeout(() => {
    tick();
    setInterval(tick, 60_000);
  }, 5000);
})();

async function fetchYahooTicker(yahooSymbol: string, name: string): Promise<TickerQuote> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2d`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(7000) });
    if (!r.ok) return { name, price: null, change: null, changePercent: null, high: null, low: null, marketState: null };
    const json = await r.json() as Record<string, unknown>;
    const res0 = ((json as Record<string, Record<string, unknown[]>>)?.chart?.result)?.[0] as Record<string, unknown> | undefined;
    if (!res0) return { name, price: null, change: null, changePercent: null, high: null, low: null, marketState: null };
    const meta = res0.meta as Record<string, number | string | Record<string, Record<string, number>>>;
    // Derive marketState from currentTradingPeriod timestamps (NSE indices don't expose marketState directly)
    const tradingPeriod = meta.currentTradingPeriod as Record<string, Record<string, number>> | undefined;
    const nowSec = Math.floor(Date.now() / 1000);
    const regStart = tradingPeriod?.regular?.start ?? 0;
    const regEnd = tradingPeriod?.regular?.end ?? 0;
    const marketState: string = (meta.marketState as string) ??
      (regStart > 0 && regEnd > 0 ? (nowSec >= regStart && nowSec <= regEnd ? "REGULAR" : "CLOSED") : "CLOSED");
    // regularMarketPrice works during and after hours; chartPreviousClose gives yesterday's close for change calc
    const price = (meta.regularMarketPrice as number) ?? null;
    const prevClose = ((meta.chartPreviousClose ?? meta.previousClose) as number) ?? null;
    const change = price != null && prevClose != null ? price - prevClose : ((meta.regularMarketChange as number) ?? null);
    const changePercent = price != null && prevClose != null && prevClose > 0
      ? ((price - prevClose) / prevClose) * 100
      : ((meta.regularMarketChangePercent as number) ?? null);
    const high = (meta.regularMarketDayHigh as number) ?? null;
    const low = (meta.regularMarketDayLow as number) ?? null;
    return {
      name,
      price: price != null ? parseFloat(price.toFixed(2)) : null,
      change: change != null ? parseFloat((change as number).toFixed(2)) : null,
      changePercent: changePercent != null ? parseFloat((changePercent as number).toFixed(3)) : null,
      high: high != null ? parseFloat(high.toFixed(2)) : null,
      low: low != null ? parseFloat(low.toFixed(2)) : null,
      marketState,
    };
  } catch {
    return { name, price: null, change: null, changePercent: null, high: null, low: null, marketState: null };
  }
}

router.get("/trademaster/ticker", async (req: Request, res: Response): Promise<void> => {
  try {
    // Serve from cache if fresh
    if (TICKER_CACHE.data && Date.now() - TICKER_CACHE.ts < TICKER_TTL) {
      res.json({ ticker: TICKER_CACHE.data, fmpFeed: { price: FMP_FEED.price, name: FMP_FEED.name, ts: FMP_FEED.ts } });
      return;
    }
    // Fetch Yahoo ticker data + FMP feed check in parallel
    const [nifty, banknifty, fmpFeed] = await Promise.all([
      fetchYahooTicker("^NSEI", "Nifty 50"),
      fetchYahooTicker("^NSEBANK", "Bank Nifty"),
      fetchFmpLiveFeed(),
    ]);
    // When FMP returns a valid price, the live data feed is confirmed active.
    // Force marketState = "OPEN" so the scanner and tips engine can trigger.
    const fmpActive = fmpFeed.price != null && fmpFeed.price > 0;
    if (fmpActive) {
      if (nifty.marketState !== "REGULAR") nifty.marketState = "OPEN";
      if (banknifty.marketState !== "REGULAR") banknifty.marketState = "OPEN";
    }
    const results: TickerResults = { nifty, banknifty };
    TICKER_CACHE.data = results;
    TICKER_CACHE.ts = Date.now();
    res.json({ ticker: results, fmpFeed: { price: fmpFeed.price, name: fmpFeed.name, ts: FMP_FEED.ts } });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch ticker");
    res.status(500).json({ error: "Failed to fetch ticker" });
  }
});

router.post("/trademaster/telegram", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const { message } = req.body as { message?: unknown };
    if (typeof message !== "string" || !message.trim()) { res.status(400).json({ error: "Message is required" }); return; }
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    if (!botToken || !channelId) { res.status(500).json({ error: "Telegram not configured." }); return; }
    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: channelId, text: message.trim(), parse_mode: "HTML" }),
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) { res.status(500).json({ error: "Failed to send to Telegram" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to send Telegram message");
    res.status(500).json({ error: "Failed to send Telegram message" });
  }
});

router.post("/trademaster/payment/order", async (req: Request, res: Response): Promise<void> => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) { res.status(500).json({ error: "Payment gateway not configured" }); return; }
    const Razorpay = require("razorpay");
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.create({
      amount: 250000,
      currency: "INR",
      receipt: `tm_edu_${Date.now()}`,
      notes: { product: "TradeMaster Pro — Pro Educator Plan (90 days)" },
    });
    res.json({ orderId: order.id as string, amount: order.amount as number, currency: order.currency as string, keyId });
  } catch (err) {
    req.log.error({ err }, "Failed to create Razorpay order");
    res.status(500).json({ error: "Failed to initiate payment" });
  }
});

router.post("/trademaster/payment/verify", async (req: Request, res: Response): Promise<void> => {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) { res.status(500).json({ error: "Payment gateway not configured" }); return; }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email } = req.body as Record<string, unknown>;
    if (typeof razorpay_order_id !== "string" || typeof razorpay_payment_id !== "string" || typeof razorpay_signature !== "string") {
      res.status(400).json({ error: "Missing payment verification fields" }); return;
    }
    const keyId = process.env.RAZORPAY_KEY_ID ?? "";
    const isTestMode = keyId.startsWith("rzp_test_");
    const isSimulated = typeof razorpay_payment_id === "string" && razorpay_payment_id.startsWith("rzp_sim_");
    if (!(isTestMode && isSimulated)) {
      const expectedSignature = createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
      if (expectedSignature !== razorpay_signature) {
        res.status(400).json({ error: "Payment verification failed — invalid signature" }); return;
      }
    }
    const sessionId = `rzp_${razorpay_payment_id}`;
    await db.insert(tradeMasterSubscriptions).values({
      sessionId,
      email: typeof email === "string" && email.trim() ? email.trim() : null,
      stripeCustomerId: null,
      stripeSubscriptionId: razorpay_payment_id,
      plan: "professional",
      status: "active",
    }).onConflictDoNothing();
    res.json({ success: true, sessionId });
  } catch (err) {
    req.log.error({ err }, "Failed to verify Razorpay payment");
    res.status(500).json({ error: "Payment verification failed" });
  }
});

router.get("/trademaster/subscription/check", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.query as { sessionId?: string };
    if (!sessionId || typeof sessionId !== "string") { res.json({ isPremium: false }); return; }
    const [sub] = await db.select().from(tradeMasterSubscriptions)
      .where(and(eq(tradeMasterSubscriptions.sessionId, sessionId), eq(tradeMasterSubscriptions.status, "active")));
    if (!sub) { res.json({ isPremium: false, subscription: null }); return; }
    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
    const isExpired = Date.now() - new Date(sub.createdAt).getTime() > NINETY_DAYS_MS;
    if (isExpired) {
      await db.update(tradeMasterSubscriptions).set({ status: "expired" }).where(eq(tradeMasterSubscriptions.id, sub.id));
      res.json({ isPremium: false, subscription: null }); return;
    }
    res.json({ isPremium: true, subscription: sub });
  } catch (err) {
    req.log.error({ err }, "Failed to check subscription");
    res.json({ isPremium: false, subscription: null });
  }
});

router.post("/trademaster/consent", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.body as { sessionId?: unknown };
    if (typeof sessionId !== "string" || !sessionId.trim()) {
      res.status(400).json({ error: "sessionId required" }); return;
    }
    const sid = sessionId.trim();
    await db.insert(tradeMasterConsent)
      .values({ sessionId: sid })
      .onConflictDoNothing();
    res.json({ success: true, sessionId: sid });
  } catch (err) {
    req.log.error({ err }, "Failed to persist consent");
    res.status(500).json({ error: "Failed to persist consent" });
  }
});

router.get("/trademaster/consent/check", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.query as { sessionId?: string };
    if (!sessionId || typeof sessionId !== "string") {
      res.json({ hasConsented: false }); return;
    }
    const [record] = await db.select().from(tradeMasterConsent)
      .where(eq(tradeMasterConsent.sessionId, sessionId));
    res.json({ hasConsented: !!record, acceptedAt: record?.acceptedAt ?? null });
  } catch (err) {
    req.log.error({ err }, "Failed to check consent");
    res.json({ hasConsented: false });
  }
});

router.get("/trademaster/subscriptions", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const subscriptions = await db.select().from(tradeMasterSubscriptions).orderBy(desc(tradeMasterSubscriptions.createdAt));
    res.json({ subscriptions, total: subscriptions.length });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch subscriptions");
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});

router.patch("/trademaster/subscriptions/:id", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { status } = req.body as { status?: unknown };
    if (typeof status !== "string" || !["active", "cancelled", "expired"].includes(status)) {
      res.status(400).json({ error: "status must be active, cancelled, or expired" }); return;
    }
    const [sub] = await db.update(tradeMasterSubscriptions).set({ status }).where(eq(tradeMasterSubscriptions.id, id)).returning();
    if (!sub) { res.status(404).json({ error: "Subscription not found" }); return; }
    res.json({ subscription: sub });
  } catch (err) {
    req.log.error({ err }, "Failed to update subscription");
    res.status(500).json({ error: "Failed to update subscription" });
  }
});

const VALID_REPORT_CATEGORIES = ["large_cap_equity", "etf", "mutual_fund", "government_bond", "gold_silver", "reit", "fixed_deposit"] as const;
type ValidReportCategory = typeof VALID_REPORT_CATEGORIES[number];

function isValidReportCategory(s: unknown): s is ValidReportCategory {
  return typeof s === "string" && (VALID_REPORT_CATEGORIES as readonly string[]).includes(s);
}

const INVESTMENT_SEED_DATA = [
  { category: "large_cap_equity" as ValidReportCategory, instrumentName: "Reliance Industries Ltd", instrumentCode: "RELIANCE", analystRating: "strong_buy" as const, riskLevel: "medium" as const, suggestedAllocationPct: 8, recommendedHorizon: "3–5 years", rationale: "Diversified conglomerate with dominant positions in telecom (Jio), retail, and petrochemicals. Strong cash generation and aggressive expansion into green energy. Promoter-backed buyback programs and low debt make this a core large-cap holding." },
  { category: "large_cap_equity" as ValidReportCategory, instrumentName: "HDFC Bank Ltd", instrumentCode: "HDFCBANK", analystRating: "buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 7, recommendedHorizon: "2–4 years", rationale: "India's largest private sector bank with best-in-class asset quality, CASA ratio above 43%, and conservative credit risk management. Post-merger integration with HDFC Ltd nearing completion — expect re-rating as margins stabilize." },
  { category: "large_cap_equity" as ValidReportCategory, instrumentName: "Infosys Ltd", instrumentCode: "INFY", analystRating: "buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 6, recommendedHorizon: "2–3 years", rationale: "Tier-1 IT services with strong deal wins in AI/cloud transformation. Free cash flow yield of ~5%, consistent dividend payouts, and improving revenue visibility. FY25 guidance revision risk is priced in at current valuations." },
  { category: "large_cap_equity" as ValidReportCategory, instrumentName: "Tata Consultancy Services", instrumentCode: "TCS", analystRating: "hold" as const, riskLevel: "low" as const, suggestedAllocationPct: 5, recommendedHorizon: "3+ years", rationale: "India's largest IT bellwether with a fortress balance sheet and premium client relationships. Near-term growth tempered by global discretionary IT spend slowdown, but long-cycle mega-deals provide earnings floor. Hold for quality premium." },
  { category: "large_cap_equity" as ValidReportCategory, instrumentName: "Larsen & Toubro Ltd", instrumentCode: "LT", analystRating: "strong_buy" as const, riskLevel: "medium" as const, suggestedAllocationPct: 6, recommendedHorizon: "3–5 years", rationale: "India's premier infrastructure and engineering conglomerate is the primary beneficiary of the ₹11-lakh-crore capex supercycle. Record order book above ₹5 lakh crore with strong international execution. Compounding play on India's infrastructure decade." },
  { category: "etf" as ValidReportCategory, instrumentName: "Nifty 50 ETF — Nippon India", instrumentCode: "NIFTYBEES", analystRating: "strong_buy" as const, riskLevel: "medium" as const, suggestedAllocationPct: 10, recommendedHorizon: "5–10 years", rationale: "Most liquid Nifty 50 ETF on NSE with AUM above ₹20,000 crore and tracking error under 0.02%. Ideal passive core holding for long-term wealth creation. Expense ratio of 0.04% — one of the lowest in India." },
  { category: "etf" as ValidReportCategory, instrumentName: "Nifty 50 ETF — SBI", instrumentCode: "SETFNIF50", analystRating: "buy" as const, riskLevel: "medium" as const, suggestedAllocationPct: 8, recommendedHorizon: "5–10 years", rationale: "Backed by SBI Mutual Fund with strong institutional support. Excellent liquidity, tight bid-ask spreads, and consistent tracking. Good alternative or complement to NIFTYBEES for Nifty 50 core exposure." },
  { category: "etf" as ValidReportCategory, instrumentName: "Bank Nifty ETF — Mirae Asset", instrumentCode: "MAFSETF10", analystRating: "buy" as const, riskLevel: "high" as const, suggestedAllocationPct: 5, recommendedHorizon: "2–5 years", rationale: "Concentrated banking sector ETF for investors with higher risk appetite. Benefits from India's credit upcycle and financialization theme. Strong returns in bull markets — tactical allocation only, pair with fixed income for balance." },
  { category: "etf" as ValidReportCategory, instrumentName: "Nifty Next 50 ETF — UTI", instrumentCode: "UTINEXT50", analystRating: "buy" as const, riskLevel: "medium" as const, suggestedAllocationPct: 6, recommendedHorizon: "5–7 years", rationale: "Captures the next generation of Nifty 50 constituents — mid-cap leaders poised for large-cap graduation. Historically delivers alpha over pure Nifty 50 in growth cycles. Higher volatility, rewarding for patient investors." },
  { category: "etf" as ValidReportCategory, instrumentName: "Gold ETF — HDFC Gold ETF", instrumentCode: "HDFCMFGETF", analystRating: "buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 5, recommendedHorizon: "3–7 years", rationale: "Efficient gold exposure without physical storage concerns. Tracks MCX gold spot with tight spreads. Portfolio hedge against INR depreciation and equity market stress. Suitable as 5–8% strategic allocation in any portfolio." },
  { category: "mutual_fund" as ValidReportCategory, instrumentName: "HDFC Top 100 Fund — Direct Growth", instrumentCode: "HDFC100DIR", analystRating: "strong_buy" as const, riskLevel: "medium" as const, suggestedAllocationPct: 10, recommendedHorizon: "5+ years", rationale: "Consistent large-cap outperformer managed by experienced fund managers. 10-year CAGR exceeds benchmark by 2–3%. Heavy allocation to quality businesses with pricing power — HDFC Bank, ICICI Bank, Reliance, Infosys. Minimal style drift." },
  { category: "mutual_fund" as ValidReportCategory, instrumentName: "Axis Bluechip Fund — Direct Growth", instrumentCode: "AXISBCDIR", analystRating: "buy" as const, riskLevel: "medium" as const, suggestedAllocationPct: 8, recommendedHorizon: "5+ years", rationale: "Growth-oriented large-cap fund with concentrated portfolio of 25–30 high-conviction stocks. Focus on businesses with sustainable competitive advantages and clean balance sheets. Some alpha variability year-to-year but strong 5-year track record." },
  { category: "mutual_fund" as ValidReportCategory, instrumentName: "Parag Parikh Flexi Cap Fund — Direct", instrumentCode: "PPFCFD", analystRating: "strong_buy" as const, riskLevel: "medium" as const, suggestedAllocationPct: 10, recommendedHorizon: "5–10 years", rationale: "Unique flexi-cap with 25–35% global diversification (Alphabet, Meta, Amazon). Reduces India-specific risk while capturing domestic growth. Consistent top-quartile performance. Conservative expense ratio and low portfolio churn." },
  { category: "mutual_fund" as ValidReportCategory, instrumentName: "Mirae Asset Large Cap Fund — Direct", instrumentCode: "MIRAELCDIR", analystRating: "buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 8, recommendedHorizon: "4–7 years", rationale: "Disciplined large-cap fund managed with quantitative-qualitative blend. Lower volatility than category average with consistent risk-adjusted returns. Good choice for first-time equity investors seeking large-cap stability." },
  { category: "mutual_fund" as ValidReportCategory, instrumentName: "SBI Small Cap Fund — Direct Growth", instrumentCode: "SBISMCDIR", analystRating: "hold" as const, riskLevel: "high" as const, suggestedAllocationPct: 5, recommendedHorizon: "7–10 years", rationale: "India's largest small-cap fund — strong long-term track record but periodic closures due to capacity constraints. Entry timing matters in small-cap; current valuations are elevated. Hold existing positions; new entrants should use SIP route only." },
  { category: "government_bond" as ValidReportCategory, instrumentName: "Sovereign Gold Bond 2025-26 Series", instrumentCode: "SGBBOND", analystRating: "strong_buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 8, recommendedHorizon: "8 years (with 5-yr exit)", rationale: "Government of India guaranteed instrument combining gold price returns with a 2.5% p.a. fixed interest (tax-free for individuals holding to maturity). Capital gains fully exempt on maturity. Superior to physical gold — no making charges, no storage risk, government backing." },
  { category: "government_bond" as ValidReportCategory, instrumentName: "RBI 7.75% Floating Rate Savings Bond", instrumentCode: "RBIFRB", analystRating: "buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 7, recommendedHorizon: "7 years", rationale: "Guaranteed by RBI, linked to NSC rate + 35 bps, reset every 6 months. No credit risk. Ideal for retirees and conservative investors seeking predictable, inflation-adjusting income. Interest taxable but capital fully protected by sovereign guarantee." },
  { category: "government_bond" as ValidReportCategory, instrumentName: "CPSE ETF — Central PSU Bond Index", instrumentCode: "CPSEETF", analystRating: "buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 5, recommendedHorizon: "3–5 years", rationale: "Portfolio of AAA-rated central PSU bonds (ONGC, NTPC, Power Finance Corp). Better yield than government securities with near-sovereign credit quality. Good for tax-efficient bond exposure via ETF route." },
  { category: "government_bond" as ValidReportCategory, instrumentName: "Nifty G-Sec ETF — Edelweiss", instrumentCode: "GSEC10IETF", analystRating: "hold" as const, riskLevel: "low" as const, suggestedAllocationPct: 5, recommendedHorizon: "5–10 years", rationale: "Pure 10-year G-Sec exposure — high duration risk in a rising rate environment. Ideal for those with a strong view on rate cuts. Currently hold — accumulate on rate hike spikes for long-term bond gains when RBI pivots to easing." },
  { category: "government_bond" as ValidReportCategory, instrumentName: "PPF (Public Provident Fund)", instrumentCode: "PPF", analystRating: "strong_buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 10, recommendedHorizon: "15 years", rationale: "Sovereign-guaranteed EEE instrument — contributions, interest, and maturity all tax-free. Current rate of 7.1% p.a. (compounded annually). Ideal long-term wealth accumulation vehicle for every Indian investor regardless of income bracket." },
  { category: "gold_silver" as ValidReportCategory, instrumentName: "Physical Gold — 24K / 999 Fine", instrumentCode: "GOLD999", analystRating: "buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 5, recommendedHorizon: "5–10 years", rationale: "Timeless hedge against inflation, currency debasement, and geopolitical uncertainty. Central bank gold accumulation globally supports prices. Recommended 5–10% portfolio allocation in physical hallmarked gold coins or bars via reputed institutions." },
  { category: "gold_silver" as ValidReportCategory, instrumentName: "Gold ETF — Kotak Gold ETF", instrumentCode: "KOTAKGOLD", analystRating: "strong_buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 6, recommendedHorizon: "3–7 years", rationale: "Best-in-class tracking accuracy with competitive expense ratio. Backed by allocated physical gold stored with SEBI-designated custodians. Global gold at all-time highs driven by DXY weakness and Fed rate cut expectations. Strong buy at current levels." },
  { category: "gold_silver" as ValidReportCategory, instrumentName: "Silver ETF — Mirae Asset Silver ETF", instrumentCode: "SILVERETF", analystRating: "buy" as const, riskLevel: "high" as const, suggestedAllocationPct: 3, recommendedHorizon: "2–5 years", rationale: "Silver dual demand from industrial (solar panels, EVs, electronics) and investment. Gold-Silver ratio at historically elevated levels — silver historically outperforms in late-cycle gold rallies. Tactical 3–5% allocation for higher-risk, higher-reward precious metals exposure." },
  { category: "gold_silver" as ValidReportCategory, instrumentName: "Digital Gold — MMTC-PAMP", instrumentCode: "DIGIGOLD", analystRating: "buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 3, recommendedHorizon: "1–5 years", rationale: "MMTC-PAMP certified 99.9% pure gold in digital format — start from ₹1. Easy SIP, instant liquidity, and delivery option. Good for young investors building gold positions incrementally. No demat account required." },
  { category: "gold_silver" as ValidReportCategory, instrumentName: "Multi-Asset Fund with Gold — ICICI Pru", instrumentCode: "ICICIMAF", analystRating: "buy" as const, riskLevel: "medium" as const, suggestedAllocationPct: 5, recommendedHorizon: "3–5 years", rationale: "Automatically rebalances across equity, debt, and gold — reduces behavioral bias. Beneficial for one-fund-portfolio investors. ICICI Pru Multi-Asset consistently beats category average due to superior tactical allocation." },
  { category: "reit" as ValidReportCategory, instrumentName: "Embassy Office Parks REIT", instrumentCode: "EMBASSYREIT", analystRating: "strong_buy" as const, riskLevel: "medium" as const, suggestedAllocationPct: 5, recommendedHorizon: "3–7 years", rationale: "India's largest listed REIT by area — 45 million sq ft of Grade-A office parks leased to MNCs including Google, JP Morgan, and IBM. Consistent 6–7% distribution yield with built-in escalation clauses. Beneficiary of India's global capability centre (GCC) boom." },
  { category: "reit" as ValidReportCategory, instrumentName: "Mindspace Business Parks REIT", instrumentCode: "MINDREIT", analystRating: "buy" as const, riskLevel: "medium" as const, suggestedAllocationPct: 4, recommendedHorizon: "3–5 years", rationale: "Mumbai-centric premium office REIT with high occupancy in tech-driven Bandra-Kurla Complex and Pune IT corridors. Tenant profile skewed towards technology and BFSI sectors. Competitive 6% distribution yield with 3-year track record of consistent payouts." },
  { category: "reit" as ValidReportCategory, instrumentName: "Brookfield India REIT", instrumentCode: "BIRET", analystRating: "buy" as const, riskLevel: "medium" as const, suggestedAllocationPct: 3, recommendedHorizon: "3–5 years", rationale: "Backed by global alternative asset manager Brookfield with 18 million sq ft in Mumbai, NCR, Kolkata, and Pune. Development pipeline of 7 million sq ft provides future growth upside. Well-structured leases with escalation — suitable for income-focused investors." },
  { category: "reit" as ValidReportCategory, instrumentName: "Nexus Select Trust (Retail REIT)", instrumentCode: "NEXUSREIT", analystRating: "hold" as const, riskLevel: "medium" as const, suggestedAllocationPct: 3, recommendedHorizon: "3–5 years", rationale: "India's first listed retail REIT — portfolio of 17 premium malls across Tier-1 cities. Consumer spending recovery supports retail demand. Yields lower than office REITs (~5.5%) but offers diversification with retail-linked upside." },
  { category: "reit" as ValidReportCategory, instrumentName: "InvIT — IRB Infrastructure Trust", instrumentCode: "IRBINVIT", analystRating: "buy" as const, riskLevel: "medium" as const, suggestedAllocationPct: 3, recommendedHorizon: "5–8 years", rationale: "Infrastructure Investment Trust with toll-road assets providing inflation-linked, government-backed cash flows. 8–9% distribution yield — among the highest in listed yield instruments. Suitable for income investors with 5+ year horizon." },
  { category: "fixed_deposit" as ValidReportCategory, instrumentName: "SBI Fixed Deposit — 1-3 Year", instrumentCode: "SBIFDR", analystRating: "buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 10, recommendedHorizon: "1–3 years", rationale: "State Bank of India offers 6.80–7.00% p.a. for 1–3 year tenure for regular citizens (7.30–7.50% for senior citizens). Zero credit risk — deposits up to ₹5 lakh guaranteed by DICGC. Ideal parking for short-term funds and emergency corpus." },
  { category: "fixed_deposit" as ValidReportCategory, instrumentName: "HDFC Bank Fixed Deposit — Senior Citizen", instrumentCode: "HDFCFDSR", analystRating: "strong_buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 12, recommendedHorizon: "1–2 years", rationale: "HDFC Bank offers 7.75% p.a. for senior citizens on 1–2 year deposits — one of the best risk-free returns available. DICGC insured up to ₹5 lakh. Auto-renewal option available. Strongly recommended for retired investors as core income instrument." },
  { category: "fixed_deposit" as ValidReportCategory, instrumentName: "Corporate FD — Bajaj Finance AAA", instrumentCode: "BAJAJFD", analystRating: "buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 5, recommendedHorizon: "2–3 years", rationale: "AAA-rated corporate FD offering 8.05–8.35% p.a. — premium over bank FDs with manageable credit risk. Bajaj Finance is one of India's most financially sound NBFCs with consistent triple-A ratings from ICRA and CRISIL. Suitable for investors comfortable with NBFC exposure." },
  { category: "fixed_deposit" as ValidReportCategory, instrumentName: "Small Finance Bank FD — ESAF / AU", instrumentCode: "AUSFBFD", analystRating: "hold" as const, riskLevel: "medium" as const, suggestedAllocationPct: 3, recommendedHorizon: "1 year", rationale: "Small finance banks offer 8.50–9.00% p.a. for 1-year FDs — significantly above large banks. DICGC insured up to ₹5 lakh. Higher yield comes with slightly elevated operational risk vs PSU banks. Limit to ₹5 lakh per bank for full insurance cover. Hold/accumulate tactically." },
  { category: "fixed_deposit" as ValidReportCategory, instrumentName: "Post Office Time Deposit — 5 Year", instrumentCode: "POTD5Y", analystRating: "strong_buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 8, recommendedHorizon: "5 years", rationale: "Government of India backed 5-year time deposit offering 7.5% p.a. with 80C tax deduction benefit — effective post-tax yield exceeds 9% for highest tax bracket. Absolute sovereign guarantee — zero default risk. Ideal for conservative investors in 30% tax bracket maximizing 80C." },
];

router.get("/trademaster/reports", async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.query as { category?: string };
    const accessLevel = resolveAccessLevel(req);
    const isPremium = accessLevel === "admin" || await isSessionPremium(accessLevel ?? undefined);

    let rows = await db.select().from(tradeMasterInvestmentReports)
      .where(eq(tradeMasterInvestmentReports.isActive, true))
      .orderBy(tradeMasterInvestmentReports.category, tradeMasterInvestmentReports.id);

    if (category && isValidReportCategory(category)) {
      rows = rows.filter((r) => r.category === category);
    }

    if (!isPremium) {
      const summary = rows.map((r) => ({
        id: r.id,
        category: r.category,
        instrumentName: r.instrumentName,
        instrumentCode: r.instrumentCode,
        analystRating: r.analystRating,
        riskLevel: r.riskLevel,
        recommendedHorizon: r.recommendedHorizon,
        rationale: null,
        suggestedAllocationPct: null,
      }));
      res.json({ reports: summary, isPremium: false });
      return;
    }

    res.json({ reports: rows, isPremium: true });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch investment reports");
    res.status(500).json({ error: "Failed to fetch investment reports" });
  }
});

router.post("/trademaster/reports/seed", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const existing = await db.select({ id: tradeMasterInvestmentReports.id }).from(tradeMasterInvestmentReports).limit(1);
    if (existing.length > 0) {
      res.json({ message: "Reports already seeded", count: existing.length });
      return;
    }
    await db.insert(tradeMasterInvestmentReports).values(INVESTMENT_SEED_DATA);
    res.json({ message: "Seeded investment reports", count: INVESTMENT_SEED_DATA.length });
  } catch (err) {
    req.log.error({ err }, "Failed to seed investment reports");
    res.status(500).json({ error: "Failed to seed reports" });
  }
});

router.get("/trademaster/performance", async (req: Request, res: Response): Promise<void> => {
  try {
    const { segment, from, to } = req.query as { segment?: string; from?: string; to?: string };
    const accessLevel = resolveAccessLevel(req);
    const isPremium = accessLevel === "admin" || await isSessionPremium(accessLevel ?? undefined);

    let rows = await db.select().from(tradeMasterSignals).orderBy(desc(tradeMasterSignals.createdAt));

    if (segment && isValidSegment(segment)) {
      rows = rows.filter((r) => r.segment === segment);
    }
    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) rows = rows.filter((r) => new Date(r.createdAt) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) rows = rows.filter((r) => new Date(r.createdAt) <= toDate);
    }

    const total = rows.length;
    const targetHit = rows.filter((r) => r.status === "target_hit").length;
    const slHit = rows.filter((r) => r.status === "sl_hit").length;
    const open = rows.filter((r) => r.status === "active").length;
    const closed = total - open;
    const successRate = closed > 0 ? ((targetHit / closed) * 100).toFixed(1) : "0";
    const rrValues = rows.filter((r) => r.riskReward != null).map((r) => parseFloat(r.riskReward!));
    const avgRR = rrValues.length > 0 ? (rrValues.reduce((a, b) => a + b, 0) / rrValues.length).toFixed(2) : null;

    const limitedRows = isPremium ? rows : rows.slice(0, 10);
    const signals = limitedRows.map((s) => (s.isPremium && !isPremium ? redactPremiumSignal(s) : s));

    res.json({
      stats: { total, targetHit, slHit, open, successRate, avgRR },
      signals,
      isPremium,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch performance data");
    res.status(500).json({ error: "Failed to fetch performance data" });
  }
});


router.get("/trademaster/journal", async (req: Request, res: Response): Promise<void> => {
  try {
    const { session_id } = req.query;
    if (!session_id || typeof session_id !== "string") { res.status(400).json({ error: "session_id required" }); return; }
    const trades = await db.select().from(tradeMasterJournal).where(eq(tradeMasterJournal.sessionId, session_id)).orderBy(desc(tradeMasterJournal.entryDate));
    res.json({ trades });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch journal");
    res.status(500).json({ error: "Failed to fetch journal" });
  }
});

router.post("/trademaster/journal", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, assetName, assetType, direction, entryPrice, exitPrice, quantity, strategyUsed, notes, entryDate, exitDate } = req.body as Record<string, unknown>;
    if (!sessionId || !assetName || !entryPrice || !quantity) { res.status(400).json({ error: "sessionId, assetName, entryPrice, quantity required" }); return; }
    const ep = parseFloat(entryPrice as string);
    const xp = exitPrice ? parseFloat(exitPrice as string) : null;
    const qty = parseInt(quantity as string, 10);
    let pnl: number | null = null;
    let outcome: "open" | "win" | "loss" | "breakeven" = "open";
    if (xp !== null) {
      pnl = direction === "short" ? (ep - xp) * qty : (xp - ep) * qty;
      outcome = Math.abs(pnl) < 0.01 ? "breakeven" : pnl > 0 ? "win" : "loss";
    }
    const [trade] = await db.insert(tradeMasterJournal).values({
      sessionId: sessionId as string,
      assetName: assetName as string,
      assetType: (assetType as string) || "equity",
      direction: ((direction as string) || "long") as "long" | "short",
      entryPrice: ep.toString(),
      exitPrice: xp !== null ? xp.toString() : null,
      quantity: qty,
      strategyUsed: (strategyUsed as string) || null,
      notes: (notes as string) || null,
      entryDate: entryDate ? new Date(entryDate as string) : new Date(),
      exitDate: exitDate ? new Date(exitDate as string) : null,
      outcome,
      pnl: pnl !== null ? pnl.toFixed(2) : null,
    }).returning();
    res.json({ trade });
  } catch (err) {
    req.log.error({ err }, "Failed to add trade");
    res.status(500).json({ error: "Failed to add trade" });
  }
});

router.put("/trademaster/journal/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { exitPrice, exitDate, notes, strategyUsed } = req.body as Record<string, unknown>;
    const existing = await db.select().from(tradeMasterJournal).where(eq(tradeMasterJournal.id, id)).then(r => r[0]);
    if (!existing) { res.status(404).json({ error: "Trade not found" }); return; }
    const xp = exitPrice ? parseFloat(exitPrice as string) : null;
    const ep = parseFloat(existing.entryPrice);
    const qty = existing.quantity;
    let pnl = existing.pnl;
    let outcome = existing.outcome;
    if (xp !== null) {
      const rawPnl = existing.direction === "short" ? (ep - xp) * qty : (xp - ep) * qty;
      pnl = rawPnl.toFixed(2);
      outcome = Math.abs(rawPnl) < 0.01 ? "breakeven" : rawPnl > 0 ? "win" : "loss";
    }
    const [updated] = await db.update(tradeMasterJournal).set({
      exitPrice: xp !== null ? xp.toString() : existing.exitPrice,
      exitDate: exitDate ? new Date(exitDate as string) : existing.exitDate,
      notes: notes !== undefined ? (notes as string) : existing.notes,
      strategyUsed: strategyUsed !== undefined ? (strategyUsed as string) : existing.strategyUsed,
      outcome,
      pnl,
    }).where(eq(tradeMasterJournal.id, id)).returning();
    res.json({ trade: updated });
  } catch (err) {
    req.log.error({ err }, "Failed to update trade");
    res.status(500).json({ error: "Failed to update trade" });
  }
});

router.delete("/trademaster/journal/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(tradeMasterJournal).where(eq(tradeMasterJournal.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete trade");
    res.status(500).json({ error: "Failed to delete trade" });
  }
});

router.get("/trademaster/journal/analytics", async (req: Request, res: Response): Promise<void> => {
  try {
    const { session_id } = req.query;
    if (!session_id || typeof session_id !== "string") { res.status(400).json({ error: "session_id required" }); return; }
    const trades = await db.select().from(tradeMasterJournal).where(eq(tradeMasterJournal.sessionId, session_id)).orderBy(tradeMasterJournal.entryDate);
    const closed = trades.filter(t => t.outcome !== "open");
    const wins = closed.filter(t => t.outcome === "win");
    const losses = closed.filter(t => t.outcome === "loss");
    const totalPnl = closed.reduce((s, t) => s + parseFloat(t.pnl ?? "0"), 0);
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + parseFloat(t.pnl ?? "0"), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + parseFloat(t.pnl ?? "0"), 0) / losses.length) : 0;
    const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
    const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const dayPnl: Record<string, number> = {};
    closed.forEach(t => { const d = DAYS[new Date(t.entryDate).getDay()]; dayPnl[d] = (dayPnl[d] ?? 0) + parseFloat(t.pnl ?? "0"); });
    const bestDay = Object.entries(dayPnl).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const pnlCurve = closed.map((t, i) => ({ index: i + 1, pnl: parseFloat(t.pnl ?? "0"), cumulative: closed.slice(0, i + 1).reduce((s, x) => s + parseFloat(x.pnl ?? "0"), 0), asset: t.assetName, date: t.entryDate }));
    const strategyBreakdown: Record<string, { count: number; pnl: number; wins: number }> = {};
    closed.forEach(t => { const s = t.strategyUsed || "Untagged"; if (!strategyBreakdown[s]) strategyBreakdown[s] = { count: 0, pnl: 0, wins: 0 }; strategyBreakdown[s].count++; strategyBreakdown[s].pnl += parseFloat(t.pnl ?? "0"); if (t.outcome === "win") strategyBreakdown[s].wins++; });
    res.json({ total: trades.length, closed: closed.length, wins: wins.length, losses: losses.length, winRate: winRate.toFixed(1), totalPnl: totalPnl.toFixed(2), avgWin: avgWin.toFixed(2), avgLoss: avgLoss.toFixed(2), bestDay, pnlCurve, strategyBreakdown, dayPnl });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch analytics");
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// ─── Market Sweep Scanner ───────────────────────────────────────────────────

const SCANNER_CACHE = new Map<string, { data: ScannerResponse; ts: number }>();
const SCANNER_TTL = 2 * 60 * 1000;

type ScanResult = {
  symbol: string; name: string; cmp: number; signal: "buy" | "sell";
  entry: number; sl: number; pt1: number; pt2: number;
  rsi: number; vwap: number; volumeRatio: number; isBreakout: boolean;
  strength: number; reason: string; segment: string; changePercent: number | null;
};
type ScannerResponse = { buy: ScanResult[]; sell: ScanResult[]; scannedAt: string; totalScanned: number; fmpFeed?: { price: number | null; name: string | null; active: boolean } };

const EQUITY_UNIVERSE = [
  { symbol: "RELIANCE.NS",  name: "Reliance Industries",      seg: "equity" },
  { symbol: "TCS.NS",       name: "Tata Consultancy Services", seg: "equity" },
  { symbol: "HDFCBANK.NS",  name: "HDFC Bank",                 seg: "equity" },
  { symbol: "BHARTIARTL.NS",name: "Bharti Airtel",             seg: "equity" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank",                seg: "equity" },
  { symbol: "INFY.NS",      name: "Infosys",                   seg: "equity" },
  { symbol: "SBIN.NS",      name: "State Bank of India",       seg: "equity" },
  { symbol: "ITC.NS",       name: "ITC Ltd",                   seg: "equity" },
  { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank",       seg: "equity" },
  { symbol: "LT.NS",        name: "Larsen & Toubro",           seg: "equity" },
  { symbol: "AXISBANK.NS",  name: "Axis Bank",                 seg: "equity" },
  { symbol: "BAJFINANCE.NS",name: "Bajaj Finance",             seg: "equity" },
  { symbol: "MARUTI.NS",    name: "Maruti Suzuki",             seg: "equity" },
  { symbol: "TITAN.NS",     name: "Titan Company",             seg: "equity" },
  { symbol: "SUNPHARMA.NS", name: "Sun Pharmaceutical",        seg: "equity" },
  { symbol: "WIPRO.NS",     name: "Wipro",                     seg: "equity" },
  { symbol: "HCLTECH.NS",   name: "HCL Technologies",          seg: "equity" },
  { symbol: "TATAMOTORS.NS",name: "Tata Motors",               seg: "equity" },
  { symbol: "HINDUNILVR.NS",name: "Hindustan Unilever",        seg: "equity" },
  { symbol: "ONGC.NS",      name: "ONGC",                      seg: "equity" },
  { symbol: "NTPC.NS",      name: "NTPC",                      seg: "equity" },
  { symbol: "TATASTEEL.NS", name: "Tata Steel",                seg: "equity" },
  { symbol: "ADANIENT.NS",  name: "Adani Enterprises",         seg: "equity" },
  { symbol: "HINDALCO.NS",  name: "Hindalco Industries",       seg: "equity" },
  { symbol: "DRREDDY.NS",   name: "Dr. Reddy's Labs",          seg: "equity" },
];
const INDEX_UNIVERSE = [
  { symbol: "^NSEI",    name: "Nifty 50 Spot",      seg: "fno" },
  { symbol: "^NSEBANK", name: "BankNifty Spot",     seg: "fno" },
  { symbol: "^CNXFIN",  name: "Nifty FinServ Spot", seg: "fno" },
];

function scannerRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  const si = closes.length - period - 1;
  for (let i = si + 1; i <= si + period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses += Math.abs(d);
  }
  const ag = gains / period, al = losses / period;
  if (al === 0) return 100;
  return parseFloat((100 - 100 / (1 + ag / al)).toFixed(2));
}
function scannerVWAP(h: number[], l: number[], c: number[], v: number[]): number {
  let tpv = 0, tv = 0;
  for (let i = 0; i < c.length; i++) { const tp = (h[i] + l[i] + c[i]) / 3; tpv += tp * v[i]; tv += v[i]; }
  return tv > 0 ? tpv / tv : c[c.length - 1];
}
function scannerVolRatio(v: number[]): number {
  if (v.length < 3) return 1;
  const cur = v[v.length - 1];
  const lk = v.slice(-21, -1);
  const avg = lk.reduce((s, x) => s + x, 0) / lk.length;
  return avg > 0 ? parseFloat((cur / avg).toFixed(2)) : 1;
}

async function fetchScannerOHLCV(symbol: string, interval: string) {
  const range = interval === "1h" ? "5d" : "2d";
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(9000) });
    if (!r.ok) return null;
    const json = await r.json() as Record<string, unknown>;
    const result = (json as Record<string, unknown>)?.chart as Record<string, unknown>;
    const res0 = (result?.result as unknown[])?.[0] as Record<string, unknown> | undefined;
    if (!res0) return null;
    const q = (res0.indicators as Record<string, unknown[]>)?.quote?.[0] as Record<string, (number | null)[]>;
    const timestamps = res0.timestamp as number[];
    const opens: number[] = [], highs: number[] = [], lows: number[] = [], closes: number[] = [], vols: number[] = [];
    for (let i = 0; i < (timestamps || []).length; i++) {
      const o = q?.open?.[i], h = q?.high?.[i], l = q?.low?.[i], c = q?.close?.[i], v = q?.volume?.[i];
      if (o != null && h != null && l != null && c != null && v != null) {
        opens.push(o); highs.push(h); lows.push(l); closes.push(c); vols.push(v);
      }
    }
    if (closes.length < 16) return null;
    const meta = res0.meta as Record<string, number>;
    const cmp = meta.regularMarketPrice ?? closes[closes.length - 1];
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? null;
    const changePct = prev ? ((cmp - prev) / prev) * 100 : null;
    return { opens, highs, lows, closes, vols, cmp, changePct };
  } catch { return null; }
}

router.get("/trademaster/scanner", async (req: Request, res: Response): Promise<void> => {
  try {
    const { session_id, segment = "equity", interval = "5m" } = req.query;
    const isPremium = true; // TESTING MODE — revert to: await isSessionPremium(session_id as string | undefined)
    if (!isPremium) { res.status(403).json({ error: "Pro Educator subscription required", code: "SUBSCRIPTION_REQUIRED" }); return; }
    void session_id;

    // Tips Engine: trigger scan when FMP live feed is active (confirms live data pipeline)
    const fmpActive = FMP_FEED.price != null && FMP_FEED.price > 0 && (Date.now() - FMP_FEED.ts < 5 * 60_000);
    if (fmpActive) {
      logger.info(`Tips Engine triggered by FMP live feed — FMP price: $${FMP_FEED.price?.toFixed(2)} (${FMP_FEED.name})`);
    }

    const seg = typeof segment === "string" ? segment : "equity";
    const ivl = typeof interval === "string" && ["5m","15m","1h"].includes(interval) ? interval : "5m";
    const cacheKey = `${seg}_${ivl}`;

    const hit = SCANNER_CACHE.get(cacheKey);
    if (hit && Date.now() - hit.ts < SCANNER_TTL) { res.json(hit.data); return; }

    let universe = [...EQUITY_UNIVERSE, ...INDEX_UNIVERSE];
    if (seg === "equity") universe = EQUITY_UNIVERSE;
    else if (seg === "fno") universe = [...INDEX_UNIVERSE, ...EQUITY_UNIVERSE.slice(0, 12)];

    const settled = await Promise.allSettled(universe.map(async (stock) => {
      const data = await fetchScannerOHLCV(stock.symbol, ivl);
      if (!data) return null;
      const { highs, lows, closes, vols, cmp, changePct } = data;
      const rsi = scannerRSI(closes);
      const vwap = scannerVWAP(highs, lows, closes, vols);
      const volRatio = scannerVolRatio(vols);
      const recent20c = closes.slice(-21, -1);
      const recent5h = highs.slice(-6, -1);
      const recent5l = lows.slice(-6, -1);
      const isBreakout = cmp > Math.max(...recent20c);
      const isBreakdown = cmp < Math.min(...recent20c);
      const buySL = Math.min(...recent5l) * 0.999;
      const sellSL = Math.max(...recent5h) * 1.001;
      const isBuy = rsi > 58 && cmp > vwap && volRatio > 1.3;
      const isSell = rsi < 42 && cmp < vwap && volRatio > 1.3;
      if (!isBuy && !isSell) return null;
      const signal: "buy" | "sell" = isBuy ? "buy" : "sell";
      const entry = cmp;
      const slVal = signal === "buy" ? buySL : sellSL;
      const risk = Math.abs(entry - slVal);
      const pt1 = signal === "buy" ? entry + 1.5 * risk : entry - 1.5 * risk;
      const pt2 = signal === "buy" ? entry + 2.5 * risk : entry - 2.5 * risk;
      let strength = 1;
      if (signal === "buy") {
        if (rsi > 65) strength += 2; else if (rsi > 60) strength += 1;
        if (cmp > vwap * 1.005) strength++; if (volRatio > 2) strength++; if (isBreakout) strength++;
      } else {
        if (rsi < 35) strength += 2; else if (rsi < 40) strength += 1;
        if (cmp < vwap * 0.995) strength++; if (volRatio > 2) strength++; if (isBreakdown) strength++;
      }
      strength = Math.min(5, strength);
      const conds: string[] = [];
      if (signal === "buy") {
        conds.push(`RSI ${rsi.toFixed(0)} bullish`);
        if (cmp > vwap) conds.push("above VWAP");
        if (volRatio > 1.5) conds.push(`${volRatio.toFixed(1)}x vol surge`);
        if (isBreakout) conds.push("20-bar breakout");
      } else {
        conds.push(`RSI ${rsi.toFixed(0)} bearish`);
        if (cmp < vwap) conds.push("below VWAP");
        if (volRatio > 1.5) conds.push(`${volRatio.toFixed(1)}x vol surge`);
        if (isBreakdown) conds.push("20-bar breakdown");
      }
      return {
        symbol: stock.symbol, name: stock.name,
        cmp: parseFloat(cmp.toFixed(2)), signal, entry: parseFloat(entry.toFixed(2)),
        sl: parseFloat(slVal.toFixed(2)), pt1: parseFloat(pt1.toFixed(2)), pt2: parseFloat(pt2.toFixed(2)),
        rsi: parseFloat(rsi.toFixed(1)), vwap: parseFloat(vwap.toFixed(2)), volumeRatio: volRatio,
        isBreakout: signal === "buy" ? isBreakout : isBreakdown, strength,
        reason: conds.join(" · "), segment: stock.seg,
        changePercent: changePct != null ? parseFloat(changePct.toFixed(2)) : null,
      } satisfies ScanResult;
    }));

    const valid = settled
      .filter((r): r is PromiseFulfilledResult<ScanResult | null> => r.status === "fulfilled" && r.value !== null)
      .map(r => r.value!);

    const response: ScannerResponse = {
      buy:  valid.filter(r => r.signal === "buy").sort((a,b) => b.strength - a.strength).slice(0, 5),
      sell: valid.filter(r => r.signal === "sell").sort((a,b) => b.strength - a.strength).slice(0, 5),
      scannedAt: new Date().toISOString(),
      totalScanned: universe.length,
      fmpFeed: fmpActive ? { price: FMP_FEED.price!, name: FMP_FEED.name!, active: true } : { price: null, name: null, active: false },
    };

    SCANNER_CACHE.set(cacheKey, { data: response, ts: Date.now() });
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Scanner failed");
    res.status(500).json({ error: "Scanner failed" });
  }
});

export default router;
