import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSignals, updateSignal } from "@/lib/api";
import { SignalCard } from "@/components/signal-card";
import { useAdmin } from "@/hooks/use-admin";
import { useSubscription } from "@/hooks/use-subscription";
import { AdBanner } from "@/components/ad-banner";

const SESSION_KEY = "trademaster_session_id";

const SEGMENTS = [
  {
    key: "all",
    label: "All Markets",
    icon: "🌐",
    description: "Every active signal across all segments",
    color: "from-gray-700 to-gray-800",
    accent: "gray",
  },
  {
    key: "intraday",
    label: "Intraday",
    icon: "⚡",
    description: "Same-day scalp & momentum trades",
    color: "from-yellow-900/60 to-yellow-950/60",
    accent: "yellow",
  },
  {
    key: "nifty",
    label: "Nifty 50",
    icon: "📈",
    description: "Index levels, support & resistance",
    color: "from-blue-900/60 to-blue-950/60",
    accent: "blue",
  },
  {
    key: "banknifty",
    label: "BankNifty",
    icon: "🏦",
    description: "Bank Nifty futures & options flow",
    color: "from-indigo-900/60 to-indigo-950/60",
    accent: "indigo",
  },
  {
    key: "stocks",
    label: "Stocks",
    icon: "🏢",
    description: "Large & mid-cap equity breakouts",
    color: "from-green-900/60 to-green-950/60",
    accent: "green",
  },
  {
    key: "fno",
    label: "F&O",
    icon: "🔄",
    description: "Futures, options strategies & spreads",
    color: "from-purple-900/60 to-purple-950/60",
    accent: "purple",
  },
  {
    key: "currency",
    label: "Currency",
    icon: "💱",
    description: "USD-INR, EUR-INR forex signals",
    color: "from-teal-900/60 to-teal-950/60",
    accent: "teal",
  },
  {
    key: "commodity",
    label: "Commodity",
    icon: "🥇",
    description: "Gold, Silver, Crude Oil, Natural Gas",
    color: "from-amber-900/60 to-amber-950/60",
    accent: "amber",
  },
];

const MARKET_COVERAGE = [
  { icon: "📈", label: "Nifty 50", sub: "Index Levels", color: "text-blue-400" },
  { icon: "🏦", label: "BankNifty", sub: "Options Flow", color: "text-indigo-400" },
  { icon: "🏢", label: "500+ Stocks", sub: "Large & Mid Cap", color: "text-green-400" },
  { icon: "🔄", label: "F&O", sub: "Futures & Options", color: "text-purple-400" },
  { icon: "💱", label: "Currency", sub: "USD / EUR / GBP", color: "text-teal-400" },
  { icon: "🥇", label: "Commodity", sub: "Gold · Silver · Oil", color: "text-amber-400" },
];

const STATS = [
  { label: "Overall Accuracy", value: "87%", icon: "🎯", color: "text-green-400" },
  { label: "Intraday Win Rate", value: "84%", icon: "⚡", color: "text-yellow-400" },
  { label: "Avg Risk:Reward", value: "1:3.1", icon: "⚖️", color: "text-blue-400" },
  { label: "Targets / Month", value: "48/55", icon: "✅", color: "text-green-400" },
];

type HomeProps = {
  onNavigateAdmin: () => void;
  onNavigatePricing: () => void;
};

