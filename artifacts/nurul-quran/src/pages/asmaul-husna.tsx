import { useState } from "react";
import { motion } from "framer-motion";

interface Name {
  number: number;
  arabic: string;
  transliteration: string;
  meaning: string;
}

const NAMES: Name[] = [
  { number: 1, arabic: "الرَّحْمَنُ", transliteration: "Ar-Rahman", meaning: "The Most Gracious" },
  { number: 2, arabic: "الرَّحِيمُ", transliteration: "Ar-Raheem", meaning: "The Most Merciful" },
  { number: 3, arabic: "الْمَلِكُ", transliteration: "Al-Malik", meaning: "The King, The Sovereign" },
  { number: 4, arabic: "الْقُدُّوسُ", transliteration: "Al-Quddus", meaning: "The Most Holy, The Pure" },
  { number: 5, arabic: "السَّلاَمُ", transliteration: "As-Salam", meaning: "The Source of Peace" },
  { number: 6, arabic: "الْمُؤْمِنُ", transliteration: "Al-Mu'min", meaning: "The Infuser of Faith" },
  { number: 7, arabic: "الْمُهَيْمِنُ", transliteration: "Al-Muhaymin", meaning: "The Guardian, The Watchful" },
  { number: 8, arabic: "الْعَزِيزُ", transliteration: "Al-Aziz", meaning: "The Almighty, The Invincible" },
  { number: 9, arabic: "الْجَبَّارُ", transliteration: "Al-Jabbar", meaning: "The Compeller, The Restorer" },
  { number: 10, arabic: "الْمُتَكَبِّرُ", transliteration: "Al-Mutakabbir", meaning: "The Supreme, The Majestic" },
  { number: 11, arabic: "الْخَالِقُ", transliteration: "Al-Khaliq", meaning: "The Creator" },
  { number: 12, arabic: "الْبَارِئُ", transliteration: "Al-Bari", meaning: "The Originator" },
  { number: 13, arabic: "الْمُصَوِّرُ", transliteration: "Al-Musawwir", meaning: "The Fashioner of Forms" },
  { number: 14, arabic: "الْغَفَّارُ", transliteration: "Al-Ghaffar", meaning: "The Forgiving" },
  { number: 15, arabic: "الْقَهَّارُ", transliteration: "Al-Qahhar", meaning: "The Subduer" },
  { number: 16, arabic: "الْوَهَّابُ", transliteration: "Al-Wahhab", meaning: "The Bestower" },
  { number: 17, arabic: "الرَّزَّاقُ", transliteration: "Ar-Razzaq", meaning: "The Provider" },
  { number: 18, arabic: "الْفَتَّاحُ", transliteration: "Al-Fattah", meaning: "The Opener, The Victory Giver" },
  { number: 19, arabic: "اَلْعَلِيمُ", transliteration: "Al-Alim", meaning: "The All-Knowing" },
  { number: 20, arabic: "الْقَابِضُ", transliteration: "Al-Qabid", meaning: "The Restrainer, The Withholder" },
  { number: 21, arabic: "الْبَاسِطُ", transliteration: "Al-Basit", meaning: "The Extender" },
  { number: 22, arabic: "الْخَافِضُ", transliteration: "Al-Khafid", meaning: "The Abaser" },
  { number: 23, arabic: "الرَّافِعُ", transliteration: "Ar-Rafi", meaning: "The Exalter, The Elevator" },
  { number: 24, arabic: "الْمُعِزُّ", transliteration: "Al-Mu'izz", meaning: "The Bestower of Honour" },
  { number: 25, arabic: "المُذِلُّ", transliteration: "Al-Mudhill", meaning: "The Humiliator" },
  { number: 26, arabic: "السَّمِيعُ", transliteration: "As-Sami", meaning: "The All-Hearing" },
  { number: 27, arabic: "الْبَصِيرُ", transliteration: "Al-Basir", meaning: "The All-Seeing" },
  { number: 28, arabic: "الْحَكَمُ", transliteration: "Al-Hakam", meaning: "The Judge, The Arbitrator" },
  { number: 29, arabic: "الْعَدْلُ", transliteration: "Al-Adl", meaning: "The Utterly Just" },
  { number: 30, arabic: "اللَّطِيفُ", transliteration: "Al-Latif", meaning: "The Subtle One, The Gentle" },
  { number: 31, arabic: "الْخَبِيرُ", transliteration: "Al-Khabir", meaning: "The All-Aware, The Acquainted" },
  { number: 32, arabic: "الْحَلِيمُ", transliteration: "Al-Halim", meaning: "The Forbearing, The Indulgent" },
  { number: 33, arabic: "الْعَظِيمُ", transliteration: "Al-Azim", meaning: "The Magnificent" },
  { number: 34, arabic: "الْغَفُورُ", transliteration: "Al-Ghafur", meaning: "The Forgiving, The Pardoner" },
  { number: 35, arabic: "الشَّكُورُ", transliteration: "Ash-Shakur", meaning: "The Appreciative, The Grateful" },
  { number: 36, arabic: "الْعَلِيُّ", transliteration: "Al-Ali", meaning: "The Most High, The Exalted" },
  { number: 37, arabic: "الْكَبِيرُ", transliteration: "Al-Kabir", meaning: "The Most Great" },
  { number: 38, arabic: "الْحَفِيظُ", transliteration: "Al-Hafiz", meaning: "The Preserver, The Protector" },
  { number: 39, arabic: "المُقيِت", transliteration: "Al-Muqit", meaning: "The Sustainer, The Nourisher" },
  { number: 40, arabic: "الْحسِيبُ", transliteration: "Al-Hasib", meaning: "The Reckoner" },
  { number: 41, arabic: "الْجَلِيلُ", transliteration: "Al-Jalil", meaning: "The Majestic, The Exalted" },
  { number: 42, arabic: "الْكَرِيمُ", transliteration: "Al-Karim", meaning: "The Most Generous" },
  { number: 43, arabic: "الرَّقِيبُ", transliteration: "Ar-Raqib", meaning: "The Watchful" },
  { number: 44, arabic: "الْمُجِيبُ", transliteration: "Al-Mujib", meaning: "The Responsive, The Answerer" },
  { number: 45, arabic: "الْوَاسِعُ", transliteration: "Al-Wasi", meaning: "The All-Encompassing" },
  { number: 46, arabic: "الْحَكِيمُ", transliteration: "Al-Hakim", meaning: "The Wise" },
  { number: 47, arabic: "الْوَدُودُ", transliteration: "Al-Wadud", meaning: "The Loving" },
  { number: 48, arabic: "الْمَجِيدُ", transliteration: "Al-Majid", meaning: "The Most Glorious" },
  { number: 49, arabic: "الْبَاعِثُ", transliteration: "Al-Ba'ith", meaning: "The Resurrector" },
  { number: 50, arabic: "الشَّهِيدُ", transliteration: "Ash-Shahid", meaning: "The Witness" },
  { number: 51, arabic: "الْحَقُّ", transliteration: "Al-Haqq", meaning: "The Truth, The Reality" },
  { number: 52, arabic: "الْوَكِيلُ", transliteration: "Al-Wakil", meaning: "The Trustee, The Disposer of Affairs" },
  { number: 53, arabic: "الْقَوِيُّ", transliteration: "Al-Qawiyy", meaning: "The Strong" },
  { number: 54, arabic: "الْمَتِينُ", transliteration: "Al-Matin", meaning: "The Firm, The Steadfast" },
  { number: 55, arabic: "الْوَلِيُّ", transliteration: "Al-Wali", meaning: "The Protecting Friend, Patron" },
  { number: 56, arabic: "الْحَمِيدُ", transliteration: "Al-Hamid", meaning: "The Praiseworthy" },
  { number: 57, arabic: "الْمُحْصِي", transliteration: "Al-Muhsi", meaning: "The All-Enumerating" },
  { number: 58, arabic: "الْمُبْدِئُ", transliteration: "Al-Mubdi", meaning: "The Originator, The Initiator" },
  { number: 59, arabic: "الْمُعِيدُ", transliteration: "Al-Mu'id", meaning: "The Restorer, The Reinstater" },
  { number: 60, arabic: "الْمُحْيِي", transliteration: "Al-Muhyi", meaning: "The Giver of Life" },
  { number: 61, arabic: "اَلْمُمِيتُ", transliteration: "Al-Mumit", meaning: "The Bringer of Death" },
  { number: 62, arabic: "الْحَيُّ", transliteration: "Al-Hayy", meaning: "The Ever-Living" },
  { number: 63, arabic: "الْقَيُّومُ", transliteration: "Al-Qayyum", meaning: "The Sustainer, Self-Subsisting" },
  { number: 64, arabic: "الْوَاجِدُ", transliteration: "Al-Wajid", meaning: "The Perceiver, The Finder" },
  { number: 65, arabic: "الْمَاجِدُ", transliteration: "Al-Majid", meaning: "The Illustrious, The Magnificent" },
  { number: 66, arabic: "الْواحِدُ", transliteration: "Al-Wahid", meaning: "The Unique, The Single" },
  { number: 67, arabic: "اَلاَحَدُ", transliteration: "Al-Ahad", meaning: "The One, The All Inclusive" },
  { number: 68, arabic: "الصَّمَدُ", transliteration: "As-Samad", meaning: "The Eternal, Absolute" },
  { number: 69, arabic: "الْقَادِرُ", transliteration: "Al-Qadir", meaning: "The Omnipotent, The Able" },
  { number: 70, arabic: "الْمُقْتَدِرُ", transliteration: "Al-Muqtadir", meaning: "The Powerful" },
  { number: 71, arabic: "الْمُقَدِّمُ", transliteration: "Al-Muqaddim", meaning: "The Expediter" },
  { number: 72, arabic: "الْمُؤَخِّرُ", transliteration: "Al-Mu'akhkhir", meaning: "The Delayer" },
  { number: 73, arabic: "الأوَّلُ", transliteration: "Al-Awwal", meaning: "The First" },
  { number: 74, arabic: "الآخِرُ", transliteration: "Al-Akhir", meaning: "The Last" },
  { number: 75, arabic: "الظَّاهِرُ", transliteration: "Az-Zahir", meaning: "The Manifest, The Evident" },
  { number: 76, arabic: "الْبَاطِنُ", transliteration: "Al-Batin", meaning: "The Hidden, The Concealed" },
  { number: 77, arabic: "الْوَالِي", transliteration: "Al-Wali", meaning: "The Governor, The Patron" },
  { number: 78, arabic: "الْمُتَعَالِي", transliteration: "Al-Muta'ali", meaning: "The Self-Exalted" },
  { number: 79, arabic: "الْبَرُّ", transliteration: "Al-Barr", meaning: "The Source of Goodness" },
  { number: 80, arabic: "التَّوَّابُ", transliteration: "At-Tawwab", meaning: "The Ever-Accepting of Repentance" },
  { number: 81, arabic: "الْمُنْتَقِمُ", transliteration: "Al-Muntaqim", meaning: "The Avenger" },
  { number: 82, arabic: "الْعَفُوُّ", transliteration: "Al-Afuww", meaning: "The Pardoner, The Forgiver" },
  { number: 83, arabic: "الرَّؤُوفُ", transliteration: "Ar-Ra'uf", meaning: "The Compassionate, The Kind" },
  { number: 84, arabic: "مَالِكُ الْمُلْكِ", transliteration: "Malik-ul-Mulk", meaning: "Master of the Kingdom" },
  { number: 85, arabic: "ذُوالْجَلاَلِ وَالإكْرَامِ", transliteration: "Dhul-Jalal Wal-Ikram", meaning: "Lord of Majesty and Generosity" },
  { number: 86, arabic: "الْمُقْسِطُ", transliteration: "Al-Muqsit", meaning: "The Equitable, The Just" },
  { number: 87, arabic: "الْجَامِعُ", transliteration: "Al-Jami", meaning: "The Gatherer, The Collector" },
  { number: 88, arabic: "الْغَنِيُّ", transliteration: "Al-Ghani", meaning: "The Self-Sufficient, The Wealthy" },
  { number: 89, arabic: "الْمُغْنِي", transliteration: "Al-Mughni", meaning: "The Enricher" },
  { number: 90, arabic: "اَلْمَانِعُ", transliteration: "Al-Mani", meaning: "The Preventer of Harm" },
  { number: 91, arabic: "الضَّارُّ", transliteration: "Ad-Darr", meaning: "The Distresser" },
  { number: 92, arabic: "النَّافِعُ", transliteration: "An-Nafi", meaning: "The Propitious, The Benefactor" },
  { number: 93, arabic: "النُّورُ", transliteration: "An-Nur", meaning: "The Light" },
  { number: 94, arabic: "الْهَادِي", transliteration: "Al-Hadi", meaning: "The Guide" },
  { number: 95, arabic: "الْبَدِيعُ", transliteration: "Al-Badi", meaning: "The Originator, The Incomparable" },
  { number: 96, arabic: "اَلْبَاقِي", transliteration: "Al-Baqi", meaning: "The Everlasting" },
  { number: 97, arabic: "الْوَارِثُ", transliteration: "Al-Warith", meaning: "The Inheritor of All" },
  { number: 98, arabic: "الرَّشِيدُ", transliteration: "Ar-Rashid", meaning: "The Guide to the Right Path" },
  { number: 99, arabic: "الصَّبُورُ", transliteration: "As-Sabur", meaning: "The Forbearing, The Patient" },
];

