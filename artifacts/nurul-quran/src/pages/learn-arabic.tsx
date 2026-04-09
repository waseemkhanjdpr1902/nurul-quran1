import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCcw, BookOpen, MessageCircle, Hash, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface ArabicLetter {
  letter: string;
  name: string;
  phonetic: string;
  initial: string;
  medial: string;
  final: string;
}

const ARABIC_ALPHABET: ArabicLetter[] = [
  { letter: "ا", name: "Alif", phonetic: "a / ā", initial: "ا", medial: "ـا", final: "ـا" },
  { letter: "ب", name: "Ba", phonetic: "b", initial: "بـ", medial: "ـبـ", final: "ـب" },
  { letter: "ت", name: "Ta", phonetic: "t", initial: "تـ", medial: "ـتـ", final: "ـت" },
  { letter: "ث", name: "Tha", phonetic: "th", initial: "ثـ", medial: "ـثـ", final: "ـث" },
  { letter: "ج", name: "Jim", phonetic: "j", initial: "جـ", medial: "ـجـ", final: "ـج" },
  { letter: "ح", name: "Ha", phonetic: "ḥ", initial: "حـ", medial: "ـحـ", final: "ـح" },
  { letter: "خ", name: "Kha", phonetic: "kh", initial: "خـ", medial: "ـخـ", final: "ـخ" },
  { letter: "د", name: "Dal", phonetic: "d", initial: "د", medial: "ـد", final: "ـد" },
  { letter: "ذ", name: "Dhal", phonetic: "dh", initial: "ذ", medial: "ـذ", final: "ـذ" },
  { letter: "ر", name: "Ra", phonetic: "r", initial: "ر", medial: "ـر", final: "ـر" },
  { letter: "ز", name: "Zay", phonetic: "z", initial: "ز", medial: "ـز", final: "ـز" },
  { letter: "س", name: "Sin", phonetic: "s", initial: "سـ", medial: "ـسـ", final: "ـس" },
  { letter: "ش", name: "Shin", phonetic: "sh", initial: "شـ", medial: "ـشـ", final: "ـش" },
  { letter: "ص", name: "Sad", phonetic: "ṣ", initial: "صـ", medial: "ـصـ", final: "ـص" },
  { letter: "ض", name: "Dad", phonetic: "ḍ", initial: "ضـ", medial: "ـضـ", final: "ـض" },
  { letter: "ط", name: "Tah", phonetic: "ṭ", initial: "طـ", medial: "ـطـ", final: "ـط" },
  { letter: "ظ", name: "Dha", phonetic: "ẓ", initial: "ظـ", medial: "ـظـ", final: "ـظ" },
  { letter: "ع", name: "Ayn", phonetic: "ʿ", initial: "عـ", medial: "ـعـ", final: "ـع" },
  { letter: "غ", name: "Ghayn", phonetic: "gh", initial: "غـ", medial: "ـغـ", final: "ـغ" },
  { letter: "ف", name: "Fa", phonetic: "f", initial: "فـ", medial: "ـفـ", final: "ـف" },
  { letter: "ق", name: "Qaf", phonetic: "q", initial: "قـ", medial: "ـقـ", final: "ـق" },
  { letter: "ك", name: "Kaf", phonetic: "k", initial: "كـ", medial: "ـكـ", final: "ـك" },
  { letter: "ل", name: "Lam", phonetic: "l", initial: "لـ", medial: "ـلـ", final: "ـل" },
  { letter: "م", name: "Mim", phonetic: "m", initial: "مـ", medial: "ـمـ", final: "ـم" },
  { letter: "ن", name: "Nun", phonetic: "n", initial: "نـ", medial: "ـنـ", final: "ـن" },
  { letter: "ه", name: "Ha (ه)", phonetic: "h", initial: "هـ", medial: "ـهـ", final: "ـه" },
  { letter: "و", name: "Waw", phonetic: "w / ū", initial: "و", medial: "ـو", final: "ـو" },
  { letter: "ي", name: "Ya", phonetic: "y / ī", initial: "يـ", medial: "ـيـ", final: "ـي" },
];

