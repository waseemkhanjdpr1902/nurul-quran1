import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

interface AladhanData {
  timings: PrayerTimings;
  date: {
    readable: string;
    hijri: { date: string; month: { en: string }; year: string };
    gregorian: { date: string };
  };
  meta: { timezone: string; city: string; country: string };
}

const PRAYER_NAMES = [
  { key: "Fajr", label: "Fajr", arabic: "الفجر", desc: "Dawn Prayer" },
  { key: "Dhuhr", label: "Dhuhr", arabic: "الظهر", desc: "Midday Prayer" },
  { key: "Asr", label: "Asr", arabic: "العصر", desc: "Afternoon Prayer" },
  { key: "Maghrib", label: "Maghrib", arabic: "المغرب", desc: "Sunset Prayer" },
  { key: "Isha", label: "Isha", arabic: "العشاء", desc: "Night Prayer" },
];

function to24h(time12: string): string {
  const [time, period] = time12.split(" ");
  if (!period) return time12;
  let [h, m] = time.split(":").map(Number);
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function PrayerTimes() {
  const [data, setData] = useState<AladhanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("");
  const [nextPrayer, setNextPrayer] = useState("");
  const [locationName, setLocationName] = useState("Your Location");

  const fetchPrayerTimes = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date();
      const d = today.getDate();
      const mo = today.getMonth() + 1;
      const y = today.getFullYear();
      const res = await fetch(
        `https://api.aladhan.com/v1/timings/${d}-${mo}-${y}?latitude=${lat}&longitude=${lon}&method=2`
      );
      if (!res.ok) throw new Error("Failed to fetch prayer times");
      const json = await res.json();
      setData(json.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load prayer times");
    } finally {
      setLoading(false);
    }
  }, []);

  const requestLocation = useCallback(() => {
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            const city = geoData.address?.city || geoData.address?.town || geoData.address?.village || "";
            const country = geoData.address?.country || "";
            if (city || country) setLocationName([city, country].filter(Boolean).join(", "));
          }
        } catch {}
        fetchPrayerTimes(latitude, longitude);
      },
      (err) => {
        setError("Location access denied. Please allow location access to see prayer times.");
        setLoading(false);
      }
    );
  }, [fetchPrayerTimes]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (!data) return;
    const interval = setInterval(() => {
      const now = new Date();
      let nextMs = Infinity;
      let nextName = "";
      for (const p of PRAYER_NAMES) {
        const t24 = to24h(data.timings[p.key as keyof PrayerTimings]);
        const [h, m] = t24.split(":").map(Number);
        const pDate = new Date(now);
        pDate.setHours(h, m, 0, 0);
        const diff = pDate.getTime() - now.getTime();
        if (diff > 0 && diff < nextMs) {
          nextMs = diff;
          nextName = p.label;
        }
      }
      if (nextName) {
        setNextPrayer(nextName);
        setCountdown(formatCountdown(nextMs));
      } else {
        const fajrT = to24h(data.timings.Fajr);
        const [h, m] = fajrT.split(":").map(Number);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(h, m, 0, 0);
        setNextPrayer("Fajr (tomorrow)");
        setCountdown(formatCountdown(tomorrow.getTime() - now.getTime()));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [data]);

  const isCurrentPrayer = (key: string) => {
    if (!data) return false;
    const prayers = PRAYER_NAMES.map((p) => ({
      key: p.key,
      t: to24h(data.timings[p.key as keyof PrayerTimings]),
    }));
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    for (let i = 0; i < prayers.length; i++) {
      const [h, m] = prayers[i].t.split(":").map(Number);
      const pMins = h * 60 + m;
      const nextPMins =
        i + 1 < prayers.length
          ? (() => {
              const [nh, nm] = prayers[i + 1].t.split(":").map(Number);
              return nh * 60 + nm;
            })()
          : 24 * 60;
      if (nowMins >= pMins && nowMins < nextPMins) return prayers[i].key === key;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-background">
      <section
        className="py-12 md:py-20 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%)" }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none select-none flex items-center justify-center">
          <span style={{ fontSize: 260, fontFamily: "Amiri, serif", color: "#d4af37" }}>☽</span>
        </div>
        <div className="container mx-auto max-w-3xl px-4 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[#d4af37] text-xs uppercase tracking-widest mb-3 font-semibold">صلاة</p>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 font-serif">Prayer Times</h1>
            <div className="flex items-center justify-center gap-2 text-white/70 text-sm">
              <MapPin className="h-4 w-4" />
              <span>{locationName}</span>
              <button
                onClick={requestLocation}
                className="ml-2 hover:text-[#d4af37] transition-colors"
                title="Refresh location"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            {data && (
              <p className="text-white/50 text-xs mt-2">
                {data.date.hijri.date} {data.date.hijri.month.en} {data.date.hijri.year}
              </p>
            )}
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto max-w-3xl px-4 py-10">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={requestLocation} style={{ background: "#1a472a" }} className="text-white">
              Try Again
            </Button>
          </div>
        )}

        {data && !loading && (
          <>
            {nextPrayer && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl p-6 mb-8 text-center text-white shadow-lg"
                style={{ background: "linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%)" }}
              >
                <p className="text-white/70 text-sm uppercase tracking-widest mb-1">Next Prayer</p>
                <p className="text-2xl font-bold mb-1">{nextPrayer}</p>
                <p className="text-4xl font-mono font-bold" style={{ color: "#d4af37" }}>
                  {countdown}
                </p>
              </motion.div>
            )}

            <div className="space-y-3">
              {PRAYER_NAMES.map((p, i) => {
                const active = isCurrentPrayer(p.key);
                const time = data.timings[p.key as keyof PrayerTimings];
                return (
                  <motion.div
                    key={p.key}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className={`flex items-center justify-between rounded-2xl px-6 py-5 border-2 transition-all ${
                      active
                        ? "border-[#d4af37] bg-[#1a472a]/5 shadow-md"
                        : "border-border bg-card hover:border-[#1a472a]/30"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                        style={{
                          background: active ? "#1a472a" : "#f5f5f5",
                          color: active ? "#d4af37" : "#666",
                        }}
                      >
                        {i + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{p.label}</span>
                          {active && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{ background: "#d4af37", color: "#1a472a" }}
                            >
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{p.desc}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-xl font-mono font-bold"
                        style={{ color: active ? "#1a472a" : undefined }}
                      >
                        {time}
                      </p>
                      <p
                        className="text-lg font-arabic leading-tight"
                        style={{ fontFamily: "Amiri, serif", color: "#d4af37" }}
                        dir="rtl"
                      >
                        {p.arabic}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {data.timings.Sunrise && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl px-6 py-4 border border-border bg-muted/30">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Sunrise</span>
                <span className="ml-auto font-mono font-semibold">{data.timings.Sunrise}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
