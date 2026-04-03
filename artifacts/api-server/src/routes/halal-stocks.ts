import { Router, type IRouter } from "express";

const router: IRouter = Router();

const HALAL_STOCKS = [
  { symbol: "AMZN", name: "Amazon", sector: "Technology", reason: "E-commerce & Cloud — no primary haram activity", screening: "pass" },
  { symbol: "MSFT", name: "Microsoft", sector: "Technology", reason: "Software & Cloud — halal compliant", screening: "pass" },
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology", reason: "Consumer Electronics — passes Islamic screening", screening: "pass" },
  { symbol: "GOOGL", name: "Alphabet (Google)", sector: "Technology", reason: "Technology & Search — halal core business", screening: "pass" },
  { symbol: "NVDA", name: "NVIDIA", sector: "Technology", reason: "AI & Semiconductors — compliant", screening: "pass" },
  { symbol: "META", name: "Meta Platforms", sector: "Technology", reason: "Social Media — passes debt screening", screening: "pass" },
  { symbol: "TSM", name: "TSMC", sector: "Technology", reason: "Semiconductor manufacturing — compliant", screening: "pass" },
  { symbol: "ASML", name: "ASML Holding", sector: "Technology", reason: "Chipmaking equipment — halal", screening: "pass" },
  { symbol: "ADBE", name: "Adobe Inc.", sector: "Technology", reason: "Creative software — halal compliant", screening: "pass" },
  { symbol: "CRM", name: "Salesforce", sector: "Technology", reason: "CRM Software — passes Islamic screening", screening: "pass" },
  { symbol: "ORCL", name: "Oracle", sector: "Technology", reason: "Enterprise software & cloud — compliant", screening: "pass" },
  { symbol: "CSCO", name: "Cisco Systems", sector: "Technology", reason: "Networking equipment — halal", screening: "pass" },
  { symbol: "SHOP", name: "Shopify", sector: "Technology", reason: "E-commerce platform — halal compliant", screening: "pass" },
  { symbol: "SNOW", name: "Snowflake", sector: "Technology", reason: "Cloud data platform — compliant", screening: "pass" },
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare", reason: "Medical devices & pharma — halal", screening: "pass" },
  { symbol: "UNH", name: "UnitedHealth Group", sector: "Healthcare", reason: "Healthcare services — halal compliant", screening: "pass" },
  { symbol: "ABT", name: "Abbott Laboratories", sector: "Healthcare", reason: "Medical devices — Islamic compliant", screening: "pass" },
  { symbol: "MDT", name: "Medtronic", sector: "Healthcare", reason: "Medical technology — halal", screening: "pass" },
  { symbol: "TMO", name: "Thermo Fisher Scientific", sector: "Healthcare", reason: "Life science instruments — compliant", screening: "pass" },
  { symbol: "PFE", name: "Pfizer", sector: "Healthcare", reason: "Pharmaceuticals — passes debt screening", screening: "pass" },
  { symbol: "LLY", name: "Eli Lilly", sector: "Healthcare", reason: "Pharmaceuticals — halal compliant", screening: "pass" },
  { symbol: "AMGN", name: "Amgen", sector: "Healthcare", reason: "Biotechnology — Islamic screening passed", screening: "pass" },
  { symbol: "ISRG", name: "Intuitive Surgical", sector: "Healthcare", reason: "Robotic surgery — halal", screening: "pass" },
  { symbol: "WMT", name: "Walmart", sector: "Consumer", reason: "Retail — passes debt/interest screening", screening: "pass" },
  { symbol: "TGT", name: "Target", sector: "Consumer", reason: "Retail — halal compliant core", screening: "pass" },
  { symbol: "COST", name: "Costco", sector: "Consumer", reason: "Wholesale retail — Islamic compliant", screening: "pass" },
  { symbol: "NKE", name: "Nike", sector: "Consumer", reason: "Sportswear — halal compliant", screening: "pass" },
  { symbol: "SBUX", name: "Starbucks", sector: "Consumer", reason: "Coffee & beverages — no haram revenue", screening: "pass" },
  { symbol: "HD", name: "Home Depot", sector: "Consumer", reason: "Home improvement retail — compliant", screening: "pass" },
  { symbol: "MCD", name: "McDonald's", sector: "Consumer", reason: "Halal-certified locations globally — passes screening", screening: "pass" },
  { symbol: "V", name: "Visa Inc.", sector: "Financial Services", reason: "Payment processing — interest-free service fees", screening: "pass" },
  { symbol: "MA", name: "Mastercard", sector: "Financial Services", reason: "Payment network — transaction fees only, halal", screening: "pass" },
  { symbol: "PYPL", name: "PayPal", sector: "Financial Services", reason: "Digital payments — mainly fee-based, compliant", screening: "pass" },
  { symbol: "SQ", name: "Block (Square)", sector: "Financial Services", reason: "Payments & fintech — halal compliant services", screening: "pass" },
  { symbol: "BA", name: "Boeing", sector: "Industrials", reason: "Commercial aviation — halal compliant", screening: "pass" },
  { symbol: "CAT", name: "Caterpillar", sector: "Industrials", reason: "Construction equipment — halal", screening: "pass" },
  { symbol: "RTX", name: "RTX Corporation", sector: "Industrials", reason: "Aerospace & defense — passes screening", screening: "pass" },
  { symbol: "ENPH", name: "Enphase Energy", sector: "Clean Energy", reason: "Solar microinverters — halal & ethical", screening: "pass" },
  { symbol: "FSLR", name: "First Solar", sector: "Clean Energy", reason: "Solar panel manufacturing — Islamic compliant", screening: "pass" },
  { symbol: "NEE", name: "NextEra Energy", sector: "Clean Energy", reason: "Renewable energy — halal compliant", screening: "pass" },
  { symbol: "TSLA", name: "Tesla", sector: "Clean Energy", reason: "Electric vehicles & clean energy — passes screening", screening: "pass" },
];

