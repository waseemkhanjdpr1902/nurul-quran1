import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJournalAnalytics } from "@/lib/api";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";

const SESSION_KEY = "trademaster_session_id";

function getSessionId(): string {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) { sid = `tm_${Date.now()}_${Math.random().toString(36).slice(2)}`; localStorage.setItem(SESSION_KEY, sid); }
  return sid;
}

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function Analytics() {
  const [sessionId] = useState(getSessionId);

  const { data, isLoading, error } = useQuery({
    queryKey: ["journalAnalytics", sessionId],
    queryFn: () => fetchJournalAnalytics(sessionId),
    refetchInterval: 60000,
  });

  if (isLoading) return (
    <div className="max-w-5xl mx-auto px-4 py-16 text-center">
      <div className="text-gray-500 animate-pulse">Loading analytics...</div>
    </div>
  );

  if (!data || data.total === 0) return (
    <div className="max-w-5xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">📊</div>
      <div className="text-white font-bold text-xl mb-2">No trade data yet</div>
      <p className="text-gray-500 text-sm">Log trades in your Journal to unlock analytics and performance insights.</p>
    </div>
  );

  const totalPnl = parseFloat(data.totalPnl);
  const winRateNum = parseFloat(data.winRate);

  const dayChartData = DAYS_ORDER
    .filter(d => d in data.dayPnl)
    .map(d => ({ day: d.slice(0, 3), pnl: data.dayPnl[d], fill: data.dayPnl[d] >= 0 ? "#22c55e" : "#ef4444" }));

  const strategyData = Object.entries(data.strategyBreakdown)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([name, stats]) => ({ name: name.length > 16 ? name.slice(0, 14) + "…" : name, trades: stats.count, pnl: stats.pnl }));

  const outcomeData = [
    { name: "Wins", value: data.wins, fill: "#22c55e" },
    { name: "Losses", value: data.losses, fill: "#ef4444" },
    { name: "Breakeven", value: data.closed - data.wins - data.losses, fill: "#eab308" },
    { name: "Open", value: data.total - data.closed, fill: "#3b82f6" },
  ].filter(d => d.value > 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Performance Analytics</h1>
        <p className="text-gray-500 text-sm mt-0.5">Data-driven insights from your trading journal</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Win Rate", value: `${data.winRate}%`, sub: `${data.wins}W / ${data.losses}L`, icon: "🎯", color: winRateNum >= 50 ? "text-green-400" : "text-red-400" },
          { label: "Total P&L", value: `₹${totalPnl >= 0 ? "+" : ""}${Math.abs(totalPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, sub: `${data.closed} closed`, icon: "💰", color: totalPnl >= 0 ? "text-green-400" : "text-red-400" },
          { label: "Avg Win", value: `₹+${parseFloat(data.avgWin).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, sub: "per winning trade", icon: "🏆", color: "text-green-400" },
          { label: "Avg Loss", value: `₹-${parseFloat(data.avgLoss).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, sub: "per losing trade", icon: "⚠️", color: "text-red-400" },
        ].map(s => (
          <div key={s.label} className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-4">
            <div className="text-xl mb-1">{s.icon}</div>
            <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-gray-400 text-xs font-semibold mt-0.5">{s.label}</div>
            <div className="text-gray-600 text-xs mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {data.bestDay && (
        <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border border-amber-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="text-3xl">⭐</div>
          <div>
            <div className="text-amber-400 font-black text-sm">Best Performing Day</div>
            <div className="text-white font-bold text-xl">{data.bestDay}</div>
            <div className="text-gray-400 text-xs">Your most profitable trading day this period</div>
          </div>
        </div>
      )}

      {data.pnlCurve.length > 1 && (
        <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-5 mb-6">
          <h3 className="text-white font-bold mb-4">Cumulative P&L Curve</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.pnlCurve}>
              <defs>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={totalPnl >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={totalPnl >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,18%)" />
              <XAxis dataKey="index" stroke="#4b5563" tick={{ fontSize: 11 }} label={{ value: "Trade #", position: "insideBottom", offset: -2, fill: "#6b7280", fontSize: 11 }} />
              <YAxis stroke="#4b5563" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(220,13%,14%)", border: "1px solid hsl(220,13%,24%)", borderRadius: 8 }}
                labelStyle={{ color: "#9ca3af", fontSize: 11 }}
                formatter={(v: number) => [`₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, "Cumulative P&L"]}
              />
              <Area type="monotone" dataKey="cumulative" stroke={totalPnl >= 0 ? "#22c55e" : "#ef4444"} fill="url(#pnlGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {dayChartData.length > 0 && (
          <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-5">
            <h3 className="text-white font-bold mb-4">P&L by Day of Week</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dayChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,18%)" />
                <XAxis dataKey="day" stroke="#4b5563" tick={{ fontSize: 11 }} />
                <YAxis stroke="#4b5563" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(220,13%,14%)", border: "1px solid hsl(220,13%,24%)", borderRadius: 8 }}
                  formatter={(v: number) => [`₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, "P&L"]}
                />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {dayChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {outcomeData.length > 0 && (
          <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-5">
            <h3 className="text-white font-bold mb-4">Trade Outcomes</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={outcomeData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3}>
                  {outcomeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(220,13%,14%)", border: "1px solid hsl(220,13%,24%)", borderRadius: 8 }}
                  formatter={(v: number, name: string) => [v, name]}
                />
                <Legend formatter={(v) => <span className="text-gray-300 text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {strategyData.length > 0 && (
        <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-5 mb-6">
          <h3 className="text-white font-bold mb-4">Strategy Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-[hsl(220,13%,18%)]">
                  <th className="text-left py-2 pr-4">Strategy</th>
                  <th className="text-right py-2 pr-4">Trades</th>
                  <th className="text-right py-2">Total P&L</th>
                </tr>
              </thead>
              <tbody>
                {strategyData.map(s => (
                  <tr key={s.name} className="border-b border-[hsl(220,13%,16%)] last:border-0">
                    <td className="py-2.5 pr-4 text-white font-medium">{s.name}</td>
                    <td className="py-2.5 pr-4 text-right text-gray-400">{s.trades}</td>
                    <td className={`py-2.5 text-right font-bold ${s.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {s.pnl >= 0 ? "+" : ""}₹{s.pnl.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-[hsl(220,13%,10%)] border border-[hsl(220,13%,18%)] rounded-xl p-4 text-center text-xs text-gray-500">
        ℹ️ Analytics are based on trades logged in your personal journal. Past performance does not guarantee future results.
      </div>
    </div>
  );
}
