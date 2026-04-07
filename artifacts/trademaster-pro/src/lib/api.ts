const API_BASE = "/api/trademaster";

export type Signal = {
  id: number;
  segment: string;
  assetName: string;
  signalType: "buy" | "sell";
  entryPrice: string;
  stopLoss: string;
  target1: string;
  target2?: string | null;
  riskReward?: string | null;
  iv?: string | null;
  pcr?: string | null;
  notes?: string | null;
  isPremium: boolean;
  status: "active" | "target_hit" | "sl_hit";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type Subscription = {
  id: number;
  sessionId: string;
  email: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type TickerQuote = {
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  high: number | null;
  low: number | null;
};

export type TickerData = Record<string, TickerQuote>;

export type LiveQuote = {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  prevClose: number | null;
};

const INDEX_MAP: Record<string, string> = {
  // Nifty 50 — all common naming variants including futures
  "NIFTY": "^NSEI", "NIFTY 50": "^NSEI", "NIFTY50": "^NSEI",
  "NIFTY FUTURES": "^NSEI", "NIFTY 50 FUTURES": "^NSEI",
  "NIFTY FUT": "^NSEI", "NIFTY 50 FUT": "^NSEI",
  "NIFTY SPOT": "^NSEI", "NIFTY 50 SPOT": "^NSEI",
  // Bank Nifty — all common naming variants
  "BANKNIFTY": "^NSEBANK", "BANK NIFTY": "^NSEBANK", "BANK NIFTY 50": "^NSEBANK",
  "BANKNIFTY FUTURES": "^NSEBANK", "BANK NIFTY FUTURES": "^NSEBANK",
  "BANKNIFTY FUT": "^NSEBANK", "BANK NIFTY FUT": "^NSEBANK",
  "BANKNIFTY SPOT": "^NSEBANK", "BANK NIFTY SPOT": "^NSEBANK",
  // Fin Nifty / Midcap Nifty
  "FINNIFTY": "^NSEMDCP50", "FIN NIFTY": "^NSEMDCP50", "NIFTY FIN SERVICE": "^NSEMDCP50",
  "MIDCAPNIFTY": "^NSEMDCP50", "MIDCAP NIFTY": "^NSEMDCP50",
  // Sensex
  "SENSEX": "^BSESN",
  // Currency
  "USDINR": "USDINR=X", "USD/INR": "USDINR=X", "USD INR": "USDINR=X",
  "EURINR": "EURINR=X", "EUR/INR": "EURINR=X",
  "GBPINR": "GBPINR=X", "GBP/INR": "GBPINR=X",
  // Commodities (direct name lookup)
  "GOLD": "GC=F", "MCX GOLD": "GC=F", "GOLD MCX": "GC=F", "GOLD MINI": "GC=F",
  "SILVER": "SI=F", "MCX SILVER": "SI=F",
  "CRUDEOIL": "CL=F", "CRUDE OIL": "CL=F", "MCX CRUDE": "CL=F", "CRUDE": "CL=F",
  "NATURAL GAS": "NG=F", "NATURALGAS": "NG=F",
  "COPPER": "HG=F",
};

// Maps common full company names to their NSE ticker symbols.
// These are typically how signal admins enter asset names.
const COMPANY_TICKER_MAP: Record<string, string> = {
  "RELIANCE INDUSTRIES": "RELIANCE",
  "TATA CONSULTANCY SERVICES": "TCS",
  "TATA CONSULTANCY": "TCS",
  "INFOSYS": "INFY",
  "HDFC BANK": "HDFCBANK",
  "HDFC": "HDFC",
  "ICICI BANK": "ICICIBANK",
  "STATE BANK OF INDIA": "SBIN",
  "SBI": "SBIN",
  "AXIS BANK": "AXISBANK",
  "KOTAK MAHINDRA BANK": "KOTAKBANK",
  "KOTAK BANK": "KOTAKBANK",
  "LARSEN AND TOUBRO": "LT",
  "LARSEN & TOUBRO": "LT",
  "L&T": "LT",
  "ITC": "ITC",
  "HINDUSTAN UNILEVER": "HINDUNILVR",
  "HUL": "HINDUNILVR",
  "BHARTI AIRTEL": "BHARTIARTL",
  "AIRTEL": "BHARTIARTL",
  "WIPRO": "WIPRO",
  "HCL TECHNOLOGIES": "HCLTECH",
  "HCL TECH": "HCLTECH",
  "SUN PHARMA": "SUNPHARMA",
  "SUN PHARMACEUTICAL": "SUNPHARMA",
  "MARUTI SUZUKI": "MARUTI",
  "MARUTI": "MARUTI",
  "TATA MOTORS": "TATAMOTORS",
  "BAJAJ FINANCE": "BAJFINANCE",
  "BAJAJ FINSERV": "BAJAJFINSV",
  "ASIAN PAINTS": "ASIANPAINT",
  "TITAN COMPANY": "TITAN",
  "TITAN": "TITAN",
  "ULTRA TECH CEMENT": "ULTRACEMCO",
  "ULTRATECH CEMENT": "ULTRACEMCO",
  "ADANI ENTERPRISES": "ADANIENT",
  "ADANI PORTS": "ADANIPORTS",
  "NTPC": "NTPC",
  "POWER GRID": "POWERGRID",
  "ONGC": "ONGC",
  "OIL AND NATURAL GAS": "ONGC",
  "CIPLA": "CIPLA",
  "DR REDDYS": "DRREDDY",
  "DR REDDY": "DRREDDY",
  "DIVIS LABS": "DIVISLAB",
  "DIVIS LABORATORIES": "DIVISLAB",
  "NESTLE INDIA": "NESTLEIND",
  "NESTLE": "NESTLEIND",
  "GRASIM INDUSTRIES": "GRASIM",
  "GRASIM": "GRASIM",
  "HINDALCO INDUSTRIES": "HINDALCO",
  "HINDALCO": "HINDALCO",
  "TATA STEEL": "TATASTEEL",
  "JSW STEEL": "JSWSTEEL",
  "HERO MOTOCORP": "HEROMOTOCO",
  "BAJAJ AUTO": "BAJAJ-AUTO",
  "EICHER MOTORS": "EICHERMOT",
  "INDUSIND BANK": "INDUSINDBK",
  "TECH MAHINDRA": "TECHM",
  "SHREE CEMENT": "SHREECEM",
  "BRITANNIA INDUSTRIES": "BRITANNIA",
  "BRITANNIA": "BRITANNIA",
};

const COMMODITY_LABELS: Record<string, string> = {
  "GC=F": "Gold (MCX)",
  "SI=F": "Silver (MCX)",
  "CL=F": "Crude Oil (MCX)",
  "NG=F": "Natural Gas (MCX)",
  "HG=F": "Copper (MCX)",
};

const INDEX_LABELS: Record<string, string> = {
  "^NSEI": "Nifty 50 Spot",
  "^NSEBANK": "Bank Nifty Spot",
  "^NSEMDCP50": "Fin Nifty Spot",
  "^BSESN": "Sensex Spot",
};

function extractFnOUnderlying(upper: string): { symbol: string; label: string } {
  if (/^(BANKNIFTY|BANK\s*NIFTY)/.test(upper)) return { symbol: "^NSEBANK", label: "Bank Nifty Spot" };
  if (/^(FINNIFTY|FIN\s*NIFTY|NIFTY\s*FIN)/.test(upper)) return { symbol: "^NSEMDCP50", label: "Fin Nifty Spot" };
  if (/^(MIDCAPNIFTY|MIDCAP\s*NIFTY)/.test(upper)) return { symbol: "^NSEMDCP50", label: "Midcap Nifty Spot" };
  if (/^NIFTY/.test(upper)) return { symbol: "^NSEI", label: "Nifty 50 Spot" };
  if (/^SENSEX/.test(upper)) return { symbol: "^BSESN", label: "Sensex Spot" };
  const match = upper.match(/^([A-Z&]+)/);
  const ticker = match ? match[1] : "NIFTY";
  if (ticker === "NIFTY") return { symbol: "^NSEI", label: "Nifty 50 Spot" };
  return { symbol: `${ticker}.NS`, label: `${ticker} Spot (NSE)` };
}

export type UnderlyingInfo = {
  yahooSymbol: string;
  spotLabel: string;
  isFnO: boolean;
  isCommodity: boolean;
};

export function resolveUnderlyingInfo(assetName: string, segment: string): UnderlyingInfo {
  // Strip parenthetical annotations first: "L&T (LARSEN & TOUBRO)" → "L&T"
  const upper = assetName.toUpperCase().trim().replace(/\s*\([^)]*\)/g, "").trim();
  const isFnO = ["options", "futures", "fno"].includes(segment);
  const isCommodity = segment === "commodity";

  // 1. Direct index/commodity/currency lookup (catches futures variants too)
  if (INDEX_MAP[upper]) {
    const sym = INDEX_MAP[upper];
    return { yahooSymbol: sym, spotLabel: INDEX_LABELS[sym] ?? COMMODITY_LABELS[sym] ?? assetName, isFnO, isCommodity };
  }

  // 2. Segment-level routing — "nifty" / "banknifty" always resolve to their index
  if (segment === "nifty") {
    const { symbol, label } = extractFnOUnderlying(upper);
    return { yahooSymbol: symbol, spotLabel: label, isFnO: false, isCommodity: false };
  }
  if (segment === "banknifty") {
    return { yahooSymbol: "^NSEBANK", spotLabel: "Bank Nifty Spot", isFnO: false, isCommodity: false };
  }

  // 3. F&O — extract underlying index / equity
  if (isFnO) {
    const { symbol, label } = extractFnOUnderlying(upper);
    return { yahooSymbol: symbol, spotLabel: label, isFnO: true, isCommodity: false };
  }

  // 4. Commodity segment
  if (isCommodity) {
    let sym = "GC=F";
    if (upper.includes("SILVER")) sym = "SI=F";
    else if (upper.includes("CRUDE") || upper.includes("OIL")) sym = "CL=F";
    else if (upper.includes("GAS") || upper.includes("NATURAL")) sym = "NG=F";
    else if (upper.includes("COPPER")) sym = "HG=F";
    return { yahooSymbol: sym, spotLabel: COMMODITY_LABELS[sym] ?? assetName, isFnO: false, isCommodity: true };
  }

  // 5. Currency segment
  if (segment === "currency") {
    let sym = "USDINR=X";
    if (upper.includes("EUR")) sym = "EURINR=X";
    else if (upper.includes("GBP")) sym = "GBPINR=X";
    return { yahooSymbol: sym, spotLabel: `${assetName} (Forex)`, isFnO: false, isCommodity: false };
  }

  // 6. Intraday — try F&O extraction first (handles "NIFTY 50 FUTURES", "BANKNIFTY FUTURES", etc.)
  if (segment === "intraday") {
    if (/^(NIFTY|BANKNIFTY|BANK\s*NIFTY|FINNIFTY|SENSEX|MIDCAP\s*NIFTY)/.test(upper)) {
      const { symbol, label } = extractFnOUnderlying(upper);
      return { yahooSymbol: symbol, spotLabel: label, isFnO: false, isCommodity: false };
    }
  }

  // 7. Equity (and intraday equity) — company name to NSE ticker mapping
  if (COMPANY_TICKER_MAP[upper]) {
    const ticker = COMPANY_TICKER_MAP[upper];
    return { yahooSymbol: `${ticker}.NS`, spotLabel: `${ticker} (NSE)`, isFnO: false, isCommodity: false };
  }

  // 8. Equity fallback — strip expiry suffixes, then strip generic suffixes that aren't part of NSE ticker
  const stripped = upper
    .replace(/\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*\d{2,4}.*$/i, "")
    .replace(/\s+(FUTURES|FUTURE|FUT|OPTIONS|OPTION|CE|PE|CALL|PUT)$/i, "")
    .replace(/\s+\d+\s*(CE|PE|CALL|PUT)?$/i, "")
    .replace(/\s+(INDUSTRIES|INDUSTRY|LIMITED|LTD|ENTERPRISES|ENTERPRISE|CORPORATION|CORP)$/i, "")
    .trim();
  const ticker = stripped.replace(/\s+/g, "");
  return { yahooSymbol: `${ticker}.NS`, spotLabel: `${ticker} (NSE)`, isFnO: false, isCommodity: false };
}

export function resolveYahooSymbol(assetName: string, segment: string): string {
  return resolveUnderlyingInfo(assetName, segment).yahooSymbol;
}

export async function fetchQuote(yahooSymbol: string): Promise<{ quotes: Record<string, LiveQuote | null> }> {
  return apiFetch(`${API_BASE}/quote?symbol=${encodeURIComponent(yahooSymbol)}`);
}

export type RazorpayOrder = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
};

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchSignals(segment?: string, sessionId?: string | null): Promise<{ signals: Signal[] }> {
  const params = new URLSearchParams();
  if (segment) params.set("segment", segment);
  if (sessionId) params.set("sessionId", sessionId);
  const qs = params.toString();
  return apiFetch(`${API_BASE}/signals${qs ? `?${qs}` : ""}`);
}

