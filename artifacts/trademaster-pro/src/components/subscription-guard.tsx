import { useSubscription } from "@/hooks/use-subscription";
import { useAdmin } from "@/hooks/use-admin";

// TESTING MODE — set to false to re-enable subscription gate
const TESTING_MODE = true;

type SubscriptionGuardProps = {
  onNavigatePricing: (message?: string) => void;
  children: React.ReactNode;
  redirectMessage?: string;
};

export function SubscriptionGuard({ onNavigatePricing, children, redirectMessage }: SubscriptionGuardProps) {
  const { isPremium, loading } = useSubscription();
  const { isAdmin } = useAdmin();
  void onNavigatePricing; void redirectMessage;

  // TESTING MODE: bypass all subscription checks
  if (TESTING_MODE) return <>{children}</>;

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
