import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Search, TrendingUp, TrendingDown, CheckCircle, RefreshCw,
  Info, Lock, Crown, ChevronRight, Star, BarChart2, Zap, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";

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

interface StocksResponse {
  stocks: HalalStock[];
  total: number;
}

const SECTOR_COLORS: Record<string, string> = {
  Technology: "bg-blue-100 text-blue-700 border-blue-200",
  Healthcare: "bg-green-100 text-green-700 border-green-200",
  Consumer: "bg-orange-100 text-orange-700 border-orange-200",
  "Financial Services": "bg-purple-100 text-purple-700 border-purple-200",
  Industrials: "bg-gray-100 text-gray-700 border-gray-200",
  "Clean Energy": "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const FREE_LIMIT = 3;

function formatMarketCap(cap: number | null): string {
  if (!cap) return "N/A";
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(0)}M`;
  return `$${cap.toLocaleString()}`;
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
  const [stocks, setStocks] = useState<HalalStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("All");
  const [sectors, setSectors] = useState<string[]>(["All"]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const { isAuthenticated } = useAuth();

  const fetchStocks = async (q = search, sec = sector) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      if (sec && sec !== "All") params.set("sector", sec);
      const res = await fetch(`/api/halal-stocks?${params}`);
      const data: StocksResponse = await res.json();
      setStocks(data.stocks);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch stocks", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSectors = async () => {
    try {
      const res = await fetch("/api/halal-stocks/sectors");
      const data = await res.json();
      setSectors(data.sectors);
    } catch {}
  };

  useEffect(() => {
    fetchSectors();
    fetchStocks();
  }, []);

  const handleSearch = (val: string) => {
    setSearchInput(val);
    clearTimeout((window as any)._stockSearchTimer);
    (window as any)._stockSearchTimer = setTimeout(() => {
      setSearch(val);
      fetchStocks(val, sector);
    }, 400);
  };

  const handleSector = (sec: string) => {
    setSector(sec);
    fetchStocks(search, sec);
  };

  const visibleStocks = isAuthenticated ? stocks : stocks.slice(0, FREE_LIMIT);
  const lockedStocks = isAuthenticated ? [] : stocks.slice(FREE_LIMIT);
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
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchStocks(search, sector)} disabled={isLoading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
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

      {/* Free limit notice */}
      {!isAuthenticated && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl p-4 mb-6 flex items-center justify-between gap-4 flex-wrap"
        >
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-secondary shrink-0" />
            <div>
              <p className="font-semibold">Free plan: 3 stocks visible</p>
              <p className="text-sm text-primary-foreground/80">Subscribe to unlock all {stocks.length > FREE_LIMIT ? stocks.length : "30"}+ screened halal stocks, full analysis, and alerts</p>
            </div>
          </div>
          <Button asChild variant="secondary" size="sm" className="font-semibold shrink-0">
            <Link href="/support"><Crown className="w-3.5 h-3.5 mr-1.5" /> Upgrade ₹999/mo</Link>
          </Button>
        </motion.div>
      )}

      {/* Stats bar */}
      {!isLoading && stocks.length > 0 && (
        <div className="flex items-center gap-6 mb-6 text-sm flex-wrap">
          <span className="text-muted-foreground">{isAuthenticated ? stocks.length : `${FREE_LIMIT} of ${stocks.length}`} stocks shown</span>
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
        {sectors.map(sec => (
          <button
            key={sec}
            onClick={() => handleSector(sec)}
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
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : stocks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No halal stocks found for your search.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleStocks.map((stock, i) => (
              <motion.div
                key={stock.symbol}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
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

            {/* Locked / blurred stock cards for non-premium */}
            {lockedStocks.slice(0, 6).map((stock, i) => (
              <motion.div
                key={stock.symbol}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (visibleStocks.length + i) * 0.04 }}
                className="relative bg-card border border-border rounded-xl p-4 overflow-hidden"
              >
                {/* Blurred content */}
                <div className="blur-sm select-none pointer-events-none">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div>
                      <p className="font-bold text-sm font-mono">{stock.symbol}</p>
                      <p className="text-xs text-muted-foreground truncate">{stock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-base">$---</p>
                      <p className="text-xs text-green-600">+-.-- %</p>
                    </div>
                  </div>
                  <Badge className="text-[10px] px-1.5 py-0 border bg-gray-100 text-gray-700 border-gray-200 mb-2">{stock.sector}</Badge>
                  <p className="text-[10px] text-muted-foreground mt-1.5">••••••••••••••••••••</p>
                </div>
                {/* Lock overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/70 backdrop-blur-[1px]">
                  <Lock className="w-5 h-5 text-primary mb-1.5" />
                  <p className="text-xs font-semibold text-foreground text-center px-2">Premium</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Premium upsell row */}
          {!isAuthenticated && lockedStocks.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 rounded-xl p-6 text-center"
            >
              <Crown className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="text-lg font-serif font-bold text-foreground mb-1">
                {lockedStocks.length} more halal stocks locked
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                Subscribe to Nurul Quran Premium to access all screened stocks, real-time price alerts, detailed analysis reports, and portfolio tracking tools.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                  <Link href="/support"><Crown className="w-4 h-4 mr-1.5" /> Subscribe — ₹999/month</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/register">Create Free Account</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </>
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
                tip.isWarning
                  ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/40"
                  : "bg-card border-border hover:border-primary/30 transition-colors"
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl leading-none">{tip.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm ${tip.isWarning ? "text-red-700 dark:text-red-400" : "text-foreground"}`}>
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
              <p className={`text-xs leading-relaxed mb-3 ${tip.isWarning ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
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