export async function fetchTicker(): Promise<{ ticker: TickerData; sessionDate?: string }> {
  return apiFetch(`${API_BASE}/ticker`);
}

export async function createSignal(data: Record<string, unknown>, adminToken: string): Promise<{ signal: Signal }> {
  return apiFetch(`${API_BASE}/signals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(data),
  });
}

export async function updateSignal(id: number, data: Record<string, unknown>, adminToken: string): Promise<{ signal: Signal }> {
  return apiFetch(`${API_BASE}/signals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(data),
  });
}

export async function deleteSignal(id: number, adminToken: string): Promise<{ success: boolean }> {
  return apiFetch(`${API_BASE}/signals/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
}

export async function postToTelegram(message: string, adminToken: string): Promise<{ success: boolean }> {
  return apiFetch(`${API_BASE}/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ message }),
  });
}

export async function createRazorpayOrder(): Promise<RazorpayOrder> {
  return apiFetch(`${API_BASE}/payment/order`, { method: "POST", headers: { "Content-Type": "application/json" } });
}

export async function verifyRazorpayPayment(data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  email?: string;
}): Promise<{ success: boolean; sessionId: string }> {
  return apiFetch(`${API_BASE}/payment/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function checkSubscription(sessionId: string): Promise<{ isPremium: boolean; subscription: Subscription | null }> {
  return apiFetch(`${API_BASE}/subscription/check?sessionId=${encodeURIComponent(sessionId)}`);
}

export async function fetchSubscriptions(adminToken: string): Promise<{ subscriptions: Subscription[]; total: number }> {
  return apiFetch(`${API_BASE}/subscriptions`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
}

export async function updateSubscription(id: number, status: string, adminToken: string): Promise<{ subscription: Subscription }> {
  return apiFetch(`${API_BASE}/subscriptions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status }),
  });
}

