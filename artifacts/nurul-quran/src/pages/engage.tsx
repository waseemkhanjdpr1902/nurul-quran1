import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Timer, Users, Play, Pause, RotateCcw, Heart, Wind, Search, Share2, Download, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import { useAppTheme, THEMES } from "@/contexts/theme-context";
import { ThemeSwitcher } from "@/components/theme-switcher";

const API = import.meta.env.VITE_API_URL ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MoodVerse {
  id: number;
  arabic: string;
  translation: string;
  reference: string;
  mood: string;
}

interface SoulVerse {
  id: number;
  arabic: string;
  translation: string;
  reference: string;
  modern_insight: string;
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

const REFLECTION_VERSES = [
  { arabic: "أَلَا بِذِكۡرِ ٱللَّهِ تَطۡمَئِنُّ ٱلۡقُلُوبُ", translation: "Verily, in the remembrance of Allah do hearts find rest.", ref: "Ar-Rad 13:28" },
  { arabic: "وَنَحۡنُ أَقۡرَبُ إِلَيۡهِ مِنۡ حَبۡلِ ٱلۡوَرِيدِ", translation: "And We are closer to him than his jugular vein.", ref: "Qaf 50:16" },
  { arabic: "إِنَّ مَعَ ٱلۡعُسۡرِ يُسۡرًا", translation: "Indeed, with hardship comes ease.", ref: "Al-Inshirah 94:6" },
];

const SUGGESTED_SEARCHES = [
  "I'm stressed about exams", "feeling lonely", "worried about money", "heartbreak",
  "I sinned and feel guilty", "dealing with anger", "lost my purpose", "facing injustice",
  "tired and burnt out", "scared about the future",
];

// ─── Feature 0: Soul-Search ───────────────────────────────────────────────────

function SoulSearch() {
  const { def } = useAppTheme();
  const [query, setQuery] = useState("");
  const [verse, setVerse] = useState<SoulVerse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) return;
    setLoading(true);
    setError(null);
    setVerse(null);
    try {
      const res = await fetch(`${API}/api/soul-search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setVerse(data.verse);
    } catch {
      setError("Could not find a verse. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search(query);
  };

  const handleSuggestion = (s: string) => {
    setQuery(s);
    search(s);
  };

  const handleShare = async () => {
    if (!cardRef.current || !verse) return;
    setSharing(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });

      // Try Web Share API first (works on mobile)
      if (navigator.share) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], "nurul-quran-verse.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: verse.reference, text: `${verse.translation}\n— ${verse.reference}\n\nNurul Quran App` });
          return;
        }
        await navigator.share({
          title: verse.reference,
          text: `${verse.translation}\n— ${verse.reference}\n\nNurul Quran App`,
        });
        return;
      }

      // Fallback: download the image
      const link = document.createElement("a");
      link.download = `nurul-quran-${verse.reference.replace(/[^a-z0-9]/gi, "-")}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // Silent fail
    } finally {
      setSharing(false);
    }
  };

