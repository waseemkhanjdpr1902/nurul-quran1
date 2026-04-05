import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Timer, Users, Play, Pause, RotateCcw, Heart, Wind } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MoodVerse {
  id: number;
  arabic: string;
  translation: string;
  reference: string;
  mood: string;
}

interface UmmahStats {
  pages_read: number;
  goal_target: number;
  label: string;
}

// ─── Mood configuration ───────────────────────────────────────────────────────

const MOODS = [
  { key: "stressed",  label: "Stressed",  emoji: "😔", color: "bg-rose-100 border-rose-300 text-rose-700 hover:bg-rose-200", active: "bg-rose-500 border-rose-500 text-white" },
  { key: "grateful",  label: "Grateful",  emoji: "🌸", color: "bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200", active: "bg-emerald-600 border-emerald-600 text-white" },
  { key: "anxious",   label: "Anxious",   emoji: "🌊", color: "bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200", active: "bg-blue-600 border-blue-600 text-white" },
  { key: "peaceful",  label: "Peaceful",  emoji: "☀️", color: "bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200", active: "bg-amber-500 border-amber-500 text-white" },
];

const TIMER_OPTIONS = [10, 20, 30];

// A reflection verse shown inside the timer while it runs
const REFLECTION_VERSES = [
  { arabic: "أَلَا بِذِكۡرِ ٱللَّهِ تَطۡمَئِنُّ ٱلۡقُلُوبُ", translation: "Verily, in the remembrance of Allah do hearts find rest.", ref: "Ar-Rad 13:28" },
  { arabic: "وَنَحۡنُ أَقۡرَبُ إِلَيۡهِ مِنۡ حَبۡلِ ٱلۡوَرِيدِ", translation: "And We are closer to him than his jugular vein.", ref: "Qaf 50:16" },
  { arabic: "إِنَّ مَعَ ٱلۡعُسۡرِ يُسۡرًا", translation: "Indeed, with hardship comes ease.", ref: "Al-Inshirah 94:6" },
];

// ─── Feature 1: Mood-Based Quran Discovery ───────────────────────────────────

