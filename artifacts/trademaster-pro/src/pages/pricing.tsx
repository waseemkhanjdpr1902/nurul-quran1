import { useState, useEffect } from "react";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/api";
import { useSubscription } from "@/hooks/use-subscription";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
};

type RazorpayInstance = { open: () => void };

const BASIC_FEATURES = [
  "3 free trading tips per day",
  "Nifty & Bank Nifty basic signals",
  "Signal status updates (Target Hit / SL Hit)",
  "WhatsApp & Telegram sharing",
  "Market overview dashboard",
  "SEBI compliance disclaimers",
];

const PRO_FEATURES = [
  "Unlimited premium trading signals",
  "Intraday Equity picks (10–15 per day)",
  "Nifty & Bank Nifty index signals",
  "Options signals with IV & PCR analysis",
  "Commodity signals — Gold, Silver, Crude Oil",
  "Currency signals — USD/INR, EUR/INR",
  "Investment Analysis Reports (7 asset classes)",
  "Portfolio Allocator — Conservative / Moderate / Aggressive",
  "Performance History with detailed breakdowns",
  "Early pre-market research notes",
  "Precise Entry, Stop-Loss & 2 Targets",
  "Risk:Reward analysis on every signal",
  "Real-time signal status alerts",
  "Analyst commentary on each call",
  "Priority access to high-conviction setups",
];

const TESTIMONIALS = [
  { name: "Rahul M.", city: "Mumbai", text: "Made ₹38,000 in just 2 weeks following their Nifty Bank calls. The accuracy is unreal.", stars: 5 },
  { name: "Priya S.", city: "Hyderabad", text: "Switched from 3 other services. TradeMaster Pro's intraday equity tips are consistently profitable.", stars: 5 },
  { name: "Vikram T.", city: "Delhi", text: "87% accuracy this month. The stop-loss discipline they teach saved my capital multiple times.", stars: 5 },
];

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) { resolve(true); return; }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Pricing({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const { isPremium, activate } = useSubscription();
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    loadRazorpayScript().then(setScriptReady);
  }, []);

  const handleSubscribe = async () => {
    if (!scriptReady) { setError("Payment gateway is loading. Please try again."); return; }
    setLoading(true);
    setError("");
    try {
      const order = await createRazorpayOrder();
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "TradeMaster Pro",
        description: "Professional Trading Signals — Monthly Plan",
        image: "https://ui-avatars.com/api/?name=TM&background=16a34a&color=fff&bold=true&size=128",
        order_id: order.orderId,
        handler: async (response) => {
          try {
            const result = await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              email,
            });
            if (result.success) {
              await activate(result.sessionId);
            } else {
              setError("Payment verification failed. Please contact support.");
            }
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Payment verification failed.");
          } finally {
            setLoading(false);
          }
        },
        prefill: { email },
        theme: { color: "#16a34a" },
        modal: { ondismiss: () => setLoading(false) },
      });
      rzp.open();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initiate payment.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(220,13%,9%)]">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm mb-8 flex items-center gap-1 transition-colors">
          ← Back to Signals
        </button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-900/30 border border-green-500/30 text-green-400 text-xs px-4 py-1.5 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> 
            Live since 2021 · 4,200+ active subscribers
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Choose Your Plan</h1>
          <p className="text-gray-400 max-w-xl mx-auto text-lg">
            Join thousands of profitable traders who trust TradeMaster Pro for their daily market edge.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
          <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,22%)] rounded-2xl p-7">
            <div className="mb-6">
              <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Basic</div>
              <div className="text-5xl font-bold text-white">₹0</div>
              <div className="text-gray-500 text-sm mt-1">Free forever · No credit card needed</div>
            </div>
            <ul className="space-y-3 mb-8">
              {BASIC_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-400">
                  <span className="text-green-600 mt-0.5 shrink-0">✓</span> {f}
                </li>
              ))}
            </ul>
            <div className="bg-[hsl(220,13%,16%)] text-gray-500 text-sm font-semibold text-center py-3 rounded-xl">
              Current Free Plan
            </div>
          </div>

          <div className="bg-[hsl(220,13%,12%)] border-2 border-green-500/70 rounded-2xl p-7 relative overflow-hidden">
            <div className="absolute top-5 right-5 bg-green-500 text-black text-xs font-black px-3 py-1 rounded-full tracking-wide">BEST VALUE</div>
            <div className="mb-6">
              <div className="text-green-400 text-xs font-bold uppercase tracking-widest mb-2">Professional</div>
              <div className="flex items-end gap-2">
                <div className="text-5xl font-bold text-white">₹2,499</div>
                <div className="text-gray-400 text-sm mb-1.5">/month</div>
              </div>
              <div className="text-gray-500 text-sm mt-1">Cancel anytime · Instant activation</div>
              <div className="mt-2 text-xs text-green-400 font-semibold">
                🔥 Only ₹83/day — less than your chai & samosa
              </div>
            </div>
            <ul className="space-y-2.5 mb-8">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                  <span className="text-green-400 mt-0.5 shrink-0">✦</span> {f}
                </li>
              ))}
            </ul>

            {isPremium ? (
              <div className="bg-green-500/20 text-green-400 border border-green-500/50 text-sm font-bold text-center py-3 rounded-xl">
                ✅ You are on Professional Plan
              </div>
            ) : (
              <>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com (for payment receipt)"
                  className="w-full mb-3 bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,28%)] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-green-500"
                />
                <button
                  onClick={handleSubscribe}
                  disabled={loading || !scriptReady}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-black py-4 rounded-xl transition-colors text-base tracking-wide"
                >
                  {loading ? "Processing…" : "Subscribe Now — ₹2,499/month →"}
                </button>
                <p className="text-center text-xs text-gray-600 mt-3">🔒 Secured by Razorpay · UPI / Cards / Net Banking</p>
              </>
            )}
            {error && <p className="text-red-400 text-xs mt-3 text-center">{error}</p>}
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-white text-xl font-bold text-center mb-6">What Our Subscribers Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-5">
                <div className="text-yellow-400 text-sm mb-2">{"★".repeat(t.stars)}</div>
                <p className="text-gray-300 text-sm italic mb-3">"{t.text}"</p>
                <div className="text-gray-500 text-xs font-semibold">{t.name} · {t.city}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-6 text-center mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Overall Success Rate", value: "83%", sub: "across all segments" },
              { label: "Intraday Accuracy", value: "79%", sub: "equity intraday calls" },
              { label: "Avg Risk:Reward", value: "1:2.6", sub: "per verified signal" },
              { label: "Signals This Month", value: "47", sub: "40 targets hit" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-black text-green-400">{stat.value}</div>
                <div className="text-white text-xs font-semibold mt-0.5">{stat.label}</div>
                <div className="text-gray-600 text-xs">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-900/10 border border-yellow-600/20 rounded-xl p-5 text-center">
          <p className="text-yellow-300/70 text-xs leading-relaxed">
            ⚠️ <strong>SEBI Disclaimer:</strong> TradeMaster Pro is NOT a SEBI-registered investment advisor. All signals are strictly for educational purposes and do not constitute investment advice. Trading in equity, F&O, commodities, and currencies involves substantial risk of capital loss. Past performance is not indicative of future results. Please consult a qualified, SEBI-registered financial advisor before making any investment decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
