import { useState } from "react";
import { useCreateCheckoutSession, useCreateSubscription } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Heart, Star, Crown, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DONATION_AMOUNTS = [500, 1000, 2500, 5000];

export default function Support() {
  const [selectedAmount, setSelectedAmount] = useState(1000);
  const [customAmount, setCustomAmount] = useState("");
  const { toast } = useToast();
  const checkoutMutation = useCreateCheckoutSession();
  const subscriptionMutation = useCreateSubscription();

  const getAmount = () => {
    if (customAmount) return Math.round(parseFloat(customAmount) * 100);
    return selectedAmount;
  };

  const handleDonate = async () => {
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
        onError: () => toast({ title: "Error", description: "Stripe is not configured yet. Add your STRIPE_SECRET_KEY to get started.", variant: "destructive" }),
      }
    );
  };

  const handleSubscribe = async () => {
    const base = window.location.origin;
    subscriptionMutation.mutate(
      { data: { successUrl: `${base}/?premium=success`, cancelUrl: `${base}/support` } },
      {
        onSuccess: (data) => { if (data.url) window.location.href = data.url; },
        onError: () => toast({ title: "Error", description: "Stripe is not configured yet. Add your STRIPE_SECRET_KEY to get started.", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-serif font-bold text-foreground mb-3">Support Nurul Quran</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          Your generosity helps us provide free access to authentic Islamic education for Muslims around the world.
          Every contribution, big or small, makes a difference.
        </p>
      </motion.div>

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
            {DONATION_AMOUNTS.map(amount => (
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
                ${(amount / 100).toFixed(0)}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <label className="text-xs text-muted-foreground mb-1 block">Custom amount ($)</label>
            <input
              type="number"
              min="1"
              placeholder="Enter amount"
              value={customAmount}
              onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(0); }}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              data-testid="input-custom-amount"
            />
          </div>

          <Button
            onClick={handleDonate}
            disabled={checkoutMutation.isPending}
            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            data-testid="button-donate"
          >
            {checkoutMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
            ) : (
              <><Heart className="w-4 h-4 mr-2" /> Donate ${customAmount || (getAmount() / 100).toFixed(0)}</>
            )}
          </Button>
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
            <p className="text-primary-foreground/70 text-sm mb-2">$9.99 / month</p>
            <Badge className="bg-secondary text-secondary-foreground text-xs mb-6">Most Popular</Badge>

            <ul className="space-y-3 mb-8">
              {[
                "Access to all premium courses",
                "Complete Tafseer of Al-Baqarah",
                "Advanced Fiqh courses",
                "Hadith Sciences curriculum",
                "Ad-free experience",
                "Offline listening (coming soon)",
              ].map(feature => (
                <li key={feature} className="flex items-start gap-2.5 text-sm">
                  <Check className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                  <span className="text-primary-foreground/90">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={handleSubscribe}
              disabled={subscriptionMutation.isPending}
              variant="secondary"
              className="w-full h-12 font-semibold"
              data-testid="button-subscribe"
            >
              {subscriptionMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <><Crown className="w-4 h-4 mr-2" /> Start Premium Access</>
              )}
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Mission section */}
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