export type InvestmentReport = {
  id: number;
  category: string;
  instrumentName: string;
  instrumentCode: string | null;
  analystRating: string;
  riskLevel: string;
  suggestedAllocationPct: number | null;
  recommendedHorizon: string;
  rationale: string | null;
  isActive?: boolean;
  createdAt?: string;
};

export async function fetchReports(category?: string, sessionId?: string | null): Promise<{ reports: InvestmentReport[]; isPremium: boolean }> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (sessionId) params.set("sessionId", sessionId);
  const qs = params.toString();
  return apiFetch(`${API_BASE}/reports${qs ? `?${qs}` : ""}`);
}

export async function seedReports(adminToken: string): Promise<{ message: string; count?: number }> {
  return apiFetch(`${API_BASE}/reports/seed`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
}

export type PerformanceSignal = {
  id: number;
  segment: string;
  assetName: string;
  signalType: string;
  entryPrice: string;
  stopLoss: string;
  target1: string;
  target2?: string | null;
  riskReward?: string | null;
  status: string;
  isPremium: boolean;
  createdAt: string;
};

export type PerformanceStats = {
  total: number;
  targetHit: number;
  slHit: number;
  open: number;
  successRate: string;
  avgRR: string | null;
};

export type JournalTrade = {
  id: number;
  sessionId: string;
  assetName: string;
  assetType: string;
  direction: "long" | "short";
  entryPrice: string;
  exitPrice: string | null;
  quantity: number;
  strategyUsed: string | null;
  notes: string | null;
  entryDate: string;
  exitDate: string | null;
  outcome: "open" | "win" | "loss" | "breakeven";
  pnl: string | null;
  createdAt: string;
};

export type JournalAnalytics = {
  total: number;
  closed: number;
  wins: number;
  losses: number;
  winRate: string;
  totalPnl: string;
  avgWin: string;
  avgLoss: string;
  bestDay: string | null;
  pnlCurve: { index: number; pnl: number; cumulative: number; asset: string; date: string }[];
  strategyBreakdown: Record<string, { count: number; pnl: number }>;
  dayPnl: Record<string, number>;
};

export async function fetchJournal(sessionId: string): Promise<{ trades: JournalTrade[] }> {
  return apiFetch(`${API_BASE}/journal?session_id=${encodeURIComponent(sessionId)}`);
}

export async function addJournalTrade(data: Record<string, unknown>): Promise<{ trade: JournalTrade }> {
  return apiFetch(`${API_BASE}/journal`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
}

export async function updateJournalTrade(id: number, data: Record<string, unknown>): Promise<{ trade: JournalTrade }> {
  return apiFetch(`${API_BASE}/journal/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
}

export async function deleteJournalTrade(id: number): Promise<{ success: boolean }> {
  return apiFetch(`${API_BASE}/journal/${id}`, { method: "DELETE" });
}

export async function fetchJournalAnalytics(sessionId: string): Promise<JournalAnalytics> {
  return apiFetch(`${API_BASE}/journal/analytics?session_id=${encodeURIComponent(sessionId)}`);
}

export async function persistConsent(sessionId: string): Promise<{ success: boolean }> {
  return apiFetch(`${API_BASE}/consent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
}

export async function checkConsent(sessionId: string): Promise<{ hasConsented: boolean; acceptedAt: string | null }> {
  return apiFetch(`${API_BASE}/consent/check?sessionId=${encodeURIComponent(sessionId)}`);
}

export async function fetchPerformance(params: { segment?: string; from?: string; to?: string; sessionId?: string | null }): Promise<{ stats: PerformanceStats; signals: PerformanceSignal[]; isPremium: boolean }> {
  const p = new URLSearchParams();
  if (params.segment) p.set("segment", params.segment);
  if (params.from) p.set("from", params.from);
  if (params.to) p.set("to", params.to);
  if (params.sessionId) p.set("sessionId", params.sessionId);
  const qs = p.toString();
  return apiFetch(`${API_BASE}/performance${qs ? `?${qs}` : ""}`);
}

export type ScanResult = {
  symbol: string; name: string; cmp: number; signal: "buy" | "sell";
  entry: number; sl: number; pt1: number; pt2: number;
  rsi: number; vwap: number; volumeRatio: number; isBreakout: boolean;
  strength: number; reason: string; segment: string; changePercent: number | null;
};
export type ScannerResponse = {
  buy: ScanResult[]; sell: ScanResult[];
  scannedAt: string; totalScanned: number;
  fmpFeed?: { price: number | null; name: string | null; active: boolean };
  dataDate: string | null;
  isStale: boolean;
  staleSources: string[];
  todayIST: string;
};

export async function runScanner(sessionId: string, segment: string, interval: string): Promise<ScannerResponse> {
  const p = new URLSearchParams({ session_id: sessionId, segment, interval });
  const r = await fetch(`${API_BASE}/scanner?${p}`);
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: "Scanner failed" })) as { error?: string; code?: string };
    throw Object.assign(new Error(err.error ?? "Scanner failed"), { code: err.code });
  }
  return r.json();
}

