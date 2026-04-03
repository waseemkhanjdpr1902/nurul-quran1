import { useQuery } from "@tanstack/react-query";
import { fetchTicker } from "@/lib/api";

export function TickerBar() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["ticker"],
    queryFn: fetchTicker,
    refetchInterval: 60000,
  });

  const ticker = data?.ticker || {};
  const items = [
    { key: "nifty", label: "NIFTY 50" },
    { key: "banknifty", label: "BANK NIFTY" },
  ];

  const allPricesNull = !isLoading && items.every(({ key }) => ticker[key]?.price == null);
  const showUnavailable = isError || allPricesNull;

  return (
    <div className="bg-[hsl(220,13%,10%)] border-b border-[hsl(220,13%,18%)] px-4 py-2">
      <div className="flex items-center gap-6 overflow-x-auto scrollbar-none">
        <span className="text-xs text-gray-500 font-mono shrink-0">LIVE</span>
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
            <div className="w-2 h-2 bg-amber-600 rounded-full" />
          ) : (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
          <span className="text-xs text-gray-500">Market Data</span>
        </div>
      </div>
    </div>
  );
}
