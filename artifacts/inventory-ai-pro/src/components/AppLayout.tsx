import { Link, useLocation } from "wouter";
import { LayoutDashboard, Camera, ClipboardList, Zap } from "lucide-react";
import { AdMobBanner } from "./AdMobBanner";
import { useAuth } from "@/context/AuthContext";
import { useGetInventorySummary, getGetInventorySummaryQueryKey } from "@workspace/api-client-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { isFreeTier } = useAuth();

  const { data: summary } = useGetInventorySummary({
    query: { queryKey: getGetInventorySummaryQueryKey(), staleTime: 30_000 }
  });

  const lowStockCount = summary?.lowStockCount ?? 0;

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, badge: lowStockCount > 0 ? lowStockCount : null },
    { href: "/camera", label: "Scan", icon: Camera, badge: null },
    { href: "/audit", label: "Audit", icon: ClipboardList, badge: null },
    { href: "/upgrade", label: "Pro", icon: Zap, badge: null },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background text-foreground pb-[100px]">
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-lg border-t border-border" style={{ paddingBottom: isFreeTier ? "50px" : "0" }}>
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <div className={`relative p-1 rounded-full ${isActive ? "bg-primary/10" : ""}`}>
                  <Icon className="w-5 h-5" />
                  {item.badge !== null && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <AdMobBanner />
    </div>
  );
}
