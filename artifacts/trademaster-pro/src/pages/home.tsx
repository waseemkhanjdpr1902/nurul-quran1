import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSignals, fetchSignalLTPs, updateSignal, type Signal, type SignalLTP } from "@/lib/api";
import { SignalCard } from "@/components/signal-card";
import { useAdmin } from "@/hooks/use-admin";
import { useSubscription } from "@/hooks/use-subscription";
import { AdBanner } from "@/components/ad-banner";

function todayIST(): string {
  return new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
}

function istDateStr(isoStr: string): string {
  const d = new Date(isoStr);
  return new Date(d.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
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
  const lines = [`🔥 *TradeMaster Pro — Option Chain Digest*`, `📅 *${today}*`, `━━━━━━━━━━━━━━━━━━━━━`];
  for (const [grp, sigs] of Object.entries(grouped)) {
    lines.push(`\n*${grp} Options*`);
    sigs.forEach(s => {
      const optType = /\bCE\b/i.test(s.assetName) ? "CALL ☎️" : /\bPE\b/i.test(s.assetName) ? "PUT 🛡️" : "";
      const entry = parseFloat(s.entryPrice), sl = parseFloat(s.stopLoss), t1 = parseFloat(s.target1);
      const slPct = !isNaN(entry) && !isNaN(sl) ? ` (−${(((entry-sl)/entry)*100).toFixed(0)}%)` : "";
      const t1Pct = !isNaN(entry) && !isNaN(t1) ? ` (+${(((t1-entry)/entry)*100).toFixed(0)}%)` : "";
      lines.push(`📊 *${s.assetName}* ${optType ? `[${optType}]` : ""}`);
      lines.push(`  Entry ₹${s.entryPrice} | SL ₹${s.stopLoss}${slPct} | T1 ₹${s.target1}${t1Pct}`);
      if (s.target2) lines.push(`  T2 ₹${s.target2}`);
      if (s.iv || s.pcr) lines.push(`  ${[s.iv ? `IV ${s.iv}` : "", s.pcr ? `PCR ${s.pcr}` : ""].filter(Boolean).join(" | ")}`);
    });
  }
  lines.push(`\n━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`⚠️ _Educational only. Not SEBI investment advice._`);
  lines.push(`— _TradeMaster Pro_`);
  return lines.join("\n");
}

const SEGMENTS = [
  { key: "all",       label: "ALL",       full: "All Markets" },
  { key: "options",   label: "OPTIONS",   full: "Option Chain" },
  { key: "intraday",  label: "INTRADAY",  full: "Intraday" },
  { key: "equity",    label: "EQUITY",    full: "Equity" },
  { key: "nifty",     label: "NIFTY",     full: "Nifty 50" },
  { key: "banknifty", label: "BANKNIFTY", full: "Bank Nifty" },
  { key: "fno",       label: "F&O",       full: "Futures & Options" },
  { key: "currency",  label: "FOREX",     full: "Currency" },
  { key: "commodity", label: "COMMOD",    full: "Commodity" },
];

type HomeProps = {
  onNavigateAdmin: () => void;
  onNavigatePricing: () => void;
};

function StatCell({ label, value, sub, valueColor = "text-white" }: { label: string; value: string; sub?: string; valueColor?: string }) {
  return (
    <div className="flex flex-col px-4 py-2.5 border-r border-[#1a2535] last:border-r-0 min-w-0">
      <span className="text-[9px] text-[#2a4060] uppercase tracking-widest mb-0.5 font-mono">{label}</span>
      <span className={`text-sm font-black font-mono leading-none ${valueColor}`}>{value}</span>
      {sub && <span className="text-[9px] text-[#3a5070] mt-0.5 font-mono">{sub}</span>}
    </div>
  );
}

function ClosedRow({ s }: { s: Signal }) {
  const isBuy = s.signalType === "buy";
  const pnl = pnlPct(s);
  const isWin = s.status === "target_hit";
  const isAuto = s.createdBy === "auto-engine";
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1a2535]/50 last:border-b-0 hover:bg-[#0d1525] transition-colors font-mono">
      <span className={`text-[9px] font-black w-4 shrink-0 ${isBuy ? "text-[#00d084]" : "text-[#ff4466]"}`}>{isBuy ? "▲" : "▼"}</span>
      <span className="text-white text-[11px] font-bold truncate flex-1 min-w-0">{s.assetName}</span>
      {isAuto && <span className="text-[8px] text-purple-400 shrink-0">🤖</span>}
      <span className="text-[10px] text-[#3a5070] font-mono shrink-0">₹{s.entryPrice}</span>
      {s.exitPrice && <span className="text-[10px] text-[#5a7090] shrink-0">→ ₹{parseFloat(s.exitPrice).toFixed(0)}</span>}
      {pnl != null && (
        <span className={`text-[10px] font-black w-12 text-right shrink-0 ${pnl >= 0 ? "text-[#00d084]" : "text-[#ff4466]"}`}>
          {pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}%
        </span>
      )}
      <span className={`text-[9px] font-bold w-3 shrink-0 ${isWin ? "text-[#00d084]" : "text-[#ff4466]"}`}>{isWin ? "✓" : "✗"}</span>
      {s.closedAt && <span className="text-[9px] text-[#2a4060] font-mono shrink-0 hidden sm:inline">{istTimeStr(s.closedAt)}</span>}
    </div>
  );
}

export default function Home({ onNavigateAdmin, onNavigatePricing }: HomeProps) {
  const [activeSegment, setActiveSegment] = useState("all");
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

  const { data: allData } = useQuery({
    queryKey: ["signals-all", sessionId],
    queryFn: () => fetchSignals(undefined, sessionId),
    refetchInterval: 60000,
  });

  const { data: ltpData } = useQuery<Record<number, SignalLTP>>({
    queryKey: ["signals-ltp"],
    queryFn: fetchSignalLTPs,
    refetchInterval: 60000,
    staleTime: 55000,
  });

  const today = todayIST();
  const closedToday = (allData?.signals ?? []).filter((s) => {
    if (s.status === "active") return false;
    const closedDateStr = s.closedAt ? istDateStr(s.closedAt) : null;
    const createdDateStr = istDateStr(s.createdAt);
    return (closedDateStr ?? createdDateStr) === today;
  });

  const signals = data?.signals ?? [];
  const FREE_LIMIT = 3;
  const visibleSignals = isPremium || isAdmin ? signals : signals.slice(0, FREE_LIMIT);
  const lockedCount = signals.length - visibleSignals.length;

  const winsToday = closedToday.filter(s => s.status === "target_hit").length;
  const winRateToday = closedToday.length > 0 ? Math.round((winsToday / closedToday.length) * 100) : null;
  const allSignals = allData?.signals ?? [];
  const totalClosed = allSignals.filter(s => s.status !== "active").length;
  const totalWins = allSignals.filter(s => s.status === "target_hit").length;
  const overallWinRate = totalClosed > 0 ? Math.round((totalWins / totalClosed) * 100) : null;
  const activeCount = allSignals.filter(s => s.status === "active").length;

  const handleStatusUpdate = async (id: number, status: string) => {
    if (!adminToken) return;
    await updateSignal(id, { status }, adminToken);
    queryClient.invalidateQueries({ queryKey: ["signals"] });
  };

  const handleShareOptionsDigest = async (via: "whatsapp" | "copy") => {
    const freshData = await fetchSignals(undefined, sessionId);
    const text = buildOptionsDigest(freshData.signals ?? []);
    if (via === "copy") {
      try { await navigator.clipboard.writeText(text); setDigestCopied(true); setTimeout(() => setDigestCopied(false), 2500); }
      catch { setDigestCopied(false); }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#07101e" }}>

      {/* ── Market Stats Bar ──────────────────────────────────────────── */}
      <div className="border-b border-[#1a2535]" style={{ background: "#080d1a" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-stretch overflow-x-auto scrollbar-none">
            <StatCell label="ACTIVE SIGNALS" value={String(activeCount)} sub="live positions" valueColor="text-[#00d084]" />
            <StatCell label="CLOSED TODAY" value={String(closedToday.length)} sub={winRateToday != null ? `${winRateToday}% win rate` : "no closed"} valueColor="text-amber-400" />
            <StatCell label="TOTAL WINS" value={totalClosed > 0 ? `${totalWins}/${totalClosed}` : "—"} sub={overallWinRate != null ? `${overallWinRate}% accuracy` : ""} valueColor={overallWinRate != null ? (overallWinRate >= 60 ? "text-[#00d084]" : "text-amber-400") : "text-white"} />
            <StatCell label="NIFTY PCR" value="1.121" sub="bullish bias" valueColor="text-[#00d084]" />
            <StatCell label="BN PCR" value="0.846" sub="range/bearish" valueColor="text-amber-400" />
            <div className="flex-1" />
            <div className="flex items-center px-4 gap-2">
              {!isPremium && !isAdmin && !subLoading && (
                <button
                  onClick={onNavigatePricing}
                  className="text-[10px] font-black tracking-widest px-3 py-1.5 rounded border border-[#00d084]/30 text-[#00d084] bg-[#00d084]/5 hover:bg-[#00d084]/15 transition-colors whitespace-nowrap font-mono"
                >
                  ★ UNLOCK PRO
                </button>
              )}
              {isPremium && (
                <span className="text-[10px] font-black tracking-widest text-amber-400 font-mono">★ PRO ACTIVE</span>
              )}
              {isAdmin && (
                <button
                  onClick={onNavigateAdmin}
                  className="text-[10px] font-mono text-[#3a5070] hover:text-[#6a90b0] transition-colors"
                >
                  [ADMIN]
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">

        {/* ── Segment filter ───────────────────────────────────────────── */}
        <div className="flex items-center gap-0 mb-5 border border-[#1a2535] rounded overflow-x-auto scrollbar-none" style={{ background: "#080d1a" }}>
          {SEGMENTS.map((seg, i) => (
            <button
              key={seg.key}
              onClick={() => setActiveSegment(seg.key)}
              className={`relative px-3 py-2.5 text-[10px] font-black tracking-widest whitespace-nowrap transition-colors font-mono border-r border-[#1a2535] last:border-r-0 ${
                activeSegment === seg.key
                  ? "text-[#00d084] bg-[#00d084]/8"
                  : "text-[#3a5070] hover:text-[#6a9090] hover:bg-[#0d1525]"
              }`}
            >
              {activeSegment === seg.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00d084]" />
              )}
              {seg.label}
            </button>
          ))}
        </div>

        {!isPremium && !isAdmin && <AdBanner className="mb-4" />}

        {/* ── Options digest bar ───────────────────────────────────────── */}
        {activeSegment === "options" && signals.length > 0 && (
          <div className="mb-4 flex items-center gap-3 px-3 py-2.5 rounded border border-[#1a2535] bg-[#0d1525] font-mono">
            <span className="text-[10px] text-[#4a7090] uppercase tracking-widest">OPTION DIGEST</span>
            <div className="flex-1" />
            <button
              onClick={() => void handleShareOptionsDigest("whatsapp")}
              className="text-[10px] font-bold text-[#25D366] border border-[#25D366]/25 bg-[#25D366]/8 hover:bg-[#25D366]/15 px-2.5 py-1 rounded transition-colors"
            >
              ↗ WhatsApp Group
            </button>
            <button
              onClick={() => void handleShareOptionsDigest("copy")}
              className={`text-[10px] font-bold px-2.5 py-1 rounded border transition-colors ${
                digestCopied
                  ? "text-[#00d084] border-[#00d084]/30 bg-[#00d084]/10"
                  : "text-[#5a7090] border-[#1a2535] bg-[#0d1525] hover:text-[#8aaac0]"
              }`}
            >
              {digestCopied ? "✓ Copied" : "⧉ Copy Digest"}
            </button>
          </div>
        )}

        {/* ── Main: signals + closed panel ─────────────────────────────── */}
        <div className="flex gap-4">

          {/* Left: Signals ─────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Section header */}
            <div className="flex items-center gap-2 mb-3 font-mono">
              <span className="w-1 h-3 bg-[#00d084] rounded-sm shrink-0" />
              <span className="text-[10px] text-[#4a6080] uppercase tracking-widest">
                {SEGMENTS.find(s => s.key === activeSegment)?.full ?? "All Markets"}
              </span>
              {signals.length > 0 && (
                <span className="text-[9px] text-[#2a4060] font-mono ml-1">
                  [{signals.length}]
                </span>
              )}
              <div className="flex-1 h-px bg-[#1a2535]" />
              <span className="text-[9px] text-[#2a4060] font-mono">
                REFRESH 30s
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 py-16 justify-center font-mono">
                <div className="w-4 h-4 border border-[#00d084] border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px] text-[#3a5070] tracking-widest">FETCHING SIGNALS…</span>
              </div>
            ) : error ? (
              <div className="text-center py-12 text-[#ff4466] text-[11px] font-mono tracking-widest">
                ERR: FAILED TO LOAD — RETRY
              </div>
            ) : signals.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center font-mono">
                <div className="text-[#1a2535] text-4xl mb-3">◈</div>
                <div className="text-[#3a5070] text-[11px] tracking-widest uppercase mb-1">NO SIGNALS IN THIS SEGMENT</div>
                <div className="text-[#2a3545] text-[10px]">
                  {isAdmin ? "Post via Admin panel" : "Analyst preparing signals — check back soon"}
                </div>
                {activeSegment !== "all" && (
                  <button
                    onClick={() => setActiveSegment("all")}
                    className="mt-4 text-[#00d084] text-[10px] font-bold tracking-widest hover:opacity-70 transition-opacity"
                  >
                    → VIEW ALL MARKETS
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {visibleSignals.map((signal) => (
                    <SignalCard
                      key={signal.id}
                      signal={signal}
                      isPremiumUser={isPremium || !!isAdmin}
                      adminToken={adminToken}
                      onStatusUpdate={handleStatusUpdate}
                      currentLtp={ltpData?.[signal.id] ?? null}
                    />
                  ))}
                </div>

                {/* Locked signals CTA */}
                {!isPremium && !isAdmin && lockedCount > 0 && (
                  <div className="mt-4 rounded border border-[#1a2535] overflow-hidden font-mono">
                    <div className="px-4 py-3 border-b border-[#1a2535] flex items-center gap-2" style={{ background: "#080d1a" }}>
                      <span className="text-[9px] text-amber-400 font-black tracking-widest border border-amber-400/25 bg-amber-400/8 px-1.5 py-0.5 rounded">PRO ONLY</span>
                      <span className="text-[11px] text-white font-bold">{lockedCount} SIGNAL{lockedCount !== 1 ? "S" : ""} LOCKED</span>
                      <div className="flex-1" />
                      <button
                        onClick={onNavigatePricing}
                        className="text-[10px] font-black tracking-widest px-3 py-1.5 rounded border border-[#00d084]/30 text-[#00d084] bg-[#00d084]/5 hover:bg-[#00d084]/15 transition-colors"
                      >
                        ★ SUBSCRIBE →
                      </button>
                    </div>
                    <div className="px-4 py-3 bg-[#0b1120]">
                      <div className="text-[10px] text-[#3a5070] leading-relaxed">
                        Pro Educator members unlock full entry, SL & target levels across Nifty · BankNifty · F&O · Equity · Currency · Commodity — with IV, PCR, OI data and S&R zones.
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {["NIFTY 50", "BANKNIFTY", "F&O", "EQUITY", "CURRENCY", "COMMODITY"].map(m => (
                          <span key={m} className="text-[9px] text-[#00d084]/60 border border-[#00d084]/15 px-1.5 py-0.5 rounded font-bold">✓ {m}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Closed Today panel ──────────────────────────────────── */}
          {closedToday.length > 0 && (
            <div className="w-72 shrink-0 hidden lg:block">
              <div className="rounded border border-[#1a2535] overflow-hidden font-mono sticky top-40">
                {/* Panel header */}
                <div className="px-3 py-2.5 border-b border-[#1a2535] flex items-center gap-2" style={{ background: "#080d1a" }}>
                  <span className="w-1 h-3 bg-amber-400 rounded-sm shrink-0" />
                  <span className="text-[10px] text-[#4a6080] uppercase tracking-widest flex-1">CLOSED TODAY</span>
                  <span className="text-[9px] text-[#2a4060]">[{closedToday.length}]</span>
                </div>
                {/* Win rate bar */}
                {winRateToday != null && (
                  <div className="px-3 py-2 border-b border-[#1a2535] bg-[#0b1120]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-[#3a5070] uppercase tracking-widest">WIN RATE</span>
                      <span className={`text-[10px] font-black ${winRateToday >= 60 ? "text-[#00d084]" : winRateToday >= 40 ? "text-amber-400" : "text-[#ff4466]"}`}>
                        {winRateToday}%
                      </span>
                    </div>
                    <div className="h-1 bg-[#1a2535] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${winRateToday >= 60 ? "bg-[#00d084]" : winRateToday >= 40 ? "bg-amber-400" : "bg-[#ff4466]"}`}
                        style={{ width: `${winRateToday}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[8px] text-[#00d084]/60">{winsToday}W</span>
                      <span className="text-[8px] text-[#ff4466]/60">{closedToday.length - winsToday}L</span>
                    </div>
                  </div>
                )}
                {/* Closed signal rows */}
                <div className="bg-[#0b1120] max-h-[60vh] overflow-y-auto">
                  {closedToday
                    .sort((a, b) => (b.closedAt ?? b.createdAt).localeCompare(a.closedAt ?? a.createdAt))
                    .map(s => <ClosedRow key={s.id} s={s} />)
                  }
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Closed Today */}
        {closedToday.length > 0 && (
          <div className="mt-4 lg:hidden rounded border border-[#1a2535] overflow-hidden font-mono">
            <div className="px-3 py-2.5 border-b border-[#1a2535] flex items-center gap-2" style={{ background: "#080d1a" }}>
              <span className="w-1 h-3 bg-amber-400 rounded-sm shrink-0" />
              <span className="text-[10px] text-[#4a6080] uppercase tracking-widest flex-1">CLOSED TODAY</span>
              {winRateToday != null && (
                <span className={`text-[10px] font-black font-mono ${winRateToday >= 60 ? "text-[#00d084]" : "text-amber-400"}`}>
                  {winRateToday}% WIN
                </span>
              )}
            </div>
            <div className="bg-[#0b1120]">
              {closedToday
                .sort((a, b) => (b.closedAt ?? b.createdAt).localeCompare(a.closedAt ?? a.createdAt))
                .map(s => <ClosedRow key={s.id} s={s} />)
              }
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-6 text-center font-mono">
          <span className="text-[9px] text-[#1a2535] uppercase tracking-widest">
            ⚠ EDUCATIONAL TOOL ONLY — NOT SEBI INVESTMENT ADVICE — DATA MAY BE DELAYED 15–30 MIN
          </span>
        </div>
      </div>
    </div>
  );
}
