import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Heart, Star, Crown, Check, Loader2, CreditCard, IndianRupee,
  BookOpen, Headphones, Shield, Zap, Users, Globe, ChevronDown, ChevronUp,
  Sparkles, Lock, Infinity, LogIn, CheckCircle2, Mail, Phone, MapPin, User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

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
    amountPaise: null,
    features: [
      "Free Quran reader (all 114 surahs)",
      "English & Urdu translations",
      "1 free course — Quran Recitation with Tajweed",
      "1 free lesson — Daily Arabic Conversations",
      "3 Halal stocks preview",
    ],
    locked: [
      "All 12 premium courses",
      "All 18 Arabic learning lessons",
      "Full halal stock screener (30+ stocks)",
      "Tafseer Ibn Katheer",
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
      "All 12 Islamic courses unlocked",
      "All 18 Arabic learning lessons",
      "Full halal stock screener (30+ stocks)",
      "Quran with Tafseer Ibn Katheer",
      "Ad-free experience",
      "Priority email support",
      "Early access to new content",
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
      "Lowest price — best value",
      "Direct access to developer via email",
      "Early access to all new features",
    ],
    cta: "Get Annual Plan",
    disabled: false,
  },
];

const FEATURES_DETAIL = [
  { icon: BookOpen, title: "12 Islamic Courses", desc: "Structured courses covering Aqeedah, Fiqh, Tafseer, Hadith, Seerah, Spirituality, and more" },
  { icon: Headphones, title: "18 Arabic Learning Lessons", desc: "Curated Arabic lessons by world-renowned educators — alphabet, grammar, Quranic Arabic, and daily conversations" },
  { icon: Crown, title: "Full Quran Experience", desc: "Read with Tafseer Ibn Katheer, English & Urdu translations, and per-ayah Mishary Alafasy recitation" },
  { icon: Zap, title: "30+ Halal Stocks", desc: "Full Shariah-screened stock database with live prices, analysis, and investment guidance" },
  { icon: Shield, title: "Ad-Free Experience", desc: "Zero ads and distraction-free Islamic learning on both the website and mobile app" },
  { icon: Globe, title: "Multi-Language", desc: "Content in English, Urdu, and Arabic — designed for Muslims in India and worldwide" },
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
  { value: "18", label: "Arabic Lessons" },
  { value: "12", label: "Islamic Courses" },
  { value: "50+", label: "Countries" },
];

