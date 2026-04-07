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

const PRO_EDUCATOR_FEATURES = [
  "Access to all trading signal charts & levels (educational reference)",
  "Pre-market educational notes — posted at 6:30 AM IST",
  "Intraday technical analysis charts — 10 to 15 educational setups per session",
  "Nifty & Bank Nifty index reference levels with support/resistance analysis",
  "Options educational content — IV, PCR & OI data interpretation",
  "Commodity educational charts — Gold, Silver, Crude Oil, Natural Gas",
  "Currency pair analysis — USD/INR, EUR/INR, GBP/INR (for learning)",
  "Black-Scholes option greeks calculator",
  "Position sizing & risk management calculators",
  "Pivot point & Fibonacci retracement tools",
  "Investment analysis reports across 7 asset classes",
  "Portfolio Allocator — 3 risk profile simulations",
  "Full performance history with outcome tracking",
  "Personal trade journal with analytics",
  "90 days of educational tool access",
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

export default function Pricing({ onBack, redirectMessage }: { onBack: () => void; redirectMessage?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const { isPremium, activate } = useSubscription();
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    loadRazorpayScript().then(setScriptReady);
  }, []);

  const handleSubscribe = async () => {
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (!scriptReady) { setError("Payment gateway is loading. Please try again."); return; }
    setLoading(true);
    setError("");
    try {
      const order = await createRazorpayOrder();
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "TradeMaster Pro — Pro Educator",
        description: "Pro Educator Plan · 90-Day Educational Tool Access",
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
        prefill: { email, contact: phone },
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
      <div className="max-w-3xl mx-auto px-4 py-10">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm mb-8 flex items-center gap-1 transition-colors">
          ← Back
        </button>

        {redirectMessage && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-8 flex items-start gap-3">
            <span className="text-amber-400 text-lg shrink-0">🔒</span>
            <p className="text-amber-300 text-sm leading-relaxed">{redirectMessage}</p>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs px-4 py-1.5 rounded-full mb-5 font-semibold tracking-wider uppercase">
            📚 Pro Educator Plan — Educational Tools Access
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
            Unlock 90 Days of<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">Educational Trading Tools</span>
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto text-base leading-relaxed">
            Charts, calculators, screening logic, and historical data analysis — all in one platform, built for learning how markets work.
          </p>
        </div>

        {/* Plan Card */}
        <div className="relative bg-gradient-to-b from-[hsl(220,13%,13%)] to-[hsl(220,13%,10%)] border-2 border-green-500/50 rounded-2xl p-8 mb-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none" />

          <div className="relative mb-6">
            <div className="text-green-400 text-xs font-black uppercase tracking-widest mb-3">Pro Educator Plan</div>
            <div className="flex items-end gap-2 mb-1">
              <div className="text-5xl font-black text-white">₹2,500</div>
              <div className="text-gray-400 text-base mb-2">/ 3 Months</div>
            </div>
            <div className="text-gray-500 text-sm mt-1">One-time payment · 90 days of access · No auto-renewal</div>

            <div className="mt-4 bg-yellow-900/20 border border-yellow-600/20 rounded-xl px-4 py-3">
              <p className="text-yellow-300/80 text-xs leading-relaxed">
                <strong>Important:</strong> This fee is for access to <strong>software tools and educational content only</strong> — not for financial advisory, investment recommendations, or any SEBI-regulated service. TradeMaster Pro is not a SEBI-registered investment adviser.
              </p>
            </div>
          </div>

          <ul className="space-y-2.5 mb-8 relative">
            {PRO_EDUCATOR_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                <span className="text-green-400 mt-0.5 shrink-0 font-black">✓</span> {f}
              </li>
            ))}
          </ul>

          {isPremium ? (
            <div className="bg-green-500/15 text-green-400 border border-green-500/40 text-sm font-black text-center py-4 rounded-xl relative">
              ✅ You have an active Pro Educator subscription
            </div>
          ) : (
            <div className="relative space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address (for receipt & access)"
                className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,28%)] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number (optional)"
                className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,28%)] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
              />
              <button
                onClick={handleSubscribe}
                disabled={loading || !scriptReady}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl transition-all text-base tracking-wide shadow-xl shadow-green-900/30"
              >
                {loading ? "Processing…" : "Subscribe Now — ₹2,500 for 90 Days →"}
              </button>
              <div className="flex items-center justify-center gap-3 text-xs text-gray-600">
                <span>🔒 Razorpay Secured</span>
                <span>·</span>
                <span>UPI · Cards · Net Banking</span>
                <span>·</span>
                <span>Instant Activation</span>
              </div>
            </div>
          )}
          {error && <p className="text-red-400 text-xs mt-3 text-center">{error}</p>}
        </div>

        {/* Trust bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {[
            { icon: "🛡️", title: "100% Secure", sub: "Razorpay PCI-DSS encryption" },
            { icon: "⚡", title: "Instant Access", sub: "Tools live within minutes" },
            { icon: "📚", title: "90-Day Access", sub: "Charts, calculators & history" },
            { icon: "📋", title: "Software Only", sub: "Not financial advisory" },
          ].map(t => (
            <div key={t.title} className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl px-4 py-4 text-center">
              <div className="text-2xl mb-1">{t.icon}</div>
              <div className="text-white text-xs font-bold">{t.title}</div>
              <div className="text-gray-600 text-xs mt-0.5">{t.sub}</div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mb-10">
          <h2 className="text-white text-xl font-black text-center mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {[
              { q: "What exactly am I paying for?", a: "You are paying for 90 days of access to educational software tools: signal charts (for learning technical analysis), position sizing calculators, option greeks calculator, pivot point tools, trade journal, performance tracking, and investment analysis reports. This is a software subscription, not a financial advisory service." },
              { q: "Is this SEBI-regulated financial advice?", a: "No. TradeMaster Pro is not a SEBI-registered investment adviser. All content is strictly for educational purposes. We do not provide personalised investment advice or portfolio management services." },
              { q: "How does access work after payment?", a: "Access is activated instantly after payment verification. All tools and educational content are unlocked for 90 days from your activation date." },
              { q: "Is there auto-renewal?", a: "No. The ₹2,500 plan is a one-time payment for 90 days of access. There is no automatic renewal — you can choose to subscribe again when your period ends." },
              { q: "What if the data is delayed?", a: "Market data displayed on this platform may be delayed by 15–30 minutes and is provided for educational reference only. It should not be used for real-time trading decisions." },
            ].map(({ q, a }) => (
              <div key={q} className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-5">
                <div className="text-white font-semibold text-sm mb-2">{q}</div>
                <div className="text-gray-400 text-sm leading-relaxed">{a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* SEBI Disclaimer */}
        <div className="bg-yellow-900/10 border border-yellow-600/20 rounded-xl p-5 text-center">
          <p className="text-yellow-300/70 text-xs leading-relaxed">
            ⚠️ <strong>SEBI Disclaimer:</strong> TradeMaster Pro is NOT a SEBI-registered investment adviser. All content is strictly for educational purposes and does not constitute investment advice. Trading involves substantial risk of capital loss. Past performance is not indicative of future results. Please consult a qualified, SEBI-registered financial adviser before making any investment decisions. Market data may be delayed by 15–30 minutes and is for educational reference only.
          </p>
        </div>
      </div>
    </div>
  );
}