// ─── Upstox API ───────────────────────────────────────────────────────────────

export type UpstoxStatus = {
  ok: boolean;
  connected: boolean;
  apiKeyConfigured: boolean;
  apiSecretConfigured: boolean;
  accessTokenConfigured: boolean;
  message?: string;
  user?: { name?: string; email?: string; broker?: string };
};

export type UpstoxStrike = {
  strike: number;
  ce: { ltp: number | null; oi: number | null; oiChange: number | null };
  pe: { ltp: number | null; oi: number | null; oiChange: number | null };
  isATM: boolean;
};

export type ChainSignal = {
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  title: string;
  detail: string;
  strength: "STRONG" | "MODERATE" | "WEAK";
  contract?: string;
};

export type UpstoxOptionChain = {
  ok: boolean;
  segment: string;
  expiry: string;
  contractType?: string;
  pcr: number | null;
  pcrOiChange: number | null;
  atmStrike: number;
  atmLTP: { ce: number | null; pe: number | null };
  maxCallStrike: number;
  maxPutStrike: number;
  maxPain: number;
  totalCallOI: number;
  totalPutOI: number;
  strikes: UpstoxStrike[];
  strikeInterval: number;
  signals: ChainSignal[];
  fetchedAt: string;
  error?: string;
};

export async function fetchUpstoxStatus(adminToken: string): Promise<UpstoxStatus> {
  const r = await fetch(`${API_BASE}/upstox/status`, {
    headers: { "Authorization": `Bearer ${adminToken}` },
  });
  return r.json();
}

