import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Play,
  Pause,
  Volume2,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface SurahMeta {
  number: number;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
}

interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  translation?: string;
  urduTranslation?: string;
}

type DisplayLang = "english" | "urdu" | "tafseer";

// ─── Hooks ─────────────────────────────────────────────────────────────────

function useSurahList() {
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://api.alquran.cloud/v1/surah")
      .then((r) => r.json())
      .then((d) => {
        setSurahs(d.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { surahs, loading };
}

function useSurahContent(surahNum: number) {
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!surahNum) return;
    setLoading(true);
    setAyahs([]);
    const editions = ["quran-simple", "en.sahih", "ur.jalandhry"];
    fetch(
      `https://api.alquran.cloud/v1/surah/${surahNum}/editions/${editions.join(",")}`
    )
      .then((r) => r.json())
      .then((data) => {
        const arabic = data.data[0];
        const english = data.data[1];
        const urdu = data.data[2];
        const merged = (arabic?.ayahs || []).map((a: any, i: number) => ({
          number: a.number,
          numberInSurah: a.numberInSurah,
          text: a.text,
          translation: english?.ayahs?.[i]?.text,
          urduTranslation: urdu?.ayahs?.[i]?.text,
        }));
        setAyahs(merged);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [surahNum]);

  return { ayahs, loading };
}

// Module-level tafseer cache
const tafseerCache: Record<string, string> = {};

function useTafseer(surahNum: number, ayahNum: number, enabled: boolean) {
  const [tafseer, setTafseer] = useState<string>(
    () => tafseerCache[`${surahNum}-${ayahNum}`] || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled || !surahNum || !ayahNum) return;
    const key = `${surahNum}-${ayahNum}`;
    if (tafseerCache[key]) {
      setTafseer(tafseerCache[key]);
      return;
    }
    setLoading(true);
    setError(false);

    // ✅ api.quran.com — same backend, already in original CSP whitelist
    fetch(
      `https://api.quran.com/api/v4/tafsirs/169/by_ayah/${surahNum}:${ayahNum}`,
      { headers: { Accept: "application/json" } }
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        let text = d?.tafsir?.text || "";
        text = text
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]*>/g, "")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&#\d+;/g, "")
          .trim();
        tafseerCache[key] = text || "Tafseer not available for this ayah.";
        setTafseer(tafseerCache[key]);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [surahNum, ayahNum, enabled]);

  return { tafseer, loading, error };
}

// Fires true once the element scrolls into viewport
function useIsVisible(ref: React.RefObject<Element>) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { rootMargin: "200px" }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return isVisible;
}

// ─── Audio Player ──────────────────────────────────────────────────────────