const VOCABULARY = [
  { arabic: "اللَّه", transliteration: "Allāh", meaning: "God (the one true God)", category: "Faith" },
  { arabic: "إِسْلَام", transliteration: "Islām", meaning: "Submission / the religion", category: "Faith" },
  { arabic: "إِيمَان", transliteration: "Īmān", meaning: "Faith / belief", category: "Faith" },
  { arabic: "قُرْآن", transliteration: "Qur'ān", meaning: "The Holy Book of Islam", category: "Faith" },
  { arabic: "صَلَاة", transliteration: "Ṣalāh", meaning: "Prayer (the 5 daily prayers)", category: "Worship" },
  { arabic: "صَوْم", transliteration: "Ṣawm", meaning: "Fasting", category: "Worship" },
  { arabic: "زَكَاة", transliteration: "Zakāh", meaning: "Obligatory almsgiving", category: "Worship" },
  { arabic: "حَجّ", transliteration: "Ḥajj", meaning: "Pilgrimage to Makkah", category: "Worship" },
  { arabic: "دُعَاء", transliteration: "Du'ā'", meaning: "Supplication / personal prayer", category: "Worship" },
  { arabic: "جَنَّة", transliteration: "Jannah", meaning: "Paradise / Heaven", category: "Afterlife" },
  { arabic: "نَار", transliteration: "Nār", meaning: "Fire / Hell", category: "Afterlife" },
  { arabic: "آخِرَة", transliteration: "Ākhirah", meaning: "The Hereafter", category: "Afterlife" },
  { arabic: "رَحْمَة", transliteration: "Raḥmah", meaning: "Mercy / compassion", category: "Virtues" },
  { arabic: "صَبْر", transliteration: "Ṣabr", meaning: "Patience / perseverance", category: "Virtues" },
  { arabic: "شُكْر", transliteration: "Shukr", meaning: "Gratitude / thankfulness", category: "Virtues" },
  { arabic: "تَوَكُّل", transliteration: "Tawakkul", meaning: "Complete reliance on Allah", category: "Virtues" },
  { arabic: "أَخ", transliteration: "Akh", meaning: "Brother", category: "People" },
  { arabic: "أُخْت", transliteration: "Ukht", meaning: "Sister", category: "People" },
  { arabic: "أُمّ", transliteration: "Umm", meaning: "Mother", category: "People" },
  { arabic: "أَب", transliteration: "Ab", meaning: "Father", category: "People" },
  { arabic: "بَيْت", transliteration: "Bayt", meaning: "House / home", category: "Everyday" },
  { arabic: "مَاء", transliteration: "Mā'", meaning: "Water", category: "Everyday" },
  { arabic: "طَعَام", transliteration: "Ṭa'ām", meaning: "Food", category: "Everyday" },
  { arabic: "كِتَاب", transliteration: "Kitāb", meaning: "Book", category: "Everyday" },
];

