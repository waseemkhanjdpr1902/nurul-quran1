import { useAudioPlayer } from "@/hooks/use-audio-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Play, BookOpen, Users, MicVocal, LayoutGrid, Compass, ChevronRight, Clock, ScrollText, Star, BookMarked, CalendarDays, Languages } from "lucide-react";
import { motion } from "framer-motion";
import { HijriCalendar } from "@/components/hijri-calendar";
import { PrayerTimesWidget } from "@/components/prayer-times-widget";
import { useState, useEffect } from "react";
import { STATIC_COURSES } from "@/lib/courses-data";

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
  { label: "Lectures", value: "37", icon: MicVocal },
  { label: "Courses", value: "12", icon: BookOpen },
  { label: "Scholars", value: "10", icon: Users },
  { label: "Listeners", value: "8,000+", icon: LayoutGrid },
];

const FEATURED_LECTURES = [
  { id: "fl-1", title: "Seerah: Pre-Islamic Arabia & Early Life", speaker: "Dr. Yasir Qadhi", category: "Islamic History", duration: "54m", url: "https://www.youtube.com/results?search_query=seerah+pre+islamic+arabia+yasir+qadhi" },
  { id: "fl-2", title: "Tafseer of Surah Al-Fatiha", speaker: "Nouman Ali Khan", category: "Tafseer", duration: "42m", url: "https://www.youtube.com/results?search_query=tafseer+surah+fatiha+nouman+ali+khan" },
  { id: "fl-3", title: "Understanding the 99 Names of Allah", speaker: "Omar Suleiman", category: "Aqeedah", duration: "1h 12m", url: "https://www.youtube.com/results?search_query=99+names+allah+omar+suleiman" },
  { id: "fl-4", title: "The Fiqh of Salah — Pillars & Conditions", speaker: "Mufti Menk", category: "Fiqh", duration: "38m", url: "https://www.youtube.com/results?search_query=fiqh+salah+pillars+conditions+mufti+menk" },
  { id: "fl-5", title: "40 Hadith of Imam Nawawi — Hadith 1", speaker: "Omar Suleiman", category: "Hadith", duration: "29m", url: "https://www.youtube.com/results?search_query=40+hadith+nawawi+hadith+1+omar+suleiman" },
  { id: "fl-6", title: "Purification of the Soul — Introduction", speaker: "Hamza Yusuf", category: "Spirituality", duration: "1h 5m", url: "https://www.youtube.com/results?search_query=purification+soul+tazkiyah+introduction+hamza+yusuf" },
];

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
            <p
              className="text-4xl md:text-5xl mb-3 leading-tight"
              style={{ fontFamily: "'Amiri', serif", color: "#d4af37" }}
              dir="rtl"
              lang="ar"
            >
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
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors group-hover:scale-110 duration-200"
                    style={{ background: "#1a472a" }}
                  >
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

        {/* Recent Lectures */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif font-bold text-foreground">Featured Lectures</h2>
            <Button variant="ghost" asChild className="text-primary text-sm">
              <Link href="/library">View all</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURED_LECTURES.map((lecture, i) => (
              <motion.a
                key={lecture.id}
                href={lecture.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                data-testid={`card-lecture-${lecture.id}`}
                className="group bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer hover:border-primary/30 block"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">{lecture.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{lecture.speaker}</p>
                  </div>
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <Play className="w-4 h-4 text-primary group-hover:text-primary-foreground ml-0.5" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{lecture.category}</Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto">{lecture.duration}</span>
                </div>
              </motion.a>
            ))}
          </div>
        </section>

        {/* Featured Courses */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif font-bold text-foreground">Featured Courses</h2>
            <Button variant="ghost" asChild className="text-primary text-sm">
              <Link href="/courses">View all</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STATIC_COURSES.slice(0, 3).map((course, i) => (
              <Link key={course.id} href={`/courses/${course.id}`} data-testid={`card-course-${course.id}`}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="group bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all hover:border-primary/30 cursor-pointer h-full"
                >
                  <div className="flex items-start justify-between mb-3">
                    <Badge className="text-[10px] bg-primary/10 text-primary border-0">{course.category}</Badge>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">{course.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{course.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{course.lectureCount} lectures</span>
                    <span className="truncate max-w-[120px]">{course.speakerName}</span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