function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [loadingAyah, setLoadingAyah] = useState<number | null>(null);

  const playAyah = useCallback(
    (globalAyahNumber: number) => {
      // Stop current if same ayah
      if (playingAyah === globalAyahNumber) {
        audioRef.current?.pause();
        setPlayingAyah(null);
        return;
      }

      // Stop any current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }

      setLoadingAyah(globalAyahNumber);
      setPlayingAyah(null);

      // Pad to 6 digits: ayah 1 → 000001
      const padded = String(globalAyahNumber).padStart(6, "0");
      const url = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalAyahNumber}.mp3`;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener("canplay", () => {
        setLoadingAyah(null);
        setPlayingAyah(globalAyahNumber);
        audio.play();
      });

      audio.addEventListener("ended", () => {
        setPlayingAyah(null);
      });

      audio.addEventListener("error", () => {
        setLoadingAyah(null);
        setPlayingAyah(null);
      });

      audio.load();
    },
    [playingAyah]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return { playAyah, playingAyah, loadingAyah };
}

// ─── Ayah Card ─────────────────────────────────────────────────────────────

function AyahCard({
  ayah,
  surahNum,
  displayLangs,
  onPlay,
  isPlaying,
  isLoadingAudio,
}: {
  ayah: Ayah;
  surahNum: number;
  displayLangs: DisplayLang[];
  onPlay: (globalNum: number) => void;
  isPlaying: boolean;
  isLoadingAudio: boolean;
}) {
  const [expandedTafseer, setExpandedTafseer] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(cardRef);

  const globalTafseerOn = displayLangs.includes("tafseer");
  const shouldFetch = (globalTafseerOn && isVisible) || expandedTafseer;
  const showTafseerBlock = globalTafseerOn || expandedTafseer;

  const { tafseer, loading: tafseerLoading, error: tafseerError } = useTafseer(
    surahNum,
    ayah.numberInSurah,
    shouldFetch
  );

  return (
    <div ref={cardRef} className="border rounded-xl p-4 mb-4 bg-card shadow-sm">
      {/* Header row: ayah number + audio button */}
      <div className="flex justify-between items-center mb-3">
        <Badge variant="secondary" className="text-xs font-semibold">
          {ayah.numberInSurah}
        </Badge>

        {/* Recitation button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPlay(ayah.number)}
          className="h-8 w-8 p-0 rounded-full text-primary hover:bg-primary/10"
          title="Play recitation"
        >
          {isLoadingAudio ? (
            <Volume2 className="w-4 h-4 animate-pulse" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Arabic text */}
      <p
        dir="rtl"
        className="text-2xl text-right font-['Amiri_Quran'] leading-loose mb-4"
      >
        {ayah.text}
      </p>

      {/* English translation */}
      {displayLangs.includes("english") && (
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
          {ayah.translation}
        </p>
      )}

      {/* Urdu translation */}
      {displayLangs.includes("urdu") && (
        <p dir="rtl" className="text-sm text-right mb-3 leading-loose">
          {ayah.urduTranslation}
        </p>
      )}

      {/* Per-ayah tafseer expand — only when global toggle is OFF */}
      {!globalTafseerOn && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpandedTafseer((prev) => !prev)}
          className="text-primary h-8 px-2 mt-1"
        >
          <BookOpen className="w-3 h-3 mr-1" />
          Tafseer Ibn Kathir
          {expandedTafseer ? (
            <ChevronUp className="w-3 h-3 ml-1" />
          ) : (
            <ChevronDown className="w-3 h-3 ml-1" />
          )}
        </Button>
      )}

      {/* Tafseer content */}
      {showTafseerBlock && (
        <div className="mt-3 p-3 bg-muted/60 rounded-lg text-sm leading-relaxed border-l-4 border-primary/40">
          <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">
            Tafseer Ibn Kathir
          </p>
          {tafseerLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/6" />
            </div>
          ) : tafseerError ? (
            <p className="text-muted-foreground italic">
              Unable to load tafseer. Please try again.
            </p>
          ) : (
            <p className="whitespace-pre-line text-foreground/80">{tafseer}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function QuranReader() {
  const { surahId } = useParams();
  const [, navigate] = useLocation();
  const { surahs } = useSurahList();

  // ✅ Only "english" active by default — tafseer NOT pre-selected
  const [displayLangs, setDisplayLangs] = useState<DisplayLang[]>(["english"]);

  const parsedId = parseInt(surahId || "0");
  const currentSurah = surahs.find((s) => s.number === parsedId);
  const { ayahs, loading } = useSurahContent(currentSurah?.number || 0);

  const { playAyah, playingAyah, loadingAyah } = useAudioPlayer();

  const toggleLang = (lang: DisplayLang) =>
    setDisplayLangs((prev) =>
      prev.includes(lang) ? prev.filter((x) => x !== lang) : [...prev, lang]
    );

  // Navigation between surahs
  const prevSurah = parsedId > 1 ? parsedId - 1 : null;
  const nextSurah = parsedId < 114 ? parsedId + 1 : null;

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => navigate("/quran")}
        className="mb-4"
      >
        <ChevronLeft className="mr-1" /> Back
      </Button>

      {/* Surah header */}
      {currentSurah && (
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold">{currentSurah.englishName}</h1>
          <p className="text-muted-foreground">
            {currentSurah.englishNameTranslation}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {currentSurah.numberOfAyahs} Ayahs
          </p>
        </div>
      )}

      {/* Language toggles */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["english", "urdu", "tafseer"] as DisplayLang[]).map((l) => (
          <Button
            key={l}
            variant={displayLangs.includes(l) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleLang(l)}
          >
            {l === "tafseer"
              ? "Tafseer Ibn Kathir"
              : l.charAt(0).toUpperCase() + l.slice(1)}
          </Button>
        ))}
      </div>

      {/* Ayah list */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        ayahs.map((a) => (
          <AyahCard
            key={a.number}
            ayah={a}
            surahNum={currentSurah?.number || 0}
            displayLangs={displayLangs}
            onPlay={playAyah}
            isPlaying={playingAyah === a.number}
            isLoadingAudio={loadingAyah === a.number}
          />
        ))
      )}

      {/* Prev / Next surah navigation */}
      {!loading && ayahs.length > 0 && (
        <div className="flex justify-between mt-8 mb-4">
          <Button
            variant="outline"
            onClick={() => prevSurah && navigate(`/quran/${prevSurah}`)}
            disabled={!prevSurah}
          >
            <ChevronLeft className="mr-1 w-4 h-4" /> Previous Surah
          </Button>
          <Button
            variant="outline"
            onClick={() => nextSurah && navigate(`/quran/${nextSurah}`)}
            disabled={!nextSurah}
          >
            Next Surah <ChevronLeft className="ml-1 w-4 h-4 rotate-180" />
          </Button>
        </div>
      )}
    </div>
  );
}
