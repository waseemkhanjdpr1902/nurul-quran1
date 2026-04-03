import { Link, useLocation } from "wouter";
import { Store, Tag, PlusCircle, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { DisclaimerFooter } from "./disclaimer-footer";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col max-w-md mx-auto relative shadow-xl overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-20">
        {children}
        <DisclaimerFooter />
      </div>
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  const [location] = useLocation();
  const { isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) return null;

  const tabs = [
    { href: "/stockswap/", icon: Tag, label: "Deals" },
    { href: "/stockswap/list", icon: PlusCircle, label: "Sell" },
    { href: "/stockswap/my-listings", icon: Store, label: "My Shop" },
  ];

  return (
    <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-between items-center z-50 pb-safe">
      {tabs.map((tab) => {
        const isActive = location === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
              isActive ? "text-primary" : "text-gray-500 hover:text-gray-900"
            }`}
            data-testid={`nav-${tab.label.toLowerCase()}`}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{tab.label}</span>
          </Link>
        );
      })}
      <button
        onClick={logout}
        className="flex flex-col items-center p-2 rounded-lg text-gray-500 hover:text-red-600 transition-colors"
        data-testid="nav-logout"
      >
        <LogOut className="w-6 h-6 mb-1" />
        <span className="text-xs font-medium">Logout</span>
      </button>
    </nav>
  );
}
