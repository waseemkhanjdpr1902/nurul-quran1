type PremiumLockProps = {
  onNavigatePricing: () => void;
  title?: string;
  description?: string;
};

export function PremiumLock({
  onNavigatePricing,
  title = "Premium Feature",
  description = "This content is available exclusively to Professional subscribers.",
}: PremiumLockProps) {
  return (
    <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/10 border border-green-500/30 rounded-2xl p-8 text-center">
      <div className="text-4xl mb-3">🔒</div>
      <h3 className="text-white font-bold text-xl mb-2">{title}</h3>
      <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">{description}</p>
      <button
        onClick={onNavigatePricing}
        className="bg-green-600 hover:bg-green-500 text-white font-black px-8 py-3 rounded-xl transition-colors text-sm"
      >
        Upgrade to Professional →
      </button>
      <p className="text-gray-600 text-xs mt-3">₹2,499/month · Cancel anytime · Instant access</p>
    </div>
  );
}
