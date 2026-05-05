import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Play,
  Pause,
  Volume2,
  Search,
  BookMarked,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
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

// ─── Tafseer ───────────────────────────────────────────────────────────────

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

// ─── Intersection observer ─────────────────────────────────────────────────

function useIsVisible(ref: React.RefObject<Element>) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
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
      if (playingAyah === globalAyahNumber) {
        audioRef.current?.pause();
        setPlayingAyah(null);
        return;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      setLoadingAyah(globalAyahNumber);
      setPlayingAyah(null);

      const url = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalAyahNumber}.mp3`;
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener("canplay", () => {
        setLoadingAyah(null);
        setPlayingAyah(globalAyahNumber);
        audio.play();
      });
      audio.addEventListener("ended", () => setPlayingAyah(null));
      audio.addEventListener("error", () => {
        setLoadingAyah(null);
        setPlayingAyah(null);
      });
      audio.load();
    },
    [playingAyah]
  );

  useEffect(() => () => { audioRef.current?.pause(); }, []);

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
  onPlay: (n: number) => void;
  isPlaying: boolean;
  isLoadingAudio: boolean;
}) {
  const [expandedTafseer, setExpandedTafseer] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(cardRef);

  const globalTafseerOn = displayLangs.includes("tafseer");
  const shouldFetch = (globalTafseerOn && isVisible) || expandedTafseer;
  const showTafseerBlock = globalTafseerOn || expandedTafseer;

  const { tafseer, loading: tafseerLoading, error: tafseerError } =
    useTafseer(surahNum, ayah.numberInSurah, shouldFetch);

  return (
    <div ref={cardRef} className="border rounded-xl p-4 mb-4 bg-card shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <Badge variant="secondary" className="text-xs font-semibold">
          {ayah.numberInSurah}
        </Badge>
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

      <p dir="rtl" className="text-2xl text-right font-['Amiri_Quran'] leading-loose mb-4">
        {ayah.text}
      </p>

      {displayLangs.includes("english") && (
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
          {ayah.translation}
        </p>
      )}

      {displayLangs.includes("urdu") && (
        <p dir="rtl" className="text-sm text-right mb-3 leading-loose">
          {ayah.urduTranslation}
        </p>
      )}

      {!globalTafseerOn && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpandedTafseer((p) => !p)}
          className="text-primary h-8 px-2 mt-1"
        >
          <BookOpen className="w-3 h-3 mr-1" />
          Tafseer Ibn Kathir
          {expandedTafseer
            ? <ChevronUp className="w-3 h-3 ml-1" />
            : <ChevronDown className="w-3 h-3 ml-1" />}
        </Button>
      )}

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
            <p className="text-muted-foreground italic">Unable to load tafseer. Please try again.</p>
          ) : (
            <p className="whitespace-pre-line text-foreground/80">{tafseer}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Surah List (shown at /quran) ─────────────────────────────────────────

function SurahList({
  surahs,
  loading,
  onSelect,
}: {
  surahs: SurahMeta[];
  loading: boolean;
  onSelect: (id: number) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = surahs.filter(
    (s) =>
      s.englishName.toLowerCase().includes(search.toLowerCase()) ||
      s.name.includes(search) ||
      String(s.number).includes(search)
  );

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <BookMarked className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">The Holy Quran</h1>
        </div>
        <p className="text-muted-foreground">114 Surahs — Select one to begin reading</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name or number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <button
              key={s.number}
              onClick={() => onSelect(s.number)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-primary/5 hover:border-primary/30 transition-all text-left group"
            >
              {/* Number badge */}
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {s.number}
              </div>

              {/* Names */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-sm">{s.englishName}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {s.englishNameTranslation}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {s.numberOfAyahs} Ayahs · {s.revelationType}
                </div>
              </div>

              {/* Arabic name */}
              <div className="text-right shrink-0">
                <p dir="rtl" className="font-['Amiri_Quran'] text-lg text-primary">
                  {s.name}
                </p>
              </div>

              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Surah Reader (shown at /quran/:surahId) ──────────────────────────────

function SurahReader({
  surahId,
  surahs,
}: {
  surahId: string;
  surahs: SurahMeta[];
}) {
  const [, navigate] = useLocation();
  const [displayLangs, setDisplayLangs] = useState<DisplayLang[]>(["english"]);

  const parsedId = parseInt(surahId);
  const currentSurah = surahs.find((s) => s.number === parsedId);
  const { ayahs, loading } = useSurahContent(parsedId || 0);
  const { playAyah, playingAyah, loadingAyah } = useAudioPlayer();

  const toggleLang = (lang: DisplayLang) =>
    setDisplayLangs((prev) =>
      prev.includes(lang) ? prev.filter((x) => x !== lang) : [...prev, lang]
    );

  const prevSurah = parsedId > 1 ? parsedId - 1 : null;
  const nextSurah = parsedId < 114 ? parsedId + 1 : null;

  // Scroll to top when surah changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [surahId]);

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      {/* Back to list */}
      <Button
        variant="ghost"
        onClick={() => navigate("/quran")}
        className="mb-4 -ml-2"
      >
        <ChevronLeft className="mr-1 w-4 h-4" /> All Surahs
      </Button>

      {/* Surah header */}
      {currentSurah ? (
        <div className="mb-6 text-center">
          <p dir="rtl" className="font-['Amiri_Quran'] text-3xl text-primary mb-1">
            {currentSurah.name}
          </p>
          <h1 className="text-2xl font-bold">{currentSurah.englishName}</h1>
          <p className="text-muted-foreground text-sm">{currentSurah.englishNameTranslation}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {currentSurah.numberOfAyahs} Ayahs · {currentSurah.revelationType}
          </p>
        </div>
      ) : (
        <Skeleton className="h-24 w-full rounded-xl mb-6" />
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
            {l === "tafseer" ? "Tafseer Ibn Kathir" : l.charAt(0).toUpperCase() + l.slice(1)}
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
            surahNum={parsedId}
            displayLangs={displayLangs}
            onPlay={playAyah}
            isPlaying={playingAyah === a.number}
            isLoadingAudio={loadingAyah === a.number}
          />
        ))
      )}

      {/* Prev / Next navigation */}
      {!loading && ayahs.length > 0 && (
        <div className="flex justify-between mt-8 mb-4 gap-2">
          <Button
            variant="outline"
            onClick={() => prevSurah && navigate(`/quran/${prevSurah}`)}
            disabled={!prevSurah}
            className="flex-1"
          >
            <ChevronLeft className="mr-1 w-4 h-4" /> Previous Surah
          </Button>
          <Button
            variant="outline"
            onClick={() => nextSurah && navigate(`/quran/${nextSurah}`)}
            disabled={!nextSurah}
            className="flex-1"
          >
            Next Surah <ChevronRight className="ml-1 w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Root Export — handles both /quran and /quran/:surahId ────────────────

export default function QuranReader() {
  const { surahId } = useParams<{ surahId?: string }>();
  const [, navigate] = useLocation();
  const { surahs, loading } = useSurahList();

  // /quran (no surahId) → show list
  if (!surahId) {
    return (
      <SurahList
        surahs={surahs}
        loading={loading}
        onSelect={(id) => navigate(`/quran/${id}`)}
      />
    );
  }

  // /quran/:surahId → show reader
  return <SurahReader surahId={surahId} surahs={surahs} />;
}
