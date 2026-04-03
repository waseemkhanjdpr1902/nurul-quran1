import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DisclaimerModal } from "@/components/disclaimer-modal";
import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { TickerBar } from "@/components/ticker-bar";
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import Pricing from "@/pages/pricing";
import Reports from "@/pages/reports";
import Performance from "@/pages/performance";

const queryClient = new QueryClient();

type Page = "home" | "admin" | "pricing" | "reports" | "performance";

function App() {
  const [page, setPage] = useState<Page>("home");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-[hsl(220,13%,9%)] flex flex-col">
          <DisclaimerModal />

          <header className="bg-[hsl(220,13%,10%)] border-b border-[hsl(220,13%,18%)] sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <button onClick={() => setPage("home")} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center text-white font-black text-base shadow-lg shadow-green-900/40">TM</div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <div className="text-white font-black text-sm tracking-tight">TradeMaster Pro</div>
                    <span className="text-amber-400 text-[9px] font-black bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-full tracking-widest">ELITE</span>
                  </div>
                  <div className="text-gray-500 text-xs">87% Accuracy · Institutional-Grade Signals</div>
                </div>
              </button>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setPage("home")}
                  className={`text-xs font-semibold transition-colors ${page === "home" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
                >
                  Signals
                </button>
                <button
                  onClick={() => setPage("reports")}
                  className={`text-xs font-semibold transition-colors ${page === "reports" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
                >
                  Reports
                </button>
                <button
                  onClick={() => setPage("performance")}
                  className={`text-xs font-semibold transition-colors ${page === "performance" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
                >
                  Performance
                </button>
                <button
                  onClick={() => setPage("pricing")}
                  className={`text-xs font-semibold transition-colors ${page === "pricing" ? "text-green-400" : "text-gray-500 hover:text-green-400"}`}
                >
                  💎 Pricing
                </button>
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span>Live</span>
                </div>
              </div>
            </div>
            <TickerBar />
          </header>

          <main className="flex-1">
            {page === "home" && (
              <Home
                onNavigateAdmin={() => setPage("admin")}
                onNavigatePricing={() => setPage("pricing")}
              />
            )}
            {page === "admin" && <Admin onBack={() => setPage("home")} />}
            {page === "pricing" && <Pricing onBack={() => setPage("home")} />}
            {page === "reports" && <Reports onNavigatePricing={() => setPage("pricing")} />}
            {page === "performance" && <Performance onNavigatePricing={() => setPage("pricing")} />}
          </main>

          <DisclaimerFooter />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