export default function Home({ onNavigateAdmin, onNavigatePricing }: HomeProps) {
  const [activeSegment, setActiveSegment] = useState("all");
  const [showCoverage, setShowCoverage] = useState(false);
  const { isAdmin, adminToken } = useAdmin();
  const { isPremium, loading: subLoading, activate } = useSubscription();
  const queryClient = useQueryClient();
  const sessionId = typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    if (sid) {
      window.history.replaceState({}, "", window.location.pathname);
      void activate(sid);
    }
  }, [activate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["signals", activeSegment, sessionId],
    queryFn: () => fetchSignals(activeSegment === "all" ? undefined : activeSegment, sessionId),
    refetchInterval: 30000,
  });

  const signals = data?.signals ?? [];
  const FREE_LIMIT = 3;
  const visibleSignals = isPremium || isAdmin ? signals : signals.slice(0, FREE_LIMIT);
  const lockedCount = signals.length - visibleSignals.length;
  const activeSegInfo = SEGMENTS.find((s) => s.key === activeSegment) ?? SEGMENTS[0];

  const handleStatusUpdate = async (id: number, status: string) => {
    if (!adminToken) return;
    await updateSignal(id, { status }, adminToken);
    queryClient.invalidateQueries({ queryKey: ["signals"] });
  };

  return (
    <div className="min-h-screen bg-[hsl(220,13%,9%)]">
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-white">Market Signals</h1>
              <span className="inline-flex items-center gap-1 bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-black px-2 py-0.5 rounded-full tracking-widest uppercase">
                Live
              </span>
              {isPremium && (
                <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full tracking-widest uppercase">
                  ♛ Pro Educator
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Technical analysis levels across Nifty · BankNifty · Stocks · F&O · Currency · Commodity
              <span className="text-gray-600"> · Educational reference only</span>
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 text-amber-400/90 text-[10px] font-semibold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full opacity-80" />
              Data delayed by 15–30 min for educational purposes
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowCoverage((v) => !v)}
              className="hidden sm:flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-xs px-3 py-2 rounded-lg bg-[hsl(220,13%,14%)] border border-[hsl(220,13%,22%)] transition-colors"
            >
              🌐 Coverage
            </button>
            {!isPremium && !subLoading && (
              <button
                onClick={onNavigatePricing}
                className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white text-sm font-black px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-green-900/30"
              >
                ♛ Subscribe
              </button>
            )}
            {isPremium && (
              <button
                onClick={onNavigatePricing}
                className="bg-amber-500/10 text-amber-400 border border-amber-500/40 text-xs px-3 py-1.5 rounded-lg font-black hover:bg-amber-500/20 transition-colors tracking-wide"
              >
                ♛ PRO EDUCATOR
              </button>
            )}
            {isAdmin && (
              <button
                onClick={onNavigateAdmin}
                className="bg-[hsl(220,13%,18%)] hover:bg-[hsl(220,13%,22%)] text-gray-300 text-sm px-4 py-2 rounded-lg border border-[hsl(220,13%,25%)] transition-colors"
              >
                ⚙️ Admin
              </button>
            )}
          </div>
        </div>

        {/* Market Coverage Panel */}
        {showCoverage && (
          <div className="mb-5 bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,22%)] rounded-2xl p-4">
            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Markets Covered</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {MARKET_COVERAGE.map((m) => (
                <div key={m.label} className="bg-[hsl(220,13%,16%)] rounded-xl p-3 text-center">
                  <div className="text-2xl mb-1">{m.icon}</div>
                  <div className={`text-xs font-bold ${m.color}`}>{m.label}</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">{m.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <span className="text-xl shrink-0">{s.icon}</span>
              <div>
                <div className={`font-black text-lg leading-tight ${s.color}`}>{s.value}</div>
                <div className="text-gray-500 text-xs leading-tight">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {!isPremium && !isAdmin && <AdBanner className="mb-5" />}

        {/* Segment Tabs — Scrollable */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2 scrollbar-none">
          {SEGMENTS.map((seg) => {
            const isActive = activeSegment === seg.key;
            return (
              <button
                key={seg.key}
                onClick={() => setActiveSegment(seg.key)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-green-600 text-white shadow-md shadow-green-900/40"
                    : "bg-[hsl(220,13%,14%)] text-gray-400 hover:text-white hover:bg-[hsl(220,13%,20%)] border border-[hsl(220,13%,22%)]"
                }`}
              >
                <span>{seg.icon}</span>
                <span>{seg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Segment Header */}
        <div className="flex items-center gap-3 mb-4 px-1">
          <span className="text-2xl">{activeSegInfo.icon}</span>
          <div>
            <div className="text-white font-bold text-base">{activeSegInfo.label}</div>
            <div className="text-gray-500 text-xs">{activeSegInfo.description}</div>
          </div>
          {signals.length > 0 && (
            <span className="ml-auto text-xs font-semibold text-gray-500 bg-[hsl(220,13%,16%)] px-3 py-1 rounded-full">
              {signals.length} signal{signals.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Signals Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-gray-500">Fetching latest signals…</span>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400">Failed to load signals. Please refresh.</div>
        ) : signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">{activeSegInfo.icon}</div>
            <div className="text-gray-300 text-lg font-semibold mb-2">
              No {activeSegInfo.label} signals yet
            </div>
            <div className="text-gray-600 text-sm">
              {isAdmin
                ? "Post the first signal from the Admin panel"
                : "Our analyst is preparing calls — check back soon"}
            </div>
            {activeSegment !== "all" && (
              <button
                onClick={() => setActiveSegment("all")}
                className="mt-4 text-green-400 hover:text-green-300 text-sm font-semibold underline underline-offset-4"
              >
                View all markets →
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleSignals.map((signal) => (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  isPremiumUser={isPremium || !!isAdmin}
                  adminToken={adminToken}
                  onStatusUpdate={handleStatusUpdate}
                />
              ))}
            </div>

            {!isPremium && !isAdmin && lockedCount > 0 && (
              <div className="mt-6 bg-gradient-to-r from-[hsl(220,13%,13%)] via-green-950/20 to-amber-950/10 border border-amber-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-amber-400 text-xs font-black tracking-widest uppercase bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      Pro Educator Only
                    </span>
                  </div>
                  <div className="text-white font-bold text-lg">
                    🔒 {lockedCount} premium signal{lockedCount !== 1 ? "s" : ""} locked
                  </div>
                  <div className="text-gray-400 text-sm mt-1">
                    Pro Educator members unlock full entry, SL &amp; target levels across Nifty, BankNifty, F&amp;O, Stocks, Currency &amp; Commodities — with IV/PCR data, S&amp;R zones &amp; Fibonacci levels.
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {["Nifty 50", "BankNifty", "500+ Stocks", "F&O", "Currency", "Commodity"].map((m) => (
                      <span key={m} className="text-[11px] text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full font-medium">
                        ✓ {m}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={onNavigatePricing}
                  className="shrink-0 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-black px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-green-900/30 text-sm whitespace-nowrap"
                >
                  ♛ Subscribe Now →
                </button>
              </div>
            )}
          </>
        )}

        {/* Disclaimer */}
        <div className="mt-8 text-center text-xs text-gray-700 max-w-2xl mx-auto">
          ⚠️ All signals and technical levels are for educational and self-tracking purposes only. TradeMaster Pro is <strong className="text-gray-600">not a SEBI-registered investment adviser</strong>. Please consult a qualified financial advisor before trading.
        </div>
      </div>
    </div>
  );
}