export async function fetchUpstoxAuthUrl(adminToken: string): Promise<{ url: string; redirectUri: string }> {
  const r = await fetch(`${API_BASE}/upstox/auth-url`, {
    headers: { "Authorization": `Bearer ${adminToken}` },
  });
  if (!r.ok) throw new Error("Failed to get auth URL");
  return r.json();
}

export async function exchangeUpstoxCode(adminToken: string, code: string, redirectUri: string): Promise<{ ok: boolean; access_token?: string; error?: string }> {
  const r = await fetch(`${API_BASE}/upstox/token`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });
  return r.json();
}

// ── Master Signal Engine Types ────────────────────────────────────────────────

export type MasterSignalStrength = "Strong Buy" | "Buy" | "Neutral" | "Sell" | "Strong Sell";

export type OIAlert = {
  strike: number;
  optionType: "CE" | "PE";
  oiChange: number;
  oiChangePct: number;
  action: "Writing" | "Unwinding";
};

export type MasterSignal = {
  segment: string;
  timeframe: "Intraday" | "Positional";
  signal: MasterSignalStrength;
  entry: number;
  sl: number;
  target: number;
  target2: number;
  dataReason: string;
  indicators: {
    ema9?: number;
    vwap?: number;
    rsi?: number;
    pcr?: number;
    dma20?: number;
    dma50?: number;
    macdLine?: number;
    signalLine?: number;
    macdHistogram?: number;
    atr?: number;
  };
  oiAlerts: OIAlert[];
  confidence: number;
  fetchedAt: string;
};

