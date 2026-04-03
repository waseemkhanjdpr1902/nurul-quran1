import { useState, useEffect } from "react";
import { useCreateCheckoutSession, useCreateSubscription } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Heart, Star, Crown, Check, Loader2, CreditCard, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DONATION_AMOUNTS_INR = [499, 999, 2499, 4999];
const DONATION_AMOUNTS_USD = [500, 1000, 2500, 5000];

declare global {
  interface Window {
    Razorpay: any;
  }
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

export default function Support() {
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [selectedAmount, setSelectedAmount] = useState(999);
  const [customAmount, setCustomAmount] = useState("");
  const [donating, setDonating] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const { toast } = useToast();

  const razorpayConfig = useRazorpayConfig();
  const checkoutMutation = useCreateCheckoutSession();
  const subscriptionMutation = useCreateSubscription();

  const amounts = currency === "INR" ? DONATION_AMOUNTS_INR : DONATION_AMOUNTS_USD;
  const symbol = currency === "INR" ? "₹" : "$";

  const getAmount = () => {
    if (customAmount) return Math.round(parseFloat(customAmount) * 100);
    return selectedAmount * 100;
  };

  // ── Razorpay donate ────────────────────────────────────────────────
  const handleRazorpayDonate = async () => {
    const amount = getAmount();
    if (!amount || amount < 100) {
      toast({ title: "Invalid amount", description: "Minimum donation is ₹1", variant: "destructive" });
      return;
    }
    setDonating(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load Razorpay");

      const res = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency }),
      });
      if (!res.ok) throw new Error(await res.text());
      const order = await res.json();

      const options = {
        key: razorpayConfig?.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Nurul Quran",
        description: "Donation to support Islamic education",
        order_id: order.id,
        theme: { color: "#004d40" },
        handler: async (response: any) => {
          const verify = await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const result = await verify.json();
          if (result.success) {
            toast({ title: "JazakAllah Khair!", description: "Your donation has been received. May Allah reward you abundantly." });
          } else {
            toast({ title: "Verification failed", description: result.error, variant: "destructive" });
          }
        },
        modal: { ondismiss: () => setDonating(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        toast({ title: "Payment failed", description: resp.error?.description || "Please try again.", variant: "destructive" });
        setDonating(false);
      });
      rzp.open();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not initiate payment. Please try again.", variant: "destructive" });
    } finally {
      setDonating(false);
    }
  };

  // ── Razorpay subscribe ─────────────────────────────────────────────
  const handleRazorpaySubscribe = async () => {
    setSubscribing(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load Razorpay");

      const res = await fetch("/api/payments/razorpay/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await res.text());
      const order = await res.json();

      const options = {
        key: razorpayConfig?.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Nurul Quran Premium",
        description: "Monthly Premium Membership — ₹999/month",
        order_id: order.id,
        theme: { color: "#004d40" },
        handler: async (response: any) => {
          const verify = await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const result = await verify.json();
          if (result.success) {
            toast({ title: "Welcome to Premium!", description: "Your subscription is now active. JazakAllah Khair!" });
          }
        },
        modal: { ondismiss: () => setSubscribing(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not initiate subscription. Please try again.", variant: "destructive" });
    } finally {
      setSubscribing(false);
    }
  };

  // ── Stripe fallback donate ─────────────────────────────────────────
  const handleStripeDonate = () => {
    const amount = getAmount();
    if (!amount || amount < 100) {
      toast({ title: "Invalid amount", description: "Minimum donation is $1", variant: "destructive" });
      return;
    }
    const base = window.location.origin;
    checkoutMutation.mutate(
      { data: { amount, currency: "usd", successUrl: `${base}/?donation=success`, cancelUrl: `${base}/support` } },
      {
        onSuccess: (data) => { if (data.url) window.location.href = data.url; },
        onError: () => toast({ title: "Stripe not configured", description: "Please add your Stripe keys or use Razorpay.", variant: "destructive" }),
      }
    );
  };

  const handleStripeSubscribe = () => {
    const base = window.location.origin;
    subscriptionMutation.mutate(
      { data: { successUrl: `${base}/?premium=success`, cancelUrl: `${base}/support` } },
      {
        onSuccess: (data) => { if (data.url) window.location.href = data.url; },
        onError: () => toast({ title: "Stripe not configured", description: "Please add your Stripe keys or use Razorpay.", variant: "destructive" }),
      }
    );
  };

  const useRazorpay = razorpayConfig?.configured;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-serif font-bold text-foreground mb-3">Support Nurul Quran</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          Your generosity helps us provide free access to authentic Islamic education for Muslims around the world.
        </p>

        {/* Payment provider badge */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {useRazorpay ? (
            <Badge className="bg-[#072654] text-white text-xs gap-1"><IndianRupee className="w-3 h-3" /> Powered by Razorpay</Badge>
          ) : (
            <Badge variant="outline" className="text-xs gap-1"><CreditCard className="w-3 h-3" /> Stripe Checkout</Badge>
          )}
        </div>
      </motion.div>

      {/* Currency toggle (only for Razorpay) */}
      {useRazorpay && (
        <div className="flex items-center justify-center gap-2 mb-8">
          {(["INR", "USD"] as const).map(c => (
            <button
              key={c}
              onClick={() => { setCurrency(c); setSelectedAmount(c === "INR" ? 999 : 1000); setCustomAmount(""); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                currency === c ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {c === "INR" ? "₹ INR" : "$ USD"}
            </button>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Donation Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-7"
        >
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-serif font-bold text-foreground">Make a Donation</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-6">One-time contribution to support our mission</p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {amounts.map(amount => (
              <button
                key={amount}
                onClick={() => { setSelectedAmount(amount); setCustomAmount(""); }}
                data-testid={`button-amount-${amount}`}
                className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                  selectedAmount === amount && !customAmount
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background border-border text-foreground hover:border-primary/40"
                }`}
              >
                {symbol}{amount.toLocaleString()}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <label className="text-xs text-muted-foreground mb-1 block">Custom amount ({currency})</label>
            <input
              type="number"
              min="1"
              placeholder={`Enter amount in ${currency}`}
              value={customAmount}
              onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(0); }}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              data-testid="input-custom-amount"
            />
          </div>

          <Button
            onClick={useRazorpay ? handleRazorpayDonate : handleStripeDonate}
            disabled={donating || checkoutMutation.isPending}
            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            data-testid="button-donate"
          >
            {(donating || checkoutMutation.isPending) ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
            ) : (
              <><Heart className="w-4 h-4 mr-2" /> Donate {symbol}{customAmount || selectedAmount.toLocaleString()}</>
            )}
          </Button>

          {!useRazorpay && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              Add RAZORPAY_KEY_ID &amp; RAZORPAY_KEY_SECRET secrets to enable Razorpay
            </p>
          )}
        </motion.div>

        {/* Premium Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-primary text-primary-foreground rounded-2xl p-7 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary-foreground/5 -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-5 h-5 text-secondary" />
              <h2 className="text-xl font-serif font-bold">Premium Membership</h2>
            </div>
            <p className="text-primary-foreground/70 text-sm mb-2">
              {useRazorpay ? "₹999 / month" : "$9.99 / month"}
            </p>
            <Badge className="bg-secondary text-secondary-foreground text-xs mb-6">Most Popular</Badge>

            <ul className="space-y-3 mb-8">
              {[
                "Access to all premium courses",
                "Complete Tafseer of Al-Baqarah",
                "Advanced Fiqh courses",
                "Hadith Sciences curriculum",
                "Quran with Tafseer Ibn Katheer",
                "Ad-free experience",
              ].map(feature => (
                <li key={feature} className="flex items-start gap-2.5 text-sm">
                  <Check className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                  <span className="text-primary-foreground/90">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={useRazorpay ? handleRazorpaySubscribe : handleStripeSubscribe}
              disabled={subscribing || subscriptionMutation.isPending}
              variant="secondary"
              className="w-full h-12 font-semibold"
              data-testid="button-subscribe"
            >
              {(subscribing || subscriptionMutation.isPending) ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
              ) : (
                <><Crown className="w-4 h-4 mr-2" /> Subscribe {useRazorpay ? "₹999/month" : "$9.99/month"}</>
              )}
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Mission */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-12 grid md:grid-cols-3 gap-6"
      >
        {[
          { title: "Free Education", desc: "All basic lectures remain free for everyone, regardless of their financial situation." },
          { title: "Authentic Knowledge", desc: "We partner with qualified Islamic scholars to ensure all content is authentic and reliable." },
          { title: "Global Reach", desc: "Your support helps us reach Muslims in over 50 countries with quality Islamic content." },
        ].map((item, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
