import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Crown, Lock, Check } from "lucide-react";
import { motion } from "framer-motion";

interface PremiumGateProps {
  onClose?: () => void;
  lectureTitle?: string;
}

export function PremiumGate({ onClose, lectureTitle }: PremiumGateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 20 }}
        className="bg-card rounded-2xl p-7 max-w-sm w-full shadow-2xl border border-primary/20"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-primary-foreground" />
        </div>

        <h2 className="text-xl font-serif font-bold text-center text-foreground mb-1">Premium Content</h2>
        {lectureTitle && (
          <p className="text-sm text-muted-foreground text-center mb-3 line-clamp-2">"{lectureTitle}"</p>
        )}
        <p className="text-sm text-muted-foreground text-center mb-6">
          This lecture is available to Premium members. Subscribe to access our full library of exclusive Islamic content.
        </p>

        <ul className="space-y-2 mb-6">
          {[
            "Access all premium lectures",
            "Complete Tafseer courses",
            "Full Halal Stock Screener",
            "Ad-free experience",
          ].map(f => (
            <li key={f} className="flex items-center gap-2 text-sm text-foreground">
              <Check className="w-4 h-4 text-primary shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        <div className="bg-primary/5 rounded-xl p-3 text-center mb-5">
          <div className="text-2xl font-bold text-primary">₹999<span className="text-sm font-normal text-muted-foreground">/month</span></div>
          <p className="text-xs text-muted-foreground">or ₹7,999/year · Cancel anytime</p>
        </div>

        <Button asChild className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold mb-2">
          <Link href="/support">
            <Crown className="w-4 h-4 mr-2" />
            Subscribe — ₹999/month
          </Link>
        </Button>

        <Button variant="ghost" className="w-full text-muted-foreground" onClick={onClose}>
          Continue with free content
        </Button>
      </motion.div>
    </motion.div>
  );
}