function MoodDiscovery() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [verse, setVerse] = useState<MoodVerse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVerse = useCallback(async (mood: string) => {
    setLoading(true);
    setError(null);
    setVerse(null);
    try {
      const res = await fetch(`${API}/api/engage/verse/${mood}`);
      if (!res.ok) throw new Error("Could not fetch verse");
      const data = await res.json();
      setVerse(data.verse);
    } catch {
      setError("Could not load a verse. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMoodClick = (mood: string) => {
    setSelectedMood(mood);
    fetchVerse(mood);
  };

  const currentMood = MOODS.find((m) => m.key === selectedMood);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">How are you feeling?</h2>
          <p className="text-sm text-muted-foreground">Let the Quran speak to your heart</p>
        </div>
      </div>

      {/* Mood Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {MOODS.map((mood) => {
          const isActive = selectedMood === mood.key;
          return (
            <button
              key={mood.key}
              onClick={() => handleMoodClick(mood.key)}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all duration-200 ${
                isActive ? mood.active : mood.color
              }`}
            >
              <span className="text-lg">{mood.emoji}</span>
              {mood.label}
            </button>
          );
        })}
      </div>

      {/* Verse Display */}
      {loading && (
        <div className="text-center py-6 text-muted-foreground text-sm animate-pulse">
          Finding the perfect verse for you…
        </div>
      )}

      {error && (
        <p className="text-center text-sm text-rose-500">{error}</p>
      )}

      {verse && !loading && (
        <div className={`rounded-xl p-5 border-l-4 space-y-3 ${
          currentMood?.key === "stressed"  ? "bg-rose-50 border-rose-400"  :
          currentMood?.key === "grateful"  ? "bg-emerald-50 border-emerald-500" :
          currentMood?.key === "anxious"   ? "bg-blue-50 border-blue-500"  :
          "bg-amber-50 border-amber-400"
        }`}>
          <p className="text-right text-2xl font-arabic leading-loose text-gray-800 dark:text-gray-200" dir="rtl">
            {verse.arabic}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
            {verse.translation}
          </p>
          <p className="text-xs font-semibold text-muted-foreground">{verse.reference}</p>
          <button
            onClick={() => fetchVerse(selectedMood!)}
            className="text-xs text-primary underline hover:no-underline mt-1"
          >
            Show another verse
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Feature 2: Deen Focus Timer ─────────────────────────────────────────────

function DeenTimer() {
  const [minutes, setMinutes] = useState(20);
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pick a random reflection verse on component mount
  const reflectionVerse = REFLECTION_VERSES[Math.floor(Math.random() * REFLECTION_VERSES.length)];

  const totalSeconds = minutes * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const displayMins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const displaySecs = String(secondsLeft % 60).padStart(2, "0");

  // Start / stop the interval
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            setFinished(true);
            audioRef.current?.pause();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
      audioRef.current?.play().catch(() => {});
    } else {
      clearInterval(intervalRef.current!);
      audioRef.current?.pause();
    }
    return () => clearInterval(intervalRef.current!);
  }, [running]);

  const handleStart = () => {
    setFinished(false);
    setRunning(true);
  };

  const handlePause = () => setRunning(false);

  const handleReset = () => {
    setRunning(false);
    setFinished(false);
    setSecondsLeft(minutes * 60);
  };

  const handleMinutesChange = (m: number) => {
    if (running) return;
    setMinutes(m);
    setSecondsLeft(m * 60);
    setFinished(false);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border p-6 space-y-5">
      {/* Hidden ambient audio — loops a soft nature sound */}
      <audio
        ref={audioRef}
        loop
        preload="none"
        src="https://assets.mixkit.co/music/preview/mixkit-river-nature-ambience-13.mp3"
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
          <Timer className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Deen Focus Timer</h2>
          <p className="text-sm text-muted-foreground">Block distractions. Focus on Allah.</p>
        </div>
      </div>

      {/* Duration selector — disabled while running */}
      <div className="flex gap-2">
        {TIMER_OPTIONS.map((m) => (
          <button
            key={m}
            onClick={() => handleMinutesChange(m)}
            disabled={running}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${
              minutes === m
                ? "bg-teal-600 text-white border-teal-600"
                : "text-teal-700 border-teal-300 hover:bg-teal-50 disabled:opacity-40"
            }`}
          >
            {m} min
          </button>
        ))}
      </div>

      {/* Circular progress + countdown */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="44"
              fill="none"
              stroke={finished ? "#10b981" : "#0d9488"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {finished ? (
              <span className="text-2xl">🎉</span>
            ) : (
              <>
                <span className="text-3xl font-bold font-mono text-gray-800 dark:text-gray-100">
                  {displayMins}:{displaySecs}
                </span>
                {running && (
                  <span className="text-[10px] text-teal-600 font-semibold mt-0.5 flex items-center gap-1">
                    <Wind className="w-3 h-3" /> nature sound on
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Do Not Disturb banner */}
        {running && (
          <div className="w-full bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-center">
            <p className="text-teal-700 font-semibold text-sm">🔕 Do Not Disturb — Deen Time Active</p>
            <p className="text-teal-600 text-xs mt-1">Put your phone face-down and stay focused.</p>
          </div>
        )}

        {/* Finished banner */}
        {finished && (
          <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-center">
            <p className="text-emerald-700 font-semibold text-sm">✅ Masha'Allah! Session Complete</p>
            <p className="text-emerald-600 text-xs mt-1">Your focus in the way of Allah is never wasted.</p>
          </div>
        )}

        {/* Reflection verse — shown while timer is running */}
        {running && (
          <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-1">
            <p className="text-right text-lg font-arabic leading-loose text-gray-700 dark:text-gray-300" dir="rtl">
              {reflectionVerse.arabic}
            </p>
            <p className="text-xs text-gray-500 italic">{reflectionVerse.translation}</p>
            <p className="text-xs font-semibold text-muted-foreground">{reflectionVerse.ref}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          {!running && !finished && (
            <button
              onClick={handleStart}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              <Play className="w-4 h-4" /> Start
            </button>
          )}
          {running && (
            <button
              onClick={handlePause}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              <Pause className="w-4 h-4" /> Pause
            </button>
          )}
          {(running || secondsLeft < totalSeconds) && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-100 font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Feature 3: Community Ummah Goal ─────────────────────────────────────────

function UmmahGoal() {
  const [stats, setStats] = useState<UmmahStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [contributing, setContributing] = useState(false);
  const [justContributed, setJustContributed] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/engage/ummah-goal`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStats(data.stats);
    } catch {
      // silently fail — the UI still renders with null check
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleContribute = async () => {
    if (contributing) return;
    setContributing(true);
    try {
      const res = await fetch(`${API}/api/engage/ummah-goal/increment`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStats(data.stats);
      setJustContributed(true);
      setTimeout(() => setJustContributed(false), 3000);
    } catch {
      // silently fail
    } finally {
      setContributing(false);
    }
  };

  const percent = stats
    ? Math.min(100, Math.round((stats.pages_read / stats.goal_target) * 100))
    : 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
          <Users className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Ummah Goal 🕌</h2>
          <p className="text-sm text-muted-foreground">A global goal shared by every reader</p>
        </div>
      </div>

      {loading && (
        <div className="text-center py-4 text-muted-foreground text-sm animate-pulse">Loading Ummah progress…</div>
      )}

      {stats && (
        <div className="space-y-4">
          {/* Label */}
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{stats.label}</p>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
              <div
                className="h-4 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-700"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{stats.pages_read.toLocaleString()} pages read</span>
              <span>{percent}% of {stats.goal_target.toLocaleString()}</span>
            </div>
          </div>

          {/* Contribute Button */}
          <button
            onClick={handleContribute}
            disabled={contributing}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
              justContributed
                ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                : "bg-violet-600 hover:bg-violet-700 text-white"
            } disabled:opacity-60`}
          >
            <Heart className={`w-4 h-4 ${justContributed ? "fill-emerald-500 text-emerald-500" : ""}`} />
            {justContributed
              ? "Jazak Allah Khayran! ✅"
              : contributing
              ? "Recording…"
              : "I read a page — contribute!"}
          </button>

          <p className="text-xs text-center text-muted-foreground">
            Each click is an honest record of your contribution to the Ummah's collective Quran reading.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Engage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-serif font-bold text-primary">Reflect & Engage</h1>
        <p className="text-muted-foreground text-sm">
          Quranic guidance for your mood · Focus sessions · Community goals
        </p>
      </div>

      <MoodDiscovery />
      <DeenTimer />
      <UmmahGoal />
    </div>
  );
}
