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

const FREE_FEATURES = [
  "3 live signals per day (preview)",
  "Nifty & Bank Nifty index signals",
  "Signal status (Target Hit / SL Hit)",
  "Market overview dashboard",
  "SEBI compliance & disclaimers",
];

const ELITE_FEATURES = [
  "Unlimited live signals across all segments",
  "Pre-market research notes (6:30 AM daily)",
  "Intraday equity picks — 10 to 15 per session",
  "Nifty & Bank Nifty index calls (precise levels)",
  "Options signals with IV, PCR & OI intelligence",
  "Commodity — Gold, Silver, Crude Oil, Natural Gas",
  "Currency pairs — USD/INR, EUR/INR, GBP/INR",
  "Institutional-grade entry, Stop-Loss & 2 Targets",
  "Risk:Reward analysis on every signal",
  "Real-time status alerts & analyst commentary",
  "Investment Analysis Reports (7 asset classes)",
  "Portfolio Allocator — 3 risk profiles",
  "Verified Performance History with breakdowns",
  "Priority access to high-conviction setups",
  "Dedicated WhatsApp signal group",
];

const TESTIMONIALS = [
  {
    name: "Arjun V.",
    city: "Mumbai",
    profit: "₹1.2L",
    period: "in 3 weeks",
    text: "Their Bank Nifty calls are surgical. I made ₹1.2 lakh in 3 weeks just from options — the IV and PCR analysis they provide is something you'd pay ₹50,000 for elsewhere.",
    stars: 5,
  },
  {
    name: "Sneha R.",
    city: "Bangalore",
    profit: "₹87,000",
    period: "first month",
    text: "Coming from other services that charged less and delivered nothing, TradeMaster Pro is in a different league entirely. The pre-market notes alone are worth the subscription.",
    stars: 5,
  },
  {
    name: "Karthik M.",
    city: "Chennai",
    profit: "₹2.4L",
    period: "in 2 months",
    text: "87% success rate is not marketing fluff — I personally tracked 55 signals last month and 48 hit target. The risk management discipline they teach saved my capital multiple times.",
    stars: 5,
  },
  {
    name: "Nisha P.",
    city: "Delhi",
    profit: "₹65,000",
    period: "intraday picks",
    text: "Switched from a ₹499/month service to TradeMaster Pro and never looked back. The quality of analysis is institutional-grade. 100% worth every rupee.",
    stars: 5,
  },
];

