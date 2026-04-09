import { useState } from "react";
import { useGetCourses } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Lock, BookOpen, Clock, Users, Star, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

const CATEGORIES = ["All", "Quran Recitation", "Tafseer", "Fiqh", "Aqeedah", "Hadith", "Spirituality", "Islamic History", "Word-to-Word"];

interface StaticCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  isPremium: boolean;
  lectureCount: number;
  speakerName: string;
  students: number;
  rating: number;
  level: string;
  freeUrl?: string;
}

const FREE_COURSE_ID = "quran-tajweed";

const STATIC_COURSES: StaticCourse[] = [
  {
    id: "quran-tajweed",
    title: "Quran Recitation with Tajweed",
    description: "Master the rules of Tajweed for beautiful, correct Quran recitation. Covers Makharij al-Huruf, Sifat, Noon Sakinah, Meem Sakinah, and Madd rules.",
    category: "Quran Recitation",
    isPremium: false,
    lectureCount: 24,
    speakerName: "Sheikh Yusuf Zidan",
    students: 3200,
    rating: 4.9,
    level: "Beginner",
    freeUrl: "https://www.youtube.com/playlist?list=PLGpnWMlkT8vQREMgwpY_OQVwqMHCOXhIe",
  },
  {
    id: "tafseer-juz-amma",
    title: "Tafseer of Juz Amma",
    description: "Deep explanation of the 30th Juz of the Quran. Learn the meaning, context, and lessons of the most commonly recited surahs in Salah.",
    category: "Tafseer",
    isPremium: true,
    lectureCount: 18,
    speakerName: "Dr. Bilal Philips",
    students: 4100,
    rating: 4.8,
    level: "Beginner",
  },
  {
    id: "fiqh-salah",
    title: "Fiqh of Salah — Complete Guide",
    description: "Complete Islamic jurisprudence of prayer — conditions, pillars, obligations, Sunnah acts, and invalidators. Based on classical Fiqh sources.",
    category: "Fiqh",
    isPremium: true,
    lectureCount: 16,
    speakerName: "Mufti Menk",
    students: 5800,
    rating: 4.9,
    level: "Beginner",
  },
  {
    id: "aqeedah-101",
    title: "Islamic Aqeedah: Pillars of Faith",
    description: "Comprehensive course on Islamic creed — belief in Allah, Angels, Books, Prophets, Day of Judgement, and Divine Decree (Qadar). Based on Aqeedah al-Wasitiyyah.",
    category: "Aqeedah",
    isPremium: true,
    lectureCount: 22,
    speakerName: "Sheikh Assim al-Hakeem",
    students: 2900,
    rating: 4.8,
    level: "Intermediate",
  },
  {
    id: "hadith-nawawi",
    title: "40 Hadith of Imam Nawawi",
    description: "Study the 40 most important hadith of Imam Nawawi — the foundational texts of Islamic ethics, worship, and character. Essential for every Muslim.",
    category: "Hadith",
    isPremium: true,
    lectureCount: 20,
    speakerName: "Sheikh Omar Suleiman",
    students: 6200,
    rating: 4.9,
    level: "All Levels",
  },
  {
    id: "tazkiyah-soul",
    title: "Purification of the Soul (Tazkiyah)",
    description: "Journey through Islamic spirituality — purify the heart from diseases like pride, envy, and anger. Based on Imam al-Ghazali's Ihya Ulum al-Din.",
    category: "Spirituality",
    isPremium: true,
    lectureCount: 28,
    speakerName: "Sheikh Hamza Yusuf",
    students: 3700,
    rating: 4.9,
    level: "Intermediate",
  },
  {
    id: "seerah-prophet",
    title: "Seerah: Life of the Prophet ﷺ",
    description: "Complete biography of Prophet Muhammad ﷺ from birth to his passing. Makkah period, Hijra, Madinah period, major battles, and lessons for modern Muslims.",
    category: "Islamic History",
    isPremium: true,
    lectureCount: 32,
    speakerName: "Sheikh Yasir Qadhi",
    students: 8100,
    rating: 5.0,
    level: "All Levels",
  },
  {
    id: "arabic-word-to-word",
    title: "Word-to-Word Quran Arabic",
    description: "Understand every word of the Quran in Arabic. Learn grammatical structures, root words, and vocabulary so you can understand Quran directly without translation.",
    category: "Word-to-Word",
    isPremium: true,
    lectureCount: 40,
    speakerName: "Dr. V. Abdur Rahim",
    students: 4400,
    rating: 4.8,
    level: "Beginner–Intermediate",
  },
  {
    id: "fiqh-zakat",
    title: "Fiqh of Zakat & Islamic Finance",
    description: "Master the rulings of Zakat, Sadaqah, and Islamic financial transactions. Includes halal investments, avoiding riba, and contemporary Fiqh issues.",
    category: "Fiqh",
    isPremium: true,
    lectureCount: 14,
    speakerName: "Sheikh Shafi Chowdhury",
    students: 2100,
    rating: 4.7,
    level: "Intermediate",
  },
  {
    id: "tafseer-ibn-katheer",
    title: "Tafseer Ibn Katheer — Selected Surahs",
    description: "In-depth Tafseer from the classical masterwork of Ibn Katheer. Covers Al-Baqarah, Al-Imran, Al-Kahf, Al-Mulk, and Yaseen with detailed commentary.",
    category: "Tafseer",
    isPremium: true,
    lectureCount: 36,
    speakerName: "Sheikh Imad Khalil",
    students: 2800,
    rating: 4.9,
    level: "Intermediate",
  },
  {
    id: "islamic-history-caliphs",
    title: "The Rightly Guided Caliphs",
    description: "History of Abu Bakr, Umar, Uthman, and Ali (RA) — their leadership, challenges, conquests, and lasting legacy for the Muslim ummah.",
    category: "Islamic History",
    isPremium: true,
    lectureCount: 20,
    speakerName: "Sheikh Abdul Nasir Jangda",
    students: 3500,
    rating: 4.8,
    level: "All Levels",
  },
  {
    id: "aqeedah-names-attributes",
    title: "99 Names of Allah — Deep Dive",
    description: "Explore the 99 beautiful names and attributes of Allah (Asmaul Husna). Understand their meaning, implications for worship, and how to incorporate them into daily life.",
    category: "Aqeedah",
    isPremium: true,
    lectureCount: 15,
    speakerName: "Sheikh Omar Suleiman",
    students: 4900,
    rating: 4.9,
    level: "Beginner",
  },
];

