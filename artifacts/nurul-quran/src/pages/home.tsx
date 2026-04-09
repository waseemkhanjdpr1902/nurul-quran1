import { useGetDailyAyah, useGetRecentLectures, useGetCourses, useGetDashboardSummary } from "@workspace/api-client-react";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Play, Lock, BookOpen, Users, MicVocal, LayoutGrid, Compass, ChevronRight, Clock, ScrollText, Star, BookMarked, CalendarDays, Languages } from "lucide-react";
import { motion } from "framer-motion";
import { HijriCalendar } from "@/components/hijri-calendar";
import { PrayerTimesWidget } from "@/components/prayer-times-widget";
import { useState, useEffect } from "react";

function formatDuration(seconds?: number | null) {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

interface HadithData {
  hadithnumber: number;
  text: string;
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

  if (loading) return <Skeleton className="h-32 rounded-2xl" />;

  if (!hadith) {
    return (
      <div className="rounded-2xl p-5 border border-border bg-card flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">Unable to load Hadith</p>
        <Link href="/hadith">
          <span className="text-xs font-semibold" style={{ color: "#1a472a" }}>
            Browse Hadiths →
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 border-2"
      style={{ borderColor: "#d4af37", background: "linear-gradient(135deg, #1a472a08, #d4af3710)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <ScrollText className="h-4 w-4" style={{ color: "#1a472a" }} />
        <span className="text-sm font-semibold" style={{ color: "#1a472a" }}>
          Sahih Bukhari
        </span>
        <span className="text-xs text-muted-foreground ml-auto">#{hadith.hadithnumber}</span>
      </div>
      <p className="text-sm text-foreground leading-relaxed line-clamp-4">{hadith.text}</p>
      <div className="mt-3 flex justify-end">
        <Link href="/hadith">
          <span className="text-xs font-semibold" style={{ color: "#1a472a" }}>
            Browse more →
          </span>
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

export default function Home() {
  const { data: ayah, isLoading: ayahLoading } = useGetDailyAyah();
  const { data: recentLectures, isLoading: recentLoading } = useGetRecentLectures({ limit: 6 });
  const { data: courses, isLoading: coursesLoading } = useGetCourses();
  const { data: summary } = useGetDashboardSummary();
  const { playLecture } = useAudioPlayer();

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
            {ayahLoading ? (
              <div className="space-y-3 max-w-2xl mx-auto">
                <Skeleton className="h-12 w-3/4 mx-auto bg-primary-foreground/10" />
                <Skeleton className="h-4 w-full bg-primary-foreground/10" />
              </div>
            ) : ayah ? (
              <>
                <p
                  className="text-3xl md:text-5xl mb-4 leading-[1.8] text-primary-foreground/95"
                  dir="rtl"
                  lang="ar"
                  style={{ fontFamily: "'Amiri Quran', 'Scheherazade New', serif" }}
                  data-testid="text-arabic-ayah"
                >
                  {ayah.arabicText}
                </p>
                <p className="text-base md:text-xl text-primary-foreground/80 mb-2 italic max-w-2xl mx-auto" data-testid="text-ayah-translation">
                  "{ayah.translation}"
                </p>
                <p className="text-primary-foreground/50 text-sm" data-testid="text-ayah-reference">
                  — {ayah.reference}
                </p>
              </>
            ) : null}
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      {summary && (
        <section className="border-b bg-card">
          <div className="container mx-auto max-w-6xl px-4 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Lectures", value: summary.totalLectures, icon: MicVocal },
                { label: "Courses", value: summary.totalCourses, icon: BookOpen },
                { label: "Scholars", value: summary.totalSpeakers, icon: Users },
                { label: "Listeners", value: summary.totalListeners.toLocaleString(), icon: LayoutGrid },
              ].map(({ label, value, icon: Icon }) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
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
      )}

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
            <h2 className="text-2xl font-serif font-bold text-foreground">Recent Lectures</h2>
            <Button variant="ghost" asChild className="text-primary text-sm">
              <Link href="/library">View all</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))
              : recentLectures?.map((lecture, i) => (
                  <motion.div
                    key={lecture.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    data-testid={`card-lecture-${lecture.id}`}
                    className="group bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer hover:border-primary/30"
                    onClick={() => !lecture.isPremium && playLecture(lecture)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="font-semibold text-sm text-foreground truncate">{lecture.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{lecture.speakerName}</p>
                      </div>
                      {lecture.isPremium ? (
                        <div className="shrink-0 w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <Lock className="w-4 h-4 text-amber-500" />
                        </div>
                      ) : (
                        <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                          <Play className="w-4 h-4 text-primary group-hover:text-primary-foreground ml-0.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{lecture.category}</Badge>
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5">{lecture.language}</Badge>
                      {lecture.duration && <span className="text-[10px] text-muted-foreground ml-auto">{formatDuration(lecture.duration)}</span>}
                    </div>
                  </motion.div>
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
            {coursesLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 rounded-xl" />
                ))
              : courses?.slice(0, 3).map((course, i) => (
                  <Link key={course.id} href={`/courses/${course.id}`} data-testid={`card-course-${course.id}`}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="group bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all hover:border-primary/30 cursor-pointer h-full"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <Badge className="text-[10px] bg-primary/10 text-primary border-0">{course.category}</Badge>
                        {course.isPremium && <Lock className="w-4 h-4 text-amber-500" />}
                      </div>
                      <h3 className="font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">{course.title}</h3>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{course.description}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{course.lectureCount} lectures</span>
                        {course.speakerName && <span className="truncate">{course.speakerName}</span>}
                      </div>
                    </motion.div>
                  </Link>
                ))}
          </div>
        </section>

        {/* Support CTA */}
        <section>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center"
          >
            <h2 className="text-2xl font-serif font-bold text-primary mb-2">Support Islamic Education</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Your Islamic Learning Fee helps us maintain and expand free access to authentic Islamic knowledge for Muslims worldwide.
            </p>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8" data-testid="button-support">
              <Link href="/support">Support Nurul Quran</Link>
            </Button>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
