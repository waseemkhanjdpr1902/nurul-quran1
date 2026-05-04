import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronDown, ChevronUp, Star, Play, Pause } from "lucide-react";

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

function useSurahContent(surahNum: number, displayLangs: DisplayLang[]) {
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

function useTafseer(surahNum: number, ayahNum: number, enabled: boolean) {
  const [tafseer, setTafseer] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!enabled || !surahNum || !ayahNum) return;
    const key = `${surahNum}-${ayahNum}`;
    if (cacheRef.current[key]) { setTafseer(cacheRef.current[key]); return; }

    setLoading(true);
    fetch(`https://api.qurancdn.com/api/v4/tafsirs/169/by_ayah/${surahNum}:${ayahNum}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })
      .then(r => r.json())
      .then(d => {
        let text = d?.tafsir?.text || "";
        text = text.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').trim();
        cacheRef.current[key] = text;
        setTafseer(text);
        setLoading(false);
      })
      .catch(() => {
        setTafseer("");
        setLoading(false);
      });
  }, [surahNum, ayahNum, enabled]);

  return { tafseer, loading };
}

function AyahCard({ ayah, surahNum, displayLangs }: { ayah: Ayah, surahNum: number, displayLangs: DisplayLang[] }) {
  const [showTafseer, setShowTafseer] = useState(false);
  // Auto-expand tafseer if "tafseer" lang is toggled on globally
  const tafseerEnabled = showTafseer || displayLangs.includes("tafseer");
  const { tafseer, loading } = useTafseer(surahNum, ayah.numberInSurah, tafseerEnabled);

  return (
    <div className="border rounded-xl p-4 mb-4 bg-card">
      <div className="flex justify-between mb-2">
        <Badge variant="secondary">{ayah.numberInSurah}</Badge>
      </div>
      <p dir="rtl" className="text-2xl text-right font-['Amiri_Quran'] mb-4">{ayah.text}</p>
      {displayLangs.includes("english") && <p className="text-sm text-muted-foreground mb-2">{ayah.translation}</p>}
      {displayLangs.includes("urdu") && <p dir="rtl" className="text-sm text-right mb-2">{ayah.urduTranslation}</p>}

      {/* Tafseer: show inline if global toggle is on, or expandable per-ayah */}
      {!displayLangs.includes("tafseer") && (
        <Button variant="ghost" size="sm" onClick={() => setShowTafseer(!showTafseer)} className="text-primary h-8 px-2">
          <Star className="w-3 h-3 mr-1" /> Tafseer {showTafseer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
      )}

      {tafseerEnabled && (
        <div className="mt-2 p-3 bg-muted rounded-lg text-sm">
          {loading ? <Skeleton className="h-4 w-full" /> : (tafseer || "Tafseer not available.")}
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
  const { ayahs, loading } = useSurahContent(currentSurah?.number || 0, displayLangs);

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <Button variant="ghost" onClick={() => navigate("/quran")} className="mb-4"><ChevronLeft className="mr-1" /> Back</Button>
      {currentSurah && (
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">{currentSurah.englishName}</h1>
          <p className="text-muted-foreground">{currentSurah.englishNameTranslation}</p>
        </div>
      )}
      <div className="flex gap-2 mb-6">
        {(["english", "urdu", "tafseer"] as DisplayLang[]).map((l) => (
          <Button key={l} variant={displayLangs.includes(l) ? "default" : "outline"} size="sm"
            onClick={() => setDisplayLangs(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l])}>
            {l.charAt(0).toUpperCase() + l.slice(1)}
          </Button>
        ))}
      </div>
      {loading ? <Skeleton className="h-40 w-full" /> : ayahs.map(a => (
        <AyahCard key={a.number} ayah={a} surahNum={currentSurah?.number || 0} displayLangs={displayLangs} />
      ))}
    </div>
  );
}
