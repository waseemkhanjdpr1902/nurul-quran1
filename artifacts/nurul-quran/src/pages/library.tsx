import { useState } from "react";
import { motion } from "framer-motion";
import { PlayCircle, ExternalLink, BookOpen, Clock, Star, Filter } from "lucide-react";

const LECTURES = [
  {
    id: 1,
    title: "Arabic Alphabet — Complete Beginner Guide",
    speaker: "Sheikh Yasir Qadhi",
    duration: "45 min",
    category: "Arabic",
    level: "Beginner",
    rating: 4.9,
    views: "2.1M",
    thumbnail: "https://img.youtube.com/vi/6V9JN8UR5xw/mqdefault.jpg",
    youtubeId: "6V9JN8UR5xw",
  },
  {
    id: 2,
    title: "How to Read Quran — Tajweed for Beginners",
    speaker: "Sheikh Mishary Alafasy",
    duration: "38 min",
    category: "Quran",
    level: "Beginner",
    rating: 4.8,
    views: "1.8M",
    thumbnail: "https://img.youtube.com/vi/pIGSrUBFHks/mqdefault.jpg",
    youtubeId: "pIGSrUBFHks",
  },
  {
    id: 3,
    title: "Surah Al-Fatiha — Meaning & Tafseer",
    speaker: "Nouman Ali Khan",
    duration: "52 min",
    category: "Tafseer",
    level: "Beginner",
    rating: 4.9,
    views: "3.2M",
    thumbnail: "https://img.youtube.com/vi/0X7PfDIQHEQ/mqdefault.jpg",
    youtubeId: "0X7PfDIQHEQ",
  },
  {
    id: 4,
    title: "The 99 Names of Allah — Al-Asma Al-Husna",
    speaker: "Sheikh Omar Suleiman",
    duration: "1h 20 min",
    category: "Aqeedah",
    level: "Beginner",
    rating: 4.9,
    views: "980K",
    thumbnail: "https://img.youtube.com/vi/VL5pzY69rV4/mqdefault.jpg",
    youtubeId: "VL5pzY69rV4",
  },
  {
    id: 5,
    title: "Five Pillars of Islam Explained",
    speaker: "Sheikh Yasir Qadhi",
    duration: "1h 5 min",
    category: "Aqeedah",
    level: "Beginner",
    rating: 4.8,
    views: "1.4M",
    thumbnail: "https://img.youtube.com/vi/LNuzNaFJ9LU/mqdefault.jpg",
    youtubeId: "LNuzNaFJ9LU",
  },
  {
    id: 6,
    title: "Life of Prophet Muhammad ﷺ — Seerah Series",
    speaker: "Sheikh Omar Suleiman",
    duration: "55 min",
    category: "Seerah",
    level: "Intermediate",
    rating: 4.9,
    views: "2.5M",
    thumbnail: "https://img.youtube.com/vi/1LtNRrNmCH0/mqdefault.jpg",
    youtubeId: "1LtNRrNmCH0",
  },
  {
    id: 7,
    title: "Understanding Salah — The Prayer",
    speaker: "Nouman Ali Khan",
    duration: "42 min",
    category: "Fiqh",
    level: "Beginner",
    rating: 4.8,
    views: "1.1M",
    thumbnail: "https://img.youtube.com/vi/1e0aXkqGPX0/mqdefault.jpg",
    youtubeId: "1e0aXkqGPX0",
  },
  {
    id: 8,
    title: "Surah Yasin — Full Recitation with Translation",
    speaker: "Sheikh Mishary Alafasy",
    duration: "30 min",
    category: "Quran",
    level: "All Levels",
    rating: 5.0,
    views: "8.4M",
    thumbnail: "https://img.youtube.com/vi/HtG1ESXTE5E/mqdefault.jpg",
    youtubeId: "HtG1ESXTE5E",
  },
  {
    id: 9,
    title: "Islamic Ethics & Morality in Daily Life",
    speaker: "Sheikh Hamza Yusuf",
    duration: "1h 10 min",
    category: "Spirituality",
    level: "Intermediate",
    rating: 4.8,
    views: "760K",
    thumbnail: "https://img.youtube.com/vi/oJGfJXQ2hU4/mqdefault.jpg",
    youtubeId: "oJGfJXQ2hU4",
  },
  {
    id: 10,
    title: "Introduction to Arabic Grammar",
    speaker: "Nouman Ali Khan",
    duration: "1h 30 min",
    category: "Arabic",
    level: "Beginner",
    rating: 4.9,
    views: "1.7M",
    thumbnail: "https://img.youtube.com/vi/cduqa_z-gS0/mqdefault.jpg",
    youtubeId: "cduqa_z-gS0",
  },
  {
    id: 11,
    title: "Hadith Sciences — Introduction",
    speaker: "Sheikh Yasir Qadhi",
    duration: "58 min",
    category: "Hadith",
    level: "Intermediate",
    rating: 4.7,
    views: "540K",
    thumbnail: "https://img.youtube.com/vi/FKZrCkCfSSc/mqdefault.jpg",
    youtubeId: "FKZrCkCfSSc",
  },
  {
    id: 12,
    title: "Ramadan — Spiritual Preparation",
    speaker: "Sheikh Omar Suleiman",
    duration: "35 min",
    category: "Spirituality",
    level: "All Levels",
    rating: 4.9,
    views: "2.2M",
    thumbnail: "https://img.youtube.com/vi/SniRMLYGkJI/mqdefault.jpg",
    youtubeId: "SniRMLYGkJI",
  },
  {
    id: 13,
    title: "Tafseer of Juz Amma — Short Surahs Explained",
    speaker: "Nouman Ali Khan",
    duration: "2h 15 min",
    category: "Tafseer",
    level: "Beginner",
    rating: 4.9,
    views: "3.8M",
    thumbnail: "https://img.youtube.com/vi/iJN7dHspIAs/mqdefault.jpg",
    youtubeId: "iJN7dHspIAs",
  },
  {
    id: 14,
    title: "Fiqh of Zakah — Charity in Islam",
    speaker: "Sheikh Yasir Qadhi",
    duration: "47 min",
    category: "Fiqh",
    level: "Intermediate",
    rating: 4.7,
    views: "430K",
    thumbnail: "https://img.youtube.com/vi/OzHWHFI3VY4/mqdefault.jpg",
    youtubeId: "OzHWHFI3VY4",
  },
  {
    id: 15,
    title: "Death & the Afterlife in Islam",
    speaker: "Sheikh Omar Suleiman",
    duration: "1h 25 min",
    category: "Aqeedah",
    level: "All Levels",
    rating: 4.9,
    views: "1.9M",
    thumbnail: "https://img.youtube.com/vi/LjUcMeta5tA/mqdefault.jpg",
    youtubeId: "LjUcMeta5tA",
  },
  {
    id: 16,
    title: "Quran Memorisation Techniques",
    speaker: "Sheikh Mishary Alafasy",
    duration: "40 min",
    category: "Quran",
    level: "All Levels",
    rating: 4.8,
    views: "1.2M",
    thumbnail: "https://img.youtube.com/vi/JN3aSzNB7bU/mqdefault.jpg",
    youtubeId: "JN3aSzNB7bU",
  },
  {
    id: 17,
    title: "Women in Islam — Rights & Status",
    speaker: "Sheikh Hamza Yusuf",
    duration: "1h 0 min",
    category: "Spirituality",
    level: "All Levels",
    rating: 4.8,
    views: "870K",
    thumbnail: "https://img.youtube.com/vi/W0pOWdGfbJU/mqdefault.jpg",
    youtubeId: "W0pOWdGfbJU",
  },
  {
    id: 18,
    title: "Islamic History — Rise of the Muslim Civilisation",
    speaker: "Sheikh Yasir Qadhi",
    duration: "1h 45 min",
    category: "History",
    level: "Intermediate",
    rating: 4.9,
    views: "1.1M",
    thumbnail: "https://img.youtube.com/vi/QpJJQpnHR50/mqdefault.jpg",
    youtubeId: "QpJJQpnHR50",
  },
];

