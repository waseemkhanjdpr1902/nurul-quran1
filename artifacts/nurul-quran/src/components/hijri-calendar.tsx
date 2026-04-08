import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

interface HijriDateData {
  hijri: {
    date: string;
    day: string;
    month: { number: number; en: string; ar: string };
    year: string;
    weekday: { en: string; ar: string };
  };
  gregorian: {
    date: string;
    day: string;
    month: { number: number; en: string };
    year: string;
    weekday: { en: string };
  };
}

interface IslamicEvent {
  name: string;
  hijriMonth: number;
  hijriDay: number;
  description: string;
}

const ISLAMIC_EVENTS: IslamicEvent[] = [
  { name: "Islamic New Year", hijriMonth: 1, hijriDay: 1, description: "1st Muharram — the first day of the Islamic year" },
  { name: "Day of Ashura", hijriMonth: 1, hijriDay: 10, description: "10th Muharram — day of fasting and remembrance" },
  { name: "Mawlid an-Nabi", hijriMonth: 3, hijriDay: 12, description: "12th Rabi' al-Awwal — birthday of Prophet Muhammad ﷺ" },
  { name: "Isra and Mi'raj", hijriMonth: 7, hijriDay: 27, description: "27th Rajab — the Night Journey and Ascension" },
  { name: "Laylat al-Bara'ah", hijriMonth: 8, hijriDay: 15, description: "15th Sha'ban — Night of Forgiveness" },
  { name: "Start of Ramadan", hijriMonth: 9, hijriDay: 1, description: "1st Ramadan — the month of fasting begins" },
  { name: "Laylat al-Qadr", hijriMonth: 9, hijriDay: 27, description: "27th Ramadan — the Night of Power (likely)" },
  { name: "Eid al-Fitr", hijriMonth: 10, hijriDay: 1, description: "1st Shawwal — festival marking end of Ramadan" },
  { name: "Day of Arafah", hijriMonth: 12, hijriDay: 9, description: "9th Dhul Hijjah — day of Hajj pilgrimage at Arafah" },
  { name: "Eid al-Adha", hijriMonth: 12, hijriDay: 10, description: "10th Dhul Hijjah — festival of sacrifice" },
];


const HIJRI_MONTH_LENGTHS = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];

function hijriDayOfYear(month: number, day: number): number {
  let total = 0;
  for (let m = 1; m < month; m++) {
    total += HIJRI_MONTH_LENGTHS[m - 1];
  }
  return total + day;
}

const HIJRI_YEAR_DAYS = HIJRI_MONTH_LENGTHS.reduce((a, b) => a + b, 0);

function getUpcomingEvents(currentHijriMonth: number, currentHijriDay: number) {
  const currentDoy = hijriDayOfYear(currentHijriMonth, currentHijriDay);
  const upcoming: (IslamicEvent & { daysUntil: number })[] = [];
  for (const event of ISLAMIC_EVENTS) {
    const eventDoy = hijriDayOfYear(event.hijriMonth, event.hijriDay);
    let diff = eventDoy - currentDoy;
    if (diff < 0) {
      diff += HIJRI_YEAR_DAYS;
    }
    upcoming.push({ ...event, daysUntil: diff });
  }
  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  return upcoming.slice(0, 5);
}

export function HijriCalendar({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<HijriDateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    fetch(`https://api.aladhan.com/v1/gToH/${dd}-${mm}-${yyyy}`)
      .then((r) => r.json())
      .then((json) => {
        setData(json.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load Hijri date");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <Skeleton className={compact ? "h-24 rounded-2xl" : "h-48 rounded-2xl"} />;
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 text-destructive text-sm p-3">
        <AlertCircle className="h-4 w-4" />
        {error ?? "Failed to load"}
      </div>
    );
  }

  const hijriMonth = data.hijri.month.number;
  const hijriDay = parseInt(data.hijri.day, 10);
  const upcomingEvents = getUpcomingEvents(hijriMonth, hijriDay);

  if (compact) {
    return (
      <div
        className="rounded-2xl p-5 border-2 text-white"
        style={{ background: "linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%)", borderColor: "#d4af37" }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="h-5 w-5" style={{ color: "#d4af37" }} />
          <span className="text-sm font-semibold text-white/80">Hijri Date</span>
        </div>
        <p className="text-2xl font-bold mb-0.5">
          {data.hijri.day} {data.hijri.month.en} {data.hijri.year} AH
        </p>
        <p className="text-white/60 text-sm">
          {data.gregorian.weekday.en}, {data.gregorian.day} {data.gregorian.month.en} {data.gregorian.year}
        </p>
        {upcomingEvents[0] && upcomingEvents[0].daysUntil === 0 && (
          <div
            className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-full inline-block"
            style={{ background: "#d4af37", color: "#1a472a" }}
          >
            🌙 Today: {upcomingEvents[0].name}
          </div>
        )}
        {upcomingEvents[0] && upcomingEvents[0].daysUntil !== 0 && (
          <p className="mt-2 text-xs text-white/60">
            Next: {upcomingEvents[0].name} in ~{upcomingEvents[0].daysUntil} days
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 mb-6 text-white"
        style={{ background: "linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%)" }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-white/60 text-xs uppercase tracking-widest mb-2">Today's Hijri Date</p>
            <p
              className="text-3xl font-bold mb-1"
              style={{ color: "#d4af37" }}
            >
              {data.hijri.day} {data.hijri.month.en} {data.hijri.year} AH
            </p>
            <p
              className="text-3xl font-bold mb-1 text-right"
              dir="rtl"
              lang="ar"
              style={{ fontFamily: "'Amiri', serif", opacity: 0.8 }}
            >
              {data.hijri.day} {data.hijri.month.ar} {data.hijri.year}
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs uppercase tracking-widest mb-2">Gregorian Date</p>
            <p className="text-xl font-semibold">
              {data.gregorian.weekday.en},<br />
              {data.gregorian.day} {data.gregorian.month.en} {data.gregorian.year}
            </p>
          </div>
        </div>
      </motion.div>

      <h3 className="text-lg font-bold font-serif text-foreground mb-4">Upcoming Islamic Events</h3>
      <div className="space-y-2">
        {upcomingEvents.map((event, i) => (
          <motion.div
            key={event.name}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 hover:border-[#d4af37]/40 transition-colors"
          >
            <div
              className="shrink-0 rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold"
              style={{ background: "#1a472a", color: "#d4af37" }}
            >
              {event.hijriDay}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">{event.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
            </div>
            {event.daysUntil === 0 ? (
              <span
                className="shrink-0 text-xs px-2 py-1 rounded-full font-bold"
                style={{ background: "#d4af37", color: "#1a472a" }}
              >
                Today!
              </span>
            ) : (
              <span className="shrink-0 text-xs text-muted-foreground">
                ~{event.daysUntil}d
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
