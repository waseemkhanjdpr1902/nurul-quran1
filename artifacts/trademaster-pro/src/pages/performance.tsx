import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPerformance, type PerformanceSignal } from "@/lib/api";
import { useAdmin } from "@/hooks/use-admin";

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
  intraday: "⚡ Intraday", nifty: "Nifty", banknifty: "Bank Nifty",
  options: "Options", equity: "Equity", commodity: "Commodity", currency: "Currency",
};

function pnlPct(signal: PerformanceSignal): number | null {
  const entry = parseFloat(signal.entryPrice);
  const exit  = signal.exitPrice ? parseFloat(signal.exitPrice) : null;
  if (!exit || isNaN(entry) || isNaN(exit) || entry === 0) return null;
  return signal.signalType === "buy"
    ? ((exit - entry) / entry) * 100
    : ((entry - exit) / entry) * 100;
}

function istDateStr(isoStr: string): string {
  const d = new Date(isoStr);
  const ist = new Date(d.getTime() + 5.5 * 3600000);
  return ist.toISOString().slice(0, 10);
}

function istTimeStr(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

function todayIST(): string {
  return istDateStr(new Date().toISOString());
}
function yesterdayIST(): string {
  const d = new Date(Date.now() - 86400000);
  return istDateStr(d.toISOString());
}

// ── Signal row ────────────────────────────────────────────────────────────────

function SignalHistoryRow({ signal }: { signal: PerformanceSignal }) {
  const isBuy = signal.signalType === "buy";
  const pnl   = pnlPct(signal);
  const isAuto = signal.createdBy === "auto-engine";

  const statusBadge =
    signal.status === "target_hit" ? { label: "✅ Target Hit", cls: "text-green-400 bg-green-500/15 border-green-500/30" } :
    signal.status === "sl_hit"     ? { label: "❌ SL Hit",     cls: "text-red-400 bg-red-500/15 border-red-500/30" }      :
    { label: "🔵 Open", cls: "text-blue-400 bg-blue-500/15 border-blue-500/30" };

  return (
    <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-lg p-3 hover:border-[hsl(220,13%,30%)] transition-colors">
      <div className="flex items-start gap-3 flex-wrap">
        {/* Signal type + name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border shrink-0 ${
            isBuy ? "bg-green-500/20 text-green-400 border-green-500/40" : "bg-red-500/20 text-red-400 border-red-500/40"
          }`}>
            {isBuy ? "▲" : "▼"} {signal.signalType.toUpperCase()}
          </span>
          <span className="text-white font-bold text-sm truncate">{signal.assetName}</span>
          <span className="text-[10px] text-gray-500 bg-[hsl(220,13%,18%)] px-1.5 py-0.5 rounded shrink-0">
            {SEGMENT_LABELS[signal.segment] ?? signal.segment}
          </span>
          {isAuto && (
            <span className="text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/25 px-1.5 py-0.5 rounded shrink-0">
              🤖 Auto
            </span>
          )}
        </div>

        {/* Prices */}
        <div className="flex items-center gap-3 text-xs font-mono shrink-0 flex-wrap">
          <span className="text-gray-500">Entry <span className="text-white">₹{signal.entryPrice}</span></span>
          <span className="text-gray-500">SL <span className="text-red-400">₹{signal.stopLoss}</span></span>
          <span className="text-gray-500">T1 <span className="text-green-400">₹{signal.target1}</span></span>
          {signal.exitPrice && signal.status !== "active" && (
            <span className="text-gray-500">Exit <span className={pnl != null && pnl >= 0 ? "text-green-400" : "text-red-400"}>₹{parseFloat(signal.exitPrice).toFixed(2)}</span></span>
          )}
          {pnl != null && (
            <span className={`font-black ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
              {pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}%
            </span>
          )}
        </div>

        {/* Status + time */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusBadge.cls}`}>
            {statusBadge.label}
          </span>
          <div className="text-right">
            <div className="text-[10px] text-gray-600 font-mono">
              {signal.closedAt
                ? `Closed ${istTimeStr(signal.closedAt)} IST`
                : `Open since ${istTimeStr(signal.createdAt)} IST`
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Date group header ─────────────────────────────────────────────────────────

function DateGroupHeader({ dateStr, signals }: { dateStr: string; signals: PerformanceSignal[] }) {
  const closed = signals.filter(s => s.status !== "active");
  const wins   = closed.filter(s => s.status === "target_hit").length;
  const losses = closed.filter(s => s.status === "sl_hit").length;
  const winRate = closed.length > 0 ? ((wins / closed.length) * 100).toFixed(0) : null;
  const [expanded, setExpanded] = useState(false);

  const pnls = closed.map(pnlPct).filter((v): v is number => v != null);
  const avgPnl = pnls.length > 0 ? pnls.reduce((a,b) => a+b, 0) / pnls.length : null;
  const totalPnl = pnls.length > 0 ? pnls.reduce((a,b) => a+b, 0) : null;

  // Avg R:R for the day (only signals with R:R data)
  const rrs = closed.map(s => s.riskReward ? parseFloat(s.riskReward) : null).filter((v): v is number => v != null);
  const avgRR = rrs.length > 0 ? (rrs.reduce((a,b) => a+b, 0) / rrs.length).toFixed(1) : null;

  // Per-segment breakdown
  const segMap: Record<string, { wins: number; total: number; pnl: number[] }> = {};
  for (const s of closed) {
    const seg = SEGMENT_LABELS[s.segment] ?? s.segment;
    if (!segMap[seg]) segMap[seg] = { wins: 0, total: 0, pnl: [] };
    segMap[seg].total++;
    if (s.status === "target_hit") segMap[seg].wins++;
    const p = pnlPct(s);
    if (p != null) segMap[seg].pnl.push(p);
  }
  const segEntries = Object.entries(segMap).sort((a,b) => b[1].total - a[1].total);

  const today = todayIST(), yesterday = yesterdayIST();
  const label = dateStr === today ? "Today" : dateStr === yesterday ? "Yesterday" :
    new Date(dateStr + "T00:00:00+05:30").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="mb-2">
      <div className="flex items-center gap-3">
        <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-white font-black text-sm">{label}</span>
          <span className="text-xs text-gray-600 font-mono">{dateStr}</span>
          <span className="text-gray-700 text-[9px]">{expanded ? "▲" : "▼"}</span>
        </button>
        <div className="h-px flex-1 bg-[hsl(220,13%,20%)]" />
        {closed.length > 0 && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {winRate && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                parseInt(winRate) >= 60 ? "text-green-400 bg-green-500/10 border-green-500/25" :
                parseInt(winRate) >= 40 ? "text-amber-400 bg-amber-500/10 border-amber-500/25" :
                "text-red-400 bg-red-500/10 border-red-500/25"
              }`}>
                {winRate}% win
              </span>
            )}
            <span className="text-xs text-gray-500">✅{wins} ❌{losses}</span>
            {avgPnl != null && (
              <span className={`text-xs font-mono font-bold ${avgPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                avg {avgPnl >= 0 ? "+" : ""}{avgPnl.toFixed(1)}%
              </span>
            )}
            {totalPnl != null && (
              <span className={`text-[10px] font-mono ${totalPnl >= 0 ? "text-green-500/70" : "text-red-500/70"}`}>
                ({totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(1)}% total)
              </span>
            )}
            {avgRR && (
              <span className="text-[10px] text-blue-400 font-mono">R:R 1:{avgRR}</span>
            )}
          </div>
        )}
      </div>

      {/* Per-date segment breakdown — collapsible */}
      {expanded && segEntries.length > 0 && (
        <div className="mt-2 ml-1 flex flex-wrap gap-1.5">
          {segEntries.map(([seg, v]) => {
            const segWinRate = v.total > 0 ? Math.round((v.wins / v.total) * 100) : 0;
            const segAvgPnl  = v.pnl.length > 0 ? v.pnl.reduce((a,b) => a+b, 0) / v.pnl.length : null;
            return (
              <div key={seg} className="bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,22%)] rounded-lg px-2.5 py-1.5 flex items-center gap-2">
                <span className="text-[10px] text-gray-400 font-semibold">{seg}</span>
                <span className="text-[10px] text-gray-600">{v.wins}/{v.total}</span>
                <span className={`text-[10px] font-bold ${segWinRate >= 60 ? "text-green-400" : segWinRate >= 40 ? "text-amber-400" : "text-red-400"}`}>
                  {segWinRate}%
                </span>
                {segAvgPnl != null && (
                  <span className={`text-[9px] font-mono ${segAvgPnl >= 0 ? "text-green-500/70" : "text-red-500/70"}`}>
                    {segAvgPnl >= 0 ? "+" : ""}{segAvgPnl.toFixed(1)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type PerformanceProps = { onNavigatePricing: () => void };

export default function Performance({ onNavigatePricing: _ }: PerformanceProps) {
  const [segment, setSegment] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [view, setView] = useState<"history" | "open">("history");
  const { isAdmin } = useAdmin();
  const sessionId = typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;

  const { data, isLoading, error } = useQuery({
    queryKey: ["performance", segment, fromDate, toDate, sessionId],
    queryFn: () => fetchPerformance({ segment: segment || undefined, from: fromDate || undefined, to: toDate || undefined, sessionId }),
    refetchInterval: 30000,
  });

  const stats   = data?.stats;
  const signals = data?.signals ?? [];

  const openSignals   = signals.filter(s => s.status === "active");
  const closedSignals = signals.filter(s => s.status !== "active");

  // Group closed signals by IST date (use closedAt if available, else createdAt)
  const dateGroups = new Map<string, PerformanceSignal[]>();
  for (const s of closedSignals) {
    const dateKey = istDateStr(s.closedAt ?? s.createdAt);
    const group = dateGroups.get(dateKey) ?? [];
    group.push(s);
    dateGroups.set(dateKey, group);
  }
  const sortedDates = Array.from(dateGroups.keys()).sort((a, b) => b.localeCompare(a));

  // Overall accuracy stats
  const successPct = stats && (stats.total - stats.open) > 0
    ? `${((stats.targetHit / (stats.total - stats.open)) * 100).toFixed(1)}%` : "—";

  // Segment breakdown for closed signals
  const segBreakdown: Record<string, { wins: number; total: number }> = {};
  for (const s of closedSignals) {
    const seg = s.segment;
    if (!segBreakdown[seg]) segBreakdown[seg] = { wins: 0, total: 0 };
    segBreakdown[seg].total++;
    if (s.status === "target_hit") segBreakdown[seg].wins++;
  }

  // Total P&L across closed signals
  const allPnls = closedSignals.map(pnlPct).filter((v): v is number => v != null);
  const totalPnl = allPnls.length > 0 ? allPnls.reduce((a,b) => a+b, 0) : null;

  return (
    <div className="min-h-screen bg-[hsl(220,13%,9%)]">
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-white">Signal History</h1>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 uppercase tracking-widest">
              Live Accuracy Tracker
            </span>
          </div>
          <p className="text-sm text-gray-500">
            All signals — active and historical — with verified outcomes, exit prices, and P&L
          </p>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Total Signals", value: stats.total.toString(), icon: "📊", color: "text-white" },
              { label: "Targets Hit", value: stats.targetHit.toString(), icon: "✅", color: "text-green-400" },
              { label: "SL Hit", value: stats.slHit.toString(), icon: "❌", color: "text-red-400" },
              { label: "Win Rate", value: successPct, icon: "🎯", color: parseInt(successPct) >= 60 ? "text-green-400" : parseInt(successPct) >= 40 ? "text-amber-400" : "text-red-400" },
            ].map((s) => (
              <div key={s.label} className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-xl shrink-0">{s.icon}</span>
                <div>
                  <div className={`font-black text-lg leading-tight ${s.color}`}>{s.value}</div>
                  <div className="text-gray-500 text-xs">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Secondary stats */}
        <div className="flex flex-wrap gap-3 mb-5">
          {stats?.avgRR && (
            <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-lg px-4 py-2 flex items-center gap-2">
              <span className="text-gray-500 text-xs">Avg R:R</span>
              <span className="text-green-400 font-black">1:{stats.avgRR}</span>
            </div>
          )}
          {totalPnl != null && (
            <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-lg px-4 py-2 flex items-center gap-2">
              <span className="text-gray-500 text-xs">Avg P&L</span>
              <span className={`font-black ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                {totalPnl >= 0 ? "+" : ""}{(totalPnl / (allPnls.length || 1)).toFixed(1)}%
              </span>
            </div>
          )}
          {stats?.open != null && stats.open > 0 && (
            <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-lg px-4 py-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-blue-400 font-black text-sm">{stats.open} active</span>
            </div>
          )}
          {/* Segment breakdown pills */}
          {Object.entries(segBreakdown)
            .filter(([,v]) => v.total > 0)
            .sort((a,b) => b[1].total - a[1].total)
            .slice(0, 5)
            .map(([seg, v]) => (
              <div key={seg} className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-lg px-3 py-2 flex items-center gap-2">
                <span className="text-gray-500 text-[10px] uppercase">{SEGMENT_LABELS[seg] ?? seg}</span>
                <span className="text-white text-xs font-bold">{v.wins}/{v.total}</span>
                <span className="text-[10px] text-gray-600">{v.total > 0 ? `${((v.wins/v.total)*100).toFixed(0)}%` : ""}</span>
              </div>
            ))}
        </div>

        {/* Filters + view toggle */}
        <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-4 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block uppercase tracking-wide">View</label>
              <div className="flex gap-1">
                {[{ key: "history", label: "📚 History" }, { key: "open", label: "🔵 Active" }].map(v => (
                  <button key={v.key} onClick={() => setView(v.key as "history" | "open")}
                    className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg transition-all ${view === v.key ? "bg-green-600 text-white" : "bg-[hsl(220,13%,18%)] text-gray-400 hover:text-white"}`}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block uppercase tracking-wide">Segment</label>
              <select value={segment} onChange={(e) => setSegment(e.target.value)}
                className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,25%)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500">
                {SEGMENTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block uppercase tracking-wide">From Date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,25%)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block uppercase tracking-wide">To Date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,25%)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500" />
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-gray-500">Loading history…</span>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400">Failed to load. Please refresh.</div>
        ) : view === "open" ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-white font-black text-sm">Active Signals ({openSignals.length})</span>
              <span className="text-[10px] text-gray-500">— updating every 30s</span>
            </div>
            {openSignals.length === 0 ? (
              <div className="text-center py-12 text-gray-600">No active signals right now</div>
            ) : (
              <div className="space-y-2">
                {openSignals.map(s => <SignalHistoryRow key={s.id} signal={s} />)}
              </div>
            )}
          </>
        ) : (
          <>
            {sortedDates.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">📚</div>
                <div className="text-gray-400 font-semibold">No closed signals yet</div>
                <div className="text-gray-600 text-sm mt-1">
                  Closed signals (target hit or SL hit) appear here date-wise for accuracy review.
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedDates.map(dateStr => {
                  const group = dateGroups.get(dateStr) ?? [];
                  return (
                    <div key={dateStr}>
                      <DateGroupHeader dateStr={dateStr} signals={group} />
                      <div className="space-y-2">
                        {group
                          .sort((a,b) => (b.closedAt ?? b.createdAt).localeCompare(a.closedAt ?? a.createdAt))
                          .map(s => <SignalHistoryRow key={s.id} signal={s} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-[hsl(220,13%,18%)] flex flex-wrap gap-4 text-[10px] text-gray-600">
          <span>🤖 Auto = generated by signal engine every 15 min during market hours</span>
          <span>P&L% = (exit − entry) / entry × 100 for buys, reversed for sells</span>
          <span>Auto-evaluator runs every 5 min · Intraday signals expire at 3:30 PM IST</span>
        </div>
      </div>
    </div>
  );
}
