import { motion } from "framer-motion";
import { Heart, Share2, Star, BookOpen, Users, Globe, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Support() {
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Nurul Quran",
        text: "Free Islamic learning — Quran, courses, Arabic lessons & halal stocks",
        url: "https://www.nurulquran.info",
      });
    } else {
      navigator.clipboard.writeText("https://www.nurulquran.info");
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-3">Support Nurul Quran</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Nurul Quran is completely free — no subscriptions, no paywalls. Help us grow by spreading the word.
        </p>
      </motion.div>

      <div className="grid gap-5 mb-12">
        {[
          {
            icon: Share2,
            title: "Share with Others",
            description: "Share Nurul Quran with friends, family, and your community. Every share helps more Muslims access Islamic knowledge.",
            cta: <Button onClick={handleShare} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-5 text-sm font-medium">Share the App</Button>,
          },
          {
            icon: Star,
            title: "Leave Feedback",
            description: "Your feedback helps us improve. Tell us what content you'd like to see, report bugs, or share your experience.",
            cta: (
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-5 text-sm font-medium">
                <a href="mailto:support@nurulquran.info?subject=Nurul Quran Feedback">Send Feedback</a>
              </Button>
            ),
          },
          {
            icon: MessageCircle,
            title: "Make Du'a",
            description: "Ask Allah to bless this project and all who benefit from it. Your du'a is the most valuable support you can give.",
            cta: null,
          },
        ].map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-card border border-border rounded-2xl p-6 flex items-start gap-5"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <item.icon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground text-base mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
              {item.cta}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-8"
      >
        <h2 className="text-lg font-serif font-bold text-foreground mb-3">Everything on Nurul Quran is Free</h2>
        <ul className="space-y-2">
          {[
            { icon: BookOpen, text: "All 114 Surahs of the Quran with translations & audio" },
            { icon: Users, text: "All Islamic courses — Tafseer, Fiqh, Aqeedah, Hadith, and more" },
            { icon: Globe, text: "All Arabic learning lessons from world-renowned educators" },
            { icon: Star, text: "Full Shariah-screened Halal Stock Screener" },
          ].map(item => (
            <li key={item.text} className="flex items-start gap-2.5 text-sm text-foreground">
              <item.icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              {item.text}
            </li>
          ))}
        </ul>
      </motion.div>

      <div className="text-center text-sm text-muted-foreground">
        <p>Have a question or suggestion? Reach us at</p>
        <a href="mailto:support@nurulquran.info" className="text-primary hover:underline font-medium">
          support@nurulquran.info
        </a>
        <p className="mt-4 text-xs">
          JazakAllah Khair for using Nurul Quran. May Allah accept it from us all.
        </p>
      </div>
    </div>
  );
}
