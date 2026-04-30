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

const JODHPUR_COORDS = { lat: 26.2389, lon: 73.0243 };

function parsePrayerTime(timeStr: string): Date {
  const now = new Date();
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date(now);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getNextPrayer(timings: PrayerTimings) {
  const now = new Date();
  let nextMs = Infinity;
  let nextName = "";

  for (const p of PRAYERS) {
    let pDate = parsePrayerTime(timings[p.key as keyof PrayerTimings]);
    let diff = pDate.getTime() - now.getTime();
    if (diff < 0) {
      pDate.setDate(pDate.getDate() + 1);
      diff = pDate.getTime() - now.getTime();
    }
    if (diff > 0 && diff < nextMs) {
      nextMs = diff;
      nextName = p.key;
    }
  }

  if (!nextName) {
    const fajrDate = parsePrayerTime(timings.Fajr);
    fajrDate.setDate(fajrDate.getDate() + 1);
    return { name: "Fajr", countdown: formatCountdown(fajrDate.getTime() - now.getTime()) };
  }
  return { name: nextName, countdown: formatCountdown(nextMs) };
}

export function PrayerTimesWidget() {
  const [timings, setTimings] = useState<PrayerTimings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState({ name: "", countdown: "" });
  const [locationName, setLocationName] = useState("Loading...");

  const fetchTimes = useCallback(async (lat: number, lon: number, source: string) => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date();
      const dateStr = `${today.getDate().toString().padStart(2,'0')}-${(today.getMonth()+1).toString().padStart(2,'0')}-${today.getFullYear()}`;

      const res = await fetch(
        `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lon}&method=2`
      );

      if (!res.ok) throw new Error("Network error");

      const json = await res.json();
      if (json.code !== 200 || !json.data?.timings) throw new Error("Invalid response");

      const newTimings = json.data.timings as PrayerTimings;
      setTimings(newTimings);
      localStorage.setItem("cached_prayer_times", JSON.stringify(newTimings));
      setLocationName(source);
    } catch (err) {
      console.error(err);
      setError("Failed to load prayer times");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load cached data immediately for fast UI
  useEffect(() => {
    const saved = localStorage.getItem("cached_prayer_times");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTimings(parsed);
        setLocationName("Previous Location");
      } catch (e) {
        localStorage.removeItem("cached_prayer_times");
      }
    }
    setLoading(false); // Don't keep loading spinner if we have cache
  }, []);

  // Try real geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      // Fallback to Jodhpur
      fetchTimes(JODHPUR_COORDS.lat, JODHPUR_COORDS.lon, "Jodhpur");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchTimes(pos.coords.latitude, pos.coords.longitude, "Your Location");
      },
      (err) => {
        console.warn("Geolocation failed, using Jodhpur fallback", err);
        fetchTimes(JODHPUR_COORDS.lat, JODHPUR_COORDS.lon, "Jodhpur (Fallback)");
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 600000 
      }
    );
  }, [fetchTimes]);

  // Countdown
  useEffect(() => {
    if (!timings) return;
    const update = () => setCountdown(getNextPrayer(timings));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [timings]);

  if (loading && !timings) return <Skeleton className="h-40 w-full rounded-2xl" />;

  if (error && !timings) {
    return (
      <div className="rounded-2xl p-6 border-2 flex flex-col items-center gap-4 text-center bg-gradient-to-br from-emerald-900 to-emerald-800 text-white">
        <MapPin className="h-8 w-8 opacity-50" />
        <p>{error}</p>
        <button onClick={() => window.location.reload()} 
          className="px-6 py-2 rounded-full font-bold" 
          style={{background: "#d4af37", color: "#1a472a"}}>
          Retry
        </button>
      </div>
    );
  }

  if (!timings) return <Skeleton className="h-40 w-full rounded-2xl" />;

  return (
    <div className="rounded-2xl border-2 overflow-hidden shadow-xl" style={{ borderColor: "#1a472a" }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #1a472a, #2d6a4f)" }}>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" style={{ color: "#d4af37" }} />
          <span className="text-sm font-bold text-white">Prayer Times • {locationName}</span>
        </div>
        {countdown.name && (
          <div className="text-right">
            <p className="text-[10px] text-white/70">Next: {countdown.name}</p>
            <p className="text-xl font-mono font-bold" style={{ color: "#d4af37" }}>{countdown.countdown}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 divide-x divide-zinc-100 bg-white">
        {PRAYERS.map((p) => {
          const t = timings[p.key as keyof PrayerTimings];
          const isNext = countdown.name === p.key;
          return (
            <div key={p.key} className={`flex flex-col items-center py-4 px-1 gap-1 ${isNext ? 'bg-emerald-50/50' : ''}`}>
              <span className="text-[10px] font-black uppercase" style={{ color: "#1a472a" }}>{p.key}</span>
              <span className="text-xs" dir="rtl" style={{ fontFamily: "Amiri, serif", color: "#d4af37" }}>{p.arabic}</span>
              <span className={`text-sm font-mono font-bold ${isNext ? 'text-emerald-700' : 'text-slate-700'}`}>{t}</span>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2 bg-zinc-50 flex justify-end border-t">
        <Link href="/prayer-times" className="text-xs font-bold" style={{ color: "#1a472a" }}>
          View Full Calendar →
        </Link>
      </div>
    </div>
  );
}
