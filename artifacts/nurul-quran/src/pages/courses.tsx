import { useState } from "react";
import { BookOpen, Star, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { STATIC_COURSES } from "@/lib/courses-data";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = ["All", "Quran Recitation", "Tafseer", "Fiqh", "Aqeedah", "Hadith", "Spirituality", "Islamic History", "Word-to-Word"];

export default function Courses() {
  const [category, setCategory] = useState("All");

  const displayCourses = category === "All"
    ? STATIC_COURSES
    : STATIC_COURSES.filter(c => c.category === category);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Islamic Courses</h1>
        <p className="text-muted-foreground mb-2">Structured learning paths for Islamic knowledge</p>
        <div className="flex items-center gap-2 mb-8">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-sm text-emerald-700 font-medium">
            All {STATIC_COURSES.length} courses available free
          </span>
        </div>
      </motion.div>

      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              category === cat
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayCourses.map((course, i) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Link href={`/courses/${course.id}`}>
              <div className="group bg-card border border-emerald-200 rounded-xl p-6 transition-all flex flex-col h-full cursor-pointer hover:shadow-lg hover:border-emerald-400 ring-1 ring-emerald-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                    <BookOpen className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span className="text-[10px] bg-muted text-muted-foreground rounded px-2 py-0.5 font-medium">{course.level}</span>
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Free
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <Badge variant="secondary" className="text-[10px] mb-2">{course.category}</Badge>
                  <h3 className="font-semibold mb-2 line-clamp-2 text-base leading-snug text-foreground group-hover:text-emerald-700 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{course.description}</p>
                </div>

                <div className="flex items-center gap-1 mb-3">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-semibold text-foreground">{course.rating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground ml-1">· {course.students.toLocaleString()} students</span>
                </div>

                <div className="flex items-center justify-between mt-2 pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{course.lectureCount}</span> lectures
                  </div>
                  <p className="text-xs text-muted-foreground truncate max-w-[140px]">{course.speakerName}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
