import { motion } from "framer-motion";
import { HijriCalendar } from "@/components/hijri-calendar";

export default function Calendar() {
  return (
    <div className="min-h-screen bg-background">
      <section
        className="py-12 md:py-20 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%)" }}
      >
        <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none select-none">
          <span style={{ fontSize: 220, fontFamily: "Amiri, serif", color: "#d4af37" }}>☽</span>
        </div>
        <div className="container mx-auto max-w-3xl px-4 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[#d4af37] text-xs uppercase tracking-widest mb-3 font-semibold">التقويم الهجري</p>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 font-serif">Hijri Calendar</h1>
            <p className="text-white/70 text-sm max-w-md mx-auto">
              Today's Islamic date and upcoming events in the Hijri calendar
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto max-w-3xl px-4 py-10">
        <HijriCalendar />
      </div>
    </div>
  );
}
