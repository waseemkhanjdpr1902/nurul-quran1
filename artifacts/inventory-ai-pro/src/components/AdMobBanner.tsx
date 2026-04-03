import { useAuth } from "@/context/AuthContext";

export function AdMobBanner() {
  const { isFreeTier } = useAuth();

  if (!isFreeTier) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-gray-100 dark:bg-gray-900 border-t border-border">
      <div 
        style={{ width: "320px", height: "50px" }}
        className="flex items-center justify-center bg-gray-200 dark:bg-gray-800 text-xs text-muted-foreground"
      >
        <span className="sr-only">AdMob Banner</span>
        Test ID: ca-app-pub-3940256099942544/6300978111
      </div>
    </div>
  );
}