async function fetchQuote(symbol: string): Promise<{ price: number | null; change: number | null; changePercent: number | null; marketCap: number | null }> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { price: null, change: null, changePercent: null, marketCap: null };
    const data = await res.json() as any;
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) return { price: null, change: null, changePercent: null, marketCap: null };
    const price = meta.regularMarketPrice ?? null;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? null;
    const change = price != null && prevClose != null ? price - prevClose : null;
    const changePercent = change != null && prevClose ? (change / prevClose) * 100 : null;
    return { price, change, changePercent, marketCap: null };
  } catch {
    return { price: null, change: null, changePercent: null, marketCap: null };
  }
}

const quoteCache = new Map<string, { data: { price: number | null; change: number | null; changePercent: number | null; marketCap: number | null }; ts: number }>();
const CACHE_TTL = 3 * 60 * 1000;

async function fetchQuotesCached(symbols: string[]): Promise<Record<string, { price: number | null; change: number | null; changePercent: number | null; marketCap: number | null }>> {
  const now = Date.now();
  const toFetch = symbols.filter(s => {
    const c = quoteCache.get(s);
    return !c || now - c.ts > CACHE_TTL;
  });
  if (toFetch.length > 0) {
    await Promise.all(toFetch.map(async (sym) => {
      const data = await fetchQuote(sym);
      quoteCache.set(sym, { data, ts: Date.now() });
    }));
  }
  const results: Record<string, any> = {};
  symbols.forEach(s => { results[s] = quoteCache.get(s)?.data ?? { price: null, change: null, changePercent: null, marketCap: null }; });
  return results;
}

router.get("/halal-stocks", async (req, res): Promise<void> => {
  const { search, sector } = req.query as { search?: string; sector?: string };

  let stocks = HALAL_STOCKS;

  if (sector && sector !== "All") {
    stocks = stocks.filter(s => s.sector === sector);
  }

  if (search) {
    const q = search.toLowerCase();
    stocks = stocks.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.symbol.toLowerCase().includes(q)
    );
  }

  const emptyQuotes: Record<string, { price: null; change: null; changePercent: null; marketCap: null }> = {};
  stocks.forEach(s => { emptyQuotes[s.symbol] = { price: null, change: null, changePercent: null, marketCap: null }; });

  const quotePromise = fetchQuotesCached(stocks.map(s => s.symbol));
  const quoteTimeout = new Promise<typeof emptyQuotes>(resolve => setTimeout(() => resolve(emptyQuotes), 3000));
  const quotes = await Promise.race([quotePromise, quoteTimeout]);

  const results = stocks.map(stock => ({
    ...stock,
    ...(quotes[stock.symbol] ?? { price: null, change: null, changePercent: null, marketCap: null }),
    currency: "USD",
  }));

  res.json({ stocks: results, total: results.length });
});

router.get("/halal-stocks/sectors", async (req, res): Promise<void> => {
  const sectors = ["All", ...Array.from(new Set(HALAL_STOCKS.map(s => s.sector)))];
  res.json({ sectors });
});

export default router;
