import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { MapPin, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PrayerTimings {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

const PRAYERS = [
  { key: "Fajr", arabic: "الفجر" },
  { key: "Dhuhr", arabic: "الظهر" },
  { key: "Asr", arabic: "العصر" },
  { key: "Maghrib", arabic: "المغرب" },
  { key: "Isha", arabic: "العشاء" },
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

function getNextPrayer(timings: PrayerTimings): { name: string; countdown: string } {
  const now = new Date();
  let nextMs = Infinity;
  let nextName = "";
  for (const p of PRAYERS) {
    const t24 = to24h(timings[p.key as keyof PrayerTimings]);
    const [h, m] = t24.split(":").map(Number);
    const pDate = new Date(now);
    pDate.setHours(h, m, 0, 0);
    const diff = pDate.getTime() - now.getTime();
    if (diff > 0 && diff < nextMs) {
      nextMs = diff;
      nextName = p.key;
    }
  }
  if (!nextName) {
    const fajrT = to24h(timings.Fajr);
    const [h, m] = fajrT.split(":").map(Number);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(h, m, 0, 0);
    return { name: "Fajr", countdown: formatCountdown(tomorrow.getTime() - now.getTime()) };
  }
  return { name: nextName, countdown: formatCountdown(nextMs) };
}

export function PrayerTimesWidget() {
  const [timings, setTimings] = useState<PrayerTimings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState({ name: "", countdown: "" });

  const fetchTimes = useCallback(async (lat: number, lon: number) => {
    try {
      const today = new Date();
      const d = today.getDate();
      const mo = today.getMonth() + 1;
      const y = today.getFullYear();
      const res = await fetch(
        `https://api.aladhan.com/v1/timings/${d}-${mo}-${y}?latitude=${lat}&longitude=${lon}&method=2`
      );
      if (!res.ok) throw new Error("API error");
      const json = await res.json();
      setTimings(json.data.timings);
    } catch {
      setError("Unable to load prayer times");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchTimes(pos.coords.latitude, pos.coords.longitude),
      () => {
        setError("Location access denied");
        setLoading(false);
      }
    );
  }, [fetchTimes]);

  useEffect(() => {
    if (!timings) return;
    const update = () => setCountdown(getNextPrayer(timings));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [timings]);

  if (loading) return <Skeleton className="h-40 rounded-2xl" />;

  if (error) {
    return (
      <div
        className="rounded-2xl p-5 border-2 flex flex-col items-center gap-3 text-center"
        style={{ borderColor: "#1a472a", background: "linear-gradient(135deg, #1a472a, #2d6a4f)" }}
      >
        <MapPin className="h-6 w-6 text-white/50" />
        <p className="text-sm text-white/70">{error}</p>
        <Link href="/prayer-times">
          <span
            className="text-xs font-bold px-4 py-1.5 rounded-full"
            style={{ background: "#d4af37", color: "#1a472a" }}
          >
            View Prayer Times →
          </span>
        </Link>
      </div>
    );
  }

  if (!timings) return null;

  return (
    <div
      className="rounded-2xl border-2 overflow-hidden"
      style={{ borderColor: "#1a472a" }}
    >
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #1a472a, #2d6a4f)" }}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" style={{ color: "#d4af37" }} />
          <span className="text-sm font-semibold text-white">Prayer Times</span>
        </div>
        {countdown.name && (
          <div className="text-right">
            <p className="text-[10px] text-white/60 uppercase tracking-wide">Next: {countdown.name}</p>
            <p className="text-base font-mono font-bold" style={{ color: "#d4af37" }}>
              {countdown.countdown}
            </p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-5 divide-x divide-border bg-card">
        {PRAYERS.map((p) => {
          const t = timings[p.key as keyof PrayerTimings];
          return (
            <div key={p.key} className="flex flex-col items-center py-3 px-1 gap-1">
              <span
                className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: "#1a472a" }}
              >
                {p.key}
              </span>
              <span
                className="text-[10px]"
                dir="rtl"
                lang="ar"
                style={{ fontFamily: "Amiri, serif", color: "#d4af37" }}
              >
                {p.arabic}
              </span>
              <span className="text-xs font-mono font-semibold text-foreground">{t}</span>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-2 bg-muted/30 flex justify-end">
        <Link href="/prayer-times">
          <span className="text-xs font-semibold" style={{ color: "#1a472a" }}>
            Full details →
          </span>
        </Link>
      </div>
    </div>
  );
}
