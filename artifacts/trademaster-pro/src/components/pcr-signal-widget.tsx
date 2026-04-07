import { useState, useEffect, useCallback } from "react";
import { fetchPcrSignals, type PcrSignalItem } from "@/lib/api";

const REFRESH_INTERVAL = 180;

function fmt(v: number | null, decimals = 2): string {
  if (v == null) return "—";
  return `₹${v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function SignalBadge({ signal }: { signal: PcrSignalItem["signal"] }) {
  if (signal === "BUY") return (
    <div className="flex items-center gap-1.5 bg-green-500/15 border border-green-500/40 rounded-lg px-3 py-1.5">
      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      <span className="text-green-300 font-black text-sm tracking-widest uppercase">BUY</span>
    </div>
  );
  if (signal === "SELL") return (
    <div className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/40 rounded-lg px-3 py-1.5">
      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
      <span className="text-red-300 font-black text-sm tracking-widest uppercase">SELL</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 bg-gray-500/15 border border-gray-500/30 rounded-lg px-3 py-1.5">
      <span className="w-2 h-2 rounded-full bg-gray-500" />
      <span className="text-gray-400 font-black text-sm tracking-widest uppercase">NEUTRAL</span>
    </div>
  );
}

function PcrCard({ item }: { item: PcrSignalItem }) {
  const borderColor =
    item.signal === "BUY"  ? "border-green-500/30 bg-green-950/10" :
    item.signal === "SELL" ? "border-red-500/30 bg-red-950/10" :
    "border-[hsl(220,13%,22%)] bg-[hsl(220,13%,12%)]";

  const pcrColor =
    item.pcr == null ? "text-gray-500" :
    item.pcr > 1.2   ? "text-green-400" :
    item.pcr < 0.8   ? "text-red-400"   : "text-amber-400";

  const pcrLabel =
    item.pcr == null ? "" :
    item.pcr > 1.3   ? " (strong bull)" :
    item.pcr > 1.2   ? " (bullish)" :
    item.pcr < 0.7   ? " (strong bear)" :
    item.pcr < 0.8   ? " (bearish)" : " (neutral)";

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 ${borderColor}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-0.5">
            {item.segment === "BANKNIFTY" ? "Bank Nifty" : "Nifty 50"}
          </div>
          <div className="text-white font-black text-base">PCR + VWAP Signal</div>
        </div>
        <SignalBadge signal={item.signal} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-black/20 rounded-lg p-2.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">PCR</div>
          <div className={`font-black font-mono text-sm ${pcrColor}`}>
            {item.pcr != null ? item.pcr.toFixed(2) : "—"}
          </div>
          <div className={`text-[10px] font-medium ${pcrColor}`}>{pcrLabel}</div>
        </div>
        <div className="bg-black/20 rounded-lg p-2.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">LTP</div>
          <div className="font-black font-mono text-sm text-white">{fmt(item.ltp, 2)}</div>
          <div className={`text-[10px] font-medium ${item.ltp != null && item.vwap != null ? item.ltp > item.vwap ? "text-green-400" : "text-red-400" : "text-gray-600"}`}>
            {item.ltp != null && item.vwap != null ? (item.ltp > item.vwap ? "↑ above VWAP" : "↓ below VWAP") : ""}
          </div>
        </div>
        <div className="bg-black/20 rounded-lg p-2.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">VWAP</div>
          <div className="font-black font-mono text-sm text-blue-300">{fmt(item.vwap, 2)}</div>
          <div className="text-[10px] text-gray-600">5-min avg</div>
        </div>
      </div>

      <div className="bg-black/20 rounded-lg px-3 py-2 text-xs text-gray-400 leading-relaxed">
        {item.reason}
      </div>
    </div>
  );
}

export function PcrSignalWidget() {
  const [data, setData]         = useState<{ signals: PcrSignalItem[]; cachedAt: string } | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPcrSignals();
      setData({ signals: res.signals, cachedAt: res.cachedAt });
      setCountdown(res.nextRefreshIn ?? REFRESH_INTERVAL);
    } catch {
      setError("Could not fetch PCR signals — market may be closed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { void load(); return REFRESH_INTERVAL; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [load]);

  const updatedAt = data?.cachedAt
    ? new Date(data.cachedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" })
    : null;

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const countdownFmt = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-sm">📡 PCR + VWAP Signal</span>
          <span className="text-[10px] text-gray-500 bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,22%)] rounded px-2 py-0.5 font-mono uppercase tracking-wide">Live · Upstox</span>
        </div>
        <div className="flex items-center gap-2">
          {updatedAt && (
            <span className="text-[10px] text-gray-600 font-mono">Updated {updatedAt} IST</span>
          )}
          <span className="text-[10px] text-gray-500 font-mono bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,22%)] rounded px-2 py-0.5">
            ↻ {countdownFmt}
          </span>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="text-[10px] text-gray-400 hover:text-white bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,22%)] rounded px-2 py-0.5 transition-colors disabled:opacity-50"
          >
            {loading ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1].map(i => (
            <div key={i} className="rounded-xl border border-[hsl(220,13%,22%)] bg-[hsl(220,13%,12%)] p-4 animate-pulse">
              <div className="h-4 bg-[hsl(220,13%,20%)] rounded w-24 mb-3" />
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[0, 1, 2].map(j => <div key={j} className="h-14 bg-[hsl(220,13%,18%)] rounded-lg" />)}
              </div>
              <div className="h-8 bg-[hsl(220,13%,18%)] rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {error && !data && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4 text-sm text-amber-400/80">
          {error}
          <button onClick={() => void load()} className="ml-3 underline text-amber-400 hover:text-amber-300">Retry</button>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.signals.map(item => <PcrCard key={item.segment} item={item} />)}
        </div>
      )}

      <div className="mt-2 text-[10px] text-gray-600 text-right">
        Rule: PCR &gt; 1.2 + Price &gt; VWAP → BUY &nbsp;|&nbsp; PCR &lt; 0.8 + Price &lt; VWAP → SELL &nbsp;|&nbsp; Refreshes every 180s
      </div>
    </div>
  );
}
