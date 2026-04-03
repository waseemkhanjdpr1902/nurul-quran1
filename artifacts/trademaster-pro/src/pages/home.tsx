import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSignals, updateSignal } from "@/lib/api";
import { SignalCard } from "@/components/signal-card";
import { useAdmin } from "@/hooks/use-admin";
import { useSubscription } from "@/hooks/use-subscription";
import { AdBanner } from "@/components/ad-banner";

const SESSION_KEY = "trademaster_session_id";

const SEGMENTS = [
  { key: "all", label: "All" },
  { key: "intraday", label: "⚡ Intraday" },
  { key: "nifty", label: "Nifty" },
  { key: "banknifty", label: "Bank Nifty" },
  { key: "options", label: "Options" },
  { key: "equity", label: "Equity" },
  { key: "commodity", label: "Commodity" },
  { key: "currency", label: "Currency" },
];

const STATS = [
  { label: "Overall Success Rate", value: "87%", icon: "🎯" },
  { label: "Intraday Accuracy", value: "84%", icon: "⚡" },
  { label: "Avg R:R Ratio", value: "1:3.1", icon: "⚖️" },
  { label: "Targets Hit / Month", value: "48/55", icon: "✅" },
];

type HomeProps = {
  onNavigateAdmin: () => void;
  onNavigatePricing: () => void;
};

export default function Home({ onNavigateAdmin, onNavigatePricing }: HomeProps) {
  const [activeSegment, setActiveSegment] = useState("all");
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

  const handleStatusUpdate = async (id: number, status: string) => {
    if (!adminToken) return;
    await updateSignal(id, { status }, adminToken);
    queryClient.invalidateQueries({ queryKey: ["signals"] });
  };

  return (
    <div className="min-h-screen bg-[hsl(220,13%,9%)]">
      <div className="max-w-7xl mx-auto px-4 py-6">

        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-white">Market Watchlist</h1>
              <span className="hidden sm:inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full tracking-widest uppercase">Elite</span>
            </div>
            <p className="text-sm text-gray-500">Technical analysis levels · Support &amp; Resistance data · Nifty · BankNifty · F&amp;O · Educational reference only</p>
          </div>
          <div className="flex items-center gap-3">
            {!isPremium && !subLoading && (
              <button
                onClick={onNavigatePricing}
                className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white text-sm font-black px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-green-900/30"
              >
                ♛ Go Elite
              </button>
            )}
            {isPremium && (
              <button onClick={onNavigatePricing} className="bg-amber-500/10 text-amber-400 border border-amber-500/40 text-xs px-3 py-1.5 rounded-lg font-black hover:bg-amber-500/20 transition-colors tracking-wide">
                ♛ ELITE MEMBER
              </button>
            )}
            {isAdmin && (
              <button onClick={onNavigateAdmin} className="bg-[hsl(220,13%,18%)] hover:bg-[hsl(220,13%,22%)] text-gray-300 text-sm px-4 py-2 rounded-lg border border-[hsl(220,13%,25%)] transition-colors">
                ⚙️ Admin
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {STATS.map((s) => (
            <div key={s.label} className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-xl">{s.icon}</span>
              <div>
                <div className="text-green-400 font-black text-lg leading-tight">{s.value}</div>
                <div className="text-gray-500 text-xs leading-tight">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {!isPremium && !isAdmin && (
          <AdBanner className="mb-5" />
        )}

        <div className="flex gap-2 mb-5 overflow-x-auto pb-2 scrollbar-none">
          {SEGMENTS.map((seg) => (
            <button
              key={seg.key}
              onClick={() => setActiveSegment(seg.key)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSegment === seg.key
                  ? "bg-green-600 text-white"
                  : "bg-[hsl(220,13%,16%)] text-gray-400 hover:text-white hover:bg-[hsl(220,13%,20%)]"
              }`}
            >
              {seg.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-gray-500">Fetching latest signals…</span>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400">Failed to load signals. Please refresh.</div>
        ) : signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">📊</div>
            <div className="text-gray-400 text-lg font-semibold">No signals in this segment yet</div>
            <div className="text-gray-600 text-sm mt-1">
              {isAdmin ? "Post the first signal from Admin panel" : "Our analyst is preparing calls — check back soon"}
            </div>
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
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-amber-400 text-xs font-black tracking-widest uppercase bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">Elite Only</span>
                  </div>
                  <div className="text-white font-bold text-lg mt-1">🔒 {lockedCount} premium watchlist entries locked</div>
                  <div className="text-gray-400 text-sm mt-1">Elite members get full technical analysis levels, IV/PCR data, support &amp; resistance zones, and Fibonacci levels — across Nifty, BankNifty, F&amp;O, commodities &amp; currencies.</div>
                  <div className="text-green-400 text-xs font-semibold mt-2">Full technical data · S&amp;R zones · Pivot levels · ₹166/day</div>
                </div>
                <button
                  onClick={onNavigatePricing}
                  className="shrink-0 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-black px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-green-900/30 text-sm whitespace-nowrap"
                >
                  ♛ Unlock Elite Access →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
