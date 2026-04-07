import { useQuery } from "@tanstack/react-query";
import { fetchTicker } from "@/lib/api";

export function TickerBar() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["ticker"],
    queryFn: fetchTicker,
    refetchInterval: 60000,
    staleTime: 55000,
  });

  const ticker = data?.ticker || {};
  // sessionDate is computed server-side in IST (DD/MM/YYYY). Fallback: compute on client.
  const sessionDate: string = data?.sessionDate ?? (() => {
    const now = new Date(Date.now() + 5.5 * 3600 * 1000);
    const d = now.toISOString().slice(0, 10);
    return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
  })();

  const items = [
    { key: "nifty", label: "NIFTY 50" },
    { key: "banknifty", label: "BANK NIFTY" },
  ];

  const allPricesNull = !isLoading && items.every(({ key }) => ticker[key]?.price == null);
  const showUnavailable = isError || allPricesNull;

  // Use Yahoo Finance's actual marketState as the heartbeat — "REGULAR" = live session
  const anyMarketState = ticker.nifty?.marketState ?? ticker.banknifty?.marketState ?? null;
  const marketLive = anyMarketState === "REGULAR" || anyMarketState === "OPEN";
  const marketLabel = marketLive ? "Market Open" : anyMarketState ? `Market ${anyMarketState}` : "Market Closed";
  const tickerLabel = marketLive ? "LIVE" : "PREV";

  return (
    <div className="bg-[hsl(220,13%,10%)] border-b border-[hsl(220,13%,18%)] px-4 py-2">
      <div className="flex items-center gap-6 overflow-x-auto scrollbar-none">
        <span className="text-xs font-mono shrink-0 text-gray-500">{tickerLabel}</span>
        <span className={`text-xs font-mono shrink-0 font-semibold ${marketLive ? "text-green-500" : "text-gray-600"}`}>
          {sessionDate}
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
          ) : marketLive ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-500 font-semibold">Market Open</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-gray-600 rounded-full" />
              <span className="text-xs text-gray-500">{marketLabel}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
