import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronDown, ChevronUp, BookOpen } from "lucide-react";

interface SurahMeta {
  number: number;
  englishName: string;
  englishNameTranslation: string;
}

interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  translation?: string;
  urduTranslation?: string;
}

type DisplayLang = "english" | "urdu" | "tafseer";

function useSurahList() {
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("https://api.alquran.cloud/v1/surah")
      .then(r => r.json())
      .then(d => { setSurahs(d.data || []); setLoading(false); })
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
    const editions = ["quran-simple", "en.sahih", "ur.jalandhry"];
    fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/editions/${editions.join(",")}`)
      .then(r => r.json())
      .then(data => {
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

// Module-level cache — survives re-renders, cleared on hard reload
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

    // ✅ api.quran.com — same backend as qurancdn, already in CSP whitelist
    fetch(`https://api.quran.com/api/v4/tafsirs/169/by_ayah/${surahNum}:${ayahNum}`, {
      headers: { Accept: "application/json" },
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => {
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

// Fires true once the card scrolls into viewport (200px pre-load buffer)
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

function AyahCard({
  ayah,
  surahNum,
  displayLangs,
}: {
  ayah: Ayah;
  surahNum: number;
  displayLangs: DisplayLang[];
}) {
  const [expandedTafseer, setExpandedTafseer] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(cardRef);

  const globalTafseerOn = displayLangs.includes("tafseer");
  const shouldFetch = (globalTafseerOn && isVisible) || expandedTafseer;
  const showTafseerBlock = globalTafseerOn || expandedTafseer;

  const { tafseer, loading, error } = useTafseer(surahNum, ayah.numberInSurah, shouldFetch);

  return (
    <div ref={cardRef} className="border rounded-xl p-4 mb-4 bg-card shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <Badge variant="secondary" className="text-xs font-semibold">
          {ayah.numberInSurah}
        </Badge>
      </div>

      {/* Arabic */}
      <p dir="rtl" className="text-2xl text-right font-['Amiri_Quran'] leading-loose mb-4">
        {ayah.text}
      </p>

      {/* English */}
      {displayLangs.includes("english") && (
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
          {ayah.translation}
        </p>
      )}

      {/* Urdu */}
      {displayLangs.includes("urdu") && (
        <p dir="rtl" className="text-sm text-right mb-3 leading-loose">
          {ayah.urduTranslation}
        </p>
      )}

      {/* Per-ayah expand button — only when global toggle is OFF */}
      {!globalTafseerOn && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpandedTafseer(prev => !prev)}
          className="text-primary h-8 px-2 mt-1"
        >
          <BookOpen className="w-3 h-3 mr-1" />
          Tafseer Ibn Kathir
          {expandedTafseer
            ? <ChevronUp className="w-3 h-3 ml-1" />
            : <ChevronDown className="w-3 h-3 ml-1" />}
        </Button>
      )}

      {/* Tafseer block */}
      {showTafseerBlock && (
        <div className="mt-3 p-3 bg-muted/60 rounded-lg text-sm leading-relaxed border-l-4 border-primary/40">
          <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">
            Tafseer Ibn Kathir
          </p>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/6" />
            </div>
          ) : error ? (
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

export default function QuranReader() {
  const { surahId } = useParams();
  const [, navigate] = useLocation();
  const { surahs } = useSurahList();
  const [displayLangs, setDisplayLangs] = useState<DisplayLang[]>(["english"]);

  const currentSurah = surahs.find(s => s.number === parseInt(surahId || "1"));
  const { ayahs, loading } = useSurahContent(currentSurah?.number || 0);

  const toggleLang = (lang: DisplayLang) =>
    setDisplayLangs(prev =>
      prev.includes(lang) ? prev.filter(x => x !== lang) : [...prev, lang]
    );

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <Button variant="ghost" onClick={() => navigate("/quran")} className="mb-4">
        <ChevronLeft className="mr-1" /> Back
      </Button>

      {currentSurah && (
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">{currentSurah.englishName}</h1>
          <p className="text-muted-foreground">{currentSurah.englishNameTranslation}</p>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {(["english", "urdu", "tafseer"] as DisplayLang[]).map(l => (
          <Button
            key={l}
            variant={displayLangs.includes(l) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleLang(l)}
          >
            {l.charAt(0).toUpperCase() + l.slice(1)}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        ayahs.map(a => (
          <AyahCard
            key={a.number}
            ayah={a}
            surahNum={currentSurah?.number || 0}
            displayLangs={displayLangs}
          />
        ))
      )}
    </div>
  );
}