const STATS = [
  { label: "Overall Success Rate", value: "87%", sub: "verified across all segments" },
  { label: "Intraday Accuracy", value: "84%", sub: "equity intraday calls" },
  { label: "Avg Risk:Reward", value: "1:3.1", sub: "per verified signal" },
  { label: "Targets Hit", value: "48/55", sub: "signals this month" },
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
        name: "TradeMaster Pro — Elite",
        description: "Elite Trading Signals · Monthly Access",
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
      <div className="max-w-5xl mx-auto px-4 py-10">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm mb-8 flex items-center gap-1 transition-colors">
          ← Back to Signals
        </button>

        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-4 py-1.5 rounded-full mb-5 font-semibold tracking-wider uppercase">
            ♛ Elite Membership · Limited Seats
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            India's Most Accurate<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">Trading Signal Service</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
            Institutional-quality research. Pre-market intelligence. 87% verified success rate.
            Used by 6,800+ traders across India.
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-10 max-w-3xl mx-auto">
            {STATS.map(s => (
              <div key={s.label} className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl px-4 py-4">
                <div className="text-2xl font-black text-green-400">{s.value}</div>
                <div className="text-white text-xs font-semibold mt-0.5">{s.label}</div>
                <div className="text-gray-600 text-xs">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">

          {/* Free */}
          <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,22%)] rounded-2xl p-7 flex flex-col">
            <div className="mb-6">
              <div className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Free Preview</div>
              <div className="text-5xl font-black text-white">₹0</div>
              <div className="text-gray-500 text-sm mt-2">No credit card · Always free</div>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-500">
                  <span className="text-gray-600 mt-0.5 shrink-0">✓</span> {f}
                </li>
              ))}
            </ul>
            <div className="bg-[hsl(220,13%,16%)] text-gray-500 text-sm font-semibold text-center py-3 rounded-xl">
              Current Free Plan
            </div>
          </div>

          {/* Elite */}
          <div className="relative bg-gradient-to-b from-[hsl(220,13%,14%)] to-[hsl(220,13%,11%)] border-2 border-green-500/60 rounded-2xl p-7 flex flex-col overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-amber-500/5 pointer-events-none" />
            <div className="absolute top-5 right-5 flex gap-1.5">
              <span className="bg-amber-500 text-black text-[10px] font-black px-2.5 py-1 rounded-full tracking-wider uppercase">♛ Elite</span>
            </div>

            <div className="mb-6 relative">
              <div className="text-green-400 text-xs font-black uppercase tracking-widest mb-3">Elite Monthly</div>
              <div className="flex items-end gap-2">
                <div className="text-5xl font-black text-white">₹4,999</div>
                <div className="text-gray-400 text-sm mb-2">/month</div>
              </div>
              <div className="text-gray-500 text-sm mt-1">Cancel anytime · Instant activation</div>
              <div className="mt-3 inline-flex items-center gap-2 bg-green-900/30 border border-green-500/20 rounded-lg px-3 py-1.5">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-xs font-semibold">Only ₹166/day for institutional-grade research</span>
              </div>
            </div>

            <ul className="space-y-2.5 mb-8 flex-1 relative">
              {ELITE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                  <span className="text-amber-400 mt-0.5 shrink-0 font-black">✦</span> {f}
                </li>
              ))}
            </ul>

            {isPremium ? (
              <div className="bg-green-500/15 text-green-400 border border-green-500/40 text-sm font-black text-center py-4 rounded-xl relative">
                ✅ You are an Elite Member
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
                  placeholder="Phone number (for WhatsApp group access)"
                  className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,28%)] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
                />
                <button
                  onClick={handleSubscribe}
                  disabled={loading || !scriptReady}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl transition-all text-base tracking-wide shadow-xl shadow-green-900/30"
                >
                  {loading ? "Processing…" : "♛ Activate Elite Access — ₹4,999/month →"}
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
        </div>

        {/* Trust bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-14">
          {[
            { icon: "🛡️", title: "100% Secure", sub: "Razorpay PCI-DSS encryption" },
            { icon: "⚡", title: "Instant Access", sub: "Signals live within minutes" },
            { icon: "📲", title: "WhatsApp Group", sub: "Elite member-only channel" },
            { icon: "🔄", title: "Cancel Anytime", sub: "No lock-in, no questions" },
          ].map(t => (
            <div key={t.title} className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl px-4 py-4 text-center">
              <div className="text-2xl mb-1">{t.icon}</div>
              <div className="text-white text-xs font-bold">{t.title}</div>
              <div className="text-gray-600 text-xs mt-0.5">{t.sub}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mb-14">
          <div className="text-center mb-8">
            <h2 className="text-white text-2xl font-black mb-2">Results Our Elite Members Achieve</h2>
            <p className="text-gray-500 text-sm">Real traders. Real profits. Verified outcomes.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-5 hover:border-green-500/20 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-yellow-400 text-sm">{"★".repeat(t.stars)}</div>
                  <div className="bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-black px-3 py-1 rounded-full">
                    {t.profit} {t.period}
                  </div>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-3">"{t.text}"</p>
                <div className="text-gray-500 text-xs font-semibold">{t.name} · {t.city} · <span className="text-amber-500/70">♛ Elite Member</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-12">
          <h2 className="text-white text-xl font-black text-center mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {[
              { q: "How is the 87% success rate calculated?", a: "We track every signal posted from entry to exit. A signal is marked 'Target Hit' only when the price reaches the defined target. Our historical data is available in the Performance section for full transparency." },
              { q: "When are signals posted?", a: "Pre-market research notes go out at 6:30 AM IST. Intraday signals are posted live throughout the market session (9:15 AM – 3:30 PM). Positional setups are published after market close." },
              { q: "How do I access signals after payment?", a: "Access is activated instantly. You'll receive signals on this dashboard and be added to our exclusive Elite WhatsApp group for real-time alerts." },
              { q: "Can I cancel my subscription?", a: "Yes. You can cancel anytime with no penalties. Your Elite access remains active until the end of the billing period." },
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
            ⚠️ <strong>SEBI Disclaimer:</strong> TradeMaster Pro is NOT a SEBI-registered investment advisor. All signals are strictly for educational purposes and do not constitute investment advice. Trading in equity, F&O, commodities, and currencies involves substantial risk of capital loss. Past performance is not indicative of future results. Please consult a qualified, SEBI-registered financial advisor before making any investment decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