  const handleWhatsApp = () => {
    if (!verse) return;
    const text = encodeURIComponent(
      `*${verse.reference}*\n\n${verse.translation}\n\n_${verse.modern_insight}_\n\n📖 Nurul Quran App`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const isMidnight = def.key === "midnight-madinah";

  return (
    <div
      className="rounded-2xl shadow-sm border p-6 space-y-5 transition-all duration-500"
      style={{
        background: def.key === "default"
          ? "white"
          : def.key === "midnight-madinah"
          ? "rgba(10,25,47,0.95)"
          : def.key === "desert-sunset"
          ? "#FFF5E6"
          : "#F0F2EF",
        borderColor: def.key === "default" ? undefined : def.accent + "40",
        color: def.key === "default" ? undefined : def.text,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: def.accent + "22" }}
          >
            <Search className="w-5 h-5" style={{ color: def.accent }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: def.key === "default" ? undefined : def.text }}>
              Soul-Search ✨
            </h2>
            <p className="text-sm" style={{ color: def.key === "default" ? undefined : def.text + "aa" }}>
              Type your problem. The Quran will answer.
            </p>
          </div>
        </div>
        <ThemeSwitcher />
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. I'm anxious about my job interview…"
          className="flex-1 px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all"
          style={{
            background: def.key === "default" ? undefined : def.bg,
            color: def.key === "default" ? undefined : def.text,
            borderColor: def.key === "default" ? undefined : def.accent + "60",
            boxShadow: def.key === "default" ? undefined : `0 0 0 0px ${def.accent}`,
          }}
        />
        <button
          type="submit"
          disabled={loading || query.trim().length < 2}
          className="px-4 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center gap-2"
          style={{ background: def.accent, color: def.key === "midnight-madinah" ? "#0A192F" : "white" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span className="hidden sm:inline">Search</span>
        </button>
      </form>

      {/* Suggested searches */}
      {!verse && !loading && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_SEARCHES.slice(0, 6).map((s) => (
            <button
              key={s}
              onClick={() => handleSuggestion(s)}
              className="text-xs px-3 py-1.5 rounded-full border font-medium transition-all hover:opacity-80"
              style={{
                borderColor: def.accent + "60",
                color: def.key === "default" ? "#1a6b4a" : def.accent,
                background: def.accent + "11",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-6 text-sm animate-pulse" style={{ color: def.accent }}>
          Searching the Quran for you…
        </div>
      )}

      {/* Error */}
      {error && <p className="text-center text-sm text-rose-500">{error}</p>}

      {/* Result Card */}
      {verse && !loading && (
        <div
          ref={cardRef}
          className="rounded-2xl p-6 space-y-4 relative overflow-hidden"
          style={{
            background: def.key === "midnight-madinah"
              ? "linear-gradient(135deg, rgba(10,25,47,0.97) 0%, rgba(15,40,65,0.97) 100%)"
              : def.key === "desert-sunset"
              ? "linear-gradient(135deg, rgba(255,245,230,0.98) 0%, rgba(255,235,200,0.98) 100%)"
              : def.key === "minimalist-zen"
              ? "linear-gradient(135deg, rgba(240,242,239,0.98) 0%, rgba(225,230,224,0.98) 100%)"
              : "linear-gradient(135deg, rgba(26,107,74,0.06) 0%, rgba(26,107,74,0.02) 100%)",
            border: `1px solid ${def.accent}40`,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: `0 8px 32px ${def.accent}22`,
          }}
        >
          {/* Decorative accent bar */}
          <div
            className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
            style={{ background: `linear-gradient(90deg, ${def.accent}, ${def.accent}66)` }}
          />

          {/* Reference badge */}
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: def.accent + "22", color: def.accent }}
            >
              {verse.reference}
            </span>
          </div>

          {/* Arabic */}
          <p
            className="text-right text-2xl sm:text-3xl font-arabic leading-loose"
            dir="rtl"
            style={{ color: def.key === "default" ? "#1a1a1a" : def.text }}
          >
            {verse.arabic}
          </p>

          {/* Translation */}
          <p
            className="text-sm sm:text-base italic leading-relaxed"
            style={{ color: def.key === "default" ? "#374151" : def.text + "cc" }}
          >
            {verse.translation}
          </p>

          {/* Divider */}
          <div className="border-t" style={{ borderColor: def.accent + "30" }} />

          {/* Modern Insight */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: def.accent }}
            >
              Modern Insight 💡
            </p>
            <p
              className="text-sm leading-relaxed"
              style={{ color: def.key === "default" ? "#4b5563" : def.text + "bb" }}
            >
              {verse.modern_insight}
            </p>
          </div>

          {/* Nurul Quran watermark (for screenshots) */}
          <p className="text-xs font-semibold" style={{ color: def.accent + "88" }}>
            📖 Nurul Quran
          </p>
        </div>
      )}

      {/* Share buttons */}
      {verse && !loading && (
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "#25D366" }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Share on WhatsApp
          </button>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 disabled:opacity-50"
            style={{ borderColor: def.accent + "60", color: def.accent }}
          >
            {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Save as Image
          </button>
          <button
            onClick={() => search(query)}
            className="text-xs underline transition-all hover:no-underline ml-auto self-center"
            style={{ color: def.key === "default" ? "#1a6b4a" : def.accent }}
          >
            Show another
          </button>
        </div>
      )}
    </div>
  );
}

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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">How are you feeling?</h2>
          <p className="text-sm text-muted-foreground">Let the Quran speak to your heart</p>
        </div>
      </div>

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

      {loading && (
        <div className="text-center py-6 text-muted-foreground text-sm animate-pulse">
          Finding the perfect verse for you…
        </div>
      )}

      {error && <p className="text-center text-sm text-rose-500">{error}</p>}

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

  const reflectionVerse = REFLECTION_VERSES[Math.floor(Math.random() * REFLECTION_VERSES.length)];

  const totalSeconds = minutes * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const displayMins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const displaySecs = String(secondsLeft % 60).padStart(2, "0");

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

  const handleStart = () => { setFinished(false); setRunning(true); };
  const handlePause = () => setRunning(false);
  const handleReset = () => { setRunning(false); setFinished(false); setSecondsLeft(minutes * 60); };
  const handleMinutesChange = (m: number) => {
    if (running) return;
    setMinutes(m); setSecondsLeft(m * 60); setFinished(false);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border p-6 space-y-5">
      <audio ref={audioRef} loop preload="none" src="https://assets.mixkit.co/music/preview/mixkit-river-nature-ambience-13.mp3" />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
          <Timer className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Deen Focus Timer</h2>
          <p className="text-sm text-muted-foreground">Block distractions. Focus on Allah.</p>
        </div>
      </div>

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

      <div className="flex flex-col items-center gap-4">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="44" fill="none"
              stroke={finished ? "#10b981" : "#0d9488"}
              strokeWidth="8" strokeLinecap="round"
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

        {running && (
          <div className="w-full bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-center">
            <p className="text-teal-700 font-semibold text-sm">🔕 Do Not Disturb — Deen Time Active</p>
            <p className="text-teal-600 text-xs mt-1">Put your phone face-down and stay focused.</p>
          </div>
        )}

        {finished && (
          <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-center">
            <p className="text-emerald-700 font-semibold text-sm">✅ Masha'Allah! Session Complete</p>
            <p className="text-emerald-600 text-xs mt-1">Your focus in the way of Allah is never wasted.</p>
          </div>
        )}

        {running && (
          <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-1">
            <p className="text-right text-lg font-arabic leading-loose text-gray-700 dark:text-gray-300" dir="rtl">
              {reflectionVerse.arabic}
            </p>
            <p className="text-xs text-gray-500 italic">{reflectionVerse.translation}</p>
            <p className="text-xs font-semibold text-muted-foreground">{reflectionVerse.ref}</p>
          </div>
        )}

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
    } finally {
      setContributing(false);
    }
  };

  const percent = stats
    ? Math.min(100, Math.round((stats.pages_read / stats.goal_target) * 100))
    : 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border p-6 space-y-5">
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
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{stats.label}</p>

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
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-serif font-bold text-primary">Reflect & Engage</h1>
        <p className="text-muted-foreground text-sm">
          Soul-Search · Mood verses · Focus sessions · Community goals
        </p>
      </div>

      <SoulSearch />
      <MoodDiscovery />
      <DeenTimer />
      <UmmahGoal />
    </div>
  );
}
