import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, BookOpen, Play, Pause, ChevronLeft, ChevronRight,
  Globe, Volume2, ChevronDown, ChevronUp, Star
} from "lucide-react";
import { useAudioPlayer } from "@/hooks/use-audio-player";

interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
}

interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  translation?: string;
  urduTranslation?: string;
  tafseer?: string;
}

type DisplayLang = "arabic" | "english" | "urdu" | "tafseer";

const RECITER_ID = "ar.alafasy";
const AYAH_LIMIT = 10;

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

function useSurahContent(surahNum: number, displayLangs: DisplayLang[]) {
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!surahNum) return;
    setLoading(true);
    setError(false);

    const editions = ["quran-simple"];
    if (displayLangs.includes("english") || displayLangs.includes("tafseer")) editions.push("en.sahih");
    if (displayLangs.includes("urdu")) editions.push("ur.jalandhry");

    fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/editions/${editions.join(",")}`)
      .then(r => r.json())
      .then(data => {
        if (!data.data || !Array.isArray(data.data)) { setError(true); setLoading(false); return; }
        const arabic = data.data[0];
        const english = data.data[1];
        const urdu = data.data[2];
        const merged: Ayah[] = (arabic?.ayahs || []).map((a: any, i: number) => ({
          number: a.number,
          numberInSurah: a.numberInSurah,
          text: a.text,
          translation: english?.ayahs?.[i]?.text,
          urduTranslation: urdu?.ayahs?.[i]?.text,
        }));
        setAyahs(merged);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [surahNum, displayLangs.join(",")]);

  return { ayahs, loading, error };
}

function useTafseer(surahNum: number, ayahNum: number, enabled: boolean) {
  const [tafseer, setTafseer] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!enabled || !surahNum || !ayahNum) return;
    const key = `${surahNum}-${ayahNum}`;
    if (cacheRef.current[key]) { setTafseer(cacheRef.current[key]); return; }

    setLoading(true);
    // Switch to qurancdn.com and add headers to fix 403 Forbidden error
    fetch(`https://api.qurancdn.com/api/v4/tafsirs/169/by_ayah/${surahNum}:${ayahNum}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
      .then(r => {
        if (r.status === 403) throw new Error("403: Access Denied by Quran API");
        return r.json();
      })
      .then(d => {
        let text = d?.tafsir?.text || "";
        // Cleaning HTML and entities
        text = text.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').trim();
        cacheRef.current[key] = text;
        setTafseer(text);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Tafseer Error:", err);
        setTafseer("");
        setLoading(false);
      });
  }, [surahNum, ayahNum, enabled]);

  return { tafseer, loading };
}

function AyahCard({
  ayah, surahNum, displayLangs, isPlaying, onPlay
}: {
  ayah: Ayah;
  surahNum: number;
  displayLangs: DisplayLang[];
  isPlaying: boolean;
  onPlay: (globalNum: number) => void;
}) {
  const [showTafseer, setShowTafseer] = useState(false);
  const [tafseerExpanded, setTafseerExpanded] = useState(false);
  const { tafseer, loading: tafseerLoading } = useTafseer(surahNum, ayah.numberInSurah, showTafseer);
  const TAFSEER_PREVIEW = 600;

  useEffect(() => {
    if (displayLangs.includes("tafseer")) setShowTafseer(true);
  }, [displayLangs]);

  return (
    <motion.div className="border border-border rounded-xl p-4 sm:p-5 bg-card mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
          {ayah.numberInSurah}
        </div>
        <Button variant="ghost" size="icon" onClick={() => onPlay(ayah.number)}>
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
      </div>

      <p dir="rtl" className="text-2xl sm:text-3xl leading-loose text-right font-['Amiri_Quran'] mb-3">
        {ayah.text}
      </p>

      {displayLangs.includes("english") && ayah.translation && (
        <p className="text-sm text-muted-foreground italic border-t pt-3 mt-3">{ayah.translation}</p>
      )}

      {displayLangs.includes("urdu") && ayah.urduTranslation && (
        <p dir="rtl" className="text-base text-right border-t pt-3 mt-3 font-['Amiri_Quran']">{ayah.urduTranslation}</p>
      )}

      <div className="border-t mt-3 pt-3">
        <button onClick={() => setShowTafseer(!showTafseer)} className="flex items-center gap-1.5 text-xs text-primary font-medium">
          <Star className="w-3.5 h-3.5" /> Tafseer Ibn Katheer {showTafseer ? <ChevronUp /> : <ChevronDown />}
        </button>
        {showTafseer && (
          <div className="mt-2 text-sm text-muted-foreground bg-primary/5 rounded-lg p-3">
            {tafseerLoading ? <Skeleton className="h-4 w-full" /> : (
              <p className="whitespace-pre-line">{tafseer || "Tafseer not available for this ayah."}</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function QuranReader() {
  const params = useParams<{ surahId?: string }>();
  const [, navigate] = useLocation();
  const { surahs } = useSurahList();
  const [selectedSurah, setSelectedSurah] = useState<SurahMeta | null>(null);
  const [displayLangs, setDisplayLangs] = useState<DisplayLang[]>(["english"]);
  const { ayahs, loading: ayahsLoading } = useSurahContent(selectedSurah?.number ?? 0, displayLangs);
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);

  useEffect(() => {
    if (params.surahId && surahs.length) {
      const found = surahs.find(s => s.number === parseInt(params.surahId!));
      if (found) setSelectedSurah(found);
    }
  }, [surahs, params.surahId]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {selectedSurah ? (
        <>
          <Button variant="ghost" onClick={() => navigate("/quran")} className="mb-4"><ChevronLeft /> Back</Button>
          <div className="mb-6">
            <h1 className="text-3xl font-bold">{selectedSurah.englishName}</h1>
            <p className="text-muted-foreground">{selectedSurah.englishNameTranslation}</p>
          </div>
          <div className="flex gap-2 mb-6">
            {["english", "urdu", "tafseer"].map((l) => (
              <Button key={l} variant={displayLangs.includes(l as DisplayLang) ? "default" : "outline"} size="sm" onClick={() => {
                const lang = l as DisplayLang;
                setDisplayLangs(prev => prev.includes(lang) ? prev.filter(x => x !== lang) : [...prev, lang]);
              }}>{l}</Button>
            ))}
          </div>
          {ayahsLoading ? <Skeleton className="h-64 w-full" /> : ayahs.map(a => (
            <AyahCard key={a.number} ayah={a} surahNum={selectedSurah.number} displayLangs={displayLangs} isPlaying={playingAyah === a.number} onPlay={(n) => setPlayingAyah(n)} />
          ))}
        </>
      ) : <p>Loading Surah List...</p>}
    </div>
  );
}