export type MasterSignalsResponse = {
  signals: MasterSignal[];
  cached: boolean;
  fetchedAt: string;
  error?: string;
};

export async function fetchMasterSignals(adminToken: string): Promise<MasterSignalsResponse> {
  const r = await fetch(`${API_BASE}/master-signals`, {
    headers: { "Authorization": `Bearer ${adminToken}` },
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: "Failed to fetch master signals" })) as { error?: string };
    throw new Error(err.error ?? "Failed to fetch master signals");
  }
  return r.json();
}

export async function generateDailyTips(adminToken: string): Promise<{ message: string; generated: number; signals: Signal[] }> {
  const r = await fetch(`${API_BASE}/daily-tips`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${adminToken}`, "Content-Type": "application/json" },
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: "Failed to generate tips" })) as { error?: string };
    throw new Error(err.error ?? "Failed to generate daily tips");
  }
  return r.json();
}

export async function fetchUpstoxOptionChain(adminToken: string, segment: string, accessToken?: string, expiryDate?: string, contractType?: string): Promise<UpstoxOptionChain> {
  const params = new URLSearchParams({ segment });
  if (accessToken)   params.set("access_token", accessToken);
  if (expiryDate)    params.set("expiry_date", expiryDate);
  if (contractType)  params.set("contract_type", contractType);
  const r = await fetch(`${API_BASE}/upstox/option-chain?${params}`, {
    headers: { "Authorization": `Bearer ${adminToken}` },
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: "Option chain fetch failed" })) as { error?: string };
    throw new Error(err.error ?? "Option chain fetch failed");
  }
  return r.json();
}