const PHRASES = [
  { arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", transliteration: "Bismillāhi r-raḥmāni r-raḥīm", meaning: "In the name of Allah, the Most Gracious, the Most Merciful", use: "Before starting any action" },
  { arabic: "الْحَمْدُ لِلَّه", transliteration: "Alhamdulillāh", meaning: "All praise is due to Allah", use: "Expressing gratitude" },
  { arabic: "سُبْحَانَ اللَّه", transliteration: "Subhānallāh", meaning: "Glory be to Allah", use: "Expressing wonder or amazement" },
  { arabic: "اللَّهُ أَكْبَر", transliteration: "Allāhu Akbar", meaning: "Allah is the Greatest", use: "Prayer, moments of awe" },
  { arabic: "لَا إِلَٰهَ إِلَّا اللَّه", transliteration: "Lā ilāha illallāh", meaning: "There is no god but Allah", use: "The declaration of faith" },
  { arabic: "إِنْ شَاءَ اللَّه", transliteration: "In shā' Allāh", meaning: "If Allah wills", use: "When referring to future plans" },
  { arabic: "مَا شَاءَ اللَّه", transliteration: "Mā shā' Allāh", meaning: "What Allah has willed", use: "Admiring something beautiful" },
  { arabic: "أَسْتَغْفِرُ اللَّه", transliteration: "Astaghfirullāh", meaning: "I seek forgiveness from Allah", use: "Seeking repentance" },
  { arabic: "جَزَاكَ اللَّهُ خَيْرًا", transliteration: "Jazāka llāhu khayran", meaning: "May Allah reward you with good", use: "Thanking someone" },
  { arabic: "السَّلَامُ عَلَيْكُم", transliteration: "As-salāmu ʿalaykum", meaning: "Peace be upon you", use: "Islamic greeting" },
  { arabic: "وَعَلَيْكُمُ السَّلَام", transliteration: "Wa ʿalaykumu s-salām", meaning: "And upon you be peace", use: "Reply to the Islamic greeting" },
  { arabic: "إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ", transliteration: "Innā lillāhi wa innā ilayhi rājiʿūn", meaning: "Indeed, we belong to Allah and to Him we shall return", use: "Upon hearing of a death or calamity" },
];

const NUMBERS = [
  { arabic: "وَاحِد", numeral: "١", transliteration: "Wāḥid", english: "1" },
  { arabic: "اثْنَان", numeral: "٢", transliteration: "Ithnān", english: "2" },
  { arabic: "ثَلَاثَة", numeral: "٣", transliteration: "Thalāthah", english: "3" },
  { arabic: "أَرْبَعَة", numeral: "٤", transliteration: "Arba'ah", english: "4" },
  { arabic: "خَمْسَة", numeral: "٥", transliteration: "Khamsah", english: "5" },
  { arabic: "سِتَّة", numeral: "٦", transliteration: "Sittah", english: "6" },
  { arabic: "سَبْعَة", numeral: "٧", transliteration: "Sab'ah", english: "7" },
  { arabic: "ثَمَانِيَة", numeral: "٨", transliteration: "Thamāniyah", english: "8" },
  { arabic: "تِسْعَة", numeral: "٩", transliteration: "Tis'ah", english: "9" },
  { arabic: "عَشَرَة", numeral: "١٠", transliteration: "'Asharah", english: "10" },
  { arabic: "عِشْرُون", numeral: "٢٠", transliteration: "'Ishrūn", english: "20" },
  { arabic: "ثَلَاثُون", numeral: "٣٠", transliteration: "Thalāthūn", english: "30" },
  { arabic: "مِئَة", numeral: "١٠٠", transliteration: "Mi'ah", english: "100" },
  { arabic: "أَلْف", numeral: "١٠٠٠", transliteration: "Alf", english: "1000" },
];

const VOCAB_CATEGORIES = ["All", "Faith", "Worship", "Afterlife", "Virtues", "People", "Everyday"];

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
          style={{ backfaceVisibility: "hidden", background: "linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%)", borderColor: "#d4af37" }}
        >
          <p className="text-9xl font-bold leading-none mb-4" dir="rtl" lang="ar" style={{ fontFamily: "'Amiri', serif", color: "#d4af37" }}>
            {letter.letter}
          </p>
          <p className="text-white/60 text-sm">Tap to reveal</p>
        </div>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl shadow-xl border-2 gap-2"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "#fafdf8", borderColor: "#1a472a" }}
        >
          <p className="text-6xl font-bold leading-none" dir="rtl" lang="ar" style={{ fontFamily: "'Amiri', serif", color: "#1a472a" }}>
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
  const [vocabCategory, setVocabCategory] = useState("All");

  const handleNext = () => { setIsFlipped(false); setTimeout(() => setFlashcardIndex((i) => (i + 1) % ARABIC_ALPHABET.length), 150); };
  const handlePrev = () => { setIsFlipped(false); setTimeout(() => setFlashcardIndex((i) => (i - 1 + ARABIC_ALPHABET.length) % ARABIC_ALPHABET.length), 150); };
  const handleReset = () => { setIsFlipped(false); setFlashcardIndex(0); };

  const filteredVocab = vocabCategory === "All" ? VOCABULARY : VOCABULARY.filter(v => v.category === vocabCategory);

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
              Alphabet, vocabulary, phrases, and numbers — your gateway to understanding the Quran
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4 py-10">
        <Tabs defaultValue="alphabet">
          <TabsList className="w-full mb-8 grid grid-cols-4">
            <TabsTrigger value="alphabet" className="gap-1.5 text-xs sm:text-sm">
              <Type className="w-3.5 h-3.5" /> Alphabet
            </TabsTrigger>
            <TabsTrigger value="vocabulary" className="gap-1.5 text-xs sm:text-sm">
              <BookOpen className="w-3.5 h-3.5" /> Vocabulary
            </TabsTrigger>
            <TabsTrigger value="phrases" className="gap-1.5 text-xs sm:text-sm">
              <MessageCircle className="w-3.5 h-3.5" /> Phrases
            </TabsTrigger>
            <TabsTrigger value="numbers" className="gap-1.5 text-xs sm:text-sm">
              <Hash className="w-3.5 h-3.5" /> Numbers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alphabet" className="space-y-10">
            <section>
              <h2 className="text-2xl font-bold font-serif text-foreground mb-2">Arabic Alphabet</h2>
              <p className="text-muted-foreground text-sm mb-6">Click any letter to practice with flashcards below.</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-3">
                {ARABIC_ALPHABET.map((l, i) => (
                  <motion.div
                    key={l.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`flex flex-col items-center gap-1 rounded-2xl border-2 bg-card p-3 hover:shadow-md transition-all cursor-pointer ${flashcardIndex === i ? "border-[#d4af37] shadow-md" : "border-border hover:border-[#d4af37]"}`}
                    onClick={() => { setFlashcardIndex(i); setIsFlipped(false); document.getElementById("flashcard-section")?.scrollIntoView({ behavior: "smooth" }); }}
                  >
                    <p className="text-3xl leading-tight" dir="rtl" lang="ar" style={{ fontFamily: "'Amiri', serif", color: "#1a472a" }}>{l.letter}</p>
                    <p className="text-[10px] font-semibold text-center leading-tight text-foreground">{l.name}</p>
                    <p className="text-[9px] text-muted-foreground text-center">/{l.phonetic}/</p>
                  </motion.div>
                ))}
              </div>
            </section>

            <section id="flashcard-section">
              <h2 className="text-2xl font-bold font-serif text-foreground mb-2">Flashcard Practice</h2>
              <p className="text-muted-foreground text-sm mb-8">Click the card to flip it and reveal the letter name and pronunciation.</p>
              <div className="flex flex-col items-center gap-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span>{flashcardIndex + 1} / {ARABIC_ALPHABET.length}</span>
                  <span className="text-foreground font-medium">— {ARABIC_ALPHABET[flashcardIndex].name}</span>
                </div>
                <FlipCard letter={ARABIC_ALPHABET[flashcardIndex]} isFlipped={isFlipped} onClick={() => setIsFlipped((f) => !f)} />
                <div className="flex items-center gap-4 mt-4">
                  <Button variant="outline" onClick={handlePrev} size="icon" className="rounded-full w-12 h-12"><ChevronLeft className="h-5 w-5" /></Button>
                  <Button variant="outline" onClick={handleReset} size="icon" className="rounded-full w-10 h-10" title="Reset"><RotateCcw className="h-4 w-4" /></Button>
                  <Button variant="outline" onClick={handleNext} size="icon" className="rounded-full w-12 h-12"><ChevronRight className="h-5 w-5" /></Button>
                </div>
                <p className="text-xs text-muted-foreground">Tap the card to flip · Use arrows to navigate</p>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="vocabulary">
            <div className="mb-6">
              <h2 className="text-2xl font-bold font-serif text-foreground mb-2">Islamic Vocabulary</h2>
              <p className="text-muted-foreground text-sm mb-5">Essential Arabic words every Muslim should know.</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {VOCAB_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setVocabCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${vocabCategory === cat ? "text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    style={vocabCategory === cat ? { background: "#1a472a" } : {}}
                  >{cat}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredVocab.map((word, i) => (
                  <motion.div
                    key={word.transliteration}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="rounded-2xl border border-border bg-card p-4 hover:border-[#1a472a]/40 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-3xl font-bold" dir="rtl" lang="ar" style={{ fontFamily: "Amiri, serif", color: "#1a472a" }}>{word.arabic}</p>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{word.category}</Badge>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{word.transliteration}</p>
                    <p className="text-xs text-muted-foreground mt-1">{word.meaning}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="phrases">
            <div>
              <h2 className="text-2xl font-bold font-serif text-foreground mb-2">Common Islamic Phrases</h2>
              <p className="text-muted-foreground text-sm mb-6">Everyday Arabic expressions used by Muslims around the world.</p>
              <div className="space-y-4">
                {PHRASES.map((phrase, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-2xl border border-border bg-card p-5 hover:border-[#1a472a]/40 transition-colors"
                  >
                    <p className="text-2xl font-bold mb-2 leading-relaxed" dir="rtl" lang="ar" style={{ fontFamily: "Amiri, serif", color: "#1a472a" }}>
                      {phrase.arabic}
                    </p>
                    <p className="text-sm font-medium text-foreground italic mb-1">{phrase.transliteration}</p>
                    <p className="text-sm text-muted-foreground mb-2">"{phrase.meaning}"</p>
                    <span className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ background: "#d4af37", color: "#1a472a" }}>
                      {phrase.use}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="numbers">
            <div>
              <h2 className="text-2xl font-bold font-serif text-foreground mb-2">Arabic Numbers</h2>
              <p className="text-muted-foreground text-sm mb-6">Arabic numerals (Eastern Arabic) used in the Quran and Islamic texts.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {NUMBERS.map((num, i) => (
                  <motion.div
                    key={num.english}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-2xl border-2 border-border bg-card p-5 text-center hover:border-[#d4af37] hover:shadow-md transition-all"
                  >
                    <p className="text-5xl font-bold mb-1" dir="rtl" style={{ fontFamily: "Amiri, serif", color: "#d4af37" }}>{num.numeral}</p>
                    <p className="text-xs text-muted-foreground mb-2">Eastern Arabic: {num.numeral} · Western: {num.english}</p>
                    <p className="text-base font-bold" dir="rtl" lang="ar" style={{ fontFamily: "Amiri, serif", color: "#1a472a" }}>{num.arabic}</p>
                    <p className="text-xs text-muted-foreground mt-1">{num.transliteration}</p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 rounded-2xl p-5 border border-border bg-card">
                <h3 className="font-bold text-foreground mb-3">Did you know?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Arabic is written and read from <strong>right to left</strong>. The numerals we use today (0, 1, 2, 3...) are actually derived from Arabic numerals, 
                  which is why they're called "Arabic numerals." The Quran uses Eastern Arabic numerals (٠١٢٣...) for Surah and verse numbers.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
