import { useState } from "react";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useAuth } from "@/hooks/use-auth";
import { PremiumGate } from "@/components/premium-gate";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, BookOpen, Lock, Play, Pause, Clock,
  User, GraduationCap, Globe, Crown
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Lecture } from "@workspace/api-client-react";

interface CourseDetail {
  id: number;
  title: string;
  description: string | null;
  category: string;
  isPremium: boolean;
  lectureCount: number;
  thumbnailUrl: string | null;
  speakerId: number | null;
  speakerName: string | null;
  createdAt: string;
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

const CATEGORY_ICONS: Record<string, string> = {
  "Quran Recitation": "☪",
  "Tafseer": "📖",
  "Fiqh": "⚖️",
  "Aqeedah": "🕌",
  "Hadith": "📜",
  "Spirituality": "✨",
  "Islamic History": "🏛️",
  "Word-to-Word": "🔤",
};

const WHAT_YOU_LEARN: Record<string, string[]> = {
  "Quran Recitation": ["Proper Tajweed rules", "Makhaarij (articulation points)", "Sifaat of letters", "Practical recitation exercises"],
  "Tafseer": ["Arabic Quranic vocabulary", "Classical Tafseer methodology", "Historical context of revelations", "Applying Quranic lessons"],
  "Fiqh": ["Foundational rulings in Islamic law", "Evidence from Quran & Sunnah", "Scholarly consensus & differences", "Application in daily life"],
  "Aqeedah": ["The six pillars of Iman", "Names & Attributes of Allah", "Common misconceptions corrected", "Strengthening your conviction"],
  "Hadith": ["Hadith classification methodology", "Key Hadith collections", "Applying Prophetic Sunnah", "Hadith Sciences terminology"],
  "Spirituality": ["Purification of the heart", "Dhikr and worship routines", "Islamic ethics and character", "Overcoming spiritual hardships"],
  "Islamic History": ["Seerah of the Prophet ﷺ", "Companion biographies", "Early Islamic civilization", "Lessons for the modern Muslim"],
  "Word-to-Word": ["Arabic root word analysis", "Quranic grammar basics", "Building vocabulary systematically", "Understanding Quranic sentences"],
};

export default function CourseDetail() {
  const params = useParams<{ id: string }>();
  const courseId = parseInt(params.id ?? "0", 10);
  const { playLecture, currentLecture, isPlaying } = useAudioPlayer();
  const { isAuthenticated } = useAuth();
  const [premiumGate, setPremiumGate] = useState<{ title: string } | null>(null);

  const { data: course, isLoading: courseLoading } = useQuery<CourseDetail>({
    queryKey: ["course", courseId],
    queryFn: () => fetch(`/api/courses/${courseId}`).then(r => r.json()),
    enabled: !!courseId,
  });

  const { data: lectures, isLoading: lecturesLoading } = useQuery<Lecture[]>({
    queryKey: ["course-lectures", courseId],
    queryFn: () => fetch(`/api/courses/${courseId}/lectures`).then(r => r.json()),
    enabled: !!courseId,
  });

  const handlePlay = (lecture: Lecture) => {
    if (course?.isPremium && !isAuthenticated) {
      setPremiumGate({ title: lecture.title });
      return;
    }
    if (lecture.isPremium && !isAuthenticated) {
      setPremiumGate({ title: lecture.title });
      return;
    }
    playLecture(lecture);
  };

  if (courseLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="h-8 w-40 mb-6" />
        <Skeleton className="h-48 rounded-2xl mb-6" />
        <div className="space-y-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
        <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Course not found</h2>
        <p className="text-muted-foreground mb-6">This course may have been removed or doesn't exist.</p>
        <Button asChild variant="outline"><Link href="/courses"><ChevronLeft className="w-4 h-4 mr-1" /> Back to Courses</Link></Button>
      </div>
    );
  }

  const icon = CATEGORY_ICONS[course.category] ?? "📚";
  const learnings = WHAT_YOU_LEARN[course.category] ?? ["Comprehensive knowledge in this subject", "Practical application", "Authentic scholarship", "Structured curriculum"];

