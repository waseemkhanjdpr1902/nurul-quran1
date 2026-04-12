import { motion } from "framer-motion";
import { Mail, User, MessageSquare, Send, Heart, Shield } from "lucide-react";
import { useState } from "react";

export default function Contact() {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const body = encodeURIComponent(`Name: ${name}\n\n${message}`);
    const sub = encodeURIComponent(subject || "Nurul Quran Enquiry");
    window.location.href = `mailto:support@nurulquran.info?subject=${sub}&body=${body}`;
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-14 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none select-none">
          <div className="absolute top-2 right-8 text-[160px] font-arabic leading-none">﷽</div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-5 shadow-inner">
              <Mail className="w-8 h-8" style={{ color: "#d4af37" }} />
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">Contact Us</h1>
            <p className="text-primary-foreground/70 text-base leading-relaxed max-w-xl mx-auto">
              Have a question, suggestion, or need support? We'd love to hear from you.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-10">

        {/* Left — About the Creator */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-6"
        >
          {/* Creator Card */}
          <div
            className="rounded-2xl p-6 border-2"
            style={{ borderColor: "#d4af37", background: "linear-gradient(135deg, #1a472a08, #d4af3712)" }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "#1a472a" }}>
                <User className="w-7 h-7" style={{ color: "#d4af37" }} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Creator & Admin</p>
                <h2 className="text-xl font-serif font-bold text-foreground">Mohammed Waseem</h2>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nurul Quran was built as a completely free Islamic learning platform — no ads, no subscriptions, no paywalls.
              The goal is to make authentic Islamic knowledge accessible to every Muslim and seeker worldwide.
            </p>
          </div>

          {/* Direct Email */}
          <div className="rounded-2xl p-5 border border-border bg-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#1E40AF" }}>
                <Mail className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email us directly</p>
                <a
                  href="mailto:support@nurulquran.info"
                  className="text-base font-semibold hover:underline transition-colors"
                  style={{ color: "#1a472a" }}
                >
                  support@nurulquran.info
                </a>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">We aim to reply within 48 hours, in sha Allah.</p>
          </div>

          {/* Values */}
          <div className="rounded-2xl p-5 border border-border bg-card space-y-3">
            <h3 className="font-bold text-foreground font-serif flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-400" /> Our Commitment
            </h3>
            {[
              "100% free — no subscriptions, no hidden fees",
              "Authentic Islamic content from trusted scholars",
              "No personal data sold or shared with third parties",
              "Open to feedback, suggestions and corrections",
            ].map((point) => (
              <div key={point} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "#1a472a" }} />
                <p className="text-sm text-muted-foreground leading-relaxed">{point}</p>
              </div>
            ))}
          </div>

          {/* Security notice */}
          <div className="rounded-2xl p-4 border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Secure & Private</span>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
              This site uses HTTPS encryption and security headers. We do not use tracking cookies or collect personal data without your consent.
            </p>
          </div>
        </motion.div>

        {/* Right — Contact Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="rounded-2xl border-2 border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#1a472a" }}>
                <MessageSquare className="w-5 h-5" style={{ color: "#d4af37" }} />
              </div>
              <div>
                <h2 className="font-bold text-foreground font-serif">Send a Message</h2>
                <p className="text-xs text-muted-foreground">Opens your email client</p>
              </div>
            </div>

            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ahmed Ali"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Suggestion / Report an issue"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your message here..."
                  rows={6}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #1a472a, #0D4A3E)" }}
              >
                <Send className="w-4 h-4" />
                Send Message
              </button>

              <p className="text-center text-xs text-muted-foreground">
                Clicking "Send Message" will open your email app pre-filled with your message.
              </p>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Footer note */}
      <div className="text-center py-8 px-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          بَارَكَ اللَّهُ فِيكُمْ — <em>May Allah bless you all</em>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Nurul Quran · Created by Mohammed Waseem · support@nurulquran.info
        </p>
      </div>
    </div>
  );
}
