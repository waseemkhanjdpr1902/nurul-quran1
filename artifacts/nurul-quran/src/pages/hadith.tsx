import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RefreshCw, AlertCircle, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface HadithEntry {
  hadithnumber: number;
  arabicnumber?: number;
  text: string;
  reference?: { book: number; hadith: number };
}

interface CollectionMeta {
  name: string;
}

const COLLECTIONS = [
  { key: "bukhari", label: "Sahih Bukhari", maxHadith: 6638 },
  { key: "muslim", label: "Sahih Muslim", maxHadith: 3033 },
  { key: "abudawud", label: "Abu Dawud", maxHadith: 5274 },
  { key: "tirmidhi", label: "Tirmidhi", maxHadith: 3956 },
  { key: "ibnmajah", label: "Ibn Majah", maxHadith: 4341 },
];

const BASE_URL = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-";

async function fetchHadith(collection: string, number: number): Promise<HadithEntry | null> {
  try {
    const res = await fetch(`${BASE_URL}${collection}/${number}.json`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.hadiths?.[0] ?? null;
  } catch {
    return null;
  }
}

function getRandomHadithNumber(collection: string): number {
  const col = COLLECTIONS.find((c) => c.key === collection);
  const max = col?.maxHadith ?? 100;
  return Math.floor(Math.random() * max) + 1;
}

export default function Hadith() {
  const [hadithOfDay, setHadithOfDay] = useState<HadithEntry | null>(null);
  const [hodCollection, setHodCollection] = useState("bukhari");
  const [hodLoading, setHodLoading] = useState(true);
  const [hodError, setHodError] = useState<string | null>(null);

  const [selectedCollection, setSelectedCollection] = useState("bukhari");
  const [browseHadith, setBrowseHadith] = useState<HadithEntry | null>(null);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [hadithNumber, setHadithNumber] = useState(1);

  const fetchRandomHadith = async () => {
    setHodLoading(true);
    setHodError(null);
    const randomNum = getRandomHadithNumber("bukhari");
    const h = await fetchHadith("bukhari", randomNum);
    if (h) {
      setHadithOfDay(h);
      setHodCollection("Sahih Bukhari");
    } else {
      setHodError("Failed to load Hadith of the Day");
    }
    setHodLoading(false);
  };

  const loadBrowseHadith = async (collection: string, num: number) => {
    setBrowseLoading(true);
    setBrowseError(null);
    const h = await fetchHadith(collection, num);
    if (h) {
      setBrowseHadith(h);
    } else {
      setBrowseError("Failed to load hadith. Try a different number.");
    }
    setBrowseLoading(false);
  };

  useEffect(() => {
    fetchRandomHadith();
  }, []);

  useEffect(() => {
    setHadithNumber(1);
    loadBrowseHadith(selectedCollection, 1);
  }, [selectedCollection]);

  const handleNext = () => {
    const next = hadithNumber + 1;
    setHadithNumber(next);
    loadBrowseHadith(selectedCollection, next);
  };

  const handlePrev = () => {
    if (hadithNumber <= 1) return;
    const prev = hadithNumber - 1;
    setHadithNumber(prev);
    loadBrowseHadith(selectedCollection, prev);
  };

  const collectionLabel = (key: string) => COLLECTIONS.find((c) => c.key === key)?.label ?? key;

  return (
    <div className="min-h-screen bg-background">
      <section
        className="py-12 md:py-20 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%)" }}
      >
        <div className="absolute inset-0 opacity-5 flex items-center justify-end pointer-events-none select-none pr-8">
          <span style={{ fontSize: 220, fontFamily: "Amiri, serif", color: "#d4af37" }}>حديث</span>
        </div>
        <div className="container mx-auto max-w-3xl px-4 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[#d4af37] text-xs uppercase tracking-widest mb-3 font-semibold">حديث</p>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 font-serif">Hadith Browser</h1>
            <p className="text-white/70 text-sm max-w-md mx-auto">
              Prophetic traditions from the authentic collections of Islamic scholarship
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto max-w-3xl px-4 py-10 space-y-10">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold font-serif text-foreground">Hadith of the Day</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchRandomHadith}
              disabled={hodLoading}
              className="text-[#1a472a] hover:text-[#1a472a]"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${hodLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {hodLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          ) : hodError ? (
            <div className="flex items-center gap-3 text-destructive p-4 rounded-2xl border border-destructive/20 bg-destructive/5">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm">{hodError}</p>
            </div>
          ) : hadithOfDay ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border-2 p-6 shadow-sm"
              style={{ borderColor: "#d4af37", background: "linear-gradient(135deg, #1a472a08, #d4af3710)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4" style={{ color: "#1a472a" }} />
                <span className="text-sm font-semibold" style={{ color: "#1a472a" }}>
                  {hodCollection}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  #{hadithOfDay.hadithnumber}
                </span>
              </div>
              <p className="text-foreground leading-relaxed">{hadithOfDay.text}</p>
            </motion.div>
          ) : null}
        </section>

        <section>
          <h2 className="text-xl font-bold font-serif text-foreground mb-4">Browse by Collection</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {COLLECTIONS.map((c) => (
              <button
                key={c.key}
                onClick={() => setSelectedCollection(c.key)}
                className="px-4 py-2 rounded-full text-sm font-medium border-2 transition-all"
                style={
                  selectedCollection === c.key
                    ? { background: "#1a472a", color: "#d4af37", borderColor: "#1a472a" }
                    : { borderColor: "#ccc", color: "#555" }
                }
              >
                {c.label}
              </button>
            ))}
          </div>

          {browseLoading ? (
            <Skeleton className="h-48 rounded-2xl" />
          ) : browseError ? (
            <div className="flex items-center gap-3 text-destructive p-4 rounded-2xl border border-destructive/20 bg-destructive/5">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm">{browseError}</p>
            </div>
          ) : browseHadith ? (
            <motion.div
              key={`${selectedCollection}-${hadithNumber}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-[#1a472a]" />
                <span className="text-sm font-semibold text-[#1a472a]">{collectionLabel(selectedCollection)}</span>
                <span className="text-xs text-muted-foreground ml-auto">#{browseHadith.hadithnumber}</span>
              </div>
              <p className="text-foreground leading-relaxed">{browseHadith.text}</p>
            </motion.div>
          ) : null}

          <div className="flex items-center justify-between mt-4">
            <Button variant="outline" onClick={handlePrev} disabled={hadithNumber <= 1 || browseLoading}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Hadith #{hadithNumber}</span>
            <Button variant="outline" onClick={handleNext} disabled={browseLoading}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
