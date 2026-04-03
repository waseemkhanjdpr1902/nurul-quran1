import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DisclaimerModal } from "@/components/disclaimer-modal";
import { TickerBar } from "@/components/ticker-bar";
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import Pricing from "@/pages/pricing";
import Reports from "@/pages/reports";
import Journal from "@/pages/journal";
import Analytics from "@/pages/analytics";
import Calculators from "@/pages/calculators";

const queryClient = new QueryClient();

type Page = "journal" | "analytics" | "watchlist" | "calculators" | "reports" | "pricing" | "admin";

const NAV: { key: Page; label: string; icon: string }[] = [
  { key: "journal", label: "My Trades", icon: "📓" },
  { key: "analytics", label: "Analytics", icon: "📊" },
  { key: "watchlist", label: "Watchlist", icon: "👁️" },
  { key: "calculators", label: "Calculators", icon: "🔢" },
  { key: "reports", label: "Reports", icon: "📋" },
];

function App() {
  const [page, setPage] = useState<Page>("journal");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-[hsl(220,13%,9%)] flex flex-col">
          <DisclaimerModal />

          <header className="bg-[hsl(220,13%,10%)] border-b border-[hsl(220,13%,18%)] sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <button onClick={() => setPage("journal")} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center text-white font-black text-base shadow-lg shadow-green-900/40">TM</div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <div className="text-white font-black text-sm tracking-tight">TradeMaster Pro</div>
                    <span className="text-amber-400 text-[9px] font-black bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-full tracking-widest">JOURNAL</span>
                  </div>
                  <div className="text-gray-500 text-xs">Trading Journal &amp; Analytics Dashboard</div>
                </div>
              </button>
              <div className="flex items-center gap-1">
                {NAV.map(n => (
                  <button
                    key={n.key}
                    onClick={() => setPage(n.key)}
                    className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${page === n.key ? "bg-green-600/20 text-green-400" : "text-gray-500 hover:text-gray-300"}`}
                  >
                    <span>{n.icon}</span>
                    <span>{n.label}</span>
                  </button>
                ))}
                <button
                  onClick={() => setPage("pricing")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${page === "pricing" ? "bg-amber-500/20 text-amber-400" : "text-gray-500 hover:text-amber-400"}`}
                >
                  💎 Elite
                </button>
                <div className="flex items-center gap-1 text-xs text-gray-600 ml-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="hidden sm:inline">Live</span>
                </div>
              </div>
            </div>

            <div className="sm:hidden flex overflow-x-auto gap-1 px-4 pb-2 scrollbar-none">
              {NAV.map(n => (
                <button
                  key={n.key}
                  onClick={() => setPage(n.key)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${page === n.key ? "bg-green-600/20 text-green-400" : "text-gray-500"}`}
                >
                  {n.icon} {n.label}
                </button>
              ))}
            </div>

            <TickerBar />
          </header>

          <main className="flex-1">
            {page === "journal" && <Journal />}
            {page === "analytics" && <Analytics />}
            {page === "watchlist" && (
              <Home
                onNavigateAdmin={() => setPage("admin")}
                onNavigatePricing={() => setPage("pricing")}
              />
            )}
            {page === "calculators" && <Calculators />}
            {page === "reports" && <Reports onNavigatePricing={() => setPage("pricing")} />}
            {page === "pricing" && <Pricing onBack={() => setPage("journal")} />}
            {page === "admin" && <Admin onBack={() => setPage("watchlist")} />}
          </main>

          <footer className="bg-[hsl(220,13%,10%)] border-t border-[hsl(220,13%,18%)] py-4 px-4 text-center">
            <p className="text-gray-600 text-xs font-medium">
              🛡️ <strong className="text-gray-500">TradeMaster Pro is a self-tracking tool.</strong> We do not provide SEBI-registered investment advice. All data is for educational and personal record-keeping purposes only.
            </p>
            <p className="text-gray-700 text-xs mt-1">
              Trading involves risk. Past performance does not guarantee future results. Consult a SEBI-registered advisor before investing.
            </p>
          </footer>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
