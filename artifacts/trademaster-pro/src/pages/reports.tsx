import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchReports, type InvestmentReport } from "@/lib/api";
import { useSubscription } from "@/hooks/use-subscription";
import { useAdmin } from "@/hooks/use-admin";
import { PremiumLock } from "@/components/premium-lock";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const SESSION_KEY = "trademaster_session_id";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "large_cap_equity", label: "🏛️ Large-Cap" },
  { key: "etf", label: "📊 ETFs" },
  { key: "mutual_fund", label: "💼 Mutual Funds" },
  { key: "government_bond", label: "🏛 Gov Bonds" },
  { key: "gold_silver", label: "🥇 Gold & Silver" },
  { key: "reit", label: "🏢 REITs" },
  { key: "fixed_deposit", label: "🏦 Fixed Income" },
];

const CATEGORY_LABELS: Record<string, string> = {
  large_cap_equity: "Large-Cap Equity",
  etf: "ETF",
  mutual_fund: "Mutual Fund",
  government_bond: "Government Bond",
  gold_silver: "Gold & Silver",
  reit: "REIT / InvIT",
  fixed_deposit: "Fixed Deposit / Debt",
};

const RATING_CONFIG: Record<string, { label: string; color: string }> = {
  strong_buy: { label: "STRONG BUY", color: "text-green-400 bg-green-500/20 border-green-500/40" },
  buy: { label: "BUY", color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" },
  hold: { label: "HOLD", color: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30" },
  sell: { label: "SELL", color: "text-red-400 bg-red-500/15 border-red-500/30" },
};

const RISK_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Low Risk", color: "text-green-400" },
  medium: { label: "Medium Risk", color: "text-yellow-400" },
  high: { label: "High Risk", color: "text-red-400" },
};

const RISK_PROFILES = {
  conservative: {
    label: "Conservative",
    description: "Capital preservation with steady income",
    color: "#22c55e",
    allocations: [
      { name: "Gov Bonds / PPF", value: 35, color: "#22c55e", category: "government_bond" },
      { name: "Fixed Deposits", value: 25, color: "#16a34a", category: "fixed_deposit" },
      { name: "Gold & Silver", value: 20, color: "#f59e0b", category: "gold_silver" },
      { name: "Large-Cap Equity", value: 10, color: "#3b82f6", category: "large_cap_equity" },
      { name: "Nifty ETFs", value: 5, color: "#8b5cf6", category: "etf" },
      { name: "Debt Mutual Funds", value: 5, color: "#06b6d4", category: "mutual_fund" },
    ],
  },
  moderate: {
    label: "Moderate",
    description: "Balanced growth and stability",
    color: "#3b82f6",
    allocations: [
      { name: "Large-Cap Equity", value: 30, color: "#3b82f6", category: "large_cap_equity" },
      { name: "Nifty ETFs", value: 20, color: "#8b5cf6", category: "etf" },
      { name: "Mutual Funds", value: 15, color: "#06b6d4", category: "mutual_fund" },
      { name: "Gov Bonds / PPF", value: 15, color: "#22c55e", category: "government_bond" },
      { name: "Gold & Silver", value: 10, color: "#f59e0b", category: "gold_silver" },
      { name: "REITs", value: 5, color: "#ec4899", category: "reit" },
      { name: "Fixed Deposits", value: 5, color: "#16a34a", category: "fixed_deposit" },
    ],
  },
  aggressive: {
    label: "Aggressive",
    description: "Maximum growth potential",
    color: "#ef4444",
    allocations: [
      { name: "Large-Cap Equity", value: 35, color: "#3b82f6", category: "large_cap_equity" },
      { name: "Mutual Funds (Equity)", value: 25, color: "#06b6d4", category: "mutual_fund" },
      { name: "Nifty ETFs", value: 15, color: "#8b5cf6", category: "etf" },
      { name: "REITs / InvITs", value: 10, color: "#ec4899", category: "reit" },
      { name: "Gold & Silver", value: 10, color: "#f59e0b", category: "gold_silver" },
      { name: "Gov Bonds", value: 5, color: "#22c55e", category: "government_bond" },
    ],
  },
};

type RiskProfile = keyof typeof RISK_PROFILES;

function ReportCard({ report, isPremium }: { report: InvestmentReport; isPremium: boolean }) {
  const rating = RATING_CONFIG[report.analystRating] ?? { label: report.analystRating, color: "text-gray-400 bg-gray-500/15 border-gray-500/30" };
  const risk = RISK_CONFIG[report.riskLevel] ?? { label: report.riskLevel, color: "text-gray-400" };

  return (
    <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-5 hover:border-[hsl(220,13%,28%)] transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-black px-2 py-0.5 rounded border ${rating.color}`}>{rating.label}</span>
            <span className={`text-xs font-semibold ${risk.color}`}>{risk.label}</span>
            <span className="text-xs text-gray-600 bg-[hsl(220,13%,16%)] px-2 py-0.5 rounded">
              {CATEGORY_LABELS[report.category] ?? report.category}
            </span>
          </div>
          <h3 className="text-white font-bold text-sm leading-tight">{report.instrumentName}</h3>
          {report.instrumentCode && (
            <div className="text-xs text-gray-500 font-mono mt-0.5">{report.instrumentCode}</div>
          )}
        </div>
        <div className="text-right shrink-0">
          {isPremium && report.suggestedAllocationPct != null ? (
            <div className="text-green-400 font-black text-lg leading-tight">{report.suggestedAllocationPct}%</div>
          ) : (
            <div className="text-gray-600 font-black text-lg leading-tight">—</div>
          )}
          <div className="text-gray-600 text-xs">Allocation</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-500">Horizon:</span>
        <span className="text-xs text-gray-300 font-semibold">{report.recommendedHorizon}</span>
      </div>

      {isPremium && report.rationale ? (
        <div className="bg-[hsl(220,13%,10%)] border border-[hsl(220,13%,18%)] rounded-lg px-3 py-2.5">
          <p className="text-xs text-gray-400 leading-relaxed">{report.rationale}</p>
        </div>
      ) : (
        <div className="bg-[hsl(220,13%,10%)] border border-[hsl(220,13%,18%)] rounded-lg px-3 py-2.5 flex items-center gap-2">
          <span className="text-xs text-gray-600">🔒 Full analyst rationale — Premium only</span>
        </div>
      )}
    </div>
  );
}

function PortfolioAllocator({ reports }: { reports: InvestmentReport[] }) {
  const [selectedProfile, setSelectedProfile] = useState<RiskProfile>("moderate");
  const profile = RISK_PROFILES[selectedProfile];

  const topInstrumentsByCategory = (category: string) =>
    reports.filter((r) => r.category === category).slice(0, 2);

  return (
    <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-2xl p-6 mb-8">
      <div className="mb-6">
        <h2 className="text-white text-xl font-bold mb-1">Portfolio Allocator</h2>
        <p className="text-gray-500 text-sm">Select your risk profile to see a recommended asset allocation.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {(Object.keys(RISK_PROFILES) as RiskProfile[]).map((key) => {
          const p = RISK_PROFILES[key];
          const isSelected = selectedProfile === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedProfile(key)}
              className={`p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? "border-green-500/70 bg-green-900/20"
                  : "border-[hsl(220,13%,25%)] bg-[hsl(220,13%,15%)] hover:border-[hsl(220,13%,35%)]"
              }`}
            >
              <div className="text-white font-bold text-sm mb-1">{p.label}</div>
              <div className="text-gray-500 text-xs">{p.description}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={profile.allocations}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {profile.allocations.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value}%`, "Allocation"]}
                contentStyle={{ background: "hsl(220,13%,14%)", border: "1px solid hsl(220,13%,25%)", borderRadius: "8px" }}
                labelStyle={{ color: "#fff" }}
                itemStyle={{ color: "#9ca3af" }}
              />
              <Legend
                formatter={(value) => <span style={{ color: "#9ca3af", fontSize: "11px" }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          {profile.allocations.map((alloc) => {
            const instruments = topInstrumentsByCategory(alloc.category);
            return (
              <div key={alloc.category} className="bg-[hsl(220,13%,10%)] border border-[hsl(220,13%,18%)] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: alloc.color }} />
                    <span className="text-white text-xs font-bold">{alloc.name}</span>
                  </div>
                  <span className="text-green-400 font-black text-sm">{alloc.value}%</span>
                </div>
                {instruments.length > 0 && (
                  <div className="pl-4 space-y-0.5">
                    {instruments.map((inst) => (
                      <div key={inst.id} className="text-xs text-gray-500">
                        · {inst.instrumentName}{inst.instrumentCode ? ` (${inst.instrumentCode})` : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type ReportsProps = {
  onNavigatePricing: () => void;
};

export default function Reports({ onNavigatePricing }: ReportsProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const { isPremium } = useSubscription();
  const { isAdmin } = useAdmin();
  const sessionId = typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
  const isFullAccess = isPremium || isAdmin;

  const { data, isLoading, error } = useQuery({
    queryKey: ["reports", activeCategory, sessionId],
    queryFn: () => fetchReports(activeCategory === "all" ? undefined : activeCategory, sessionId),
    refetchInterval: false,
  });

  const { data: allData } = useQuery({
    queryKey: ["reports", "all", sessionId],
    queryFn: () => fetchReports(undefined, sessionId),
    enabled: isFullAccess,
    refetchInterval: false,
  });

  const reports = data?.reports ?? [];
  const allReports = allData?.reports ?? reports;

  return (
    <div className="min-h-screen bg-[hsl(220,13%,9%)]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Investment Analysis Reports</h1>
          <p className="text-sm text-gray-500">Curated analyst picks across 7 asset classes — for long-term wealth creation</p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === cat.key
                  ? "bg-green-600 text-white"
                  : "bg-[hsl(220,13%,16%)] text-gray-400 hover:text-white hover:bg-[hsl(220,13%,20%)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {isFullAccess && (
          <PortfolioAllocator reports={allReports} />
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-gray-500">Loading reports…</span>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400">Failed to load reports. Please refresh.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {reports.map((report) => (
                <ReportCard key={report.id} report={report} isPremium={isFullAccess} />
              ))}
              {reports.length === 0 && (
                <div className="col-span-3 text-center py-16 text-gray-500">No reports found for this category.</div>
              )}
            </div>

            {!isFullAccess && (
              <PremiumLock onNavigatePricing={onNavigatePricing} />
            )}

            {!isFullAccess && (
              <div className="mt-6 bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-5">
                <h3 className="text-white font-semibold mb-2 text-sm">What's included in Pro Educator Plan?</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-gray-500">
                  {["Full analyst rationale for all picks", "Suggested allocation % per instrument", "Portfolio Allocator (3 risk profiles)", "Top 2 instruments per asset class", "Donut chart breakdown", "7 asset class coverage"].map((f) => (
                    <div key={f} className="flex items-start gap-1.5">
                      <span className="text-green-600 shrink-0">✦</span> {f}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-8 bg-yellow-900/10 border border-yellow-600/20 rounded-xl p-5 text-center">
          <p className="text-yellow-300/70 text-xs leading-relaxed">
            ⚠️ <strong>SEBI Disclaimer:</strong> Investment reports are for educational purposes only. Not SEBI-registered investment advice. Past performance does not guarantee future results. Consult a qualified SEBI-registered advisor.
          </p>
        </div>
      </div>
    </div>
  );
}
