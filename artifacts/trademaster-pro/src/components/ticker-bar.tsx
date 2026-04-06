import { useQuery } from "@tanstack/react-query";
import { fetchTicker } from "@/lib/api";

function isNSEMarketOpen(): boolean {
  const now = new Date();
  // IST = UTC + 5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  const day = ist.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const h = ist.getUTCHours(), m = ist.getUTCMinutes();
  const mins = h * 60 + m;
  return mins >= 555 && mins < 930; // 9:15 AM – 3:30 PM IST
}

export function TickerBar() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["ticker"],
    queryFn: fetchTicker,
    refetchInterval: 60000,
    staleTime: 55000,
  });

  const ticker = data?.ticker || {};
  const items = [
    { key: "nifty", label: "NIFTY 50" },
    { key: "banknifty", label: "BANK NIFTY" },
  ];

  const allPricesNull = !isLoading && items.every(({ key }) => ticker[key]?.price == null);
  const showUnavailable = isError || allPricesNull;
  const marketOpen = isNSEMarketOpen();

  return (
    <div className="bg-[hsl(220,13%,10%)] border-b border-[hsl(220,13%,18%)] px-4 py-2">
      <div className="flex items-center gap-6 overflow-x-auto scrollbar-none">
        <span className="text-xs text-gray-500 font-mono shrink-0">
          {marketOpen ? "LIVE" : "PREV"}
        </span>
        {isLoading ? (
          <span className="text-xs text-gray-600 font-mono animate-pulse">Loading market data…</span>
        ) : showUnavailable ? (
          <span className="text-xs text-amber-600 font-mono shrink-0">⚠ Market data unavailable</span>
        ) : (
          items.map(({ key, label }) => {
            const item = ticker[key];
            const price = item?.price;
            const change = item?.change;
            const changePercent = item?.changePercent;
            const isUp = change != null ? change >= 0 : null;
            return (
              <div key={key} className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400 font-mono">{label}</span>
                {price != null ? (
                  <>
                    <span className="text-sm font-mono font-bold text-white">
                      ₹{price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {change != null && (
                      <span className={`text-xs font-mono ${isUp ? "text-green-400" : "text-red-400"}`}>
                        {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(2)} ({Math.abs(changePercent || 0).toFixed(2)}%)
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-gray-600 font-mono">—</span>
                )}
              </div>
            );
          })
        )}
        <div className="shrink-0 ml-auto flex items-center gap-2">
          {showUnavailable ? (
            <>
              <div className="w-2 h-2 bg-amber-600 rounded-full" />
              <span className="text-xs text-gray-500">Market Data</span>
            </>
          ) : marketOpen ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500">Market Open</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-gray-600 rounded-full" />
              <span className="text-xs text-gray-600">Market Closed</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
