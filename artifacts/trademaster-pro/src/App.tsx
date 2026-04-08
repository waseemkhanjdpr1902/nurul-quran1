import { useState, useCallback, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DisclaimerModal } from "@/components/disclaimer-modal";
import { TickerBar } from "@/components/ticker-bar";
import { SubscriptionGuard } from "@/components/subscription-guard";
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import Pricing from "@/pages/pricing";
import Journal from "@/pages/journal";
import Calculators from "@/pages/calculators";
import Watchlist from "@/pages/watchlist";
import Events from "@/pages/events";
import ScalpDashboard from "@/pages/scalp";

const queryClient = new QueryClient();

type Page = "signals" | "scalp" | "watchlist" | "journal" | "calculators" | "events" | "pricing" | "admin";

const NAV: { key: Page; label: string; short: string }[] = [
  { key: "signals",     label: "SIGNALS",      short: "SIG" },
  { key: "scalp",       label: "HFT SCALP",    short: "HFT" },
  { key: "watchlist",   label: "WATCHLIST",    short: "WL" },
  { key: "journal",     label: "TRADE LOG",    short: "LOG" },
  { key: "calculators", label: "CALC",         short: "CLC" },
  { key: "events",      label: "EVENTS",       short: "EVT" },
];

function ISTClock() {
  const [time, setTime] = useState("");
  const [marketStatus, setMarketStatus] = useState<"PRE" | "OPEN" | "CLOSED">("CLOSED");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const hh = ist.getHours().toString().padStart(2, "0");
      const mm = ist.getMinutes().toString().padStart(2, "0");
      const ss = ist.getSeconds().toString().padStart(2, "0");
      setTime(`${hh}:${mm}:${ss}`);
      const total = ist.getHours() * 60 + ist.getMinutes();
      const day = ist.getDay();
      if (day === 0 || day === 6) { setMarketStatus("CLOSED"); return; }
      if (total >= 555 && total < 915)       setMarketStatus("PRE");
      else if (total >= 915 && total <= 930) setMarketStatus("OPEN");
      else if (total > 930 && total < 930)   setMarketStatus("OPEN");
      else if (total >= 915 && total < 930)  setMarketStatus("OPEN");
      // 9:15 = 555min, 15:30 = 930min
      const open = total >= 555 && total <= 930;
      const pre  = total >= 540 && total < 555;
      setMarketStatus(open ? "OPEN" : pre ? "PRE" : "CLOSED");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const statusColors = {
    OPEN:   "text-[#00d084] border-[#00d084]/30 bg-[#00d084]/10",
    PRE:    "text-amber-400 border-amber-400/30 bg-amber-400/10",
    CLOSED: "text-[#3a5070] border-[#1a2535] bg-[#0d1525]",
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded border font-mono ${statusColors[marketStatus]}`}>
        {marketStatus === "OPEN" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00d084] animate-pulse mr-1" />}
        {marketStatus}
      </span>
      <span className="text-[11px] font-mono text-[#3a5070] tracking-widest hidden sm:inline">{time} IST</span>
    </div>
  );
}

function App() {
  const [page, setPage] = useState<Page>("signals");
  const [pricingMessage, setPricingMessage] = useState<string | undefined>(undefined);

  const navigateToPricing = useCallback((message?: string) => {
    setPricingMessage(message);
    setPage("pricing");
  }, []);

  const navigateBack = useCallback(() => {
    setPricingMessage(undefined);
    setPage("signals");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col" style={{ background: "#07101e", fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace" }}>
          <DisclaimerModal />

          {/* ── Master header ──────────────────────────────────────────── */}
          <header className="sticky top-0 z-30 border-b border-[#1a2535]" style={{ background: "#080e1c" }}>

            {/* Top bar: brand + clock + subscribe */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a2535]/60">
              <button onClick={() => setPage("signals")} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                {/* Logo */}
                <div className="w-7 h-7 rounded flex items-center justify-center text-black font-black text-xs"
                  style={{ background: "linear-gradient(135deg, #00d084 0%, #00a86b 100%)" }}>
                  TM
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-black text-sm tracking-tight">TRADEMASTER</span>
                    <span className="text-[#00d084] font-black text-sm">PRO</span>
                    <span className="text-[9px] font-black text-amber-400/70 border border-amber-400/20 px-1 py-px rounded tracking-widest">EDU</span>
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-3">
                <ISTClock />
                <button
                  onClick={() => navigateToPricing()}
                  className="hidden sm:flex items-center gap-1.5 text-[10px] font-black tracking-widest px-3 py-1.5 rounded border border-[#00d084]/30 text-[#00d084] bg-[#00d084]/5 hover:bg-[#00d084]/15 transition-colors"
                >
                  ★ SUBSCRIBE
                </button>
                <button
                  onClick={() => setPage("admin")}
                  className="text-[10px] font-mono text-[#2a3545] hover:text-[#4a6080] transition-colors"
                >
                  ⚙
                </button>
              </div>
            </div>

            {/* Live ticker */}
            <TickerBar />

            {/* Tab navigation */}
            <div className="flex items-center border-t border-[#1a2535]/40">
              <div className="flex overflow-x-auto scrollbar-none">
                {NAV.map(n => (
                  <button
                    key={n.key}
                    onClick={() => setPage(n.key)}
                    className={`relative flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-black tracking-widest whitespace-nowrap transition-colors border-r border-[#1a2535]/50 ${
                      page === n.key
                        ? "text-[#00d084] bg-[#00d084]/5"
                        : "text-[#3a5070] hover:text-[#6a8090] hover:bg-[#0d1525]"
                    }`}
                  >
                    {page === n.key && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00d084] rounded-t" />
                    )}
                    <span className="hidden sm:inline">{n.label}</span>
                    <span className="sm:hidden">{n.short}</span>
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              <button
                onClick={() => navigateToPricing()}
                className="sm:hidden flex items-center text-[10px] font-black tracking-widest px-3 py-2.5 text-[#00d084]"
              >
                ★ SUB
              </button>
            </div>
          </header>

          {/* ── Main content ──────────────────────────────────────────── */}
          <main className="flex-1">
            {page === "signals" && (
              <SubscriptionGuard
                onNavigatePricing={navigateToPricing}
                redirectMessage="Access to trading signals requires a Pro Educator subscription."
              >
                <Home
                  onNavigateAdmin={() => setPage("admin")}
                  onNavigatePricing={() => navigateToPricing()}
                />
              </SubscriptionGuard>
            )}
            {page === "scalp"       && <ScalpDashboard />}
            {page === "watchlist"   && <Watchlist />}
            {page === "journal"     && (
              <SubscriptionGuard onNavigatePricing={navigateToPricing} redirectMessage="Trade journal requires Pro subscription.">
                <Journal />
              </SubscriptionGuard>
            )}
            {page === "calculators" && (
              <SubscriptionGuard onNavigatePricing={navigateToPricing} redirectMessage="Calculators require Pro subscription.">
                <Calculators />
              </SubscriptionGuard>
            )}
            {page === "events"      && <Events />}
            {page === "pricing"     && <Pricing onBack={navigateBack} redirectMessage={pricingMessage} />}
            {page === "admin"       && <Admin onBack={() => setPage("signals")} />}
          </main>

          {/* ── Footer ──────────────────────────────────────────────── */}
          <footer className="border-t border-[#1a2535] py-3 px-4" style={{ background: "#080e1c" }}>
            <p className="text-[#2a3545] text-[9px] font-mono tracking-wide text-center">
              TRADEMASTER PRO — EDUCATIONAL TOOL ONLY · NOT SEBI REGISTERED INVESTMENT ADVICE · DATA MAY BE DELAYED 15–30 MIN ·{" "}
              <a href="./privacy.html" className="text-[#3a5070] hover:text-[#5a7090] underline" target="_blank" rel="noopener">PRIVACY</a>
            </p>
          </footer>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
