import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL;
async function fetchQuotes(symbols: string[]): Promise<Record<string, { price: number; change: number; changePct: number; name: string }>> {
  const res = await fetch(`${BASE}api/trademaster/quote?symbol=${symbols.join(",")}`);
  const json = await res.json();
  return json.quotes ?? {};
}

type Stock = { symbol: string; name: string; sector: string };

const INDICES: Stock[] = [
  { symbol: "^NSEI",    name: "Nifty 50",       sector: "Index" },
  { symbol: "^NSEBANK", name: "Bank Nifty",      sector: "Index" },
  { symbol: "^CNXFMCG", name: "Nifty FMCG",     sector: "Index" },
  { symbol: "^CNXIT",   name: "Nifty IT",        sector: "Index" },
  { symbol: "GC=F",     name: "MCX Gold",        sector: "Commodity" },
  { symbol: "CL=F",     name: "Crude Oil",       sector: "Commodity" },
  { symbol: "USDINR=X", name: "USD / INR",       sector: "Currency" },
];

const STOCKS: Stock[] = [
  // Banking
  { symbol: "HDFCBANK.NS", name: "HDFC Bank",       sector: "Banking" },
  { symbol: "ICICIBANK.NS",name: "ICICI Bank",      sector: "Banking" },
  { symbol: "SBIN.NS",     name: "State Bank",      sector: "Banking" },
  { symbol: "KOTAKBANK.NS",name: "Kotak Bank",      sector: "Banking" },
  // IT
  { symbol: "TCS.NS",      name: "TCS",             sector: "IT" },
  { symbol: "INFY.NS",     name: "Infosys",         sector: "IT" },
  { symbol: "WIPRO.NS",    name: "Wipro",           sector: "IT" },
  { symbol: "HCLTECH.NS",  name: "HCL Tech",        sector: "IT" },
  // Auto
  { symbol: "MARUTI.NS",   name: "Maruti Suzuki",   sector: "Auto" },
  { symbol: "TATAMOTORS.NS",name: "Tata Motors",    sector: "Auto" },
  { symbol: "M&M.NS",      name: "M&M",             sector: "Auto" },
  // Energy & Infra
  { symbol: "RELIANCE.NS", name: "Reliance",        sector: "Energy" },
  { symbol: "NTPC.NS",     name: "NTPC",            sector: "Energy" },
  { symbol: "POWERGRID.NS",name: "Power Grid",      sector: "Energy" },
  // Pharma & FMCG
  { symbol: "SUNPHARMA.NS",name: "Sun Pharma",      sector: "Pharma" },
  { symbol: "DRREDDY.NS",  name: "Dr. Reddy's",     sector: "Pharma" },
  { symbol: "HINDUNILVR.NS",name: "HUL",            sector: "FMCG" },
  { symbol: "ITC.NS",      name: "ITC",             sector: "FMCG" },
  // Others
  { symbol: "ADANIENT.NS", name: "Adani Ent.",      sector: "Conglomerate" },
  { symbol: "LT.NS",       name: "L&T",             sector: "Infra" },
];

const SECTOR_COLORS: Record<string, string> = {
  Index: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  Commodity: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  Currency: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  Banking: "text-green-400 bg-green-500/10 border-green-500/30",
  IT: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  Auto: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  Energy: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  Pharma: "text-pink-400 bg-pink-500/10 border-pink-500/30",
  FMCG: "text-lime-400 bg-lime-500/10 border-lime-500/30",
  Conglomerate: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
  Infra: "text-teal-400 bg-teal-500/10 border-teal-500/30",
};

function fmt(n: number) {
  if (n >= 1_00_000) return "₹" + (n / 1_00_000).toFixed(2) + "L";
  if (n >= 1_000) return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return "₹" + n.toFixed(2);
}

function QuoteCard({ stock, quotes }: { stock: Stock; quotes: Record<string, { price: number; change: number; changePct: number; name: string }> }) {
  const q = quotes[stock.symbol];
  const isPos = q && q.changePct >= 0;
  const sectorClass = SECTOR_COLORS[stock.sector] ?? "text-gray-400 bg-gray-500/10 border-gray-500/30";

  return (
    <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-4 hover:border-[hsl(220,13%,28%)] transition-all hover:shadow-lg">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-white font-bold text-sm truncate">{stock.name}</div>
          <div className="text-gray-600 text-xs font-mono mt-0.5 truncate">{stock.symbol.replace(".NS", "")}</div>
        </div>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${sectorClass}`}>
          {stock.sector}
        </span>
      </div>

      {q ? (
        <div className="flex items-end justify-between mt-3">
          <div className="text-xl font-black font-mono text-white">{fmt(q.price)}</div>
          <div className={`flex items-center gap-1 text-sm font-bold font-mono px-2 py-1 rounded-lg ${isPos ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"}`}>
            <span>{isPos ? "▲" : "▼"}</span>
            <span>{Math.abs(q.changePct).toFixed(2)}%</span>
          </div>
        </div>
      ) : (
        <div className="mt-3 h-8 bg-[hsl(220,13%,16%)] rounded animate-pulse" />
      )}
    </div>
  );
}

