import { useState } from "react";
import { useParams, Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ChevronLeft, BookOpen, Play, Clock,
  GraduationCap, Globe, Users, Star,
  Youtube, ExternalLink, CheckCircle2,
} from "lucide-react";
import { STATIC_COURSES, WHAT_YOU_LEARN } from "@/lib/courses-data";

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

export default function CourseDetail() {
  const params = useParams<{ id: string }>();
  const courseId = params.id ?? "";
  const [showAll, setShowAll] = useState(false);

  const course = STATIC_COURSES.find(c => c.id === courseId);

  if (!course) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
        <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Course not found</h2>
        <p className="text-muted-foreground mb-6">This course may have been removed or doesn't exist.</p>
        <Button asChild variant="outline">
          <Link href="/courses"><ChevronLeft className="w-4 h-4 mr-1" /> Back to Courses</Link>
        </Button>
      </div>
    );
  }

  const icon = CATEGORY_ICONS[course.category] ?? "📚";
  const learnings = WHAT_YOU_LEARN[course.category] ?? [
    "Comprehensive knowledge in this subject",
    "Practical application",
    "Authentic scholarship",
    "Structured curriculum",
  ];

  const visibleModules = showAll ? course.modules : course.modules.slice(0, 8);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 pb-40">
      <Button variant="ghost" asChild className="mb-4 -ml-2">
        <Link href="/courses"><ChevronLeft className="w-4 h-4 mr-1" /> All Courses</Link>
      </Button>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl p-7 mb-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 text-[120px] leading-none opacity-10 select-none pr-4">{icon}</div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 text-xs">{course.category}</Badge>
            <Badge className="bg-emerald-400/20 text-emerald-100 border-0 text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Free
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold mb-3 leading-snug">{course.title}</h1>
          <p className="text-primary-foreground/80 text-sm sm:text-base leading-relaxed mb-4">{course.description}</p>
          <div className="flex items-center gap-4 flex-wrap text-sm text-primary-foreground/70">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4" /> {course.speakerName}
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" /> {course.lectureCount} lectures
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {course.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" /> {course.students.toLocaleString()} students
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4" /> {course.level}
            </span>
          </div>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Modules list */}
        <div className="md:col-span-2">
          <h2 className="text-lg font-serif font-bold text-foreground mb-4">Course Curriculum</h2>
          <div className="space-y-2">
            {visibleModules.map((module, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:border-primary/20 transition-all"
              >
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <span className="text-xs font-mono text-muted-foreground">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-1">{module}</p>
                </div>
                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </motion.div>
            ))}
          </div>

          {course.modules.length > 8 && (
            <button
              onClick={() => setShowAll(s => !s)}
              className="mt-4 w-full py-3 rounded-xl border border-dashed border-primary/30 text-sm font-medium text-primary hover:bg-primary/5 transition-all"
            >
              {showAll
                ? "Show less"
                : `Show all ${course.modules.length} modules`}
            </button>
          )}

          {/* Watch on YouTube CTA */}
          <div className="mt-8 p-5 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-start gap-3">
              <Youtube className="w-6 h-6 text-red-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Watch this course for free</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  All lectures from <strong>{course.speakerName}</strong> are freely available on YouTube.
                  Click below to start watching — no login or subscription required.
                </p>
                <Button
                  asChild
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <a href={course.freeUrl} target="_blank" rel="noopener noreferrer">
                    <Youtube className="w-4 h-4 mr-2" />
                    Watch on YouTube
                    <ExternalLink className="w-3.5 h-3.5 ml-2 opacity-70" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Start Learning */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
            <BookOpen className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold text-foreground mb-1">Free Course</h3>
            <p className="text-sm text-muted-foreground mb-4">All content is freely available — no sign-up needed.</p>
            <Button asChild className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold">
              <a href={course.freeUrl} target="_blank" rel="noopener noreferrer">
                <Play className="w-4 h-4 mr-1.5" /> Start Learning Free
              </a>
            </Button>
          </div>

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

          {/* Course stats */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            {[
              { label: "Lectures", value: course.lectureCount },
              { label: "Category", value: course.category },
              { label: "Level", value: course.level },
              { label: "Instructor", value: course.speakerName },
              { label: "Rating", value: `${course.rating.toFixed(1)} ★` },
              { label: "Students", value: course.students.toLocaleString() },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-foreground text-right max-w-[140px] truncate">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
