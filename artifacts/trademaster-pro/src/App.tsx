import { useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DisclaimerModal } from "@/components/disclaimer-modal";
import { TickerBar } from "@/components/ticker-bar";
import { SubscriptionGuard } from "@/components/subscription-guard";
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import Pricing from "@/pages/pricing";
import Reports from "@/pages/reports";
import Journal from "@/pages/journal";
import Analytics from "@/pages/analytics";
import Calculators from "@/pages/calculators";
import Performance from "@/pages/performance";

const queryClient = new QueryClient();

type Page = "journal" | "analytics" | "watchlist" | "calculators" | "reports" | "pricing" | "admin" | "performance";

const NAV: { key: Page; label: string; icon: string }[] = [
  { key: "watchlist", label: "Signals", icon: "📡" },
  { key: "journal", label: "My Trades", icon: "📓" },
  { key: "analytics", label: "Analytics", icon: "📊" },
  { key: "calculators", label: "Calculators", icon: "🔢" },
  { key: "reports", label: "Reports", icon: "📋" },
  { key: "performance", label: "Performance", icon: "🏆" },
];

function App() {
  const [page, setPage] = useState<Page>("watchlist");
  const [pricingMessage, setPricingMessage] = useState<string | undefined>(undefined);

  const navigateToPricing = useCallback((message?: string) => {
    setPricingMessage(message);
    setPage("pricing");
  }, []);

  const navigateBack = useCallback(() => {
    setPricingMessage(undefined);
    setPage("watchlist");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-[hsl(220,13%,9%)] flex flex-col">
          <DisclaimerModal />

          <header className="bg-[hsl(220,13%,10%)] border-b border-[hsl(220,13%,18%)] sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <button onClick={() => setPage("watchlist")} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center text-white font-black text-base shadow-lg shadow-green-900/40">TM</div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <div className="text-white font-black text-sm tracking-tight">TradeMaster Pro</div>
                    <span className="text-amber-400 text-[9px] font-black bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-full tracking-widest">EDU</span>
                  </div>
                  <div className="text-gray-500 text-xs">Educational Trading Tools</div>
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
                  onClick={() => navigateToPricing()}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${page === "pricing" ? "bg-green-500/20 text-green-400" : "text-gray-500 hover:text-green-400"}`}
                >
                  📚 Subscribe
                </button>
                <div className="flex items-center gap-1 text-xs text-gray-600 ml-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="hidden sm:inline">Edu</span>
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
            {page === "watchlist" && (
              <SubscriptionGuard
                onNavigatePricing={navigateToPricing}
                redirectMessage="Access to trading signals and market charts requires an active Pro Educator subscription. Subscribe below to unlock 90 days of educational tools."
              >
                <Home
                  onNavigateAdmin={() => setPage("admin")}
                  onNavigatePricing={() => navigateToPricing()}
                />
              </SubscriptionGuard>
            )}
            {page === "journal" && (
              <SubscriptionGuard
                onNavigatePricing={navigateToPricing}
                redirectMessage="Access to the trade journal requires an active Pro Educator subscription. Subscribe to log trades, track P&L, and improve your edge."
              >
                <Journal />
              </SubscriptionGuard>
            )}
            {page === "analytics" && (
              <SubscriptionGuard
                onNavigatePricing={navigateToPricing}
                redirectMessage="Access to performance analytics requires an active Pro Educator subscription. Subscribe to unlock insights from your trading history."
              >
                <Analytics />
              </SubscriptionGuard>
            )}
            {page === "calculators" && (
              <SubscriptionGuard
                onNavigatePricing={navigateToPricing}
                redirectMessage="Access to calculators requires an active Pro Educator subscription. Subscribe to use position sizing, option greeks, and pivot tools."
              >
                <Calculators />
              </SubscriptionGuard>
            )}
            {page === "reports" && (
              <SubscriptionGuard
                onNavigatePricing={navigateToPricing}
                redirectMessage="Access to investment analysis reports requires an active Pro Educator subscription. Subscribe to unlock 7-asset-class educational reports."
              >
                <Reports onNavigatePricing={() => navigateToPricing()} />
              </SubscriptionGuard>
            )}
            {page === "performance" && (
              <SubscriptionGuard
                onNavigatePricing={navigateToPricing}
                redirectMessage="Access to full performance history requires an active Pro Educator subscription. Subscribe to view all historical signals and outcomes."
              >
                <Performance onNavigatePricing={() => navigateToPricing()} />
              </SubscriptionGuard>
            )}
            {page === "pricing" && (
              <Pricing
                onBack={navigateBack}
                redirectMessage={pricingMessage}
              />
            )}
            {page === "admin" && <Admin onBack={() => setPage("watchlist")} />}
          </main>

          <footer className="bg-[hsl(220,13%,10%)] border-t border-[hsl(220,13%,18%)] py-4 px-4 text-center">
            <p className="text-gray-600 text-xs font-medium">
              🛡️ <strong className="text-gray-500">TradeMaster Pro is an educational tool.</strong> We do not provide SEBI-registered investment advice. All data is for educational and personal record-keeping purposes only.
            </p>
            <p className="text-gray-700 text-xs mt-1">
              Trading involves risk. Past performance does not guarantee future results. Market data may be delayed 15–30 min. Consult a SEBI-registered adviser before investing.
            </p>
            <p className="text-gray-700 text-xs mt-2">
              <a href="./privacy.html" className="text-gray-600 hover:text-gray-400 underline" target="_blank" rel="noopener">Privacy Policy</a>
            </p>
          </footer>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
