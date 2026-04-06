import { useState, useCallback } from "react";
import { runScanner, type ScanResult, type ScannerResponse } from "@/lib/api";

const SEGMENTS = [
  { key: "all",    label: "All",    icon: "🌐" },
  { key: "equity", label: "Equity", icon: "📈" },
  { key: "fno",    label: "F&O",    icon: "⚡" },
] as const;
type Segment = typeof SEGMENTS[number]["key"];

const INTERVALS = [
  { key: "5m",  label: "5m",   desc: "Scalp / Intraday" },
  { key: "15m", label: "15m",  desc: "Swing Intraday" },
  { key: "1h",  label: "1h",   desc: "Positional" },
] as const;
type Interval = typeof INTERVALS[number]["key"];

function fmt(n: number): string {
  return n >= 1000 ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : n.toFixed(2);
}
function stars(n: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < n ? "text-amber-400" : "text-gray-700"}>★</span>
  ));
}

function ScanCard({ r }: { r: ScanResult }) {
  const isBuy = r.signal === "buy";
  const rr = ((Math.abs(r.pt1 - r.entry) / Math.abs(r.entry - r.sl))).toFixed(1);
  const chgPos = r.changePercent != null && r.changePercent >= 0;
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${isBuy ? "bg-green-950/20 border-green-800/30" : "bg-red-950/20 border-red-800/30"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-black px-2 py-0.5 rounded font-mono tracking-wider ${isBuy ? "bg-green-600/30 text-green-300" : "bg-red-600/30 text-red-300"}`}>
              {isBuy ? "▲ BUY" : "▼ SELL"}
            </span>
            {r.isBreakout && (
              <span className={`text-xs px-1.5 py-0.5 rounded border font-mono ${isBuy ? "border-amber-600/40 text-amber-400 bg-amber-900/20" : "border-orange-600/40 text-orange-400 bg-orange-900/20"}`}>
                {isBuy ? "BREAKOUT" : "BREAKDOWN"}
              </span>
            )}
            <span className="text-xs text-gray-600 font-mono">{r.symbol}</span>
          </div>
          <div className="text-white font-bold text-sm mt-1">{r.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="text-lg font-black font-mono text-white">₹{fmt(r.cmp)}</div>
            {r.changePercent != null && (
              <span className={`text-xs font-mono ${chgPos ? "text-green-400" : "text-red-400"}`}>
                {chgPos ? "▲" : "▼"} {Math.abs(r.changePercent).toFixed(2)}%
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="flex gap-0.5 justify-end text-base leading-none">{stars(r.strength)}</div>
          <div className="text-xs text-gray-500 mt-1">Strength {r.strength}/5</div>
          <div className="text-xs text-gray-500 mt-0.5 font-mono">R:R {rr}:1</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-mono">
        <div className="flex justify-between">
          <span className="text-gray-500">Entry</span>
          <span className="text-white font-bold">₹{fmt(r.entry)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">VWAP</span>
          <span className={`font-bold ${isBuy ? "text-blue-400" : "text-purple-400"}`}>₹{fmt(r.vwap)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Stop Loss</span>
          <span className="text-red-400 font-bold">₹{fmt(r.sl)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">RSI(14)</span>
          <span className={`font-bold ${r.rsi > 60 ? "text-green-400" : r.rsi < 40 ? "text-red-400" : "text-gray-300"}`}>
            {r.rsi.toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">PT1 (1.5R)</span>
          <span className="text-emerald-400 font-bold">₹{fmt(r.pt1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Volume</span>
          <span className={`font-bold ${r.volumeRatio > 2 ? "text-amber-300" : r.volumeRatio > 1.5 ? "text-amber-400" : "text-gray-300"}`}>
            {r.volumeRatio.toFixed(1)}x avg
          </span>
        </div>
        <div className="flex justify-between col-span-2">
          <span className="text-gray-500">PT2 (2.5R)</span>
          <span className="text-teal-400 font-bold">₹{fmt(r.pt2)}</span>
        </div>
      </div>

      <div className={`text-xs px-2.5 py-1.5 rounded border ${isBuy ? "bg-green-950/40 border-green-900/30 text-green-300" : "bg-red-950/40 border-red-900/30 text-red-300"}`}>
        {r.reason}
      </div>
    </div>
  );
}

function LoadingCards({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-[hsl(220,13%,22%)] bg-[hsl(220,13%,14%)] p-4 animate-pulse">
          <div className="flex justify-between mb-3">
            <div className="space-y-2">
              <div className="h-4 w-20 bg-[hsl(220,13%,22%)] rounded" />
              <div className="h-5 w-36 bg-[hsl(220,13%,22%)] rounded" />
              <div className="h-6 w-24 bg-[hsl(220,13%,22%)] rounded" />
            </div>
            <div className="h-8 w-16 bg-[hsl(220,13%,22%)] rounded" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[...Array(6)].map((_, j) => <div key={j} className="h-4 bg-[hsl(220,13%,22%)] rounded" />)}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ScannerProps {
  onNavigatePricing: () => void;
}

export default function Scanner({ onNavigatePricing }: ScannerProps) {
  const [segment, setSegment] = useState<Segment>("equity");
  const [interval, setInterval] = useState<Interval>("5m");
  const [result, setResult] = useState<ScannerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionNeeded, setSubscriptionNeeded] = useState(false);

  const sessionId = typeof window !== "undefined"
    ? (localStorage.getItem("trademaster_session_id") ?? "")
    : "";

  const handleScan = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSubscriptionNeeded(false);
    try {
      const data = await runScanner(sessionId, segment, interval);
      setResult(data);
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string };
      if (e.code === "SUBSCRIPTION_REQUIRED") {
        setSubscriptionNeeded(true);
      } else {
        setError(e.message ?? "Scanner failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, segment, interval]);

  const totalFound = result ? result.buy.length + result.sell.length : 0;
  const scannedAt = result ? new Date(result.scannedAt) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            🔭 Market Sweep Scanner
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Auto-detects breakouts using RSI · VWAP · Volume across Nifty 50 universe
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1.5 bg-amber-950/40 border border-amber-800/30 px-2.5 py-1 rounded text-amber-400 text-xs font-semibold">
          ⚠️ Educational Only
        </div>
      </div>

      <div className="bg-[hsl(220,13%,13%)] border border-[hsl(220,13%,20%)] rounded-xl p-5 space-y-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Segment</div>
          <div className="flex gap-2 flex-wrap">
            {SEGMENTS.map(s => (
              <button
                key={s.key}
                onClick={() => setSegment(s.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${segment === s.key ? "bg-blue-600/30 border border-blue-500/50 text-blue-300" : "bg-[hsl(220,13%,18%)] border border-[hsl(220,13%,24%)] text-gray-400 hover:text-gray-200"}`}
              >
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Interval</div>
          <div className="flex gap-2 flex-wrap">
            {INTERVALS.map(iv => (
              <button
                key={iv.key}
                onClick={() => setInterval(iv.key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${interval === iv.key ? "bg-purple-600/30 border border-purple-500/50 text-purple-300" : "bg-[hsl(220,13%,18%)] border border-[hsl(220,13%,24%)] text-gray-400 hover:text-gray-200"}`}
              >
                <span className="font-mono font-black">{iv.key}</span>
                <span className="text-xs text-gray-500 ml-1.5">{iv.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-1.5 bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,22%)] px-3 py-1.5 rounded-full text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-500" /> RSI &gt; 58 (Buy) / &lt; 42 (Sell)
          </div>
          <div className="flex items-center gap-1.5 bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,22%)] px-3 py-1.5 rounded-full text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Price vs VWAP
          </div>
          <div className="flex items-center gap-1.5 bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,22%)] px-3 py-1.5 rounded-full text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Volume &gt; 1.3× avg
          </div>
          <div className="flex items-center gap-1.5 bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,22%)] px-3 py-1.5 rounded-full text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> 20-bar Breakout / Breakdown
          </div>
        </div>

        <button
          onClick={handleScan}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-600 hover:to-emerald-500 disabled:from-gray-700 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-black text-base transition-all shadow-lg shadow-green-900/30 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Scanning {segment === "all" ? "28" : segment === "fno" ? "15" : "25"} stocks…
            </>
          ) : (
            <>🔍 Execute Full Market Sweep</>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-4 text-red-300 text-sm font-medium flex items-center gap-2">
          ⚠️ {error}
        </div>
      )}

      {subscriptionNeeded && (
        <div className="bg-[hsl(220,13%,13%)] border border-amber-700/30 rounded-xl p-6 text-center space-y-3">
          <div className="text-3xl">📚</div>
          <div className="text-white font-bold text-base">Pro Educator Subscription Required</div>
          <div className="text-gray-400 text-sm max-w-sm mx-auto">
            The Market Sweep Scanner is available to Pro Educator subscribers. Subscribe to unlock the full scanner, live signals, journal, and analytics.
          </div>
          <button
            onClick={onNavigatePricing}
            className="mt-2 px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg text-sm transition-colors"
          >
            Subscribe — ₹2,500 / 3 Months
          </button>
        </div>
      )}

      {loading && (
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400 font-bold text-sm">Scanning for Buy targets…</span>
            </div>
            <LoadingCards count={3} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 font-bold text-sm">Scanning for Sell targets…</span>
            </div>
            <LoadingCards count={3} />
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-400">
                Scanned <span className="text-white font-bold">{result.totalScanned}</span> stocks
              </span>
              <span className="text-gray-600">·</span>
              <span className={`font-bold ${totalFound > 0 ? "text-green-400" : "text-gray-500"}`}>
                {totalFound} signal{totalFound !== 1 ? "s" : ""} found
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {result.fmpFeed?.active && result.fmpFeed.price != null && (
                <span className="flex items-center gap-1.5 text-xs font-mono bg-emerald-950/50 border border-emerald-700/40 text-emerald-400 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  FMP Live Feed · {result.fmpFeed.name ?? "AAPL"} ${result.fmpFeed.price.toFixed(2)}
                </span>
              )}
              {scannedAt && (
                <span className="text-xs font-mono text-gray-600">
                  Sweep at {scannedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}
            </div>
          </div>

          {totalFound === 0 && (
            <div className="bg-[hsl(220,13%,13%)] border border-[hsl(220,13%,20%)] rounded-xl p-8 text-center space-y-2">
              <div className="text-4xl">🔇</div>
              <div className="text-gray-300 font-semibold">No strong signals found right now</div>
              <div className="text-gray-500 text-sm max-w-xs mx-auto">
                Market conditions don't match breakout criteria. Try a different segment, interval, or check back during active trading hours (9:15 AM – 3:30 PM IST).
              </div>
              <div className="text-xs text-gray-600 mt-3 space-y-0.5">
                <div>Tip: Signals appear most frequently between 9:30–11:00 AM and 1:30–3:00 PM IST</div>
                <div>Try loosening the filter: switch from 5m → 15m for broader trend confirmation</div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-green-400 font-black text-sm uppercase tracking-wide">
                  Top Buy Targets ({result.buy.length})
                </span>
              </div>
              {result.buy.length > 0 ? (
                <div className="space-y-3">
                  {result.buy.map(r => <ScanCard key={r.symbol} r={r} />)}
                </div>
              ) : (
                <div className="bg-[hsl(220,13%,13%)] border border-[hsl(220,13%,20%)] rounded-xl p-5 text-center text-gray-500 text-sm">
                  No buy signals matching criteria
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-red-400 font-black text-sm uppercase tracking-wide">
                  Top Sell Targets ({result.sell.length})
                </span>
              </div>
              {result.sell.length > 0 ? (
                <div className="space-y-3">
                  {result.sell.map(r => <ScanCard key={r.symbol} r={r} />)}
                </div>
              ) : (
                <div className="bg-[hsl(220,13%,13%)] border border-[hsl(220,13%,20%)] rounded-xl p-5 text-center text-gray-500 text-sm">
                  No sell signals matching criteria
                </div>
              )}
            </div>
          </div>

          <div className="bg-amber-950/20 border border-amber-800/20 rounded-xl p-4 text-xs text-amber-700 leading-relaxed">
            <strong className="text-amber-600">Educational Disclaimer:</strong> Scanner results are generated from delayed market data for learning purposes only. RSI, VWAP, and volume calculations are educational illustrations. This is not SEBI-registered financial advice. Always verify with your broker's live feed and consult a registered investment adviser before trading.
          </div>
        </div>
      )}
    </div>
  );
}
