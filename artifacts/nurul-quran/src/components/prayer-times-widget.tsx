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

function parsePrayerTime(timeStr: string): Date {
  const now = new Date();
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
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

function getNextPrayer(timings: PrayerTimings): { name: string; countdown: string } {
  const now = new Date();
  let nextMs = Infinity;
  let nextName = "";
  for (const p of PRAYERS) {
    const pDate = parsePrayerTime(timings[p.key as keyof PrayerTimings]);
    const diff = pDate.getTime() - now.getTime();
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
  // 1. IMPROVED: Initialize strictly from localStorage to prevent start-up flickers
  const [timings, setTimings] = useState<PrayerTimings | null>(() => {
    try {
      const saved = localStorage.getItem("cached_prayer_times");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 2. LOGIC: loading is ONLY true if we have zero data to show
  const [loading, setLoading] = useState(!timings);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState({ name: "", countdown: "" });

  const fetchTimes = useCallback(async (lat: number, lon: number) => {
    try {
      // If we already have timings, we don't set loading to true (silent update)
      const res = await fetch(
        `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=2`
      );
      if (!res.ok) throw new Error("API error");
      const json = await res.json();
      const newTimings = json.data.timings;

      setTimings(newTimings);
      localStorage.setItem("cached_prayer_times", JSON.stringify(newTimings));
      setError(null);
    } catch (err) {
      // Only show error if we have nothing at all to display
      if (!timings) setError("Unable to load local prayer times");
    } finally {
      setLoading(false);
    }
  }, [timings]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => fetchTimes(pos.coords.latitude, pos.coords.longitude),
      () => {
        // If location is denied but we have cache, don't throw an error UI
        if (!timings) {
          setError("Please enable location for local times");
          setLoading(false);
        }
      },
      { 
        enableHighAccuracy: false, // Faster for web-based city detection
        timeout: 10000, 
        maximumAge: 86400000 // Allow using a 24-hour old location to speed up UI
      }
    );
  }, [fetchTimes, timings]);

  useEffect(() => {
    if (!timings) return;
    const update = () => setCountdown(getNextPrayer(timings));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [timings]);

  // 3. UI RENDERING: High-end logic for smoother experience
  if (loading && !timings) {
    return <Skeleton className="h-40 w-full rounded-2xl animate-pulse" />;
  }

  if (error && !timings) {
    return (
      <div className="rounded-2xl p-6 border-2 flex flex-col items-center gap-4 text-center transition-all"
        style={{ borderColor: "#1a472a", background: "linear-gradient(135deg, #1a472a, #2d6a4f)" }}>
        <MapPin className="h-8 w-8 text-white/30" />
        <p className="text-sm text-white/90 font-medium">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="text-xs font-bold px-6 py-2 rounded-full shadow-lg active:scale-95"
          style={{ background: "#d4af37", color: "#1a472a" }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!timings) return null;

  return (
    <div className="rounded-2xl border-2 overflow-hidden shadow-xl transition-all duration-500" style={{ borderColor: "#1a472a" }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #1a472a, #2d6a4f)" }}>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" style={{ color: "#d4af37" }} />
          <span className="text-sm font-bold text-white tracking-tight">Local Prayer Times</span>
        </div>
        {countdown.name && (
          <div className="text-right">
            <p className="text-[10px] text-white/70 uppercase font-black tracking-tighter">Next: {countdown.name}</p>
            <p className="text-xl font-mono font-bold leading-none" style={{ color: "#d4af37" }}>
              {countdown.countdown}
            </p>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-5 divide-x divide-zinc-100 bg-white">
        {PRAYERS.map((p) => {
          const t = timings[p.key as keyof PrayerTimings];
          const isNext = countdown.name === p.key;
          return (
            <div key={p.key} className={`flex flex-col items-center py-4 px-1 gap-1 transition-colors ${isNext ? 'bg-emerald-50/50' : 'hover:bg-zinc-50'}`}>
              <span className="text-[10px] font-black uppercase tracking-tighter" style={{ color: "#1a472a" }}>{p.key}</span>
              <span className="text-xs" dir="rtl" lang="ar" style={{ fontFamily: "Amiri, serif", color: "#d4af37" }}>{p.arabic}</span>
              <span className={`text-sm font-mono font-bold ${isNext ? 'text-emerald-700' : 'text-slate-700'}`}>{t}</span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-zinc-50 flex justify-end border-t border-zinc-100">
        <Link href="/prayer-times">
          <span className="text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all cursor-pointer" style={{ color: "#1a472a" }}>
            View Full Calendar →
          </span>
        </Link>
      </div>
    </div>
  );
}
