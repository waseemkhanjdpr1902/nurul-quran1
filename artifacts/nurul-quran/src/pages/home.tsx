import { useGetDailyAyah, useGetRecentLectures, useGetFeaturedLectures, useGetCourses, useGetDashboardSummary } from "@workspace/api-client-react";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Play, Lock, BookOpen, Users, MicVocal, LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";

function formatDuration(seconds?: number | null) {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

export default function Home() {
  const { data: ayah, isLoading: ayahLoading } = useGetDailyAyah();
  const { data: recentLectures, isLoading: recentLoading } = useGetRecentLectures({ limit: 6 });
  const { data: featuredLectures, isLoading: featuredLoading } = useGetFeaturedLectures();
  const { data: courses, isLoading: coursesLoading } = useGetCourses();
  const { data: summary } = useGetDashboardSummary();
  const { playLecture } = useAudioPlayer();

  return (
    <div className="min-h-screen">
      {/* Hero / Daily Ayah */}
      <section className="bg-primary text-primary-foreground py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-4 right-8 text-[200px] font-arabic leading-none select-none">﷽</div>
        </div>
        <div className="container mx-auto max-w-4xl px-4 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-primary-foreground/60 text-sm font-medium uppercase tracking-widest mb-6">Ayah of the Day</p>
            {ayahLoading ? (
              <div className="space-y-3 max-w-2xl mx-auto">
                <Skeleton className="h-12 w-3/4 mx-auto bg-primary-foreground/10" />
                <Skeleton className="h-4 w-full bg-primary-foreground/10" />
              </div>
            ) : ayah ? (
              <>
                <p
                  className="text-4xl md:text-6xl mb-6 leading-[1.6] text-primary-foreground/95"
                  dir="rtl"
                  lang="ar"
                  style={{ fontFamily: "'Amiri Quran', 'Scheherazade New', serif" }}
                  data-testid="text-arabic-ayah"
                >
                  {ayah.arabicText}
                </p>
                <p className="text-lg md:text-xl text-primary-foreground/80 mb-3 italic max-w-2xl mx-auto" data-testid="text-ayah-translation">
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
              Your donations help us maintain and expand free access to authentic Islamic knowledge for Muslims worldwide.
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
