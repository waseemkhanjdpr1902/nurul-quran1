import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";

interface Dua {
  id: number;
  arabic: string;
  transliteration: string;
  meaning: string;
  source?: string;
}

interface DuaCategory {
  name: string;
  icon: string;
  duas: Dua[];
}

const DUA_CATEGORIES: DuaCategory[] = [
  {
    name: "Morning",
    icon: "🌅",
    duas: [
      {
        id: 1,
        arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ",
        transliteration: "Asbahna wa asbahal mulku lillah walhamdu lillah la ilaha illallahu wahdahu la sharika lah",
        meaning: "We have entered the morning and at this very time unto Allah belongs all sovereignty, and all praise is for Allah. None has the right to be worshipped except Allah, alone, without partner.",
        source: "Abu Dawud 4/317",
      },
      {
        id: 2,
        arabic: "اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ",
        transliteration: "Allahumma bika asbahna wa bika amsayna wa bika nahya wa bika namutu wa ilaikan-nushur",
        meaning: "O Allah, by Your leave we have reached the morning and by Your leave we have reached the evening, by Your leave we live and die and unto You is our resurrection.",
        source: "At-Tirmidhi 5/466",
      },
    ],
  },
  {
    name: "Evening",
    icon: "🌙",
    duas: [
      {
        id: 3,
        arabic: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ",
        transliteration: "Amsayna wa amsal mulku lillah walhamdu lillah la ilaha illallahu wahdahu",
        meaning: "We have entered the evening and at this very time unto Allah belongs all sovereignty, and all praise is for Allah. None has the right to be worshipped except Allah, alone.",
        source: "Abu Dawud 4/317",
      },
    ],
  },
  {
    name: "Eating",
    icon: "🍽️",
    duas: [
      {
        id: 4,
        arabic: "بِسْمِ اللَّهِ",
        transliteration: "Bismillah",
        meaning: "In the name of Allah.",
        source: "Abu Dawud 3/347",
      },
      {
        id: 5,
        arabic: "اللَّهُمَّ بَارِكْ لَنَا فِيهِ وَأَطْعِمْنَا خَيْراً مِنْهُ",
        transliteration: "Allahumma barik lana fihi wa at'imna khayran minhu",
        meaning: "O Allah, bless us in it and provide us with something better than it.",
        source: "At-Tirmidhi 4/286",
      },
      {
        id: 6,
        arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلاَ قُوَّةٍ",
        transliteration: "Alhamdulillahil-lathi at'amani hadha wa razaqaneehi min ghayri hawlin minni wa la quwwah",
        meaning: "All praises are for Allah who fed me this and provided it for me without any might or power on my part.",
        source: "At-Tirmidhi 5/510",
      },
    ],
  },
  {
    name: "Sleeping",
    icon: "😴",
    duas: [
      {
        id: 7,
        arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
        transliteration: "Bismika Allahumma amutu wa ahya",
        meaning: "In Your name O Allah, I die and I live.",
        source: "Al-Bukhari 11/113",
      },
      {
        id: 8,
        arabic: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ",
        transliteration: "Allahumma qini adhabaka yawma tab'athu ibadak",
        meaning: "O Allah, protect me from Your punishment on the Day You resurrect Your servants.",
        source: "Abu Dawud 4/311",
      },
    ],
  },
  {
    name: "Travel",
    icon: "✈️",
    duas: [
      {
        id: 9,
        arabic: "اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ",
        transliteration: "Allahu Akbar, Allahu Akbar, Allahu Akbar, Subhanal-lathi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila Rabbina lamunqalibun",
        meaning: "Allah is the greatest, Allah is the greatest, Allah is the greatest. Glory is to Him Who has provided this for us though we could never have had it by our efforts. Surely, unto our Lord we are returning.",
        source: "Abu Dawud 3/34",
      },
    ],
  },
  {
    name: "Entering Home",
    icon: "🏠",
    duas: [
      {
        id: 10,
        arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الْمَوْلَجِ وَخَيْرَ الْمَخْرَجِ، بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا",
        transliteration: "Allahumma inni as'aluka khayral mawlaji wa khayral makhraji, bismillahi walajna wa bismillahi kharajna wa 'alallahi rabbina tawakkalna",
        meaning: "O Allah, I ask You for a good entrance and a good exit. In the name of Allah we enter and in the name of Allah we leave, and upon our Lord we place our trust.",
        source: "Abu Dawud 4/325",
      },
    ],
  },
  {
    name: "Leaving Home",
    icon: "🚪",
    duas: [
      {
        id: 11,
        arabic: "بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلاَ حَوْلَ وَلاَ قُوَّةَ إِلاَّ بِاللَّهِ",
        transliteration: "Bismillahi tawakkaltu 'alallahi wa la hawla wa la quwwata illa billah",
        meaning: "In the name of Allah, I place my trust in Allah, and there is no might nor power except with Allah.",
        source: "At-Tirmidhi 5/490",
      },
    ],
  },
  {
    name: "Protection",
    icon: "🛡️",
    duas: [
      {
        id: 12,
        arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
        transliteration: "A'udhu bikalimatil-lahit-tammati min sharri ma khalaq",
        meaning: "I seek refuge in the perfect words of Allah from the evil of what He has created.",
        source: "Muslim 4/2080",
      },
      {
        id: 13,
        arabic: "بِسْمِ اللَّهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلاَ فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
        transliteration: "Bismillahil-ladhi la yadurru ma'asmihi shay'un fil-ardi wa la fis-sama'i wa huwas-sami'ul-'alim",
        meaning: "In the name of Allah with Whose name nothing is harmed on earth nor in the heavens, and He is the All-Hearing, All-Knowing.",
        source: "Abu Dawud 4/323",
      },
    ],
  },
];