function NameCard({ name }: { name: Name }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="group relative rounded-2xl border-2 border-border bg-card p-4 text-center cursor-default transition-all duration-300 hover:shadow-lg"
      style={{
        "--hover-border": "#d4af37",
        "--hover-glow": "0 0 20px rgba(212, 175, 55, 0.3)",
      } as React.CSSProperties}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "#d4af37";
        el.style.boxShadow = "0 0 20px rgba(212, 175, 55, 0.3), 0 4px 20px rgba(26, 71, 42, 0.15)";
        el.style.transform = "scale(1.05)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "";
        el.style.boxShadow = "";
        el.style.transform = "";
      }}
    >
      <div
        className="absolute top-2 left-3 text-xs font-bold opacity-30"
        style={{ color: "#1a472a" }}
      >
        {name.number}
      </div>
      <p
        className="text-2xl md:text-3xl mb-2 leading-normal"
        dir="rtl"
        lang="ar"
        style={{ fontFamily: "'Amiri', serif", color: "#1a472a" }}
      >
        {name.arabic}
      </p>
      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#d4af37" }}>
        {name.transliteration}
      </p>
      <p className="text-xs text-muted-foreground leading-snug">{name.meaning}</p>
    </motion.div>
  );
}

export default function AsmaulHusna() {
  const [search, setSearch] = useState("");

  const filtered = NAMES.filter(
    (n) =>
      !search ||
      n.transliteration.toLowerCase().includes(search.toLowerCase()) ||
      n.meaning.toLowerCase().includes(search.toLowerCase()) ||
      n.arabic.includes(search)
  );

  return (
    <div className="min-h-screen bg-background">
      <section
        className="py-12 md:py-20 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%)" }}
      >
        <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none select-none">
          <span style={{ fontSize: 200, fontFamily: "Amiri, serif", color: "#d4af37" }}>الله</span>
        </div>
        <div className="container mx-auto max-w-4xl px-4 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[#d4af37] text-xs uppercase tracking-widest mb-3 font-semibold">أسماء الله الحسنى</p>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 font-serif">99 Names of Allah</h1>
            <p className="text-white/70 text-sm max-w-md mx-auto">
              Asmaul Husna — The Beautiful Names of Allah with Arabic, transliteration, and meanings
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex justify-center mb-8">
          <input
            type="text"
            placeholder="Search by name or meaning..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-5 py-3 rounded-full border-2 border-border focus:outline-none focus:border-[#1a472a] transition-colors text-sm bg-card"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {filtered.map((name) => (
            <NameCard key={name.number} name={name} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No names found for "{search}"
          </div>
        )}
      </div>
    </div>
  );
}
