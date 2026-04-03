import { useState, useEffect } from "react";
import { useCreateCheckoutSession, useCreateSubscription } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Heart, Star, Crown, Check, Loader2, CreditCard, IndianRupee,
  BookOpen, Headphones, Shield, Zap, Users, Globe, ChevronDown, ChevronUp,
  Sparkles, Lock, Infinity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window { Razorpay: any; }
}

function useRazorpayConfig() {
  const [config, setConfig] = useState<{ configured: boolean; key_id?: string } | null>(null);
  useEffect(() => {
    fetch("/api/payments/razorpay/config")
      .then(r => r.json())
      .then(setConfig)
      .catch(() => setConfig({ configured: false }));
  }, []);
  return config;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const PLANS = [
  {
    id: "free",
    name: "Basic",
    priceINR: 0,
    priceUSD: 0,
    period: "",
    badge: null,
    highlight: false,
    features: [
      "Access 3 halal stocks",
      "Free Quran reader (all surahs)",
      "English & Urdu translations",
      "3 free courses",
      "Basic lecture library",
    ],
    locked: [
      "Premium courses & lectures",
      "Full halal stock screener",
      "Tafseer Ibn Katheer",
      "Offline listening",
      "Ad-free experience",
    ],
    cta: "Current Plan",
    disabled: true,
  },
  {
    id: "monthly",
    name: "Premium",
    priceINR: 999,
    priceUSD: 12,
    period: "/month",
    badge: "Most Popular",
    highlight: true,
    amountPaise: 99900,
    features: [
      "Full halal stock screener (30+ stocks)",
      "All premium courses & lectures",
      "Complete Tafseer Ibn Katheer",
      "Offline audio listening",
      "Ad-free experience",
      "Priority support",
      "New content first",
    ],
    cta: "Start Premium",
    disabled: false,
  },
  {
    id: "annual",
    name: "Annual",
    priceINR: 7999,
    priceUSD: 99,
    period: "/year",
    badge: "Save 33%",
    highlight: false,
    amountPaise: 799900,
    perMonthINR: 667,
    perMonthUSD: 8.25,
    features: [
      "Everything in Premium",
      "₹667/month billed yearly",
      "2 months free",
      "Exclusive annual webinars",
      "Scholar Q&A sessions",
      "Certificate of completion",
      "Early access to new features",
    ],
    cta: "Get Annual Plan",
    disabled: false,
  },
];

const FEATURES_DETAIL = [
  { icon: BookOpen, title: "All Premium Courses", desc: "18+ structured Islamic knowledge courses from Aqeedah, Fiqh, Tafseer, Seerah, and more" },
  { icon: Headphones, title: "Complete Lecture Library", desc: "300+ lectures by world-renowned scholars with audio, in English, Urdu, and Arabic" },
  { icon: Crown, title: "Full Quran Experience", desc: "Read with Tafseer Ibn Katheer, all translations, and per-ayah Mishary Alafasy recitation" },
  { icon: Zap, title: "30+ Halal Stocks", desc: "Full Shariah-screened stock database with live prices, analysis, and investment tips" },
  { icon: Shield, title: "Ad-Free & Offline", desc: "Zero ads, distraction-free learning, and offline listening through our PWA app" },
  { icon: Globe, title: "Multi-Language", desc: "Content in English, Urdu, and Arabic — designed for Muslims worldwide" },
];

const FAQS = [
  { q: "Is my payment secure?", a: "Yes. All payments are processed securely through Razorpay, which is PCI-DSS Level 1 compliant. We never store your card details." },
  { q: "Can I cancel anytime?", a: "Yes, you can cancel your subscription at any time from your profile page. You'll retain access until the end of your billing period." },
  { q: "Is there a free trial?", a: "We offer a free Basic plan with no credit card required. Upgrade anytime to unlock premium features." },
  { q: "Which payment methods are accepted?", a: "Via Razorpay we accept all major credit/debit cards, UPI, Net Banking, Wallets (Paytm, PhonePe), and EMI." },
  { q: "Is this a halal payment method?", a: "We use Razorpay for seamless INR transactions — there is no interest or ribawi element in the subscription itself." },
];

const TESTIMONIALS = [
  { name: "Ahmad R.", city: "Mumbai", text: "The Tafseer Ibn Katheer feature changed how I understand the Quran. Worth every rupee." },
  { name: "Fatima S.", city: "Hyderabad", text: "My children use the courses daily. Best Islamic education app I've found for our family." },
  { name: "Usman K.", city: "Lahore", text: "The halal stock screener alone is worth the subscription. Finally investing with confidence." },
];

const STATS = [
  { value: "10,000+", label: "Active Learners" },
  { value: "300+", label: "Lectures" },
  { value: "18", label: "Courses" },
  { value: "50+", label: "Countries" },
];

export default function Support() {
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [donating, setDonating] = useState(false);
  const [customDonation, setCustomDonation] = useState("");
  const { toast } = useToast();

  const razorpayConfig = useRazorpayConfig();
  const checkoutMutation = useCreateCheckoutSession();
  const subscriptionMutation = useCreateSubscription();
  const useRazorpay = razorpayConfig?.configured;
  const symbol = currency === "INR" ? "₹" : "$";

  const openRazorpay = async (options: object) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) throw new Error("Failed to load Razorpay");
    const rzp = new window.Razorpay({ ...options, theme: { color: "#004d40" }, key: razorpayConfig?.key_id });
    rzp.on("payment.failed", (r: any) => {
      toast({ title: "Payment failed", description: r.error?.description || "Please try again.", variant: "destructive" });
    });
    rzp.open();
  };

  const handleSubscribe = async (plan: typeof PLANS[0]) => {
    if (plan.disabled || !plan.amountPaise) return;
    setLoadingPlan(plan.id);
    try {
      const amountPaise = currency === "INR" ? plan.amountPaise : Math.round((plan.priceUSD ?? 0) * 100);
      const cur = currency;
      const res = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountPaise, currency: cur, receipt: `sub_${plan.id}_${Date.now()}` }),
      });
      if (!res.ok) throw new Error(await res.text());
      const order = await res.json();

      await openRazorpay({
        amount: order.amount,
        currency: order.currency,
        name: "Nurul Quran",
        description: plan.name === "Annual" ? "Annual Premium Membership" : "Monthly Premium Membership",
        order_id: order.id,
        handler: async (response: any) => {
          const verify = await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const result = await verify.json();
          if (result.success) {
            toast({ title: "🎉 Welcome to Premium!", description: "Your subscription is now active. JazakAllah Khair for your support!" });
          }
        },
        modal: { ondismiss: () => setLoadingPlan(null) },
        notes: { plan: plan.id, type: "subscription" },
      });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not initiate payment.", variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleDonate = async () => {
    const amount = parseFloat(customDonation || "499");
    const amountPaise = Math.round(amount * 100);
    if (amountPaise < 100) {
      toast({ title: "Minimum ₹1", variant: "destructive" }); return;
    }
    setDonating(true);
    try {
      const res = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountPaise, currency }),
      });
      if (!res.ok) throw new Error(await res.text());
      const order = await res.json();
      await openRazorpay({
        amount: order.amount, currency: order.currency,
        name: "Nurul Quran",
        description: "Sadaqah — Support Islamic Education",
        order_id: order.id,
        handler: () => toast({ title: "JazakAllah Khair!", description: "May Allah reward your generosity abundantly. آمين" }),
        modal: { ondismiss: () => setDonating(false) },
      });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not initiate payment.", variant: "destructive" });
    } finally {
      setDonating(false);
    }
  };

  return (
    <div className="pb-40">
      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground pt-16 pb-24 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-1/4 w-72 h-72 rounded-full bg-primary-foreground blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-secondary blur-3xl" />
        </div>
        <div className="relative container mx-auto max-w-4xl">
          <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="bg-secondary text-secondary-foreground mb-4 text-sm px-4 py-1 gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Premium Islamic Learning
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-serif font-bold mb-4 leading-tight">
              Elevate Your Islamic Knowledge
            </h1>
            <p className="text-lg sm:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-8">
              Unlock the full Nurul Quran experience — complete courses, Tafseer Ibn Katheer, halal investments, and more.
            </p>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {STATS.map(s => (
                <div key={s.label} className="bg-primary-foreground/10 rounded-xl p-3">
                  <p className="text-2xl font-bold text-secondary">{s.value}</p>
                  <p className="text-xs text-primary-foreground/70">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 -mt-10">

        {/* ── Currency toggle ── */}
        <div className="flex justify-center mb-8">
          <div className="bg-card border border-border rounded-full p-1 flex gap-1">
            {(["INR", "USD"] as const).map(c => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  currency === c ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c === "INR" ? "₹ INR" : "$ USD"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Pricing Cards ── */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl border p-7 relative flex flex-col ${
                plan.highlight
                  ? "bg-primary text-primary-foreground border-primary shadow-2xl scale-105 z-10"
                  : "bg-card border-border"
              }`}
            >
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2`}>
                  <Badge className={plan.highlight ? "bg-secondary text-secondary-foreground px-4" : "bg-primary text-primary-foreground px-4"}>
                    {plan.highlight && <Crown className="w-3 h-3 mr-1" />}{plan.badge}
                  </Badge>
                </div>
              )}

              <div className="mb-5">
                <p className={`text-sm font-medium mb-1 ${plan.highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    {plan.priceINR === 0 ? "Free" : `${symbol}${currency === "INR" ? plan.priceINR.toLocaleString() : plan.priceUSD}`}
                  </span>
                  {plan.period && (
                    <span className={`text-sm ${plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{plan.period}</span>
                  )}
                </div>
                {plan.perMonthINR && (
                  <p className={`text-xs mt-1 ${plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {currency === "INR" ? `₹${plan.perMonthINR}/month` : `$${plan.perMonthUSD}/month`} billed annually
                  </p>
                )}
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.highlight ? "text-secondary" : "text-primary"}`} />
                    <span className={plan.highlight ? "text-primary-foreground/90" : "text-foreground"}>{f}</span>
                  </li>
                ))}
                {plan.locked?.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm opacity-40">
                    <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan)}
                disabled={plan.disabled || loadingPlan === plan.id || !useRazorpay}
                variant={plan.highlight ? "secondary" : "outline"}
                className={`w-full h-12 font-semibold text-sm ${plan.highlight ? "" : plan.id !== "free" ? "border-primary text-primary hover:bg-primary hover:text-primary-foreground" : ""}`}
                data-testid={`button-subscribe-${plan.id}`}
              >
                {loadingPlan === plan.id ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
                ) : plan.disabled ? (
                  plan.cta
                ) : (
                  <><Crown className="w-4 h-4 mr-1.5" /> {plan.cta}</>
                )}
              </Button>

              {plan.id === "monthly" && useRazorpay && (
                <p className={`text-[11px] text-center mt-2 ${plan.highlight ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                  Cancel anytime · No hidden fees
                </p>
              )}
            </motion.div>
          ))}
        </div>

        {/* ── Razorpay badge ── */}
        <div className="flex items-center justify-center gap-3 mb-16 flex-wrap">
          {useRazorpay ? (
            <>
              <Badge className="bg-[#072654] text-white gap-1.5 px-4 py-1.5 text-xs">
                <IndianRupee className="w-3 h-3" /> Secured by Razorpay
              </Badge>
              <Badge variant="outline" className="gap-1.5 px-4 py-1.5 text-xs"><Shield className="w-3 h-3" /> 256-bit SSL</Badge>
              <Badge variant="outline" className="gap-1.5 px-4 py-1.5 text-xs"><CreditCard className="w-3 h-3" /> UPI · Cards · Net Banking</Badge>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Add RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET to enable payments</p>
          )}
        </div>

        {/* ── Feature Highlights ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-serif font-bold text-foreground text-center mb-2">Everything You Get with Premium</h2>
          <p className="text-muted-foreground text-center mb-8">One subscription. Complete Islamic learning.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES_DETAIL.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Testimonials ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-serif font-bold text-foreground text-center mb-8">Loved by Muslims Worldwide</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-card border border-border rounded-xl p-5"
              >
                <div className="flex gap-0.5 mb-3">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 text-secondary fill-secondary" />)}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.city}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Sadaqah / Donation ── */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 mb-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-serif font-bold text-foreground">Give Sadaqah</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Support our mission with a one-time donation. Your sadaqah keeps content free for those who cannot afford premium.
              </p>
            </div>
            <div className="flex gap-3 items-center w-full sm:w-auto">
              <div className="relative flex-1 sm:w-40">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{symbol}</span>
                <input
                  type="number"
                  min="1"
                  placeholder="499"
                  value={customDonation}
                  onChange={e => setCustomDonation(e.target.value)}
                  className="w-full border border-border rounded-lg pl-8 pr-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <Button
                onClick={handleDonate}
                disabled={donating || !useRazorpay}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold whitespace-nowrap"
                data-testid="button-donate"
              >
                {donating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Heart className="w-4 h-4 mr-1.5" /> Donate</>}
              </Button>
            </div>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="mb-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-serif font-bold text-foreground text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <button
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-sm text-foreground">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Final CTA ── */}
        <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/3 w-64 h-64 rounded-full bg-primary-foreground blur-3xl" />
          </div>
          <div className="relative">
            <Crown className="w-10 h-10 text-secondary mx-auto mb-3" />
            <h2 className="text-3xl font-serif font-bold mb-2">Begin Your Premium Journey</h2>
            <p className="text-primary-foreground/75 mb-6 max-w-md mx-auto">
              Join thousands of Muslims deepening their knowledge. Start today for less than a cup of coffee per week.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button
                onClick={() => handleSubscribe(PLANS[1])}
                disabled={loadingPlan === "monthly" || !useRazorpay}
                variant="secondary"
                size="lg"
                className="font-bold text-base px-8"
              >
                {loadingPlan === "monthly" ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Crown className="w-4 h-4 mr-2" /> Subscribe ₹999/month</>}
              </Button>
              <Button
                onClick={() => handleSubscribe(PLANS[2])}
                disabled={loadingPlan === "annual" || !useRazorpay}
                variant="outline"
                size="lg"
                className="font-bold text-base px-8 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                {loadingPlan === "annual" ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Infinity className="w-4 h-4 mr-2" /> Annual — Save 33%</>}
              </Button>
            </div>
            <p className="text-xs text-primary-foreground/50 mt-4">No contracts · Cancel anytime · Secured by Razorpay</p>
          </div>
        </div>
      </div>
    </div>
  );
}
