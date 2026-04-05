import { useEffect } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { useAdmin } from "@/hooks/use-admin";

type SubscriptionGuardProps = {
  onNavigatePricing: (message?: string) => void;
  children: React.ReactNode;
  redirectMessage?: string;
};

export function SubscriptionGuard({ onNavigatePricing, children, redirectMessage }: SubscriptionGuardProps) {
  const { isPremium, loading } = useSubscription();
  const { isAdmin } = useAdmin();

  useEffect(() => {
    if (!loading && !isPremium && !isAdmin) {
      onNavigatePricing(
        redirectMessage ??
          "This section requires an active Pro Educator subscription. Subscribe below to unlock all educational tools, signal charts, calculators, and analytics for 90 days."
      );
    }
  }, [loading, isPremium, isAdmin, onNavigatePricing, redirectMessage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mr-3" />
        <span className="text-gray-500 text-sm">Checking subscription…</span>
      </div>
    );
  }

  if (!isPremium && !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