function DuaCard({ dua }: { dua: Dua }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `${dua.arabic}\n\n${dua.transliteration}\n\n"${dua.meaning}"`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <p
        className="text-2xl leading-[2] mb-3 text-right"
        dir="rtl"
        lang="ar"
        style={{ fontFamily: "'Amiri', serif", color: "#1a472a" }}
      >
        {dua.arabic}
      </p>
      <p className="text-sm italic text-muted-foreground mb-2">{dua.transliteration}</p>
      <p className="text-sm text-foreground leading-relaxed mb-3">"{dua.meaning}"</p>
      <div className="flex items-center justify-between">
        {dua.source ? (
          <span className="text-xs text-muted-foreground">{dua.source}</span>
        ) : (
          <span />
        )}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border-2 transition-all font-medium"
          style={
            copied
              ? { borderColor: "#1a472a", background: "#1a472a", color: "#fff" }
              : { borderColor: "#d4af37", color: "#1a472a" }
          }
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </motion.div>
  );
}

export default function Duas() {
  const [activeCategory, setActiveCategory] = useState(DUA_CATEGORIES[0].name);

  const category = DUA_CATEGORIES.find((c) => c.name === activeCategory) ?? DUA_CATEGORIES[0];

  return (
    <div className="min-h-screen bg-background">
      <section
        className="py-12 md:py-20 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%)" }}
      >
        <div className="absolute inset-0 opacity-5 flex items-center justify-end pointer-events-none select-none pr-8">
          <span style={{ fontSize: 220, fontFamily: "Amiri, serif", color: "#d4af37" }}>دعاء</span>
        </div>
        <div className="container mx-auto max-w-3xl px-4 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[#d4af37] text-xs uppercase tracking-widest mb-3 font-semibold">دعاء</p>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 font-serif">Daily Duas</h1>
            <p className="text-white/70 text-sm max-w-md mx-auto">
              Supplications for every occasion, in Arabic with transliteration and meaning
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-wrap gap-2 mb-8">
          {DUA_CATEGORIES.map((c) => (
            <button
              key={c.name}
              onClick={() => setActiveCategory(c.name)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border-2 transition-all"
              style={
                activeCategory === c.name
                  ? { background: "#1a472a", color: "#d4af37", borderColor: "#1a472a" }
                  : { borderColor: "#ddd", color: "#555" }
              }
            >
              <span>{c.icon}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {category.duas.map((dua) => (
            <DuaCard key={dua.id} dua={dua} />
          ))}
        </div>
      </div>
    </div>
  );
}