const CATEGORIES = ["All", "Quran", "Tafseer", "Arabic", "Aqeedah", "Fiqh", "Hadith", "Seerah", "Spirituality", "History"];
const LEVELS = ["All Levels", "Beginner", "Intermediate"];

export default function Library() {
  const [category, setCategory] = useState("All");
  const [level, setLevel] = useState("All Levels");
  const [playing, setPlaying] = useState<number | null>(null);

  const filtered = LECTURES.filter((l) => {
    const matchCat = category === "All" || l.category === category;
    const matchLevel = level === "All Levels" || l.level === level || l.level === "All Levels";
    return matchCat && matchLevel;
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Islamic Lecture Library</h1>
        <p className="text-muted-foreground mb-1">
          {LECTURES.length} free lectures from world-renowned Islamic scholars
        </p>
        <p className="text-sm text-emerald-700 font-medium flex items-center gap-2">
          <PlayCircle className="w-4 h-4" />
          Watch directly — no account needed
        </p>
      </motion.div>

      {/* Filters */}
      <div className="space-y-3 mb-8">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                category === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                level === l
                  ? "bg-emerald-600 text-white"
                  : "bg-card border border-border text-muted-foreground hover:border-emerald-400"
              }`}
            >
              <Filter className="w-3 h-3" />
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((lecture, i) => (
          <motion.div
            key={lecture.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-emerald-300 transition-all"
          >
            {/* Thumbnail / Player */}
            <div className="relative aspect-video bg-black overflow-hidden">
              {playing === lecture.id ? (
                <iframe
                  src={`https://www.youtube.com/embed/${lecture.youtubeId}?autoplay=1`}
                  title={lecture.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (
                <>
                  <img
                    src={lecture.thumbnail}
                    alt={lecture.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/320x180/0D4A3E/white?text=${encodeURIComponent(lecture.category)}`;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setPlaying(lecture.id)}
                      className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                    >
                      <PlayCircle className="w-8 h-8 text-emerald-700 fill-emerald-700" />
                    </button>
                  </div>
                  {/* Duration badge */}
                  <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {lecture.duration}
                  </div>
                </>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                  {lecture.category}
                </span>
                <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {lecture.level}
                </span>
              </div>

              <h3 className="font-semibold text-sm text-foreground leading-snug mb-1 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                {lecture.title}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">{lecture.speaker}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-semibold">{lecture.rating}</span>
                  <span className="text-xs text-muted-foreground">· {lecture.views} views</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPlaying(playing === lecture.id ? null : lecture.id)}
                    className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    {playing === lecture.id ? "Close" : "Watch"}
                  </button>
                  <a
                    href={`https://www.youtube.com/watch?v=${lecture.youtubeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    YouTube
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No lectures found for this filter.</p>
        </div>
      )}
    </div>
  );
}
