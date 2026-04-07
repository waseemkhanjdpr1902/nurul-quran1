import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSignals, updateSignal, type Signal } from "@/lib/api";
import { SignalCard } from "@/components/signal-card";
import { useAdmin } from "@/hooks/use-admin";
import { useSubscription } from "@/hooks/use-subscription";
import { AdBanner } from "@/components/ad-banner";

function todayIST(): string {
  return new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
}

function istTimeStr(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

function pnlPct(signal: Signal): number | null {
  const entry = parseFloat(signal.entryPrice);
  const exit  = signal.exitPrice ? parseFloat(signal.exitPrice) : null;
  if (!exit || isNaN(entry) || isNaN(exit) || entry === 0) return null;
  return signal.signalType === "buy" ? ((exit - entry) / entry) * 100 : ((entry - exit) / entry) * 100;
}

const SESSION_KEY = "trademaster_session_id";

const LOT_SIZES: Record<string, number> = {
  NIFTY: 75, BANKNIFTY: 30, FINNIFTY: 65, MIDCPNIFTY: 75,
  "HDFC BANK": 550, HDFCBANK: 550, RELIANCE: 250,
  "ICICI BANK": 700, ICICIBANK: 700, INFOSYS: 400,
  TCS: 150, AXISBANK: 1200, "AXIS BANK": 1200,
  BAJAJFINANCE: 125, "BAJAJ FINANCE": 125, MARUTI: 30,
};

function getLotSize(name: string): number | null {
  const u = name.toUpperCase();
  for (const [k, v] of Object.entries(LOT_SIZES)) if (u.startsWith(k)) return v;
  return null;
}

function buildOptionsDigest(signals: Signal[]): string {
  const opts = signals.filter(s => s.segment === "options" && s.status === "active");
  if (!opts.length) return "No active option chain signals right now.";

  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

  const grouped: Record<string, Signal[]> = {};
  opts.forEach(s => {
    const m = s.assetName.match(/^([A-Z ]+)\s+\d+\s+[CP]E/i);
    const grp = m ? m[1].trim() : "Other";
    (grouped[grp] ??= []).push(s);
  });

  const lines = [
    `🔥 *TradeMaster Pro — Option Chain Digest*`,
    `📅 *${today}*`,
    `━━━━━━━━━━━━━━━━━━━━━`,
  ];

  for (const [grp, sigs] of Object.entries(grouped)) {
    lines.push(`\n*${grp} Options*`);
    sigs.forEach(s => {
      const optType = /\bCE\b/i.test(s.assetName) ? "CALL ☎️" : /\bPE\b/i.test(s.assetName) ? "PUT 🛡️" : "";
      const lot = getLotSize(s.assetName);
      const entry = parseFloat(s.entryPrice);
      const sl = parseFloat(s.stopLoss);
      const t1 = parseFloat(s.target1);
      const slPct = !isNaN(entry) && !isNaN(sl) ? ` (−${(((entry-sl)/entry)*100).toFixed(0)}%)` : "";
      const t1Pct = !isNaN(entry) && !isNaN(t1) ? ` (+${(((t1-entry)/entry)*100).toFixed(0)}%)` : "";
      const maxLoss = lot && !isNaN(entry) && !isNaN(sl) ? ` | Max Loss ₹${Math.round((entry-sl)*lot).toLocaleString("en-IN")}` : "";
      lines.push(`📊 *${s.assetName}* ${optType ? `[${optType}]` : ""}`);
      lines.push(`  Entry ₹${s.entryPrice} | SL ₹${s.stopLoss}${slPct} | T1 ₹${s.target1}${t1Pct}${maxLoss}`);
      if (s.target2) lines.push(`  T2 ₹${s.target2}`);
      if (s.iv || s.pcr) {
        const ivPcr = [s.iv ? `IV ${s.iv}` : "", s.pcr ? `PCR ${s.pcr}` : ""].filter(Boolean).join(" | ");
        lines.push(`  ${ivPcr}`);
      }
    });
  }

  lines.push(`\n━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`⚠️ _Educational only. Not SEBI investment advice._`);
  lines.push(`— _TradeMaster Pro_`);
  return lines.join("\n");
}

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
    key: "options",
    label: "Option Chain",
    icon: "⛓️",
    description: "Nifty · BankNifty · FinNifty · Stock options",
    color: "from-violet-900/60 to-violet-950/60",
    accent: "violet",
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
  const [digestCopied, setDigestCopied] = useState(false);
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

  // Separate query for "Closed Today" — always fetches all segments
  const { data: allData } = useQuery({
    queryKey: ["signals-all", sessionId],
    queryFn: () => fetchSignals(undefined, sessionId),
    refetchInterval: 60000,
  });

  const today = todayIST();
  const closedToday = (allData?.signals ?? []).filter((s) => {
    if (s.status === "active") return false;
    const closedDateStr = s.closedAt
      ? new Date(s.closedAt).toISOString().slice(0, 10)
      : null;
    const createdDateStr = new Date(s.createdAt).toISOString().slice(0, 10);
    return (closedDateStr ?? createdDateStr) === today;
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

  const handleShareOptionsDigest = async (via: "whatsapp" | "copy") => {
    const allData = await fetchSignals(undefined, sessionId);
    const text = buildOptionsDigest(allData.signals ?? []);
    if (via === "copy") {
      try {
        await navigator.clipboard.writeText(text);
        setDigestCopied(true);
        setTimeout(() => setDigestCopied(false), 2500);
      } catch {
        setDigestCopied(false);
      }
    } else {
      const encoded = encodeURIComponent(text);
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    }
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

        {/* Options Chain — Share Digest Banner */}
        {activeSegment === "options" && signals.length > 0 && (
          <div className="mb-5 bg-violet-950/30 border border-violet-500/25 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-violet-300 font-bold text-sm mb-0.5">📢 Share Option Chain Digest</div>
              <div className="text-gray-500 text-xs">
                One-tap to share all {signals.filter(s => s.status === "active").length} active option signals as a formatted WhatsApp group message
              </div>
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap">
              <button
                onClick={() => void handleShareOptionsDigest("whatsapp")}
                className="flex items-center gap-1.5 text-xs font-bold bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 px-3 py-2 rounded-xl transition-colors"
              >
                📱 Share to WhatsApp Group
              </button>
              <button
                onClick={() => void handleShareOptionsDigest("copy")}
                className={`flex items-center gap-1.5 text-xs font-bold border px-3 py-2 rounded-xl transition-colors ${
                  digestCopied
                    ? "bg-green-500/20 text-green-300 border-green-500/30"
                    : "bg-[hsl(220,13%,18%)] hover:bg-[hsl(220,13%,22%)] text-gray-300 border-[hsl(220,13%,25%)]"
                }`}
              >
                {digestCopied ? "✅ Digest Copied!" : "📋 Copy Digest"}
              </button>
            </div>
          </div>
        )}

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

        {/* Closed Today */}
        {closedToday.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-black text-gray-300">Closed Today</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-500 border border-gray-700/60 uppercase tracking-widest">
                {closedToday.length} signal{closedToday.length !== 1 ? "s" : ""}
              </span>
              <div className="h-px flex-1 bg-[hsl(220,13%,18%)]" />
              {(() => {
                const wins = closedToday.filter(s => s.status === "target_hit").length;
                const rate = closedToday.length > 0 ? ((wins / closedToday.length) * 100).toFixed(0) : null;
                return rate ? (
                  <span className={`text-[10px] font-bold ${parseInt(rate) >= 60 ? "text-green-400" : parseInt(rate) >= 40 ? "text-amber-400" : "text-red-400"}`}>
                    {rate}% win rate today
                  </span>
                ) : null;
              })()}
            </div>
            <div className="space-y-1.5">
              {closedToday
                .sort((a, b) => (b.closedAt ?? b.createdAt).localeCompare(a.closedAt ?? a.createdAt))
                .map((s) => {
                const isBuy = s.signalType === "buy";
                const pnl = pnlPct(s);
                const isWin = s.status === "target_hit";
                const isAuto = s.createdBy === "auto-engine";
                return (
                  <div key={s.id} className="flex items-center gap-2 bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-lg px-3 py-2 flex-wrap">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border shrink-0 ${isBuy ? "text-green-400 border-green-500/30 bg-green-500/10" : "text-red-400 border-red-500/30 bg-red-500/10"}`}>
                      {isBuy ? "▲" : "▼"}
                    </span>
                    <span className="text-white font-bold text-xs truncate flex-1">{s.assetName}</span>
                    {isAuto && <span className="text-[9px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1 py-0.5 rounded shrink-0">🤖</span>}
                    <span className="text-xs font-mono text-gray-500 shrink-0">
                      ₹{s.entryPrice}
                      {s.exitPrice && <> → ₹{parseFloat(s.exitPrice).toFixed(2)}</>}
                    </span>
                    {pnl != null && (
                      <span className={`text-xs font-black shrink-0 ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}%
                      </span>
                    )}
                    <span className={`text-[10px] shrink-0 ${isWin ? "text-green-400" : "text-red-400"}`}>
                      {isWin ? "✅" : "❌"}
                    </span>
                    {s.closedAt && (
                      <span className="text-[9px] text-gray-600 font-mono shrink-0">{istTimeStr(s.closedAt)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-8 text-center text-xs text-gray-700 max-w-2xl mx-auto">
          ⚠️ All signals and technical levels are for educational and self-tracking purposes only. TradeMaster Pro is <strong className="text-gray-600">not a SEBI-registered investment adviser</strong>. Please consult a qualified financial advisor before trading.
        </div>
      </div>
    </div>
  );
}