export default function Support() {
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [donating, setDonating] = useState(false);
  const [customDonation, setCustomDonation] = useState("");
  const { toast } = useToast();
  const { user, isAuthenticated, login } = useAuth();
  const [, setLocation] = useLocation();

  const razorpayConfig = useRazorpayConfig();
  const razorpayReady = razorpayConfig?.configured === true;
  const symbol = currency === "INR" ? "₹" : "$";

  const openRazorpay = async (options: object) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) throw new Error("Failed to load Razorpay. Check your internet connection.");
    const rzp = new window.Razorpay({
      ...options,
      key: razorpayConfig?.key_id,
      theme: { color: "#004d40" },
      modal: {
        ...(options as any).modal,
        confirm_close: true,
      },
    });
    rzp.on("payment.failed", (r: any) => {
      toast({
        title: "Payment failed",
        description: r.error?.description || r.error?.reason || "Please try again.",
        variant: "destructive",
      });
      setLoadingPlan(null);
    });
    rzp.open();
  };

  const handleSubscribe = async (plan: typeof PLANS[0]) => {
    if (plan.disabled || !plan.amountPaise) return;

    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please log in or create an account to subscribe.",
      });
      setLocation("/login");
      return;
    }

    if (user?.isPremium) {
      toast({
        title: "Already Premium!",
        description: "You already have an active premium subscription. JazakAllah Khair!",
      });
      return;
    }

    setLoadingPlan(plan.id);
    try {
      const amountPaise = currency === "INR" ? plan.amountPaise : Math.round(((plan as any).priceUSD ?? 0) * 100);
      const cur = currency;

      const res = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountPaise, currency: cur, receipt: `sub_${plan.id}_${Date.now()}` }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to create order" }));
        throw new Error(err.error || "Failed to create payment order");
      }
      const order = await res.json();
      const token = localStorage.getItem("nurulquran_token");

      await openRazorpay({
        amount: order.amount,
        currency: order.currency,
        name: "Nurul Quran",
        description: plan.name === "Annual" ? "Annual Premium Membership" : "Monthly Premium Membership",
        order_id: order.id,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        handler: async (response: any) => {
          try {
            const verify = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: plan.id,
              }),
            });

            const result = await verify.json();

            if (result.success) {
              if (result.user && token) {
                login(token, result.user);
              } else if (token) {
                const me = await fetch("/api/users/me", {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (me.ok) {
                  const userData = await me.json();
                  login(token, userData);
                }
              }

              toast({
                title: "🎉 Welcome to Premium!",
                description: "Your subscription is now active. JazakAllah Khair for supporting Islamic education!",
              });
            } else {
              toast({
                title: "Verification failed",
                description: result.error || "Payment could not be verified. Contact support.",
                variant: "destructive",
              });
            }
          } catch {
            toast({
              title: "Verification error",
              description: "Payment received but verification failed. Please contact support with your payment ID.",
              variant: "destructive",
            });
          } finally {
            setLoadingPlan(null);
          }
        },
        modal: {
          ondismiss: () => setLoadingPlan(null),
        },
        notes: { plan: plan.id, type: "subscription" },
      });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not initiate payment.", variant: "destructive" });
      setLoadingPlan(null);
    }
  };

  const handleDonate = async () => {
    const amount = parseFloat(customDonation || "499");
    const amountPaise = Math.round(amount * 100);
    if (amountPaise < 100) {
      toast({ title: "Minimum ₹1", variant: "destructive" }); return;
    }

    if (!isAuthenticated) {
      toast({ title: "Login required", description: "Please log in to pay the Islamic Learning Fee." });
      setLocation("/login");
      return;
    }

    setDonating(true);
    try {
      const res = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountPaise, currency }),
      });
      if (!res.ok) throw new Error("Failed to create order");
      const order = await res.json();
      const token = localStorage.getItem("nurulquran_token");

      await openRazorpay({
        amount: order.amount,
        currency: order.currency,
        name: "Nurul Quran",
        description: "Islamic Learning Fee — Nurul Quran",
        order_id: order.id,
        prefill: { name: user?.name || "", email: user?.email || "" },
        handler: async (response: any) => {
          const token2 = localStorage.getItem("nurulquran_token");
          await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token2 ? { Authorization: `Bearer ${token2}` } : {}),
            },
            body: JSON.stringify({ ...response }),
          });
          toast({ title: "JazakAllah Khair!", description: "May Allah reward your generosity abundantly. آمين" });
          setDonating(false);
        },
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

        {/* ── Premium Active Banner ── */}
        {user?.isPremium && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-8 flex items-center gap-4"
          >
            <CheckCircle2 className="w-7 h-7 text-green-600 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-green-800">Your Premium subscription is active!</p>
              <p className="text-sm text-green-700">
                {(user as any).subscriptionPlan === "annual" ? "Annual plan" : "Monthly plan"}
                {(user as any).subscriptionEnd
                  ? ` · renews ${new Date((user as any).subscriptionEnd).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`
                  : ""}
                . JazakAllah Khair for your support!
              </p>
            </div>
            <Crown className="w-7 h-7 text-secondary shrink-0" />
          </motion.div>
        )}

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
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
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
                    {plan.priceINR === 0 ? "Free" : `${symbol}${currency === "INR" ? plan.priceINR.toLocaleString() : (plan as any).priceUSD}`}
                  </span>
                  {plan.period && (
                    <span className={`text-sm ${plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{plan.period}</span>
                  )}
                </div>
                {(plan as any).perMonthINR && (
                  <p className={`text-xs mt-1 ${plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {currency === "INR" ? `₹${(plan as any).perMonthINR}/month` : `$${(plan as any).perMonthUSD}/month`} billed annually
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
                {(plan as any).locked?.map((f: string) => (
                  <li key={f} className="flex items-start gap-2 text-sm opacity-40">
                    <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <PlanButton
                plan={plan}
                loadingPlan={loadingPlan}
                isAuthenticated={isAuthenticated}
                isPremium={!!user?.isPremium}
                razorpayReady={razorpayReady}
                razorpayConfig={razorpayConfig}
                onSubscribe={() => handleSubscribe(plan)}
                onLogin={() => setLocation("/login")}
              />

              {plan.id === "monthly" && razorpayReady && (
                <p className={`text-[11px] text-center mt-2 ${plan.highlight ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                  Cancel anytime · No hidden fees
                </p>
              )}
            </motion.div>
          ))}
        </div>

        {/* ── Razorpay trust badges ── */}
        <div className="flex items-center justify-center gap-3 mb-16 flex-wrap">
          {razorpayConfig === null ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading payment system…
            </div>
          ) : razorpayReady ? (
            <>
              <Badge className="bg-[#072654] text-white gap-1.5 px-4 py-1.5 text-xs">
                <IndianRupee className="w-3 h-3" /> Secured by Razorpay
              </Badge>
              <Badge variant="outline" className="gap-1.5 px-4 py-1.5 text-xs"><Shield className="w-3 h-3" /> 256-bit SSL</Badge>
              <Badge variant="outline" className="gap-1.5 px-4 py-1.5 text-xs"><CreditCard className="w-3 h-3" /> UPI · Cards · Net Banking</Badge>
              <Badge variant="outline" className="gap-1.5 px-4 py-1.5 text-xs"><Users className="w-3 h-3" /> EMI Available</Badge>
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

        {/* ── Islamic Learning Fee ── */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 mb-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-serif font-bold text-foreground">Islamic Learning Fee</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Pay a one-time Islamic Learning Fee to support our mission. Your contribution keeps content free for those who cannot afford premium.
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
                disabled={donating || !razorpayReady}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold whitespace-nowrap"
                data-testid="button-donate"
              >
                {donating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Heart className="w-4 h-4 mr-1.5" /> Pay Now</>}
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

        {/* ── Contact Us ── */}
        <div className="mb-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-serif font-bold text-foreground text-center mb-2">Contact Us</h2>
          <p className="text-muted-foreground text-center text-sm mb-8">We're here to help — reach out anytime</p>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Developer Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-2xl p-7 flex flex-col gap-4"
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-base">Mohammed Waseem</p>
                  <p className="text-xs text-muted-foreground">Founder &amp; Developer</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Built with love and dedication to help Muslims around the world connect with the Quran and Islamic knowledge. JazakAllah Khair for your support.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                <Users className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium text-foreground">Nurul Quran Team</span>
              </div>
            </motion.div>

            {/* Contact Details Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-2xl p-7 flex flex-col gap-5"
            >
              <h3 className="font-semibold text-foreground text-base mb-1">Get in Touch</h3>

              <a
                href="mailto:support@nurulquran.info"
                className="flex items-center gap-3 group"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email Support</p>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">support@nurulquran.info</p>
                </div>
              </a>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Website</p>
                  <p className="text-sm font-medium text-foreground">www.nurulquran.info</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-medium text-foreground">India</p>
                </div>
              </div>

              <div className="mt-auto pt-2">
                <p className="text-xs text-muted-foreground">
                  We typically respond within <span className="text-foreground font-medium">24–48 hours</span>. For premium support, subscribers get priority responses.
                </p>
              </div>
            </motion.div>
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
            {user?.isPremium ? (
              <div className="flex items-center justify-center gap-2 text-secondary">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">You're already Premium — JazakAllah Khair!</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Button
                  onClick={() => handleSubscribe(PLANS[1])}
                  disabled={loadingPlan === "monthly"}
                  variant="secondary"
                  size="lg"
                  className="font-bold text-base px-8"
                >
                  {loadingPlan === "monthly" ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Crown className="w-4 h-4 mr-2" /> Subscribe ₹999/month</>}
                </Button>
                <Button
                  onClick={() => handleSubscribe(PLANS[2])}
                  disabled={loadingPlan === "annual"}
                  variant="outline"
                  size="lg"
                  className="font-bold text-base px-8 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  {loadingPlan === "annual" ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Infinity className="w-4 h-4 mr-2" /> Annual — Save 33%</>}
                </Button>
              </div>
            )}
            <p className="text-xs text-primary-foreground/50 mt-4">No contracts · Cancel anytime · Secured by Razorpay</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanButton({
  plan,
  loadingPlan,
  isAuthenticated,
  isPremium,
  razorpayReady,
  razorpayConfig,
  onSubscribe,
  onLogin,
}: {
  plan: typeof PLANS[0];
  loadingPlan: string | null;
  isAuthenticated: boolean;
  isPremium: boolean;
  razorpayReady: boolean;
  razorpayConfig: any;
  onSubscribe: () => void;
  onLogin: () => void;
}) {
  const isLoading = loadingPlan === plan.id;

  if (plan.disabled) {
    return (
      <Button disabled variant={plan.highlight ? "secondary" : "outline"} className="w-full h-12 font-semibold text-sm">
        {plan.cta}
      </Button>
    );
  }

  if (isPremium) {
    return (
      <Button
        disabled
        variant={plan.highlight ? "secondary" : "outline"}
        className={`w-full h-12 font-semibold text-sm ${plan.highlight ? "" : "border-primary text-primary"}`}
      >
        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Active Plan
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button
        onClick={onLogin}
        variant={plan.highlight ? "secondary" : "outline"}
        className={`w-full h-12 font-semibold text-sm ${plan.highlight ? "" : "border-primary text-primary hover:bg-primary hover:text-primary-foreground"}`}
        data-testid={`button-login-${plan.id}`}
      >
        <LogIn className="w-4 h-4 mr-1.5" /> Log in to Subscribe
      </Button>
    );
  }

  if (razorpayConfig === null) {
    return (
      <Button disabled variant={plan.highlight ? "secondary" : "outline"} className="w-full h-12 font-semibold text-sm">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…
      </Button>
    );
  }

  if (!razorpayReady) {
    return (
      <Button disabled variant={plan.highlight ? "secondary" : "outline"} className="w-full h-12 font-semibold text-sm opacity-50">
        Payment Unavailable
      </Button>
    );
  }

  return (
    <Button
      onClick={onSubscribe}
      disabled={isLoading}
      variant={plan.highlight ? "secondary" : "outline"}
      className={`w-full h-12 font-semibold text-sm ${plan.highlight ? "" : "border-primary text-primary hover:bg-primary hover:text-primary-foreground"}`}
      data-testid={`button-subscribe-${plan.id}`}
    >
      {isLoading ? (
        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
      ) : (
        <><Crown className="w-4 h-4 mr-1.5" /> {plan.cta}</>
      )}
    </Button>
  );
}
