import { useState } from "react";
import { useGetCourses } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Lock, BookOpen, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

const CATEGORIES = ["All", "Quran Recitation", "Tafseer", "Fiqh", "Aqeedah", "Hadith", "Spirituality", "Islamic History", "Word-to-Word"];

export default function Courses() {
  const [category, setCategory] = useState("All");

  const { data: allCourses, isLoading } = useGetCourses({
    category: category !== "All" ? category : undefined,
  });

  // Only show courses that have actual content
  const courses = allCourses?.filter(c => (c.lectureCount ?? 0) > 0);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Islamic Courses</h1>
        <p className="text-muted-foreground mb-8">Structured learning paths for Islamic knowledge</p>
      </motion.div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            data-testid={`button-category-${cat.toLowerCase().replace(/\s+/g, '-')}`}
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
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)
          : courses?.map((course, i) => {
              const hasContent = true;

              const Card = (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`group bg-card border border-border rounded-xl p-6 transition-all flex flex-col h-full ${
                    hasContent
                      ? "hover:shadow-lg hover:border-primary/30 cursor-pointer"
                      : "opacity-60 cursor-default"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      hasContent ? "bg-primary/10 group-hover:bg-primary/20" : "bg-muted"
                    }`}>
                      <BookOpen className={`w-6 h-6 ${hasContent ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!hasContent && (
                        <div className="flex items-center gap-1 bg-muted text-muted-foreground text-xs font-medium px-2.5 py-1 rounded-full">
                          <Clock className="w-3 h-3" />
                          Coming Soon
                        </div>
                      )}
                      {course.isPremium && hasContent && (
                        <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 text-xs font-medium px-2.5 py-1 rounded-full">
                          <Lock className="w-3 h-3" />
                          Premium
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <Badge variant="secondary" className="text-[10px] mb-2">{course.category}</Badge>
                    <h3 className={`font-semibold mb-2 line-clamp-2 text-base leading-snug ${
                      hasContent ? "text-foreground group-hover:text-primary transition-colors" : "text-muted-foreground"
                    }`}>
                      {course.title}
                    </h3>
                    {course.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{course.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <div className="text-sm text-muted-foreground">
                      {hasContent ? (
                        <><span className="font-medium text-foreground">{course.lectureCount}</span> lectures</>
                      ) : (
                        <span className="italic text-xs">Curriculum in preparation</span>
                      )}
                    </div>
                    {course.speakerName && hasContent && (
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">{course.speakerName}</p>
                    )}
                  </div>

                  {hasContent && (
                    <div
                      className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2.5 transition-all"
                      data-testid={`button-enroll-${course.id}`}
                    >
                      {course.isPremium ? (
                        <><Lock className="w-4 h-4" /> View Course</>
                      ) : (
                        <><BookOpen className="w-4 h-4" /> Start Learning</>
                      )}
                    </div>
                  )}
                </motion.div>
              );

              return hasContent ? (
                <Link key={course.id} href={`/courses/${course.id}`} data-testid={`card-course-${course.id}`}>
                  {Card}
                </Link>
              ) : (
                <div key={course.id} data-testid={`card-course-${course.id}`}>
                  {Card}
                </div>
              );
            })}
      </div>

      {courses?.length === 0 && !isLoading && (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No courses found in this category.</p>
        </div>
      )}
    </div>
  );
}
