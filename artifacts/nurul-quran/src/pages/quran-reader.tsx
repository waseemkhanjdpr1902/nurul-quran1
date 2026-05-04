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
    // Fetching from Quran.com API v4 (Tafsir Ibn Katheer English ID: 169)
    fetch(`https://api.quran.com/api/v4/tafsirs/169/by_ayah/${surahNum}:${ayahNum}`)
      .then(r => r.json())
      .then(d => {
        // Clean HTML tags and fix spacing
        let text = d?.tafsir?.text || "";
        text = text.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "").trim();
        cacheRef.current[key] = text;
        setTafseer(text);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Tafseer Error:", err);
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

  // Auto-expand if the language is selected from toolbar
  useEffect(() => {
    if (displayLangs.includes("tafseer")) setShowTafseer(true);
  }, [displayLangs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border rounded-xl p-4 sm:p-5 bg-card hover:border-primary/20 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {ayah.numberInSurah}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 rounded-full transition-colors ${isPlaying ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"}`}
          onClick={() => onPlay(ayah.number)}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </Button>
      </div>

      <p dir="rtl" lang="ar" className="text-2xl sm:text-3xl leading-loose text-right font-['Amiri_Quran',serif] text-foreground mb-3">
        {ayah.text}
      </p>

      {displayLangs.includes("english") && ayah.translation && (
        <p className="text-sm text-muted-foreground leading-relaxed border-t border-border pt-3 mt-3 italic">
          {ayah.translation}
        </p>
      )}

      {displayLangs.includes("urdu") && ayah.urduTranslation && (
        <p dir="rtl" lang="ur" className="text-base text-foreground/80 leading-loose text-right border-t border-border pt-3 mt-3 font-['Amiri_Quran',serif]">
          {ayah.urduTranslation}
        </p>
      )}

      <div className="border-t border-border mt-3 pt-3">
        <button
          onClick={() => setShowTafseer(s => !s)}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium"
        >
          <Star className="w-3.5 h-3.5" />
          Tafseer Ibn Katheer
          {showTafseer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <AnimatePresence>
          {showTafseer && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 text-sm text-muted-foreground leading-relaxed bg-primary/5 rounded-lg p-3">
                {tafseerLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ) : tafseer ? (
                  <>
                    <p className="whitespace-pre-line">
                      {tafseerExpanded ? tafseer : tafseer.substring(0, TAFSEER_PREVIEW)}
                      {!tafseerExpanded && tafseer.length > TAFSEER_PREVIEW && "..."}
                    </p>
                    {tafseer.length > TAFSEER_PREVIEW && (
                      <button
                        onClick={() => setTafseerExpanded(v => !v)}
                        className="mt-2 text-xs font-semibold text-primary hover:text-primary/70"
                      >
                        {tafseerExpanded ? "Show less ▲" : "Read more ▼"}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground/60">Tafseer not available for this ayah.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function QuranReader() {
  const params = useParams<{ surahId?: string }>();
  const [, navigate] = useLocation();
  const { surahs, loading: surahsLoading } = useSurahList();
  const [selectedSurah, setSelectedSurah] = useState<SurahMeta | null>(null);
  const [search, setSearch] = useState("");
  const [displayLangs, setDisplayLangs] = useState<DisplayLang[]>(["english"]);
  const [audioPage, setAudioPage] = useState(0);
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);

  const { ayahs, loading: ayahsLoading, error } = useSurahContent(
    selectedSurah?.number ?? 0,
    displayLangs
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [surahAudioPlaying, setSurahAudioPlaying] = useState(false);
  const { isPlaying: lectureIsPlaying, togglePlayPause } = useAudioPlayer();

  useEffect(() => {
    if (!params.surahId || !surahs.length) return;
    const num = parseInt(params.surahId, 10);
    const found = surahs.find(s => s.number === num);
    if (found) setSelectedSurah(found);
  }, [surahs, params.surahId]);

  useEffect(() => {
    if (!params.surahId) setSelectedSurah(null);
  }, [params.surahId]);

  const toggleLang = (lang: DisplayLang) => {
    setDisplayLangs(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const playSurahAudio = useCallback(() => {
    if (!selectedSurah) return;
    const url = `https://cdn.islamic.network/quran/audio-surah/128/${RECITER_ID}/${selectedSurah.number}.mp3`;
    if (!audioRef.current) audioRef.current = new Audio();
    if (surahAudioPlaying) {
      audioRef.current.pause();
      setSurahAudioPlaying(false);
    } else {
      if (lectureIsPlaying) togglePlayPause();
      audioRef.current.src = url;
      audioRef.current.play().then(() => setSurahAudioPlaying(true)).catch(console.error);
      audioRef.current.onended = () => setSurahAudioPlaying(false);
    }
  }, [selectedSurah, surahAudioPlaying, lectureIsPlaying, togglePlayPause]);

  const playAyahAudio = useCallback((globalAyahNum: number) => {
    const url = `https://cdn.islamic.network/quran/audio/128/${RECITER_ID}/${globalAyahNum}.mp3`;
    if (!audioRef.current) audioRef.current = new Audio();
    if (playingAyah === globalAyahNum) {
      audioRef.current.pause();
      setPlayingAyah(null);
    } else {
      if (lectureIsPlaying) togglePlayPause();
      audioRef.current.src = url;
      audioRef.current.play().then(() => setPlayingAyah(globalAyahNum)).catch(console.error);
      audioRef.current.onended = () => setPlayingAyah(null);
    }
  }, [playingAyah, lectureIsPlaying, togglePlayPause]);

  const totalPages = Math.ceil(ayahs.length / AYAH_LIMIT);
  const pagedAyahs = ayahs.slice(audioPage * AYAH_LIMIT, (audioPage + 1) * AYAH_LIMIT);

  useEffect(() => { setAudioPage(0); setSurahAudioPlaying(false); setPlayingAyah(null); }, [selectedSurah]);

  if (selectedSurah) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-6 pb-40">
        <div className="flex items-start gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/quran")} className="mt-1 shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-serif font-bold text-foreground">{selectedSurah.englishName}</h1>
              <span dir="rtl" className="text-2xl font-['Amiri_Quran',serif] text-primary">{selectedSurah.name}</span>
              <Badge variant="secondary" className="text-xs">{selectedSurah.revelationType}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {selectedSurah.englishNameTranslation} · {selectedSurah.numberOfAyahs} Ayahs
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 mb-6 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Display:</span>
            {(["english", "urdu", "tafseer"] as DisplayLang[]).map(lang => (
              <button
                key={lang}
                onClick={() => toggleLang(lang)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all capitalize ${
                  displayLangs.includes(lang) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {lang === "tafseer" ? "Ibn Katheer" : lang}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={playSurahAudio} className={`h-8 text-xs gap-1.5 ${surahAudioPlaying ? "bg-red-600" : "bg-primary"} text-primary-foreground`}>
            {surahAudioPlaying ? <><Pause className="w-3.5 h-3.5" /> Stop</> : <><Volume2 className="w-3.5 h-3.5" /> Play Surah</>}
          </Button>
        </div>

        {ayahsLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Could not load surah content. Please try again.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pagedAyahs.map(ayah => (
              <AyahCard key={ayah.number} ayah={ayah} surahNum={selectedSurah.number} displayLangs={displayLangs} isPlaying={playingAyah === ayah.number} onPlay={playAyahAudio} />
            ))}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <Button variant="outline" size="icon" disabled={audioPage === 0} onClick={() => setAudioPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-sm text-muted-foreground">Page {audioPage + 1} of {totalPages}</span>
                <Button variant="outline" size="icon" disabled={audioPage === totalPages - 1} onClick={() => setAudioPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-serif font-bold text-foreground mb-1">Holy Quran</h1>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search surah..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {surahs.filter(s => s.englishName.toLowerCase().includes(search.toLowerCase())).map(surah => (
          <button key={surah.number} onClick={() => navigate(`/quran/${surah.number}`)} className="text-left bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all">
            <h3 className="font-semibold text-sm">{surah.englishName}</h3>
            <p className="text-xs text-muted-foreground">{surah.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
