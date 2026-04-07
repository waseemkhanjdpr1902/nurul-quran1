import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPerformance, type PerformanceSignal } from "@/lib/api";
import { useSubscription } from "@/hooks/use-subscription";
import { useAdmin } from "@/hooks/use-admin";
import { PremiumLock } from "@/components/premium-lock";

const SESSION_KEY = "trademaster_session_id";

const SEGMENTS = [
  { key: "", label: "All Segments" },
  { key: "intraday", label: "⚡ Intraday" },
  { key: "nifty", label: "Nifty" },
  { key: "banknifty", label: "Bank Nifty" },
  { key: "options", label: "Options" },
  { key: "equity", label: "Equity" },
  { key: "commodity", label: "Commodity" },
  { key: "currency", label: "Currency" },
];

const SEGMENT_LABELS: Record<string, string> = {
  intraday: "⚡ Intraday",
  nifty: "Nifty",
  banknifty: "Bank Nifty",
  options: "Options",
  equity: "Equity",
  commodity: "Commodity",
  currency: "Currency",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  active: { label: "Open", color: "text-blue-400 bg-blue-500/15 border-blue-500/30", dot: "bg-blue-400" },
  target_hit: { label: "Target Hit", color: "text-green-400 bg-green-500/15 border-green-500/30", dot: "bg-green-400" },
  sl_hit: { label: "SL Hit", color: "text-red-400 bg-red-500/15 border-red-500/30", dot: "bg-red-400" },
};

function PerformanceRow({ signal }: { signal: PerformanceSignal }) {
  const status = STATUS_CONFIG[signal.status] ?? { label: signal.status, color: "text-gray-400 bg-gray-500/15 border-gray-500/30", dot: "bg-gray-400" };
  const isBuy = signal.signalType === "buy";

  return (
    <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-lg p-4 hover:border-[hsl(220,13%,28%)] transition-colors">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`text-xs font-black px-2 py-0.5 rounded border shrink-0 ${
            isBuy ? "bg-green-500/20 text-green-400 border-green-500/40" : "bg-red-500/20 text-red-400 border-red-500/40"
          }`}>
            {isBuy ? "▲ BUY" : "▼ SELL"}
          </span>
          <span className="text-white font-bold text-sm truncate">{signal.assetName}</span>
          <span className="text-xs text-gray-500 bg-[hsl(220,13%,18%)] px-2 py-0.5 rounded shrink-0">
            {SEGMENT_LABELS[signal.segment] ?? signal.segment.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono shrink-0">
          <span className="text-gray-500">Entry: <span className="text-white">₹{signal.entryPrice}</span></span>
          <span className="text-gray-500">SL: <span className="text-red-400">₹{signal.stopLoss}</span></span>
          <span className="text-gray-500">T1: <span className="text-green-400">₹{signal.target1}</span></span>
          {signal.riskReward && <span className="text-gray-500">R:R <span className="text-white">1:{signal.riskReward}</span></span>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-bold px-2.5 py-1 rounded border ${status.color}`}>
            {signal.status === "target_hit" ? "✅ " : signal.status === "sl_hit" ? "❌ " : "🔵 "}{status.label}
          </span>
          <span className="text-xs text-gray-600 font-mono">
            {new Date(signal.createdAt).toLocaleDateString("en-IN", { dateStyle: "short" })}
          </span>
        </div>
      </div>
    </div>
  );
}

type PerformanceProps = {
  onNavigatePricing: () => void;
};

export default function Performance({ onNavigatePricing }: PerformanceProps) {
  const [segment, setSegment] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { isPremium } = useSubscription();
  const { isAdmin } = useAdmin();
  const sessionId = typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
  const isFullAccess = isPremium || isAdmin;

  const { data, isLoading, error } = useQuery({
    queryKey: ["performance", segment, fromDate, toDate, sessionId],
    queryFn: () => fetchPerformance({ segment: segment || undefined, from: fromDate || undefined, to: toDate || undefined, sessionId }),
    refetchInterval: 30000,
  });

  const stats = data?.stats;
  const signals = data?.signals ?? [];

  const successPct = stats && (stats.total - stats.open) > 0
    ? `${((stats.targetHit / (stats.total - stats.open)) * 100).toFixed(1)}%`
    : "—";

  return (
    <div className="min-h-screen bg-[hsl(220,13%,9%)]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Performance History</h1>
          <p className="text-sm text-gray-500">All historical signals with verified outcomes — Target Hit / SL Hit / Open</p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Calls", value: stats.total.toString(), icon: "📊" },
              { label: "Targets Hit", value: stats.targetHit.toString(), icon: "✅" },
              { label: "SL Hit", value: stats.slHit.toString(), icon: "❌" },
              { label: "Success Rate", value: successPct, icon: "🎯" },
            ].map((s) => (
              <div key={s.label} className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-xl">{s.icon}</span>
                <div>
                  <div className="text-green-400 font-black text-lg leading-tight">{s.value}</div>
                  <div className="text-gray-500 text-xs leading-tight">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {stats?.avgRR && (
          <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl px-5 py-3 mb-6 flex items-center gap-4">
            <span className="text-gray-400 text-sm">Average R:R Ratio:</span>
            <span className="text-green-400 font-black text-lg">1:{stats.avgRR}</span>
            {stats.open > 0 && (
              <span className="text-xs text-gray-500 ml-auto">{stats.open} open signal{stats.open !== 1 ? "s" : ""}</span>
            )}
          </div>
        )}

        <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Segment Filter</label>
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,25%)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
              >
                {SEGMENTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,25%)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,25%)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-gray-500">Loading performance data…</span>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400">Failed to load data. Please refresh.</div>
        ) : signals.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📊</div>
            <div className="text-gray-400 text-lg font-semibold">No signals found</div>
            <div className="text-gray-600 text-sm mt-1">Adjust your filters or check back after signals are posted.</div>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {signals.map((signal) => (
                <PerformanceRow key={signal.id} signal={signal} />
              ))}
            </div>

            {!isFullAccess && data?.isPremium === false && (
              <PremiumLock
                onNavigatePricing={onNavigatePricing}
                title="Full History is Premium-only"
                description="You are viewing the most recent 10 signals. Subscribe to the Pro Educator Plan to unlock the complete performance history — all historical calls, outcomes, and detailed breakdowns."
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