export default function Courses() {
  const [category, setCategory] = useState("All");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isPremiumUser = !!user?.isPremium;

  const { data: apiCourses, isLoading } = useGetCourses({
    category: category !== "All" ? category : undefined,
  });

  const filteredStatic = category === "All"
    ? STATIC_COURSES
    : STATIC_COURSES.filter(c => c.category === category);

  const hasApiData = apiCourses && apiCourses.length > 0;
  const courses = hasApiData ? apiCourses.filter(c => (c.lectureCount ?? 0) > 0) : null;
  const displayCourses = courses && courses.length > 0 ? courses : filteredStatic;
  const isStatic = !hasApiData;

  const handleCourseClick = (course: StaticCourse | typeof displayCourses[0]) => {
    if (!isStatic) {
      setLocation(`/courses/${course.id}`);
      return;
    }
    const sc = course as StaticCourse;
    if (!sc.isPremium) {
      if (sc.freeUrl) window.open(sc.freeUrl, "_blank", "noopener,noreferrer");
    } else {
      if (!isPremiumUser) {
        setLocation("/support");
      } else {
        setLocation("/support");
      }
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Islamic Courses</h1>
        <p className="text-muted-foreground mb-2">Structured learning paths for Islamic knowledge</p>
        <div className="flex items-center gap-2 mb-8">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-sm text-emerald-700 font-medium">
            1 free course available · Premium unlocks all {STATIC_COURSES.length} courses
          </span>
        </div>
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
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)
          : displayCourses.map((course, i) => {
              const isStaticCourse = isStatic;
              const lectureCount = course.lectureCount ?? 0;
              const speakerName = (course as any).speakerName;
              const students = (course as StaticCourse).students;
              const rating = (course as StaticCourse).rating;
              const level = (course as StaticCourse).level;
              const isFree = !course.isPremium;

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  data-testid={`card-course-${course.id}`}
                  onClick={() => isStatic && handleCourseClick(course)}
                  className={`group bg-card border rounded-xl p-6 transition-all flex flex-col h-full cursor-pointer hover:shadow-lg ${
                    isFree
                      ? "border-emerald-200 hover:border-emerald-400 ring-1 ring-emerald-100"
                      : "border-border hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      isFree ? "bg-emerald-50 group-hover:bg-emerald-100" : "bg-primary/10 group-hover:bg-primary/20"
                    }`}>
                      {isFree
                        ? <BookOpen className="w-6 h-6 text-emerald-600" />
                        : <Lock className="w-6 h-6 text-amber-500" />
                      }
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {level && (
                        <span className="text-[10px] bg-muted text-muted-foreground rounded px-2 py-0.5 font-medium">{level}</span>
                      )}
                      {isFree ? (
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Free
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 text-xs font-medium px-2.5 py-1 rounded-full">
                          <Lock className="w-3 h-3" />
                          Premium
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <Badge variant="secondary" className="text-[10px] mb-2">{course.category}</Badge>
                    <h3 className={`font-semibold mb-2 line-clamp-2 text-base leading-snug transition-colors ${
                      isFree ? "text-foreground group-hover:text-emerald-700" : "text-foreground group-hover:text-primary"
                    }`}>
                      {course.title}
                    </h3>
                    {course.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{course.description}</p>
                    )}
                  </div>

                  {isStaticCourse && rating && (
                    <div className="flex items-center gap-1 mb-3">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-semibold text-foreground">{rating.toFixed(1)}</span>
                      {students && (
                        <span className="text-xs text-muted-foreground ml-1">· {students.toLocaleString()} students</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2 pt-4 border-t border-border">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{lectureCount}</span> lectures
                    </div>
                    {speakerName && (
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">{speakerName}</p>
                    )}
                  </div>

                  <div
                    className={`mt-4 flex items-center gap-1.5 text-sm font-medium group-hover:gap-2.5 transition-all ${
                      isFree ? "text-emerald-700" : "text-amber-600"
                    }`}
                    data-testid={`button-enroll-${course.id}`}
                  >
                    {isFree ? (
                      <><BookOpen className="w-4 h-4" /> Start Learning — Free</>
                    ) : (
                      isPremiumUser
                        ? <><BookOpen className="w-4 h-4" /> View Course</>
                        : <><Lock className="w-4 h-4" /> Unlock with Premium</>
                    )}
                  </div>
                </motion.div>
              );
            })}
      </div>

      {displayCourses.length === 0 && !isLoading && (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No courses found in this category.</p>
        </div>
      )}
    </div>
  );
}
