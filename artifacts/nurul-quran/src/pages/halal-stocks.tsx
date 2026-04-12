import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, TrendingUp, TrendingDown, CheckCircle, RefreshCw,
  Info, Star, BarChart2, Zap, Shield
} from "lucide-react";
import { motion } from "framer-motion";

interface HalalStock {
  symbol: string;
  name: string;
  sector: string;
  reason: string;
  screening: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  marketCap: number | null;
  currency: string;
}

const HALAL_STOCKS_BASE: Omit<HalalStock, "price" | "change" | "changePercent" | "marketCap" | "currency">[] = [
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

const ALL_SECTORS = ["All", ...Array.from(new Set(HALAL_STOCKS_BASE.map(s => s.sector)))];

const SECTOR_COLORS: Record<string, string> = {
  Technology: "bg-blue-100 text-blue-700 border-blue-200",
  Healthcare: "bg-green-100 text-green-700 border-green-200",
  Consumer: "bg-orange-100 text-orange-700 border-orange-200",
  "Financial Services": "bg-purple-100 text-purple-700 border-purple-200",
  Industrials: "bg-gray-100 text-gray-700 border-gray-200",
  "Clean Energy": "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function formatMarketCap(cap: number | null): string {
  if (!cap) return "N/A";
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(0)}M`;
  return `$${cap.toLocaleString()}`;
}

async function fetchPrices(symbols: string[]): Promise<Record<string, { price: number | null; change: number | null; changePercent: number | null }>> {
  const result: Record<string, { price: number | null; change: number | null; changePercent: number | null }> = {};
  symbols.forEach(s => { result[s] = { price: null, change: null, changePercent: null }; });
  try {
    const syms = symbols.join(",");
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${syms}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return result;
    const data = await res.json() as any;
    const quotes: any[] = data?.quoteResponse?.result ?? [];
    quotes.forEach((q: any) => {
      result[q.symbol] = {
        price: q.regularMarketPrice ?? null,
        change: q.regularMarketChange ?? null,
        changePercent: q.regularMarketChangePercent ?? null,
      };
    });
  } catch {
  }
  return result;
}

const LONG_TERM_TIPS = [
  {
    icon: "💻",
    title: "Technology Giants",
    tip: "Companies like Apple (AAPL) and Microsoft (MSFT) consistently pass Shariah screening — low debt ratios, no haram revenue streams. Tech is the single largest sector in halal-screened indices.",
    stocks: ["AAPL", "MSFT", "GOOG"],
    horizon: "5–10 years",
    risk: "Medium",
  },
  {
    icon: "🏥",
    title: "Healthcare & Pharma",
    tip: "Healthcare is considered one of the most Shariah-compliant sectors. Companies like Johnson & Johnson (JNJ) and UnitedHealth (UNH) have no alcohol/gambling exposure and low leverage.",
    stocks: ["JNJ", "UNH", "ABT"],
    horizon: "7–15 years",
    risk: "Low–Medium",
  },
  {
    icon: "🌿",
    title: "Clean Energy",
    tip: "Halal investors are increasingly choosing clean energy as a values-aligned sector. NextEra Energy (NEE) and First Solar (FSLR) align well with Islamic principles of stewardship (khalifa) of the earth.",
    stocks: ["NEE", "FSLR", "ENPH"],
    horizon: "10–20 years",
    risk: "Medium–High",
  },
  {
    icon: "🏗️",
    title: "Industrial & Infrastructure",
    tip: "Infrastructure and industrial companies building roads, bridges, and logistics networks are often Shariah-compliant. Caterpillar (CAT) and Deere (DE) are long-term plays on global construction.",
    stocks: ["CAT", "DE", "HON"],
    horizon: "5–10 years",
    risk: "Medium",
  },
  {
    icon: "🌍",
    title: "Emerging Markets ETFs",
    tip: "Shariah-compliant ETFs like iShares MSCI World Islamic (ISWD) or SP Funds S&P 500 Sharia ETF (SPUS) offer instant diversification across hundreds of screened stocks at low cost.",
    stocks: ["SPUS", "HLAL", "ISWD"],
    horizon: "10+ years",
    risk: "Medium",
  },
  {
    icon: "⚠️",
    title: "Sectors to Avoid",
    tip: "Conventional banking (interest-based), insurance (uncertain contracts), alcohol & tobacco, gambling, adult entertainment, and weapons manufacturers. Always avoid companies with debt ratio >33% of total assets.",
    stocks: [],
    horizon: "—",
    risk: "Haram",
    isWarning: true,
  },
];

export default function HalalStocks() {
  const [prices, setPrices] = useState<Record<string, { price: number | null; change: number | null; changePercent: number | null }>>({});
  const [pricesLoading, setPricesLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sector, setSector] = useState("All");

  const loadPrices = useCallback(async () => {
    setPricesLoading(true);
    const symbols = HALAL_STOCKS_BASE.map(s => s.symbol);
    const result = await fetchPrices(symbols);
    setPrices(result);
    setLastUpdated(new Date());
    setPricesLoading(false);
  }, []);

  useEffect(() => { loadPrices(); }, [loadPrices]);

  const handleSearch = (val: string) => {
    setSearchInput(val);
    clearTimeout((window as any)._stockSearchTimer);
    (window as any)._stockSearchTimer = setTimeout(() => setSearch(val.toLowerCase()), 350);
  };

  const filtered = HALAL_STOCKS_BASE.filter(s => {
    const matchSector = sector === "All" || s.sector === sector;
    const matchSearch = !search || s.name.toLowerCase().includes(search) || s.symbol.toLowerCase().includes(search);
    return matchSector && matchSearch;
  });

  const stocks: HalalStock[] = filtered.map(s => ({
    ...s,
    currency: "USD",
    ...(prices[s.symbol] ?? { price: null, change: null, changePercent: null }),
    marketCap: null,
  }));

  const positiveStocks = stocks.filter(s => s.changePercent != null && s.changePercent > 0).length;
  const negativeStocks = stocks.filter(s => s.changePercent != null && s.changePercent < 0).length;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 pb-40">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-6 h-6 text-primary" />
              <h1 className="text-3xl font-serif font-bold text-foreground">Halal Stock Screener</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              Shariah-compliant stocks screened based on Islamic finance principles — free from riba,
              haram industries, and excessive debt.
            </p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                Prices updated: {lastUpdated.toLocaleTimeString()}
                {!Object.values(prices).some(p => p.price != null) && " (live prices unavailable — showing screening data)"}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={loadPrices} disabled={pricesLoading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${pricesLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Screening banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div className="text-sm text-foreground">
          <span className="font-semibold text-primary">Screening Criteria:</span>{" "}
          No alcohol, tobacco, gambling, weapons, or conventional banking revenue.
          Interest-bearing debt &lt;33% of assets. Impermissible income &lt;5% of revenue.{" "}
          <span className="text-muted-foreground">Always verify with a qualified Islamic finance scholar.</span>
        </div>
      </div>

      {/* Stats bar */}
      {stocks.length > 0 && (
        <div className="flex items-center gap-6 mb-6 text-sm flex-wrap">
          <span className="text-muted-foreground">{stocks.length} stocks shown</span>
          {positiveStocks > 0 && (
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="w-4 h-4" /><span>{positiveStocks} gaining</span>
            </div>
          )}
          {negativeStocks > 0 && (
            <div className="flex items-center gap-1 text-red-500">
              <TrendingDown className="w-4 h-4" /><span>{negativeStocks} declining</span>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by company name or ticker..."
            value={searchInput}
            onChange={e => handleSearch(e.target.value)}
            className="pl-9"
            data-testid="input-stock-search"
          />
        </div>
      </div>

      {/* Sector Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ALL_SECTORS.map(sec => (
          <button
            key={sec}
            onClick={() => setSector(sec)}
            data-testid={`button-sector-${sec.toLowerCase().replace(/\s+/g, '-')}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              sector === sec
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* Stock Grid */}
      {stocks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No halal stocks found for your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {stocks.map((stock, i) => (
            <motion.div
              key={stock.symbol}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              data-testid={`card-stock-${stock.symbol}`}
              className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all hover:border-primary/30"
            >
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-bold text-sm text-foreground font-mono" data-testid={`text-symbol-${stock.symbol}`}>{stock.symbol}</span>
                    <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{stock.name}</p>
                </div>
                <div className="text-right shrink-0">
                  {stock.price != null ? (
                    <>
                      <p className="font-bold text-base text-foreground" data-testid={`text-price-${stock.symbol}`}>
                        ${stock.price.toFixed(2)}
                      </p>
                      {stock.changePercent != null && (
                        <p className={`text-xs font-medium ${stock.changePercent >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {stock.changePercent >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                        </p>
                      )}
                    </>
                  ) : pricesLoading ? (
                    <div className="w-12 h-4 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-xs text-muted-foreground">Price N/A</p>
                  )}
                </div>
              </div>
              <div className="mb-2">
                <Badge className={`text-[10px] px-1.5 py-0 border ${SECTOR_COLORS[stock.sector] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                  {stock.sector}
                </Badge>
              </div>
              {stock.change != null && (
                <div className={`flex items-center gap-1 text-xs mb-1 ${stock.change >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {stock.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{stock.change >= 0 ? "+" : ""}{stock.change.toFixed(2)}</span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">Cap: {formatMarketCap(stock.marketCap)}</p>
              <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-2 border-t border-border pt-1.5">{stock.reason}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Long-term Investment Tips */}
      <div className="mt-14">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-5 h-5 text-secondary fill-secondary" />
          <h2 className="text-2xl font-serif font-bold text-foreground">Long-Term Halal Investment Guide</h2>
        </div>
        <p className="text-muted-foreground mb-8 max-w-2xl">
          Curated guidance for building a Shariah-compliant portfolio aligned with Islamic values and long-term wealth.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {LONG_TERM_TIPS.map((tip, i) => (
            <motion.div
              key={tip.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`rounded-xl border p-5 ${
                (tip as any).isWarning
                  ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/40"
                  : "bg-card border-border hover:border-primary/30 transition-colors"
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl leading-none">{tip.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm ${(tip as any).isWarning ? "text-red-700 dark:text-red-400" : "text-foreground"}`}>
                    {tip.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {tip.horizon !== "—" && (
                      <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                        Horizon: {tip.horizon}
                      </span>
                    )}
                    <span className={`text-[10px] rounded px-1.5 py-0.5 font-medium ${
                      tip.risk === "Haram"
                        ? "bg-red-100 text-red-700"
                        : tip.risk === "Low–Medium"
                        ? "bg-green-100 text-green-700"
                        : tip.risk === "Medium–High"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      Risk: {tip.risk}
                    </span>
                  </div>
                </div>
              </div>
              <p className={`text-xs leading-relaxed mb-3 ${(tip as any).isWarning ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                {tip.tip}
              </p>
              {tip.stocks.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tip.stocks.map(s => (
                    <span key={s} className="text-[11px] font-mono font-bold bg-primary/8 text-primary border border-primary/20 rounded px-1.5 py-0.5">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Strategy principles */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {[
            { icon: BarChart2, title: "Dollar-Cost Averaging", desc: "Invest fixed amounts monthly regardless of price — reduces timing risk and aligns with Islamic principles of avoiding speculation (maysir)." },
            { icon: Shield, title: "Diversify Across Sectors", desc: "Spread across Tech, Healthcare, Clean Energy, and Industrials. Never put more than 20% in a single company to manage risk (tawakkal with due diligence)." },
            { icon: Zap, title: "Halal ETFs First", desc: "For beginners, start with Shariah-screened ETFs (SPUS, HLAL) before individual stocks. They offer instant halal diversification with low fees." },
          ].map(item => (
            <div key={item.title} className="bg-primary/5 border border-primary/15 rounded-xl p-4">
              <item.icon className="w-5 h-5 text-primary mb-2" />
              <h4 className="font-semibold text-sm text-foreground mb-1">{item.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-10 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Disclaimer:</strong> This screening tool is for educational purposes only. Halal screening results are based on commonly accepted Islamic finance criteria but are not a fatwa.
        Please consult a qualified Islamic finance scholar before making investment decisions.
        Past performance is not indicative of future results.
      </div>
    </div>
  );
}
