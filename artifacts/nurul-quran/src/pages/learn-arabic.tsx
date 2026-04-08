import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ArabicLetter {
  letter: string;
  name: string;
  phonetic: string;
  isolated: string;
  initial: string;
  medial: string;
  final: string;
}

const ARABIC_ALPHABET: ArabicLetter[] = [
  { letter: "ا", name: "Alif", phonetic: "a / ā", isolated: "ا", initial: "ا", medial: "ـا", final: "ـا" },
  { letter: "ب", name: "Ba", phonetic: "b", isolated: "ب", initial: "بـ", medial: "ـبـ", final: "ـب" },
  { letter: "ت", name: "Ta (ت)", phonetic: "t", isolated: "ت", initial: "تـ", medial: "ـتـ", final: "ـت" },
  { letter: "ث", name: "Tha", phonetic: "th", isolated: "ث", initial: "ثـ", medial: "ـثـ", final: "ـث" },
  { letter: "ج", name: "Jim", phonetic: "j", isolated: "ج", initial: "جـ", medial: "ـجـ", final: "ـج" },
  { letter: "ح", name: "Ha (ح)", phonetic: "ḥ (heavy h)", isolated: "ح", initial: "حـ", medial: "ـحـ", final: "ـح" },
  { letter: "خ", name: "Kha", phonetic: "kh", isolated: "خ", initial: "خـ", medial: "ـخـ", final: "ـخ" },
  { letter: "د", name: "Dal", phonetic: "d", isolated: "د", initial: "د", medial: "ـد", final: "ـد" },
  { letter: "ذ", name: "Dhal", phonetic: "dh", isolated: "ذ", initial: "ذ", medial: "ـذ", final: "ـذ" },
  { letter: "ر", name: "Ra", phonetic: "r", isolated: "ر", initial: "ر", medial: "ـر", final: "ـر" },
  { letter: "ز", name: "Zay", phonetic: "z", isolated: "ز", initial: "ز", medial: "ـز", final: "ـز" },
  { letter: "س", name: "Sin", phonetic: "s", isolated: "س", initial: "سـ", medial: "ـسـ", final: "ـس" },
  { letter: "ش", name: "Shin", phonetic: "sh", isolated: "ش", initial: "شـ", medial: "ـشـ", final: "ـش" },
  { letter: "ص", name: "Sad", phonetic: "ṣ (heavy s)", isolated: "ص", initial: "صـ", medial: "ـصـ", final: "ـص" },
  { letter: "ض", name: "Dad", phonetic: "ḍ (heavy d)", isolated: "ض", initial: "ضـ", medial: "ـضـ", final: "ـض" },
  { letter: "ط", name: "Tah (ط)", phonetic: "ṭ (heavy t)", isolated: "ط", initial: "طـ", medial: "ـطـ", final: "ـط" },
  { letter: "ظ", name: "Dha", phonetic: "ẓ (heavy dh)", isolated: "ظ", initial: "ظـ", medial: "ـظـ", final: "ـظ" },
  { letter: "ع", name: "Ayn", phonetic: "ʿ (pharyngeal)", isolated: "ع", initial: "عـ", medial: "ـعـ", final: "ـع" },
  { letter: "غ", name: "Ghayn", phonetic: "gh", isolated: "غ", initial: "غـ", medial: "ـغـ", final: "ـغ" },
  { letter: "ف", name: "Fa", phonetic: "f", isolated: "ف", initial: "فـ", medial: "ـفـ", final: "ـف" },
  { letter: "ق", name: "Qaf", phonetic: "q", isolated: "ق", initial: "قـ", medial: "ـقـ", final: "ـق" },
  { letter: "ك", name: "Kaf", phonetic: "k", isolated: "ك", initial: "كـ", medial: "ـكـ", final: "ـك" },
  { letter: "ل", name: "Lam", phonetic: "l", isolated: "ل", initial: "لـ", medial: "ـلـ", final: "ـل" },
  { letter: "م", name: "Mim", phonetic: "m", isolated: "م", initial: "مـ", medial: "ـمـ", final: "ـم" },
  { letter: "ن", name: "Nun", phonetic: "n", isolated: "ن", initial: "نـ", medial: "ـنـ", final: "ـن" },
  { letter: "ه", name: "Hah (ه)", phonetic: "h", isolated: "ه", initial: "هـ", medial: "ـهـ", final: "ـه" },
  { letter: "و", name: "Waw", phonetic: "w / ū", isolated: "و", initial: "و", medial: "ـو", final: "ـو" },
  { letter: "ي", name: "Ya", phonetic: "y / ī", isolated: "ي", initial: "يـ", medial: "ـيـ", final: "ـي" },
];