const ALL_SYMS = [...INDICES, ...STOCKS].map(s => s.symbol);

type FilterKey = "all" | "index" | "banking" | "it" | "auto" | "energy" | "pharma" | "commodity";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",      label: "All" },
  { key: "index",    label: "Indices" },
  { key: "banking",  label: "Banking" },
  { key: "it",       label: "IT" },
  { key: "auto",     label: "Auto" },
  { key: "energy",   label: "Energy" },
  { key: "pharma",   label: "Pharma" },
  { key: "commodity",label: "Commodities" },
];

const FILTER_SECTORS: Record<FilterKey, string[]> = {
  all:       [],
  index:     ["Index"],
  banking:   ["Banking"],
  it:        ["IT"],
  auto:      ["Auto"],
  energy:    ["Energy"],
  pharma:    ["Pharma"],
  commodity: ["Commodity", "Currency"],
};

export default function Watchlist() {
  const { data: quotes = {}, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["watchlist-quotes"],
    queryFn: () => fetchQuotes(ALL_SYMS),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  const [filter, setFilter] = useState<FilterKey>("all");

  const allStocks = [...INDICES, ...STOCKS];
  const visible = filter === "all"
    ? allStocks
    : allStocks.filter(s => FILTER_SECTORS[filter].includes(s.sector));

  const gainers = [...STOCKS]
    .filter(s => quotes[s.symbol]?.changePct !== undefined)
    .sort((a, b) => (quotes[b.symbol]?.changePct ?? 0) - (quotes[a.symbol]?.changePct ?? 0))
    .slice(0, 3);

  const losers = [...STOCKS]
    .filter(s => quotes[s.symbol]?.changePct !== undefined)
    .sort((a, b) => (quotes[a.symbol]?.changePct ?? 0) - (quotes[b.symbol]?.changePct ?? 0))
    .slice(0, 3);

  const updatedText = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Watchlist</h1>
          <p className="text-gray-500 text-sm mt-0.5">Live NSE prices · auto-refreshes every 30s</p>
        </div>
        <div className="text-right">
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 border border-green-500 border-t-transparent rounded-full animate-spin" />
              Fetching…
            </div>
          )}
          {updatedText && !isLoading && (
            <div className="text-xs text-gray-600 flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Updated {updatedText}
            </div>
          )}
          <div className="text-xs text-gray-700 mt-0.5">Prices delayed 15–30 min</div>
        </div>
      </div>

      {/* Top Movers */}
      {gainers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-green-950/20 border border-green-800/30 rounded-xl p-4">
            <div className="text-xs font-bold text-green-400 mb-3 flex items-center gap-1.5">
              <span>▲</span> Top Gainers Today
            </div>
            <div className="space-y-2">
              {gainers.map(s => {
                const q = quotes[s.symbol];
                return q ? (
                  <div key={s.symbol} className="flex items-center justify-between">
                    <div>
                      <div className="text-white text-sm font-semibold">{s.name}</div>
                      <div className="text-gray-500 text-xs font-mono">{fmt(q.price)}</div>
                    </div>
                    <div className="text-green-400 font-black font-mono text-sm">▲ {q.changePct.toFixed(2)}%</div>
                  </div>
                ) : null;
              })}
            </div>
          </div>
          <div className="bg-red-950/20 border border-red-800/30 rounded-xl p-4">
            <div className="text-xs font-bold text-red-400 mb-3 flex items-center gap-1.5">
              <span>▼</span> Top Losers Today
            </div>
            <div className="space-y-2">
              {losers.map(s => {
                const q = quotes[s.symbol];
                return q ? (
                  <div key={s.symbol} className="flex items-center justify-between">
                    <div>
                      <div className="text-white text-sm font-semibold">{s.name}</div>
                      <div className="text-gray-500 text-xs font-mono">{fmt(q.price)}</div>
                    </div>
                    <div className="text-red-400 font-black font-mono text-sm">▼ {Math.abs(q.changePct).toFixed(2)}%</div>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-5 scrollbar-none">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
              filter === f.key ? "bg-green-600/20 text-green-400 border border-green-600/30" : "text-gray-500 hover:text-gray-300 border border-transparent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {visible.map(s => (
          <QuoteCard key={s.symbol} stock={s} quotes={quotes} />
        ))}
      </div>

      <p className="text-center text-gray-700 text-xs mt-8">
        ⚠️ Prices are delayed 15–30 minutes. Not investment advice. Educational use only.
      </p>
    </div>
  );
}

