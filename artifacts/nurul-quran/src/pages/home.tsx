import { Link } from "wouter";
import { BookOpen, Users, MicVocal, LayoutGrid, Compass, ChevronRight, Clock, ScrollText, Star, BookMarked, CalendarDays, Languages, Droplets, Hand, Shield, Sparkles, GraduationCap, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { HijriCalendar } from "@/components/hijri-calendar";
import { PrayerTimesWidget } from "@/components/prayer-times-widget";
import { useState, useEffect } from "react";

interface HadithData {
  hadithnumber: number;
  text: string;
}

const DAILY_AYAHS = [
  { arabic: "وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ", translation: "But perhaps you hate a thing and it is good for you.", reference: "Quran 2:216" },
  { arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", translation: "Indeed, with hardship will be ease.", reference: "Quran 94:6" },
  { arabic: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا", translation: "For indeed, with hardship will be ease.", reference: "Quran 94:5" },
  { arabic: "وَلَنَبْلُوَنَّكُم بِشَيْءٍ مِّنَ الْخَوْفِ وَالْجُوعِ", translation: "And We will surely test you with something of fear and hunger.", reference: "Quran 2:155" },
  { arabic: "وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ", translation: "And seek help through patience and prayer.", reference: "Quran 2:45" },
  { arabic: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ", translation: "Indeed, Allah is with the patient.", reference: "Quran 2:153" },
  { arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ", translation: "Sufficient for us is Allah, and He is the best Disposer of affairs.", reference: "Quran 3:173" },
  { arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ", translation: "Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence.", reference: "Quran 2:255" },
  { arabic: "وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ", translation: "And He is with you wherever you are.", reference: "Quran 57:4" },
  { arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً", translation: "Our Lord, give us in this world that which is good and in the Hereafter that which is good.", reference: "Quran 2:201" },
  { arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ", translation: "Say: He is Allah, the One.", reference: "Quran 112:1" },
  { arabic: "إِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ", translation: "Indeed, Allah does not allow the reward of good-doers to be lost.", reference: "Quran 9:120" },
  { arabic: "وَلَذِكْرُ اللَّهِ أَكْبَرُ", translation: "And the remembrance of Allah is greater.", reference: "Quran 29:45" },
  { arabic: "فَاذْكُرُونِي أَذْكُرْكُمْ", translation: "So remember Me; I will remember you.", reference: "Quran 2:152" },
  { arabic: "إِنَّ اللَّهَ غَفُورٌ رَّحِيمٌ", translation: "Indeed, Allah is Forgiving and Merciful.", reference: "Quran 2:173" },
  { arabic: "وَلَا تَيْأَسُوا مِن رَّوْحِ اللَّهِ", translation: "And despair not of relief from Allah.", reference: "Quran 12:87" },
  { arabic: "رَبِّ اشْرَحْ لِي صَدْرِي", translation: "My Lord, expand for me my breast [with assurance].", reference: "Quran 20:25" },
  { arabic: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ", translation: "And whoever relies upon Allah — then He is sufficient for him.", reference: "Quran 65:3" },
  { arabic: "إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ", translation: "Indeed, prayer prohibits immorality and wrongdoing.", reference: "Quran 29:45" },
  { arabic: "وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ", translation: "And when My servants ask you concerning Me — indeed I am near.", reference: "Quran 2:186" },
  { arabic: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", translation: "Verily, in the remembrance of Allah do hearts find rest.", reference: "Quran 13:28" },
  { arabic: "وَاللَّهُ يُحِبُّ الصَّابِرِينَ", translation: "And Allah loves the steadfast.", reference: "Quran 3:146" },
  { arabic: "يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ", translation: "O you who believe! Seek help through patience and prayer.", reference: "Quran 2:153" },
  { arabic: "وَنَفْسٍ وَمَا سَوَّاهَا", translation: "And by the soul and He who proportioned it.", reference: "Quran 91:7" },
  { arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", translation: "Indeed, with hardship will be ease.", reference: "Quran 94:6" },
  { arabic: "وَقُل رَّبِّ زِدْنِي عِلْمًا", translation: "And say: My Lord, increase me in knowledge.", reference: "Quran 20:114" },
  { arabic: "رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا", translation: "Our Lord, do not impose blame upon us if we forget or err.", reference: "Quran 2:286" },
  { arabic: "هُوَ الَّذِي خَلَقَكُمْ مِّن نَّفْسٍ وَاحِدَةٍ", translation: "It is He who created you from one soul.", reference: "Quran 7:189" },
  { arabic: "وَاللَّهُ خَيْرُ الرَّازِقِينَ", translation: "And Allah is the best of providers.", reference: "Quran 62:11" },
  { arabic: "إِنَّ اللَّهَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ", translation: "Indeed, Allah is over all things competent.", reference: "Quran 2:20" },
  { arabic: "وَلَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ", translation: "Do not despair of the mercy of Allah.", reference: "Quran 39:53" },
];

function getTodaysAyah() {
  const day = new Date().getDate();
  return DAILY_AYAHS[day % DAILY_AYAHS.length];
}

function HadithOfDayCard() {
  const [hadith, setHadith] = useState<HadithData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const randomNum = Math.floor(Math.random() * 500) + 1;
    fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari/${randomNum}.json`)
      .then((r) => r.json())
      .then((j) => { setHadith(j.hadiths?.[0] ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl p-5 border-2 animate-pulse" style={{ borderColor: "#d4af3740", background: "#1a472a08" }}>
        <div className="h-4 w-32 bg-muted rounded mb-3" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-muted rounded" />
          <div className="h-3 w-5/6 bg-muted rounded" />
          <div className="h-3 w-4/6 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!hadith) {
    return (
      <div className="rounded-2xl p-5 border border-border bg-card flex flex-col items-center gap-3 text-center">
        <ScrollText className="w-8 h-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Unable to load Hadith</p>
        <Link href="/hadith">
          <span className="text-xs font-semibold" style={{ color: "#1a472a" }}>Browse Hadiths →</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5 border-2" style={{ borderColor: "#d4af37", background: "linear-gradient(135deg, #1a472a08, #d4af3710)" }}>
      <div className="flex items-center gap-2 mb-3">
        <ScrollText className="h-4 w-4" style={{ color: "#1a472a" }} />
        <span className="text-sm font-semibold" style={{ color: "#1a472a" }}>Sahih Bukhari</span>
        <span className="text-xs text-muted-foreground ml-auto">#{hadith.hadithnumber}</span>
      </div>
      <p className="text-sm text-foreground leading-relaxed line-clamp-4">{hadith.text}</p>
      <div className="mt-3 flex justify-end">
        <Link href="/hadith">
          <span className="text-xs font-semibold" style={{ color: "#1a472a" }}>Browse more →</span>
        </Link>
      </div>
    </div>
  );
}

const FEATURE_TILES = [
  { href: "/prayer-times", label: "Prayer Times", icon: Clock, desc: "Daily salah timings" },
  { href: "/hadith", label: "Hadith", icon: ScrollText, desc: "Prophetic traditions" },
  { href: "/duas", label: "Daily Duas", icon: BookMarked, desc: "Supplications & dhikr" },
  { href: "/asmaul-husna", label: "99 Names", icon: Star, desc: "Asmaul Husna" },
  { href: "/calendar", label: "Hijri Calendar", icon: CalendarDays, desc: "Islamic dates & events" },
  { href: "/learn-arabic", label: "Learn Arabic", icon: Languages, desc: "Alphabet & flashcards" },
];

const STATIC_STATS = [
  { label: "Surahs", value: "114", icon: BookOpen },
  { label: "Islamic Tools", value: "8+", icon: LayoutGrid },
  { label: "Scholars", value: "10+", icon: Users },
  { label: "Listeners", value: "8,000+", icon: MicVocal },
];

type LearnCard = {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
  tag: string;
  steps?: string[];
  href?: string;
  external?: string;
};

const LEARN_CARDS: LearnCard[] = [
  {
    icon: Hand,
    iconBg: "#0D4A3E",
    iconColor: "#d4af37",
    title: "How to Pray Salah",
    desc: "Step-by-step guide to the 5 daily prayers — from intention (niyyah) to tasleem.",
    tag: "7 steps",
    steps: [
      "Make Wudu (ritual purification)",
      "Stand facing the Qiblah (Kaaba, Mecca)",
      "Make your Niyyah (intention) in your heart",
      "Raise hands to ears: Allahu Akbar (Takbeer)",
      "Recite Al-Fatiha + a Surah, then bow (Ruku)",
      "Prostrate twice (Sujood) — forehead on ground",
      "Sit for Tashahhud, then end with Tasleem",
    ],
    href: "/prayer-times",
  },
  {
    icon: Droplets,
    iconBg: "#1E40AF",
    iconColor: "#93C5FD",
    title: "Wudu (Ablution)",
    desc: "Ritual purification required before Salah — learn the correct order and method.",
    tag: "6 steps",
    steps: [
      "Say Bismillah and intend Wudu in your heart",
      "Wash both hands up to the wrists (×3)",
      "Rinse mouth and sniff water into nose (×3 each)",
      "Wash face fully from forehead to chin (×3)",
      "Wash arms up to elbows — right then left (×3)",
      "Wipe head once, then wash feet to ankles (×3)",
    ],
    href: "/duas",
  },
  {
    icon: Shield,
    iconBg: "#7C3AED",
    iconColor: "#C4B5FD",
    title: "5 Pillars of Islam",
    desc: "The five foundations every Muslim must fulfil — the core of Islamic practice.",
    tag: "5 pillars",
    steps: [
      "Shahada — Testimony of faith in Allah and His Prophet ﷺ",
      "Salah — 5 daily prayers (Fajr, Dhuhr, Asr, Maghrib, Isha)",
      "Zakat — Annual charity: 2.5% of savings above nisab",
      "Sawm — Fasting during the month of Ramadan",
      "Hajj — Pilgrimage to Mecca (once in lifetime if able)",
    ],
    href: "/discover",
  },
  {
    icon: Sparkles,
    iconBg: "#9F1239",
    iconColor: "#FDA4AF",
    title: "6 Articles of Iman",
    desc: "The six beliefs that form the foundation of Islamic faith (Aqeedah).",
    tag: "6 beliefs",
    steps: [
      "Belief in Allah — One God, no partners",
      "Belief in the Angels — created from light, always obey Allah",
      "Belief in the Books — Torah, Psalms, Gospel, Quran",
      "Belief in the Prophets — from Adam to Muhammad ﷺ",
      "Belief in the Last Day — Judgment, Paradise & Hellfire",
      "Belief in Divine Decree (Qadar) — good and bad from Allah",
    ],
    href: "/discover",
  },
  {
    icon: BookOpen,
    iconBg: "#065F46",
    iconColor: "#6EE7B7",
    title: "Reading the Quran",
    desc: "Start your Quran journey — read all 114 Surahs with Arabic text and English translation.",
    tag: "114 surahs",
    href: "/quran",
  },
  {
    icon: BookMarked,
    iconBg: "#92400E",
    iconColor: "#FCD34D",
    title: "Daily Duas & Dhikr",
    desc: "Essential supplications for morning, evening, before sleep, eating, travelling and more.",
    tag: "40+ duas",
    href: "/duas",
  },
  {
    icon: GraduationCap,
    iconBg: "#1E3A5F",
    iconColor: "#93C5FD",
    title: "Learn Arabic",
    desc: "Master the Arabic alphabet, Quranic vocabulary, grammar, and everyday phrases.",
    tag: "Free lessons",
    href: "/learn-arabic",
  },
  {
    icon: Heart,
    iconBg: "#7C2D12",
    iconColor: "#FCA5A5",
    title: "99 Names of Allah",
    desc: "Memorise and understand the 99 beautiful names of Allah (Asmaul Husna) with meanings.",
    tag: "99 names",
    href: "/asmaul-husna",
  },
];

function LearnCardItem({ card, index }: { card: LearnCard; index: number }) {
  const [open, setOpen] = useState(false);
  const Icon = card.icon;

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="group bg-card border-2 border-border rounded-2xl p-5 hover:shadow-lg transition-all hover:border-primary/40 cursor-pointer h-full flex flex-col"
      onClick={card.steps ? () => setOpen(!open) : undefined}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-200" style={{ background: card.iconBg }}>
          <Icon className="w-5 h-5" style={{ color: card.iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors leading-tight">{card.title}</h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: card.iconBg + "20", color: card.iconBg }}>
              {card.tag}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{card.desc}</p>
        </div>
      </div>

      {card.steps && (
        <>
          {open && (
            <ol className="mt-2 mb-3 space-y-1.5 list-none">
              {card.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                  <span className="shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: card.iconBg }}>
                    {i + 1}
                  </span>
                  <span className="leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-auto pt-2 flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: card.iconBg }}>
              {open ? "Show less ↑" : "See steps ↓"}
            </span>
            {card.href && (
              <Link href={card.href} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <span className="text-xs text-muted-foreground hover:text-primary transition-colors">Related page →</span>
              </Link>
            )}
          </div>
        </>
      )}

      {!card.steps && card.href && (
        <div className="mt-auto pt-2 flex items-center justify-end">
          <span className="text-xs font-semibold" style={{ color: card.iconBg }}>Open →</span>
        </div>
      )}
    </motion.div>
  );

  if (card.steps) return content;
  if (card.href) return <Link href={card.href} className="h-full block">{content}</Link>;
  if (card.external) return <a href={card.external} target="_blank" rel="noopener noreferrer" className="h-full block">{content}</a>;
  return content;
}

export default function Home() {
  const ayah = getTodaysAyah();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-10 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none select-none">
          <div className="absolute top-4 right-8 text-[200px] font-arabic leading-none">﷽</div>
        </div>
        <div className="container mx-auto max-w-4xl px-4 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-4xl md:text-5xl mb-3 leading-tight" style={{ fontFamily: "'Amiri', serif", color: "#d4af37" }} dir="rtl" lang="ar">
              السَّلَامُ عَلَيْكُمْ
            </p>
            <p className="text-primary-foreground/70 text-sm md:text-base font-medium tracking-wide mb-6">
              Assalamu Alaikum — Welcome to Nurul Quran
            </p>
            <p className="text-primary-foreground/60 text-xs md:text-sm font-medium uppercase tracking-widest mb-4">
              Ayah of the Day
            </p>
            <p
              className="text-3xl md:text-5xl mb-4 leading-[1.8] text-primary-foreground/95"
              dir="rtl"
              lang="ar"
              style={{ fontFamily: "'Amiri Quran', 'Scheherazade New', serif" }}
              data-testid="text-arabic-ayah"
            >
              {ayah.arabic}
            </p>
            <p className="text-base md:text-xl text-primary-foreground/80 mb-2 italic max-w-2xl mx-auto" data-testid="text-ayah-translation">
              "{ayah.translation}"
            </p>
            <p className="text-primary-foreground/50 text-sm" data-testid="text-ayah-reference">
              — {ayah.reference}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b bg-card">
        <div className="container mx-auto max-w-6xl px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATIC_STATS.map(({ label, value, icon: Icon }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 p-3"
                data-testid={`stat-${label.toLowerCase()}`}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-xl font-bold text-foreground">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl px-4 py-10 space-y-14">

        {/* Islamic Feature Tiles */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-foreground mb-6">Islamic Features</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {FEATURE_TILES.map((tile, i) => (
              <Link key={tile.href} href={tile.href}>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="group flex flex-col items-center gap-2 rounded-2xl border-2 border-border bg-card p-4 text-center hover:shadow-md transition-all cursor-pointer hover:border-[#d4af37]/60"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors group-hover:scale-110 duration-200" style={{ background: "#1a472a" }}>
                    <tile.icon className="h-6 w-6" style={{ color: "#d4af37" }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground leading-tight">{tile.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">{tile.desc}</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </section>

        {/* Prayer Times Widget */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold font-serif text-foreground">Today's Prayer Times</h2>
            <Link href="/prayer-times">
              <span className="text-xs font-semibold text-[#1a472a]">Full details →</span>
            </Link>
          </div>
          <PrayerTimesWidget />
        </section>

        {/* Hijri Date + Hadith of Day */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold font-serif text-foreground">Hijri Date</h2>
              <Link href="/calendar">
                <span className="text-xs font-semibold text-[#1a472a]">Full Calendar →</span>
              </Link>
            </div>
            <HijriCalendar compact />
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold font-serif text-foreground">Hadith of the Day</h2>
              <Link href="/hadith">
                <span className="text-xs font-semibold text-[#1a472a]">Browse →</span>
              </Link>
            </div>
            <HadithOfDayCard />
          </div>
        </section>

        {/* Da'wah Banner */}
        <Link href="/discover">
          <div className="group flex items-center gap-5 rounded-2xl bg-gradient-to-r from-[#0D4A3E] to-[#1A6B5A] p-5 md:p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01]">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-inner">
              <Compass className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white text-lg">New to Islam? Welcome!</p>
              <p className="text-white/75 text-sm mt-0.5 leading-relaxed">
                Discover what Islam is, the 5 Pillars, common questions answered, and how to take the Shahada.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-white/60 flex-shrink-0 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Islamic Learning Basics */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-serif font-bold text-foreground">Islamic Learning Basics</h2>
            <p className="text-muted-foreground text-sm mt-1">Essential knowledge every Muslim should know — tap any card to learn the steps</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LEARN_CARDS.map((card, i) => (
              <LearnCardItem key={card.title} card={card} index={i} />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