  return (
    <>
      <AnimatePresence>
        {premiumGate && (
          <PremiumGate lectureTitle={premiumGate.title} onClose={() => setPremiumGate(null)} />
        )}
      </AnimatePresence>

      <div className="container mx-auto max-w-4xl px-4 py-6 pb-40">
        {/* Back */}
        <Button variant="ghost" asChild className="mb-4 -ml-2">
          <Link href="/courses"><ChevronLeft className="w-4 h-4 mr-1" /> All Courses</Link>
        </Button>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl p-7 mb-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 text-[120px] leading-none opacity-10 select-none pr-4 pt-0">{icon}</div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 text-xs">{course.category}</Badge>
              {course.isPremium && (
                <Badge className="bg-secondary text-secondary-foreground text-xs gap-1">
                  <Crown className="w-3 h-3" /> Premium
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold mb-3 leading-snug">{course.title}</h1>
            {course.description && (
              <p className="text-primary-foreground/80 text-sm sm:text-base leading-relaxed mb-4">{course.description}</p>
            )}
            <div className="flex items-center gap-4 flex-wrap text-sm text-primary-foreground/70">
              {course.speakerName && (
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" /> {course.speakerName}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4" /> {lectures?.length ?? course.lectureCount} lectures
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="w-4 h-4" /> English / Urdu / Arabic
              </span>
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Lectures list */}
          <div className="md:col-span-2">
            <h2 className="text-lg font-serif font-bold text-foreground mb-4">Course Curriculum</h2>
            {lecturesLoading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : !lectures?.length ? (
              <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No lectures available yet for this course.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lectures.map((lecture, i) => {
                  const isCurrentlyPlaying = currentLecture?.id === lecture.id && isPlaying;
                  const isActive = currentLecture?.id === lecture.id;
                  return (
                    <motion.div
                      key={lecture.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer group ${
                        isActive
                          ? "bg-primary/5 border-primary/30"
                          : "bg-card border-border hover:border-primary/20 hover:bg-card/80"
                      }`}
                      onClick={() => handlePlay(lecture)}
                    >
                      {/* Track number / play icon */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isCurrentlyPlaying ? "bg-primary text-primary-foreground" : "bg-muted group-hover:bg-primary/10"
                      }`}>
                        {isCurrentlyPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : lecture.isPremium ? (
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <span className="text-xs font-mono text-muted-foreground group-hover:hidden">{i + 1}</span>
                        )}
                        {!isCurrentlyPlaying && !lecture.isPremium && (
                          <Play className="w-4 h-4 text-primary hidden group-hover:block ml-0.5" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium line-clamp-1 ${isActive ? "text-primary" : "text-foreground"}`}>
                          {lecture.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{lecture.language}</span>
                          {lecture.duration && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Clock className="w-3 h-3" /> {formatDuration(lecture.duration)}
                            </span>
                          )}
                          {lecture.isPremium && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-0">Premium</Badge>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* What you'll learn */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" /> What you'll learn
              </h3>
              <ul className="space-y-2">
                {learnings.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Enroll / Premium */}
            {course.isPremium ? (
              <div className="bg-primary text-primary-foreground rounded-xl p-5">
                <Crown className="w-6 h-6 text-secondary mb-2" />
                <h3 className="font-semibold mb-1">Premium Course</h3>
                <p className="text-sm text-primary-foreground/70 mb-4">Unlock this and all premium content for ₹999/month</p>
                <Button asChild variant="secondary" className="w-full font-semibold">
                  <Link href="/support"><Crown className="w-4 h-4 mr-1.5" /> Subscribe Now</Link>
                </Button>
              </div>
            ) : (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
                <BookOpen className="w-6 h-6 text-primary mb-2" />
                <h3 className="font-semibold text-foreground mb-1">Free Course</h3>
                <p className="text-sm text-muted-foreground mb-4">This course is freely available to all learners</p>
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                  onClick={() => lectures?.[0] && handlePlay(lectures[0])}
                  disabled={!lectures?.length}
                >
                  <Play className="w-4 h-4 mr-1.5" />
                  Start Learning
                </Button>
              </div>
            )}

            {/* Course stats */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              {[
                { label: "Lectures", value: lectures?.length ?? course.lectureCount },
                { label: "Category", value: course.category },
                { label: "Language", value: "Multi-language" },
                { label: "Level", value: "Beginner – Advanced" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
