import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, TrendingUp, TrendingDown, CheckCircle, RefreshCw, Info } from "lucide-react";
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

function formatMarketCap(cap: number | null): string {
  if (!cap) return "N/A";
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(0)}M`;
  return `$${cap.toLocaleString()}`;
}

export default function HalalStocks() {
  const [stocks, setStocks] = useState<HalalStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("All");
  const [sectors, setSectors] = useState<string[]>(["All"]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchInput, setSearchInput] = useState("");

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

  const positiveStocks = stocks.filter(s => s.changePercent != null && s.changePercent > 0).length;
  const negativeStocks = stocks.filter(s => s.changePercent != null && s.changePercent < 0).length;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-6 h-6 text-primary" />
              <h1 className="text-3xl font-serif font-bold text-foreground">Halal Stock Screener</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              Shariah-compliant stocks screened based on Islamic finance principles — free from riba (interest), 
              haram industries, and excessive debt ratios.
            </p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                Prices updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchStocks(search, sector)} disabled={isLoading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Prices
          </Button>
        </div>
      </motion.div>

      {/* Screening Criteria Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div className="text-sm text-foreground">
          <span className="font-semibold text-primary">Screening Criteria:</span>{" "}
          Stocks are screened for (1) no primary revenue from alcohol, tobacco, gambling, adult content, weapons, or conventional banking; 
          (2) interest-bearing debt &lt;33% of total assets; (3) impermissible income &lt;5% of total revenue.
          <span className="text-muted-foreground"> Always verify with a qualified Islamic finance scholar for your specific situation.</span>
        </div>
      </div>

      {/* Stats bar */}
      {!isLoading && stocks.length > 0 && (
        <div className="flex items-center gap-6 mb-6 text-sm flex-wrap">
          <span className="text-muted-foreground">{stocks.length} halal stocks</span>
          {positiveStocks > 0 && (
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span>{positiveStocks} gaining</span>
            </div>
          )}
          {negativeStocks > 0 && (
            <div className="flex items-center gap-1 text-red-500">
              <TrendingDown className="w-4 h-4" />
              <span>{negativeStocks} declining</span>
            </div>
          )}
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
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

      {/* Sector Filter Pills */}
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
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : stocks.length === 0 ? (
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
              transition={{ delay: i * 0.02 }}
              data-testid={`card-stock-${stock.symbol}`}
              className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all hover:border-primary/30"
            >
              {/* Top row */}
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
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
                        <p className={`text-xs font-medium ${stock.changePercent >= 0 ? "text-green-600" : "text-red-500"}`} data-testid={`text-change-${stock.symbol}`}>
                          {stock.changePercent >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Price N/A</p>
                  )}
                </div>
              </div>

              {/* Sector badge */}
              <div className="mb-2">
                <Badge
                  className={`text-[10px] px-1.5 py-0 border ${SECTOR_COLORS[stock.sector] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}
                >
                  {stock.sector}
                </Badge>
              </div>

              {/* Change amount */}
              {stock.change != null && (
                <div className={`flex items-center gap-1 text-xs mb-1 ${stock.change >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {stock.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{stock.change >= 0 ? "+" : ""}{stock.change.toFixed(2)}</span>
                </div>
              )}

              {/* Market cap */}
              <p className="text-[10px] text-muted-foreground">
                Cap: {formatMarketCap(stock.marketCap)}
              </p>

              {/* Screening reason */}
              <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-2 border-t border-border pt-1.5">
                {stock.reason}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-10 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Disclaimer:</strong> This screening tool is for educational purposes only. Stock prices are fetched live from Yahoo Finance. 
        Halal screening results are based on commonly accepted Islamic finance criteria but are not a fatwa. 
        Please consult a qualified Islamic finance scholar before making investment decisions. 
        Past performance is not indicative of future results.
      </div>
    </div>
  );
}