function FlipCard({ letter, isFlipped, onClick }: { letter: ArabicLetter; isFlipped: boolean; onClick: () => void }) {
  return (
    <div
      className="relative w-full max-w-xs mx-auto cursor-pointer select-none"
      style={{ height: 260, perspective: 1200 }}
      onClick={onClick}
    >
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl shadow-xl border-2"
          style={{
            backfaceVisibility: "hidden",
            background: "linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%)",
            borderColor: "#d4af37",
          }}
        >
          <p
            className="text-9xl font-bold leading-none mb-4"
            dir="rtl"
            lang="ar"
            style={{ fontFamily: "'Amiri', serif", color: "#d4af37" }}
          >
            {letter.letter}
          </p>
          <p className="text-white/60 text-sm">Tap to reveal</p>
        </div>

        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl shadow-xl border-2 gap-2"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "#fafdf8",
            borderColor: "#1a472a",
          }}
        >
          <p
            className="text-6xl font-bold leading-none"
            dir="rtl"
            lang="ar"
            style={{ fontFamily: "'Amiri', serif", color: "#1a472a" }}
          >
            {letter.letter}
          </p>
          <p className="text-2xl font-bold text-foreground">{letter.name}</p>
          <p className="text-sm font-medium px-3 py-1 rounded-full" style={{ background: "#d4af37", color: "#1a472a" }}>
            /{letter.phonetic}/
          </p>
          <div className="flex gap-3 text-xs text-muted-foreground mt-2">
            <span>Initial: <strong dir="rtl" lang="ar" style={{ fontFamily: "Amiri, serif" }}>{letter.initial}</strong></span>
            <span>Medial: <strong dir="rtl" lang="ar" style={{ fontFamily: "Amiri, serif" }}>{letter.medial}</strong></span>
            <span>Final: <strong dir="rtl" lang="ar" style={{ fontFamily: "Amiri, serif" }}>{letter.final}</strong></span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LearnArabic() {
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => setFlashcardIndex((i) => (i + 1) % ARABIC_ALPHABET.length), 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => setFlashcardIndex((i) => (i - 1 + ARABIC_ALPHABET.length) % ARABIC_ALPHABET.length), 150);
  };

  const handleReset = () => {
    setIsFlipped(false);
    setFlashcardIndex(0);
  };

  return (
    <div className="min-h-screen bg-background">
      <section
        className="py-12 md:py-20 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%)" }}
      >
        <div className="absolute inset-0 opacity-10 flex items-center justify-end pointer-events-none select-none pr-12">
          <span style={{ fontSize: 200, fontFamily: "Amiri, serif", color: "#d4af37" }}>أ</span>
        </div>
        <div className="container mx-auto max-w-4xl px-4 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[#d4af37] text-xs uppercase tracking-widest mb-3 font-semibold">تعلم العربية</p>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 font-serif">Learn Arabic</h1>
            <p className="text-white/70 text-sm max-w-md mx-auto">
              The Arabic alphabet — all 28 letters with pronunciations and forms
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4 py-10 space-y-14">
        <section>
          <h2 className="text-2xl font-bold font-serif text-foreground mb-6">Arabic Alphabet</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-3">
            {ARABIC_ALPHABET.map((l, i) => (
              <motion.div
                key={l.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
                className="flex flex-col items-center gap-1 rounded-2xl border-2 border-border bg-card p-3 hover:border-[#d4af37] hover:shadow-md transition-all cursor-default"
                onClick={() => {
                  setFlashcardIndex(i);
                  setIsFlipped(false);
                  document.getElementById("flashcard-section")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <p
                  className="text-3xl leading-tight"
                  dir="rtl"
                  lang="ar"
                  style={{ fontFamily: "'Amiri', serif", color: "#1a472a" }}
                >
                  {l.letter}
                </p>
                <p className="text-[10px] font-semibold text-center leading-tight text-foreground">{l.name}</p>
                <p className="text-[9px] text-muted-foreground text-center">/{l.phonetic}/</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="flashcard-section">
          <h2 className="text-2xl font-bold font-serif text-foreground mb-2">Flashcard Practice</h2>
          <p className="text-muted-foreground text-sm mb-8">
            Click the card to flip it and reveal the letter name and pronunciation.
          </p>

          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>{flashcardIndex + 1} / {ARABIC_ALPHABET.length}</span>
              <span className="text-foreground font-medium">— {ARABIC_ALPHABET[flashcardIndex].name}</span>
            </div>

            <FlipCard
              letter={ARABIC_ALPHABET[flashcardIndex]}
              isFlipped={isFlipped}
              onClick={() => setIsFlipped((f) => !f)}
            />

            <div className="flex items-center gap-4 mt-4">
              <Button variant="outline" onClick={handlePrev} size="icon" className="rounded-full w-12 h-12">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                size="icon"
                className="rounded-full w-10 h-10"
                title="Reset"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleNext} size="icon" className="rounded-full w-12 h-12">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">Tap the card to flip · Use arrows to navigate</p>
          </div>
        </section>
      </div>
    </div>
  );
}
