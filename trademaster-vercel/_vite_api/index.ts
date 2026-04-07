import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { createHmac } from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { pgTable, text, serial, timestamp, boolean, numeric, pgEnum, integer } from "drizzle-orm/pg-core";
import { eq, desc, and } from "drizzle-orm";

// ─── Database Setup ───────────────────────────────────────────────────────────

const { Pool } = pg;

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: url, max: 3 });
  return drizzle(pool);
}

const db = getDb();

// ─── Schema ───────────────────────────────────────────────────────────────────

const segmentEnum = pgEnum("trademaster_segment", ["nifty", "banknifty", "options", "equity", "intraday", "commodity", "currency"]);
const signalTypeEnum = pgEnum("trademaster_signal_type", ["buy", "sell"]);
const signalStatusEnum = pgEnum("trademaster_signal_status", ["active", "target_hit", "sl_hit"]);

const tradeMasterSignals = pgTable("trademaster_signals", {
  id: serial("id").primaryKey(),
  segment: segmentEnum("segment").notNull(),
  assetName: text("asset_name").notNull(),
  signalType: signalTypeEnum("signal_type").notNull(),
  entryPrice: numeric("entry_price", { precision: 12, scale: 4 }).notNull(),
  stopLoss: numeric("stop_loss", { precision: 12, scale: 4 }).notNull(),
  target1: numeric("target_1", { precision: 12, scale: 4 }).notNull(),
  target2: numeric("target_2", { precision: 12, scale: 4 }),
  riskReward: numeric("risk_reward", { precision: 8, scale: 2 }),
  iv: text("iv"),
  pcr: text("pcr"),
  notes: text("notes"),
  isPremium: boolean("is_premium").notNull().default(false),
  status: signalStatusEnum("status").notNull().default("active"),
  createdBy: text("created_by").notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const investmentReportCategoryEnum = pgEnum("trademaster_report_category", ["large_cap_equity", "etf", "mutual_fund", "government_bond", "gold_silver", "reit", "fixed_deposit"]);
const analystRatingEnum = pgEnum("trademaster_analyst_rating", ["strong_buy", "buy", "hold", "sell"]);
const riskLevelEnum = pgEnum("trademaster_risk_level", ["low", "medium", "high"]);

const tradeMasterInvestmentReports = pgTable("trademaster_investment_reports", {
  id: serial("id").primaryKey(),
  category: investmentReportCategoryEnum("category").notNull(),
  instrumentName: text("instrument_name").notNull(),
  instrumentCode: text("instrument_code"),
  analystRating: analystRatingEnum("analyst_rating").notNull().default("buy"),
  riskLevel: riskLevelEnum("risk_level").notNull().default("medium"),
  suggestedAllocationPct: integer("suggested_allocation_pct").notNull().default(10),
  recommendedHorizon: text("recommended_horizon").notNull(),
  rationale: text("rationale").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const tradeMasterSubscriptions = pgTable("trademaster_subscriptions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  email: text("email"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  plan: text("plan").notNull().default("professional"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const tradeDirectionEnum = pgEnum("tm_trade_direction", ["long", "short"]);
const tradeOutcomeEnum = pgEnum("tm_trade_outcome", ["open", "win", "loss", "breakeven"]);

const tradeMasterJournal = pgTable("trademaster_journal", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  assetName: text("asset_name").notNull(),
  assetType: text("asset_type").notNull().default("equity"),
  direction: tradeDirectionEnum("direction").notNull().default("long"),
  entryPrice: numeric("entry_price", { precision: 12, scale: 4 }).notNull(),
  exitPrice: numeric("exit_price", { precision: 12, scale: 4 }),
  quantity: integer("quantity").notNull(),
  strategyUsed: text("strategy_used"),
  notes: text("notes"),
  entryDate: timestamp("entry_date", { withTimezone: true }).notNull().defaultNow(),
  exitDate: timestamp("exit_date", { withTimezone: true }),
  outcome: tradeOutcomeEnum("outcome").notNull().default("open"),
  pnl: numeric("pnl", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const tradeMasterConsent = pgTable("trademaster_consent", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

const VALID_SEGMENTS = ["nifty", "banknifty", "options", "equity", "intraday", "commodity", "currency", "futures", "fno", "stocks"] as const;
type ValidSegment = typeof VALID_SEGMENTS[number];
const VALID_SIGNAL_TYPES = ["buy", "sell"] as const;
type ValidSignalType = typeof VALID_SIGNAL_TYPES[number];
const VALID_STATUSES = ["active", "target_hit", "sl_hit"] as const;
type ValidStatus = typeof VALID_STATUSES[number];

type DbSignal = typeof tradeMasterSignals.$inferSelect;
type TickerQuote = { name: string; price: number | null; change: number | null; changePercent: number | null; high: number | null; low: number | null; marketState: string | null };
type TickerResults = Record<string, TickerQuote>;
type FmpQuote = { symbol: string; price: number; name: string; change: number; changePercentage: number; volume: number; dayHigh: number; dayLow: number };
type YahooMeta = { regularMarketPrice?: number; regularMarketChangePercent?: number; regularMarketDayHigh?: number; regularMarketDayLow?: number; regularMarketOpen?: number; previousClose?: number; chartPreviousClose?: number; regularMarketChange?: number; longName?: string; shortName?: string };
type YahooChartResponse = { chart?: { result?: { meta?: YahooMeta }[] } };

type SignalUpdatePayload = {
  status?: ValidStatus; assetName?: string; signalType?: ValidSignalType;
  entryPrice?: string; stopLoss?: string; target1?: string; target2?: string | null;
  iv?: string | null; pcr?: string | null; notes?: string | null; isPremium?: boolean; riskReward?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidSegment(s: unknown): s is ValidSegment { return typeof s === "string" && (VALID_SEGMENTS as readonly string[]).includes(s); }
function isValidSignalType(s: unknown): s is ValidSignalType { return typeof s === "string" && (VALID_SIGNAL_TYPES as readonly string[]).includes(s); }
function isValidStatus(s: unknown): s is ValidStatus { return typeof s === "string" && (VALID_STATUSES as readonly string[]).includes(s); }

function buildSegmentWhere(segment: string) {
  if (segment === "fno") return eq(tradeMasterSignals.segment, "options");
  if (segment === "stocks") return eq(tradeMasterSignals.segment, "equity");
  return eq(tradeMasterSignals.segment, segment as "nifty" | "banknifty" | "options" | "equity" | "intraday" | "commodity" | "currency");
}

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

function todayIST(): string { return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10); }
function tsToDateIST(ts: number): string { return new Date(ts * 1000 + 5.5 * 3600 * 1000).toISOString().slice(0, 10); }

// ─── Quote Cache ──────────────────────────────────────────────────────────────

const quoteCache = new Map<string, { data: unknown; expiry: number }>();

const SERVER_INDEX_MAP: Record<string, string> = {
  "NIFTY": "^NSEI", "NIFTY 50": "^NSEI", "NIFTY50": "^NSEI",
  "NIFTY FUTURES": "^NSEI", "NIFTY 50 FUTURES": "^NSEI", "NIFTY FUT": "^NSEI", "NIFTY SPOT": "^NSEI",
  "BANKNIFTY": "^NSEBANK", "BANK NIFTY": "^NSEBANK", "BANK NIFTY 50": "^NSEBANK",
  "BANKNIFTY FUTURES": "^NSEBANK", "BANKNIFTY FUT": "^NSEBANK",
  "FINNIFTY": "^NSEMDCP50", "FIN NIFTY": "^NSEMDCP50", "NIFTY FIN SERVICE": "^NSEMDCP50",
  "MIDCAPNIFTY": "^NSEMDCP50", "MIDCAP NIFTY": "^NSEMDCP50",
  "SENSEX": "^BSESN",
  "USDINR": "USDINR=X", "USD/INR": "USDINR=X",
  "EURINR": "EURINR=X", "EUR/INR": "EURINR=X",
  "GBPINR": "GBPINR=X", "GBP/INR": "GBPINR=X",
  "GOLD": "GC=F", "MCX GOLD": "GC=F", "GOLD MINI": "GC=F",
  "SILVER": "SI=F", "MCX SILVER": "SI=F",
  "CRUDEOIL": "CL=F", "CRUDE OIL": "CL=F", "MCX CRUDE": "CL=F", "CRUDE": "CL=F",
  "NATURAL GAS": "NG=F", "NATURALGAS": "NG=F", "NG": "NG=F",
  "COPPER": "HG=F",
};

const SERVER_COMPANY_MAP: Record<string, string> = {
  "RELIANCE INDUSTRIES": "RELIANCE", "RELIANCE": "RELIANCE",
  "TATA CONSULTANCY SERVICES": "TCS", "TCS": "TCS",
  "INFOSYS": "INFY", "HDFC BANK": "HDFCBANK", "HDFC": "HDFC",
  "ICICI BANK": "ICICIBANK", "SBI": "SBIN", "STATE BANK OF INDIA": "SBIN",
  "AXIS BANK": "AXISBANK", "KOTAK MAHINDRA BANK": "KOTAKBANK",
  "L&T": "LT", "LARSEN AND TOUBRO": "LT", "LARSEN & TOUBRO": "LT",
  "ITC": "ITC", "WIPRO": "WIPRO",
  "HCL TECHNOLOGIES": "HCLTECH", "HCL TECH": "HCLTECH",
  "SUN PHARMA": "SUNPHARMA", "SUN PHARMACEUTICAL": "SUNPHARMA",
  "MARUTI SUZUKI": "MARUTI", "MARUTI": "MARUTI",
  "TATA MOTORS": "TATAMOTORS", "BAJAJ FINANCE": "BAJFINANCE",
  "BAJAJ FINSERV": "BAJAJFINSV", "ASIAN PAINTS": "ASIANPAINT",
  "TITAN COMPANY": "TITAN", "TITAN": "TITAN",
  "ULTRATECH CEMENT": "ULTRACEMCO", "NTPC": "NTPC",
  "ADANI ENTERPRISES": "ADANIENT", "ADANI PORTS": "ADANIPORTS",
  "CIPLA": "CIPLA", "DR REDDYS": "DRREDDY", "DR REDDY": "DRREDDY",
  "HINDALCO INDUSTRIES": "HINDALCO", "HINDALCO": "HINDALCO",
  "TATA STEEL": "TATASTEEL", "JSW STEEL": "JSWSTEEL",
  "HERO MOTOCORP": "HEROMOTOCO", "BAJAJ AUTO": "BAJAJ-AUTO",
  "INDUSIND BANK": "INDUSINDBK", "TECH MAHINDRA": "TECHM",
};

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
  const upper = assetName.toUpperCase().trim().replace(/\s*\([^)]*\)/g, "").trim();
  if (SERVER_INDEX_MAP[upper]) return SERVER_INDEX_MAP[upper];
  if (segment === "nifty") return extractFnOUnderlying(upper);
  if (segment === "banknifty") return "^NSEBANK";
  if (segment === "options" || segment === "futures" || segment === "fno") return extractFnOUnderlying(upper);
  if (segment === "intraday" && /^(NIFTY|BANKNIFTY|BANK\s*NIFTY|FINNIFTY|SENSEX)/.test(upper)) return extractFnOUnderlying(upper);
  if (segment === "commodity") {
    if (upper.includes("GOLD")) return "GC=F";
    if (upper.includes("SILVER")) return "SI=F";
    if (upper.includes("CRUDE") || upper.includes("OIL")) return "CL=F";
    if (upper.includes("NATURAL") || upper.includes("GAS")) return "NG=F";
    if (upper.includes("COPPER")) return "HG=F";
    return "GC=F";
  }
  if (segment === "currency") {
    if (upper.includes("EUR")) return "EURINR=X";
    if (upper.includes("GBP")) return "GBPINR=X";
    return "USDINR=X";
  }
  if (SERVER_COMPANY_MAP[upper]) return `${SERVER_COMPANY_MAP[upper]}.NS`;
  const stripped = upper
    .replace(/\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*\d{2,4}.*$/i, "")
    .replace(/\s+(FUTURES|FUTURE|FUT|OPTIONS|OPTION|CE|PE|CALL|PUT)$/i, "")
    .replace(/\s+\d+\s*(CE|PE)?$/i, "")
    .replace(/\s+(INDUSTRIES|INDUSTRY|LIMITED|LTD|ENTERPRISES|CORPORATION|CORP)$/i, "")
    .trim();
  return `${stripped.replace(/\s+/g, "")}.NS`;
}

// ─── Ticker Cache ─────────────────────────────────────────────────────────────

const TICKER_CACHE: { data: TickerResults | null; ts: number } = { data: null, ts: 0 };
const TICKER_TTL = 60 * 1000;
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
      FMP_FEED.price = q.price; FMP_FEED.name = q.name ?? "Apple Inc."; FMP_FEED.ts = Date.now();
      return { price: q.price, name: q.name };
    }
    return { price: null, name: null };
  } catch { return { price: null, name: null }; }
}

async function fetchYahooTicker(yahooSymbol: string, name: string): Promise<TickerQuote> {
  const cacheBuster = Math.floor(Date.now() / 60000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2d&_t=${cacheBuster}`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache", "Pragma": "no-cache" }, signal: AbortSignal.timeout(7000) });
    if (!r.ok) return { name, price: null, change: null, changePercent: null, high: null, low: null, marketState: null };
    const json = await r.json() as Record<string, unknown>;
    const res0 = ((json as Record<string, Record<string, unknown[]>>)?.chart?.result)?.[0] as Record<string, unknown> | undefined;
    if (!res0) return { name, price: null, change: null, changePercent: null, high: null, low: null, marketState: null };
    const meta = res0.meta as Record<string, number | string | Record<string, Record<string, number>>>;
    const tradingPeriod = meta.currentTradingPeriod as Record<string, Record<string, number>> | undefined;
    const nowSec = Math.floor(Date.now() / 1000);
    const regStart = tradingPeriod?.regular?.start ?? 0;
    const regEnd = tradingPeriod?.regular?.end ?? 0;
    const marketState: string = (meta.marketState as string) ?? (regStart > 0 && regEnd > 0 ? (nowSec >= regStart && nowSec <= regEnd ? "REGULAR" : "CLOSED") : "CLOSED");
    const price = (meta.regularMarketPrice as number) ?? null;
    const prevClose = ((meta.chartPreviousClose ?? meta.previousClose) as number) ?? null;
    const change = price != null && prevClose != null ? price - prevClose : ((meta.regularMarketChange as number) ?? null);
    const changePercent = price != null && prevClose != null && prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : ((meta.regularMarketChangePercent as number) ?? null);
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
  } catch { return { name, price: null, change: null, changePercent: null, high: null, low: null, marketState: null }; }
}

// ─── Scanner ──────────────────────────────────────────────────────────────────

type ScanResult = { symbol: string; name: string; cmp: number; signal: "buy" | "sell"; entry: number; sl: number; pt1: number; pt2: number; rsi: number; vwap: number; volumeRatio: number; isBreakout: boolean; strength: number; reason: string; segment: string; changePercent: number | null };
type ScannerResponse = { buy: ScanResult[]; sell: ScanResult[]; scannedAt: string; totalScanned: number; fmpFeed?: { price: number | null; name: string | null; active: boolean }; dataDate: string | null; isStale: boolean; staleSources: string[]; todayIST: string };

const SCANNER_CACHE = new Map<string, { data: ScannerResponse; ts: number }>();
const SCANNER_TTL = 2 * 60 * 1000;

const EQUITY_UNIVERSE = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries", seg: "equity" },
  { symbol: "TCS.NS", name: "Tata Consultancy Services", seg: "equity" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank", seg: "equity" },
  { symbol: "BHARTIARTL.NS", name: "Bharti Airtel", seg: "equity" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank", seg: "equity" },
  { symbol: "INFY.NS", name: "Infosys", seg: "equity" },
  { symbol: "SBIN.NS", name: "State Bank of India", seg: "equity" },
  { symbol: "ITC.NS", name: "ITC Ltd", seg: "equity" },
  { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank", seg: "equity" },
  { symbol: "LT.NS", name: "Larsen & Toubro", seg: "equity" },
  { symbol: "AXISBANK.NS", name: "Axis Bank", seg: "equity" },
  { symbol: "BAJFINANCE.NS", name: "Bajaj Finance", seg: "equity" },
  { symbol: "MARUTI.NS", name: "Maruti Suzuki", seg: "equity" },
  { symbol: "TITAN.NS", name: "Titan Company", seg: "equity" },
  { symbol: "SUNPHARMA.NS", name: "Sun Pharmaceutical", seg: "equity" },
  { symbol: "WIPRO.NS", name: "Wipro", seg: "equity" },
  { symbol: "HCLTECH.NS", name: "HCL Technologies", seg: "equity" },
  { symbol: "TATAMOTORS.NS", name: "Tata Motors", seg: "equity" },
  { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever", seg: "equity" },
  { symbol: "ONGC.NS", name: "ONGC", seg: "equity" },
  { symbol: "NTPC.NS", name: "NTPC", seg: "equity" },
  { symbol: "TATASTEEL.NS", name: "Tata Steel", seg: "equity" },
  { symbol: "ADANIENT.NS", name: "Adani Enterprises", seg: "equity" },
  { symbol: "HINDALCO.NS", name: "Hindalco Industries", seg: "equity" },
  { symbol: "DRREDDY.NS", name: "Dr. Reddy's Labs", seg: "equity" },
];

const INDEX_UNIVERSE = [
  { symbol: "^NSEI", name: "Nifty 50 Spot", seg: "fno" },
  { symbol: "^NSEBANK", name: "BankNifty Spot", seg: "fno" },
  { symbol: "^CNXFIN", name: "Nifty FinServ Spot", seg: "fno" },
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

async function fetchScannerOHLCV(symbol: string, interval: string): Promise<{ opens: number[]; highs: number[]; lows: number[]; closes: number[]; vols: number[]; cmp: number; changePct: number | null; lastCandleDate: string | null; isStale: boolean } | null> {
  const range = interval === "1h" ? "5d" : "2d";
  const cacheBuster = Math.floor(Date.now() / 60000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&_t=${cacheBuster}`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache", "Pragma": "no-cache" }, signal: AbortSignal.timeout(9000) });
    if (!r.ok) return null;
    const json = await r.json() as Record<string, unknown>;
    const result = (json as Record<string, unknown>)?.chart as Record<string, unknown>;
    const res0 = (result?.result as unknown[])?.[0] as Record<string, unknown> | undefined;
    if (!res0) return null;
    const q = (res0.indicators as Record<string, unknown[]>)?.quote?.[0] as Record<string, (number | null)[]>;
    const timestamps = res0.timestamp as number[];
    const opens: number[] = [], highs: number[] = [], lows: number[] = [], closes: number[] = [], vols: number[] = [];
    const validTs: number[] = [];
    for (let i = 0; i < (timestamps || []).length; i++) {
      const o = q?.open?.[i], h = q?.high?.[i], l = q?.low?.[i], c = q?.close?.[i], v = q?.volume?.[i];
      if (o != null && h != null && l != null && c != null && v != null) {
        opens.push(o); highs.push(h); lows.push(l); closes.push(c); vols.push(v);
        validTs.push(timestamps[i]);
      }
    }
    if (closes.length < 16) return null;
    const meta = res0.meta as Record<string, number>;
    const cmp = meta.regularMarketPrice ?? closes[closes.length - 1];
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? null;
    const changePct = prev ? ((cmp - prev) / prev) * 100 : null;
    const lastTs = validTs[validTs.length - 1] ?? null;
    const lastCandleDate = lastTs != null ? tsToDateIST(lastTs) : null;
    const today = todayIST();
    const isStale = lastCandleDate != null && lastCandleDate < today;
    return { opens, highs, lows, closes, vols, cmp, changePct, lastCandleDate, isStale };
  } catch { return null; }
}

// ─── Investment Reports Seed Data ────────────────────────────────────────────

const VALID_REPORT_CATEGORIES = ["large_cap_equity", "etf", "mutual_fund", "government_bond", "gold_silver", "reit", "fixed_deposit"] as const;
type ValidReportCategory = typeof VALID_REPORT_CATEGORIES[number];
function isValidReportCategory(s: unknown): s is ValidReportCategory { return typeof s === "string" && (VALID_REPORT_CATEGORIES as readonly string[]).includes(s); }

const INVESTMENT_SEED_DATA = [
  { category: "large_cap_equity" as ValidReportCategory, instrumentName: "Reliance Industries Ltd", instrumentCode: "RELIANCE", analystRating: "strong_buy" as const, riskLevel: "medium" as const, suggestedAllocationPct: 8, recommendedHorizon: "3–5 years", rationale: "Diversified conglomerate with dominant positions in telecom (Jio), retail, and petrochemicals. Strong cash generation and aggressive expansion into green energy. Promoter-backed buyback programs and low debt make this a core large-cap holding." },
  { category: "large_cap_equity" as ValidReportCategory, instrumentName: "HDFC Bank Ltd", instrumentCode: "HDFCBANK", analystRating: "buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 7, recommendedHorizon: "2–4 years", rationale: "India's largest private sector bank with best-in-class asset quality, CASA ratio above 43%, and conservative credit risk management. Post-merger integration with HDFC Ltd nearing completion — expect re-rating as margins stabilize." },
  { category: "large_cap_equity" as ValidReportCategory, instrumentName: "Infosys Ltd", instrumentCode: "INFY", analystRating: "buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 6, recommendedHorizon: "2–3 years", rationale: "Tier-1 IT services with strong deal wins in AI/cloud transformation. Free cash flow yield of ~5%, consistent dividend payouts, and improving revenue visibility." },
  { category: "large_cap_equity" as ValidReportCategory, instrumentName: "Tata Consultancy Services", instrumentCode: "TCS", analystRating: "hold" as const, riskLevel: "low" as const, suggestedAllocationPct: 5, recommendedHorizon: "3+ years", rationale: "India's largest IT bellwether with a fortress balance sheet. Near-term growth tempered by global discretionary IT spend slowdown, but long-cycle mega-deals provide earnings floor." },
  { category: "large_cap_equity" as ValidReportCategory, instrumentName: "Larsen & Toubro Ltd", instrumentCode: "LT", analystRating: "strong_buy" as const, riskLevel: "medium" as const, suggestedAllocationPct: 6, recommendedHorizon: "3–5 years", rationale: "India's premier infrastructure and engineering conglomerate is the primary beneficiary of the ₹11-lakh-crore capex supercycle. Record order book above ₹5 lakh crore." },
  { category: "etf" as ValidReportCategory, instrumentName: "Nifty 50 ETF — Nippon India", instrumentCode: "NIFTYBEES", analystRating: "strong_buy" as const, riskLevel: "medium" as const, suggestedAllocationPct: 10, recommendedHorizon: "5–10 years", rationale: "Most liquid Nifty 50 ETF on NSE with AUM above ₹20,000 crore and tracking error under 0.02%. Ideal passive core holding for long-term wealth creation." },
  { category: "etf" as ValidReportCategory, instrumentName: "Nifty 50 ETF — SBI", instrumentCode: "SETFNIF50", analystRating: "buy" as const, riskLevel: "medium" as const, suggestedAllocationPct: 8, recommendedHorizon: "5–10 years", rationale: "Backed by SBI Mutual Fund with strong institutional support. Excellent liquidity, tight bid-ask spreads, and consistent tracking." },
  { category: "etf" as ValidReportCategory, instrumentName: "Gold ETF — HDFC Gold ETF", instrumentCode: "HDFCMFGETF", analystRating: "buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 5, recommendedHorizon: "3–7 years", rationale: "Efficient gold exposure without physical storage concerns. Tracks MCX gold spot with tight spreads. Portfolio hedge against INR depreciation." },
  { category: "mutual_fund" as ValidReportCategory, instrumentName: "HDFC Top 100 Fund — Direct Growth", instrumentCode: "HDFC100DIR", analystRating: "strong_buy" as const, riskLevel: "medium" as const, suggestedAllocationPct: 10, recommendedHorizon: "5+ years", rationale: "Consistent large-cap outperformer managed by experienced fund managers. 10-year CAGR exceeds benchmark by 2–3%." },
  { category: "mutual_fund" as ValidReportCategory, instrumentName: "Parag Parikh Flexi Cap Fund — Direct", instrumentCode: "PPFCFD", analystRating: "strong_buy" as const, riskLevel: "medium" as const, suggestedAllocationPct: 10, recommendedHorizon: "5–10 years", rationale: "Unique flexi-cap with 25–35% global diversification (Alphabet, Meta, Amazon). Reduces India-specific risk while capturing domestic growth." },
  { category: "government_bond" as ValidReportCategory, instrumentName: "Sovereign Gold Bond 2025-26 Series", instrumentCode: "SGBBOND", analystRating: "strong_buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 8, recommendedHorizon: "8 years (with 5-yr exit)", rationale: "Government of India guaranteed instrument combining gold price returns with a 2.5% p.a. fixed interest (tax-free for individuals holding to maturity)." },
  { category: "government_bond" as ValidReportCategory, instrumentName: "PPF (Public Provident Fund)", instrumentCode: "PPF", analystRating: "strong_buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 10, recommendedHorizon: "15 years", rationale: "Sovereign-guaranteed EEE instrument — contributions, interest, and maturity all tax-free. Current rate of 7.1% p.a. (compounded annually)." },
  { category: "gold_silver" as ValidReportCategory, instrumentName: "Gold ETF — Kotak Gold ETF", instrumentCode: "KOTAKGOLD", analystRating: "strong_buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 6, recommendedHorizon: "3–7 years", rationale: "Best-in-class tracking accuracy with competitive expense ratio. Global gold at all-time highs driven by DXY weakness." },
  { category: "reit" as ValidReportCategory, instrumentName: "Embassy Office Parks REIT", instrumentCode: "EMBASSYREIT", analystRating: "strong_buy" as const, riskLevel: "medium" as const, suggestedAllocationPct: 5, recommendedHorizon: "3–7 years", rationale: "India's largest listed REIT by area — 45 million sq ft of Grade-A office parks leased to MNCs. Consistent 6–7% distribution yield." },
  { category: "fixed_deposit" as ValidReportCategory, instrumentName: "HDFC Bank Fixed Deposit — Senior Citizen", instrumentCode: "HDFCFDSR", analystRating: "strong_buy" as const, riskLevel: "low" as const, suggestedAllocationPct: 12, recommendedHorizon: "1–2 years", rationale: "HDFC Bank offers 7.75% p.a. for senior citizens on 1–2 year deposits. DICGC insured up to ₹5 lakh." },
];

// ─── Express App ──────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Admin verify
app.get("/api/trademaster/admin/verify", (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json({ ok: true });
});

// Config
app.get("/api/trademaster/config", (_req, res) => {
  res.json({ razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? null });
});

// ─── Signals ─────────────────────────────────────────────────────────────────

app.get("/api/trademaster/signals", async (req, res): Promise<void> => {
  try {
    const { segment } = req.query as { segment?: string };
    const accessLevel = resolveAccessLevel(req);
    const isPremium = accessLevel === "admin" || await isSessionPremium(accessLevel ?? undefined);
    const where = segment && isValidSegment(segment) ? buildSegmentWhere(segment) : undefined;
    const rows = where
      ? await db.select().from(tradeMasterSignals).where(where).orderBy(desc(tradeMasterSignals.createdAt))
      : await db.select().from(tradeMasterSignals).orderBy(desc(tradeMasterSignals.createdAt));
    const signals = rows.map((s) => (s.isPremium && !isPremium ? redactPremiumSignal(s) : s));
    res.json({ signals });
  } catch (err) {
    console.error("Failed to fetch signals:", err);
    res.status(500).json({ error: "Failed to fetch signals" });
  }
});

app.get("/api/trademaster/signals/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const accessLevel = resolveAccessLevel(req);
    const isPremium = accessLevel === "admin" || await isSessionPremium(accessLevel ?? undefined);
    const [signal] = await db.select().from(tradeMasterSignals).where(eq(tradeMasterSignals.id, id));
    if (!signal) { res.status(404).json({ error: "Signal not found" }); return; }
    res.json({ signal: signal.isPremium && !isPremium ? redactPremiumSignal(signal) : signal });
  } catch (err) {
    console.error("Failed to fetch signal:", err);
    res.status(500).json({ error: "Failed to fetch signal" });
  }
});

app.post("/api/trademaster/signals", async (req, res): Promise<void> => {
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
    console.error("Failed to create signal:", err);
    res.status(500).json({ error: "Failed to create signal" });
  }
});

app.patch("/api/trademaster/signals/:id", async (req, res): Promise<void> => {
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
    console.error("Failed to update signal:", err);
    res.status(500).json({ error: "Failed to update signal" });
  }
});

app.delete("/api/trademaster/signals/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [deleted] = await db.delete(tradeMasterSignals).where(eq(tradeMasterSignals.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Signal not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete signal:", err);
    res.status(500).json({ error: "Failed to delete signal" });
  }
});

// ─── Quote ────────────────────────────────────────────────────────────────────

app.get("/api/trademaster/quote", async (req, res): Promise<void> => {
  try {
    const { symbol, assetName, segment } = req.query as { symbol?: string; assetName?: string; segment?: string };
    const sym = symbol ? symbol.trim() : assetName ? toYahooSymbol(assetName, segment ?? "equity") : null;
    if (!sym) { res.status(400).json({ error: "symbol or assetName required" }); return; }
    const symbols = sym.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10);
    const now = Date.now();
    const results: Record<string, unknown> = {};
    await Promise.all(symbols.map(async (s) => {
      const cached = quoteCache.get(s);
      if (cached && cached.expiry > now) { results[s] = cached.data; return; }
      try {
        const qCacheBuster = Math.floor(Date.now() / 30000);
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?interval=1d&range=1d&includePrePost=false&_t=${qCacheBuster}`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "Mozilla/5.0 (compatible; TradeMaster/1.0)", "Cache-Control": "no-cache", "Pragma": "no-cache" } });
        if (!resp.ok) { results[s] = null; return; }
        const json = await resp.json() as YahooChartResponse;
        const meta = json?.chart?.result?.[0]?.meta;
        if (!meta || !meta.regularMarketPrice) { results[s] = null; return; }
        const price = meta.regularMarketPrice;
        const prev = meta.previousClose ?? meta.chartPreviousClose ?? null;
        const change = meta.regularMarketChange ?? (prev != null ? price - prev : null);
        const changePercent = meta.regularMarketChangePercent ?? (prev != null && prev > 0 ? ((price - prev) / prev) * 100 : null);
        const q = { symbol: s, name: meta.longName ?? meta.shortName ?? s, price, change, changePercent, high: meta.regularMarketDayHigh ?? null, low: meta.regularMarketDayLow ?? null, open: meta.regularMarketOpen ?? null, prevClose: prev };
        quoteCache.set(s, { data: q, expiry: now + 30_000 });
        results[s] = q;
      } catch { results[s] = null; }
    }));
    res.json({ quotes: results });
  } catch (err) {
    console.error("Failed to fetch quote:", err);
    res.status(500).json({ error: "Failed to fetch quote" });
  }
});

// ─── Ticker ───────────────────────────────────────────────────────────────────

app.get("/api/trademaster/ticker", async (_req, res): Promise<void> => {
  try {
    const sessionDateISO = todayIST();
    const [dd, mm, yyyy] = [sessionDateISO.slice(8, 10), sessionDateISO.slice(5, 7), sessionDateISO.slice(0, 4)];
    const sessionDate = `${dd}/${mm}/${yyyy}`;
    if (TICKER_CACHE.data && Date.now() - TICKER_CACHE.ts < TICKER_TTL) {
      res.json({ ticker: TICKER_CACHE.data, sessionDate, fmpFeed: { price: FMP_FEED.price, name: FMP_FEED.name, ts: FMP_FEED.ts } });
      return;
    }
    const [nifty, banknifty, fmpFeed] = await Promise.all([fetchYahooTicker("^NSEI", "Nifty 50"), fetchYahooTicker("^NSEBANK", "Bank Nifty"), fetchFmpLiveFeed()]);
    const fmpActive = fmpFeed.price != null && fmpFeed.price > 0;
    if (fmpActive) {
      if (nifty.marketState !== "REGULAR") nifty.marketState = "OPEN";
      if (banknifty.marketState !== "REGULAR") banknifty.marketState = "OPEN";
    }
    const results: TickerResults = { nifty, banknifty };
    TICKER_CACHE.data = results;
    TICKER_CACHE.ts = Date.now();
    res.json({ ticker: results, sessionDate, fmpFeed: { price: fmpFeed.price, name: fmpFeed.name, ts: FMP_FEED.ts } });
  } catch (err) {
    console.error("Failed to fetch ticker:", err);
    res.status(500).json({ error: "Failed to fetch ticker" });
  }
});

// ─── Payment ──────────────────────────────────────────────────────────────────

app.post("/api/trademaster/payment/order", async (req, res): Promise<void> => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) { res.status(500).json({ error: "Payment gateway not configured" }); return; }
    const { default: Razorpay } = await import("razorpay");
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.create({ amount: 250000, currency: "INR", receipt: `tm_edu_${Date.now()}`, notes: { product: "TradeMaster Pro — Pro Educator Plan (90 days)" } });
    res.json({ orderId: order.id as string, amount: order.amount as number, currency: order.currency as string, keyId });
  } catch (err) {
    console.error("Failed to create Razorpay order:", err);
    res.status(500).json({ error: "Failed to initiate payment" });
  }
});

app.post("/api/trademaster/payment/verify", async (req, res): Promise<void> => {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) { res.status(500).json({ error: "Payment gateway not configured" }); return; }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email } = req.body as Record<string, unknown>;
    if (typeof razorpay_order_id !== "string" || typeof razorpay_payment_id !== "string" || typeof razorpay_signature !== "string") { res.status(400).json({ error: "Missing payment verification fields" }); return; }
    const keyId = process.env.RAZORPAY_KEY_ID ?? "";
    const isTestMode = keyId.startsWith("rzp_test_");
    const isSimulated = typeof razorpay_payment_id === "string" && razorpay_payment_id.startsWith("rzp_sim_");
    if (!(isTestMode && isSimulated)) {
      const expectedSignature = createHmac("sha256", keySecret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
      if (expectedSignature !== razorpay_signature) { res.status(400).json({ error: "Payment verification failed — invalid signature" }); return; }
    }
    const sessionId = `rzp_${razorpay_payment_id}`;
    await db.insert(tradeMasterSubscriptions).values({ sessionId, email: typeof email === "string" && email.trim() ? email.trim() : null, stripeCustomerId: null, stripeSubscriptionId: razorpay_payment_id, plan: "professional", status: "active" }).onConflictDoNothing();
    res.json({ success: true, sessionId });
  } catch (err) {
    console.error("Failed to verify payment:", err);
    res.status(500).json({ error: "Payment verification failed" });
  }
});

// ─── Subscription ─────────────────────────────────────────────────────────────

app.get("/api/trademaster/subscription/check", async (req, res): Promise<void> => {
  try {
    const { sessionId } = req.query as { sessionId?: string };
    if (!sessionId || typeof sessionId !== "string") { res.json({ isPremium: false }); return; }
    const [sub] = await db.select().from(tradeMasterSubscriptions).where(and(eq(tradeMasterSubscriptions.sessionId, sessionId), eq(tradeMasterSubscriptions.status, "active")));
    if (!sub) { res.json({ isPremium: false, subscription: null }); return; }
    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
    const isExpired = Date.now() - new Date(sub.createdAt).getTime() > NINETY_DAYS_MS;
    if (isExpired) {
      await db.update(tradeMasterSubscriptions).set({ status: "expired" }).where(eq(tradeMasterSubscriptions.id, sub.id));
      res.json({ isPremium: false, subscription: null }); return;
    }
    res.json({ isPremium: true, subscription: sub });
  } catch (err) {
    console.error("Failed to check subscription:", err);
    res.json({ isPremium: false, subscription: null });
  }
});

app.get("/api/trademaster/subscriptions", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const subscriptions = await db.select().from(tradeMasterSubscriptions).orderBy(desc(tradeMasterSubscriptions.createdAt));
    res.json({ subscriptions, total: subscriptions.length });
  } catch (err) {
    console.error("Failed to fetch subscriptions:", err);
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});

app.patch("/api/trademaster/subscriptions/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { status } = req.body as { status?: unknown };
    if (typeof status !== "string" || !["active", "cancelled", "expired"].includes(status)) { res.status(400).json({ error: "status must be active, cancelled, or expired" }); return; }
    const [sub] = await db.update(tradeMasterSubscriptions).set({ status }).where(eq(tradeMasterSubscriptions.id, id)).returning();
    if (!sub) { res.status(404).json({ error: "Subscription not found" }); return; }
    res.json({ subscription: sub });
  } catch (err) {
    console.error("Failed to update subscription:", err);
    res.status(500).json({ error: "Failed to update subscription" });
  }
});

// ─── Consent ──────────────────────────────────────────────────────────────────

app.post("/api/trademaster/consent", async (req, res): Promise<void> => {
  try {
    const { sessionId } = req.body as { sessionId?: unknown };
    if (typeof sessionId !== "string" || !sessionId.trim()) { res.status(400).json({ error: "sessionId required" }); return; }
    const sid = sessionId.trim();
    await db.insert(tradeMasterConsent).values({ sessionId: sid }).onConflictDoNothing();
    res.json({ success: true, sessionId: sid });
  } catch (err) {
    console.error("Failed to persist consent:", err);
    res.status(500).json({ error: "Failed to persist consent" });
  }
});

app.get("/api/trademaster/consent/check", async (req, res): Promise<void> => {
  try {
    const { sessionId } = req.query as { sessionId?: string };
    if (!sessionId || typeof sessionId !== "string") { res.json({ hasConsented: false }); return; }
    const [record] = await db.select().from(tradeMasterConsent).where(eq(tradeMasterConsent.sessionId, sessionId));
    res.json({ hasConsented: !!record, acceptedAt: record?.acceptedAt ?? null });
  } catch (err) {
    console.error("Failed to check consent:", err);
    res.json({ hasConsented: false });
  }
});

// ─── Performance ──────────────────────────────────────────────────────────────

app.get("/api/trademaster/performance", async (req, res): Promise<void> => {
  try {
    const { segment, from, to } = req.query as { segment?: string; from?: string; to?: string };
    const accessLevel = resolveAccessLevel(req);
    const isPremium = accessLevel === "admin" || await isSessionPremium(accessLevel ?? undefined);
    let rows = await db.select().from(tradeMasterSignals).orderBy(desc(tradeMasterSignals.createdAt));
    if (segment && isValidSegment(segment)) rows = rows.filter((r) => r.segment === segment);
    if (from) { const fromDate = new Date(from); if (!isNaN(fromDate.getTime())) rows = rows.filter((r) => new Date(r.createdAt) >= fromDate); }
    if (to) { const toDate = new Date(to); if (!isNaN(toDate.getTime())) rows = rows.filter((r) => new Date(r.createdAt) <= toDate); }
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
    res.json({ stats: { total, targetHit, slHit, open, successRate, avgRR }, signals, isPremium });
  } catch (err) {
    console.error("Failed to fetch performance:", err);
    res.status(500).json({ error: "Failed to fetch performance data" });
  }
});

// ─── Reports ──────────────────────────────────────────────────────────────────

app.get("/api/trademaster/reports", async (req, res): Promise<void> => {
  try {
    const { category } = req.query as { category?: string };
    const accessLevel = resolveAccessLevel(req);
    const isPremium = accessLevel === "admin" || await isSessionPremium(accessLevel ?? undefined);
    let rows = await db.select().from(tradeMasterInvestmentReports).where(eq(tradeMasterInvestmentReports.isActive, true)).orderBy(tradeMasterInvestmentReports.category, tradeMasterInvestmentReports.id);
    if (category && isValidReportCategory(category)) rows = rows.filter((r) => r.category === category);
    if (!isPremium) {
      const summary = rows.map((r) => ({ id: r.id, category: r.category, instrumentName: r.instrumentName, instrumentCode: r.instrumentCode, analystRating: r.analystRating, riskLevel: r.riskLevel, recommendedHorizon: r.recommendedHorizon, rationale: null, suggestedAllocationPct: null }));
      res.json({ reports: summary, isPremium: false }); return;
    }
    res.json({ reports: rows, isPremium: true });
  } catch (err) {
    console.error("Failed to fetch reports:", err);
    res.status(500).json({ error: "Failed to fetch investment reports" });
  }
});

app.post("/api/trademaster/reports/seed", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const existing = await db.select({ id: tradeMasterInvestmentReports.id }).from(tradeMasterInvestmentReports).limit(1);
    if (existing.length > 0) { res.json({ message: "Reports already seeded", count: existing.length }); return; }
    await db.insert(tradeMasterInvestmentReports).values(INVESTMENT_SEED_DATA);
    res.json({ message: "Seeded investment reports", count: INVESTMENT_SEED_DATA.length });
  } catch (err) {
    console.error("Failed to seed reports:", err);
    res.status(500).json({ error: "Failed to seed reports" });
  }
});

// ─── Journal ──────────────────────────────────────────────────────────────────

app.get("/api/trademaster/journal", async (req, res): Promise<void> => {
  try {
    const { session_id } = req.query;
    if (!session_id || typeof session_id !== "string") { res.status(400).json({ error: "session_id required" }); return; }
    const trades = await db.select().from(tradeMasterJournal).where(eq(tradeMasterJournal.sessionId, session_id)).orderBy(desc(tradeMasterJournal.entryDate));
    res.json({ trades });
  } catch (err) {
    console.error("Failed to fetch journal:", err);
    res.status(500).json({ error: "Failed to fetch journal" });
  }
});

app.get("/api/trademaster/journal/analytics", async (req, res): Promise<void> => {
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
    const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayPnl: Record<string, number> = {};
    closed.forEach(t => { const d = DAYS[new Date(t.entryDate).getDay()]; dayPnl[d] = (dayPnl[d] ?? 0) + parseFloat(t.pnl ?? "0"); });
    const bestDay = Object.entries(dayPnl).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const pnlCurve = closed.map((t, i) => ({ index: i + 1, pnl: parseFloat(t.pnl ?? "0"), cumulative: closed.slice(0, i + 1).reduce((s, x) => s + parseFloat(x.pnl ?? "0"), 0), asset: t.assetName, date: t.entryDate }));
    const strategyBreakdown: Record<string, { count: number; pnl: number; wins: number }> = {};
    closed.forEach(t => { const s = t.strategyUsed || "Untagged"; if (!strategyBreakdown[s]) strategyBreakdown[s] = { count: 0, pnl: 0, wins: 0 }; strategyBreakdown[s].count++; strategyBreakdown[s].pnl += parseFloat(t.pnl ?? "0"); if (t.outcome === "win") strategyBreakdown[s].wins++; });
    res.json({ total: trades.length, closed: closed.length, wins: wins.length, losses: losses.length, winRate: winRate.toFixed(1), totalPnl: totalPnl.toFixed(2), avgWin: avgWin.toFixed(2), avgLoss: avgLoss.toFixed(2), bestDay, pnlCurve, strategyBreakdown, dayPnl });
  } catch (err) {
    console.error("Failed to fetch analytics:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

app.post("/api/trademaster/journal", async (req, res): Promise<void> => {
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
      sessionId: sessionId as string, assetName: assetName as string,
      assetType: (assetType as string) || "equity",
      direction: ((direction as string) || "long") as "long" | "short",
      entryPrice: ep.toString(), exitPrice: xp !== null ? xp.toString() : null,
      quantity: qty, strategyUsed: (strategyUsed as string) || null, notes: (notes as string) || null,
      entryDate: entryDate ? new Date(entryDate as string) : new Date(),
      exitDate: exitDate ? new Date(exitDate as string) : null,
      outcome, pnl: pnl !== null ? pnl.toFixed(2) : null,
    }).returning();
    res.json({ trade });
  } catch (err) {
    console.error("Failed to add trade:", err);
    res.status(500).json({ error: "Failed to add trade" });
  }
});

app.put("/api/trademaster/journal/:id", async (req, res): Promise<void> => {
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
      outcome, pnl,
    }).where(eq(tradeMasterJournal.id, id)).returning();
    res.json({ trade: updated });
  } catch (err) {
    console.error("Failed to update trade:", err);
    res.status(500).json({ error: "Failed to update trade" });
  }
});

app.delete("/api/trademaster/journal/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(tradeMasterJournal).where(eq(tradeMasterJournal.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete trade:", err);
    res.status(500).json({ error: "Failed to delete trade" });
  }
});

// ─── Scanner ──────────────────────────────────────────────────────────────────

app.get("/api/trademaster/scanner", async (req, res): Promise<void> => {
  try {
    const { session_id, segment = "equity", interval = "5m" } = req.query;
    const isPremium = await isSessionPremium(session_id as string | undefined);
    if (!isPremium) { res.status(403).json({ error: "Pro Educator subscription required", code: "SUBSCRIPTION_REQUIRED" }); return; }
    const fmpActive = FMP_FEED.price != null && FMP_FEED.price > 0 && (Date.now() - FMP_FEED.ts < 5 * 60_000);
    const seg = typeof segment === "string" ? segment : "equity";
    const ivl = typeof interval === "string" && ["5m", "15m", "1h"].includes(interval) ? interval : "5m";
    const cacheKey = `${seg}_${ivl}`;
    const hit = SCANNER_CACHE.get(cacheKey);
    if (hit && Date.now() - hit.ts < SCANNER_TTL) { res.json(hit.data); return; }
    let universe = [...EQUITY_UNIVERSE, ...INDEX_UNIVERSE];
    if (seg === "equity") universe = EQUITY_UNIVERSE;
    else if (seg === "fno") universe = [...INDEX_UNIVERSE, ...EQUITY_UNIVERSE.slice(0, 12)];
    const staleSources: string[] = [];
    let latestDataDate: string | null = null;
    const settled = await Promise.allSettled(universe.map(async (stock) => {
      const data = await fetchScannerOHLCV(stock.symbol, ivl);
      if (!data) return null;
      const { highs, lows, closes, vols, cmp, changePct, lastCandleDate, isStale } = data;
      if (isStale && lastCandleDate) staleSources.push(stock.symbol);
      if (lastCandleDate && (!latestDataDate || lastCandleDate > latestDataDate)) latestDataDate = lastCandleDate;
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
        symbol: stock.symbol, name: stock.name, cmp: parseFloat(cmp.toFixed(2)), signal, entry: parseFloat(entry.toFixed(2)),
        sl: parseFloat(slVal.toFixed(2)), pt1: parseFloat(pt1.toFixed(2)), pt2: parseFloat(pt2.toFixed(2)),
        rsi: parseFloat(rsi.toFixed(1)), vwap: parseFloat(vwap.toFixed(2)), volumeRatio: volRatio,
        isBreakout: signal === "buy" ? isBreakout : isBreakdown, strength, reason: conds.join(" · "),
        segment: stock.seg, changePercent: changePct != null ? parseFloat(changePct.toFixed(2)) : null,
      } satisfies ScanResult;
    }));
    const valid = settled.filter((r): r is PromiseFulfilledResult<ScanResult | null> => r.status === "fulfilled" && r.value !== null).map(r => r.value!);
    const today = todayIST();
    const response: ScannerResponse = {
      buy: valid.filter(r => r.signal === "buy").sort((a, b) => b.strength - a.strength).slice(0, 5),
      sell: valid.filter(r => r.signal === "sell").sort((a, b) => b.strength - a.strength).slice(0, 5),
      scannedAt: new Date().toISOString(),
      totalScanned: universe.length,
      fmpFeed: fmpActive ? { price: FMP_FEED.price!, name: FMP_FEED.name!, active: true } : { price: null, name: null, active: false },
      dataDate: latestDataDate, isStale: staleSources.length > 0, staleSources: staleSources.slice(0, 10), todayIST: today,
    };
    SCANNER_CACHE.set(cacheKey, { data: response, ts: Date.now() });
    res.json(response);
  } catch (err) {
    console.error("Scanner failed:", err);
    res.status(500).json({ error: "Scanner failed" });
  }
});

// ─── Telegram ─────────────────────────────────────────────────────────────────

app.post("/api/trademaster/telegram", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const { message } = req.body as { message?: unknown };
    if (typeof message !== "string" || !message.trim()) { res.status(400).json({ error: "Message is required" }); return; }
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    if (!botToken || !channelId) { res.status(500).json({ error: "Telegram not configured." }); return; }
    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: channelId, text: message.trim(), parse_mode: "HTML" }), signal: AbortSignal.timeout(10000) });
    if (!resp.ok) { res.status(500).json({ error: "Failed to send to Telegram" }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to send Telegram message:", err);
    res.status(500).json({ error: "Failed to send Telegram message" });
  }
});

// ─── Error handler ────────────────────────────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
