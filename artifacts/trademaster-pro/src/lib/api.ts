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

export function resolveYahooSymbol(assetName: string, segment: string): string {
  const upper = assetName.toUpperCase().trim();
  const INDEX_MAP: Record<string, string> = {
    "NIFTY 50": "^NSEI", "NIFTY50": "^NSEI", "NIFTY": "^NSEI",
    "BANKNIFTY": "^NSEBANK", "BANK NIFTY": "^NSEBANK", "BANK NIFTY 50": "^NSEBANK",
    "FINNIFTY": "^NSEMDCP50", "FIN NIFTY": "^NSEMDCP50",
    "MIDCAPNIFTY": "^NSEMDCP50", "MIDCAP NIFTY": "^NSEMDCP50",
    "SENSEX": "^BSESN",
    "USDINR": "USDINR=X", "USD/INR": "USDINR=X", "USD INR": "USDINR=X",
    "EURINR": "EURINR=X", "EUR/INR": "EURINR=X",
    "GBPINR": "GBPINR=X", "GBP/INR": "GBPINR=X",
    "GOLD": "GC=F", "MCX GOLD": "GC=F", "GOLD MINI": "GC=F",
    "SILVER": "SI=F", "MCX SILVER": "SI=F",
    "CRUDEOIL": "CL=F", "CRUDE OIL": "CL=F", "MCX CRUDE": "CL=F", "CRUDE": "CL=F",
    "NATURAL GAS": "NG=F", "NATURALGAS": "NG=F",
    "COPPER": "HG=F",
  };
  if (INDEX_MAP[upper]) return INDEX_MAP[upper];
  if (segment === "commodity") {
    if (upper.includes("GOLD")) return "GC=F";
    if (upper.includes("SILVER")) return "SI=F";
    if (upper.includes("CRUDE") || upper.includes("OIL")) return "CL=F";
  }
  if (segment === "currency") {
    if (upper.includes("USD")) return "USDINR=X";
    if (upper.includes("EUR")) return "EURINR=X";
  }
  const stripped = upper
    .replace(/\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*\d{2,4}.*$/i, "")
    .replace(/\s+(FUT|CE|PE)$/, "")
    .trim();
  return `${stripped.replace(/\s+/g, "")}.NS`;
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

export async function fetchTicker(): Promise<{ ticker: TickerData }> {
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

export async function fetchPerformance(params: { segment?: string; from?: string; to?: string; sessionId?: string | null }): Promise<{ stats: PerformanceStats; signals: PerformanceSignal[]; isPremium: boolean }> {
  const p = new URLSearchParams();
  if (params.segment) p.set("segment", params.segment);
  if (params.from) p.set("from", params.from);
  if (params.to) p.set("to", params.to);
  if (params.sessionId) p.set("sessionId", params.sessionId);
  const qs = p.toString();
  return apiFetch(`${API_BASE}/performance${qs ? `?${qs}` : ""}`);
}
