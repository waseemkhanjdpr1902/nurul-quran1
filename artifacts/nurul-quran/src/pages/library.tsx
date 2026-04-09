import { useState, useEffect } from "react";
import { useGetLectures } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Heart, ChevronRight, ChevronLeft, Youtube, ExternalLink } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type CategoryDef = { label: string; value: string; color: string; bg: string; border: string };

const CATEGORIES: CategoryDef[] = [
  { label: "All",            value: "All",            color: "#0D4A3E", bg: "#E0F2EE", border: "#9CCCC4" },
  { label: "Arabic",         value: "Arabic",         color: "#9F1239", bg: "#FFE4E6", border: "#FDA4AF" },
  { label: "Quranic Arabic", value: "Quranic Arabic", color: "#1E40AF", bg: "#DBEAFE", border: "#93C5FD" },
  { label: "Arabic Grammar", value: "Arabic Grammar", color: "#6B21A8", bg: "#F3E8FF", border: "#C4B5FD" },
];

const PAGE_SIZE = 9;

interface StaticLecture {
  id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  speakerName: string;
  thumbnailUrl: string;
  youtubeUrl: string;
  duration: number;
  isPremium: boolean;
}

const STATIC_LECTURES: StaticLecture[] = [
  {
    id: "sl-1",
    title: "Arabic Alphabet for Beginners — Full Course",
    description: "Learn all 28 Arabic letters from scratch with proper pronunciation, writing, and recognition. Perfect for absolute beginners.",
    category: "Arabic",
    language: "English",
    speakerName: "Arabic with Safaa",
    thumbnailUrl: "https://img.youtube.com/vi/I4JpIxGKedQ/hqdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=I4JpIxGKedQ",
    duration: 3240,
    isPremium: false,
  },
  {
    id: "sl-2",
    title: "Learn Arabic in 30 Minutes — Basics",
    description: "A comprehensive Arabic basics lesson covering greetings, numbers, common phrases, and essential vocabulary for beginners.",
    category: "Arabic",
    language: "English",
    speakerName: "ArabicPod101",
    thumbnailUrl: "https://img.youtube.com/vi/m0qVUKGv_GQ/hqdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=m0qVUKGv_GQ",
    duration: 1800,
    isPremium: false,
  },
  {
    id: "sl-3",
    title: "Quranic Arabic — Lesson 1: Introduction",
    description: "Start your journey understanding the Quran directly in Arabic. Learn root words, verb patterns, and Quranic vocabulary.",
    category: "Quranic Arabic",
    language: "English",
    speakerName: "Bayyinah Institute",
    thumbnailUrl: "https://img.youtube.com/vi/rMaGQI3ZBZQ/hqdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=rMaGQI3ZBZQ",
    duration: 2700,
    isPremium: false,
  },
  {
    id: "sl-4",
    title: "Arabic Grammar: Nouns & Gender (Ism, Mudhakkar, Mu'annath)",
    description: "Master Arabic noun gender rules — masculine and feminine forms, how they affect adjectives, and common exceptions in everyday Arabic.",
    category: "Arabic Grammar",
    language: "English",
    speakerName: "Learn Arabic with Maha",
    thumbnailUrl: "https://img.youtube.com/vi/aOYvDUmvRj0/hqdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=aOYvDUmvRj0",
    duration: 1620,
    isPremium: false,
  },
  {
    id: "sl-5",
    title: "Understand 50% of Quran in 9 Hours — Word to Word",
    description: "Learn the most frequently occurring words in the Quran. With just 125 words you can understand half of the Quran.",
    category: "Quranic Arabic",
    language: "English",
    speakerName: "Understand Quran Academy",
    thumbnailUrl: "https://img.youtube.com/vi/moxSEpnOyFI/hqdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=moxSEpnOyFI",
    duration: 32400,
    isPremium: false,
  },
  {
    id: "sl-6",
    title: "Arabic Verb Conjugation — Past, Present, Future",
    description: "Complete guide to Arabic verb conjugation across all tenses and persons. Includes the three-letter root system (فعل).",
    category: "Arabic Grammar",
    language: "English",
    speakerName: "Arabic Unlocked",
    thumbnailUrl: "https://img.youtube.com/vi/6Ax2JFRgLaQ/hqdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=6Ax2JFRgLaQ",
    duration: 2100,
    isPremium: false,
  },
  {
    id: "sl-7",
    title: "Arabic Pronunciation Masterclass — Makharij al-Huruf",
    description: "Master the correct pronunciation of Arabic letters, including the 'heavy' and 'light' sounds, throat letters, and sun/moon letters.",
    category: "Arabic",
    language: "English",
    speakerName: "Sheikh Wisam Sharieff",
    thumbnailUrl: "https://img.youtube.com/vi/zIbWlCXOQeQ/hqdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=zIbWlCXOQeQ",
    duration: 3600,
    isPremium: false,
  },
  {
    id: "sl-8",
    title: "Quranic Arabic: Root Words & Derivations",
    description: "The Arabic root system explained — how 3-letter roots generate dozens of related words. Essential for understanding the Quran deeply.",
    category: "Quranic Arabic",
    language: "English",
    speakerName: "Nouman Ali Khan",
    thumbnailUrl: "https://img.youtube.com/vi/0CRdZvOJcNc/hqdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=0CRdZvOJcNc",
    duration: 4200,
    isPremium: false,
  },
  {
    id: "sl-9",
    title: "Arabic Sentence Structure — Jumlah Ismiyyah & Fi'liyyah",
    description: "Learn how Arabic sentences are built — nominal sentences (Jumlah Ismiyyah) vs verbal sentences (Jumlah Fi'liyyah) with clear examples.",
    category: "Arabic Grammar",
    language: "English",
    speakerName: "Arabic with Sam",
    thumbnailUrl: "https://img.youtube.com/vi/F95XnMGklGE/hqdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=F95XnMGklGE",
    duration: 1980,
    isPremium: false,
  },
  {
    id: "sl-10",
    title: "Daily Arabic Conversations — 100 Essential Phrases",
    description: "Practical Arabic for everyday use — shopping, greetings, directions, emotions, and more. With male and female forms for each phrase.",
    category: "Arabic",
    language: "English",
    speakerName: "Learn Arabic with Maha",
    thumbnailUrl: "https://img.youtube.com/vi/kbMeGMVuanE/hqdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=kbMeGMVuanE",
    duration: 5400,
    isPremium: false,
  },
  {
    id: "sl-11",
    title: "Quranic Vocabulary: 100 Most Common Words",
    description: "Memorise the 100 most repeated words in the Quran with meaning, pronunciation, and example verses from the Quran.",
    category: "Quranic Arabic",
    language: "English",
    speakerName: "Quran Revolution",
    thumbnailUrl: "https://img.youtube.com/vi/3D3MpEFcgbU/hqdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=3D3MpEFcgbU",
    duration: 7200,
    isPremium: false,
  },
  {
    id: "sl-12",
    title: "Arabic Plurals — Sound & Broken Plural Forms",
    description: "Arabic plural forms explained clearly — sound masculine plural, sound feminine plural, and the unique 'broken plural' patterns.",
    category: "Arabic Grammar",
    language: "English",
    speakerName: "Arabic Unlocked",
    thumbnailUrl: "https://img.youtube.com/vi/8RbqbhNH4Kk/hqdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=8RbqbhNH4Kk",
    duration: 2400,
    isPremium: false,
  },
  {
    id: "sl-13",
    title: "Learn to Write Arabic Script — Beginner Handwriting",
    description: "Step-by-step handwriting guide for all Arabic letters in their initial, medial, final, and isolated forms. Great for children and adults.",
    category: "Arabic",
    language: "English",
    speakerName: "Arabic with Safaa",
    thumbnailUrl: "https://img.youtube.com/vi/WFBXIBhWnwM/hqdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=WFBXIBhWnwM",
    duration: 2700,
    isPremium: false,
  },
  {
    id: "sl-14",
    title: "Tajweed Rules — Noon Sakinah & Tanween",
    description: "Complete lesson on the four rules of Noon Sakinah and Tanween: Ith-har, Idgham, Iqlab, and Ikhfa with Quranic examples.",
    category: "Quranic Arabic",
    language: "English",
    speakerName: "Sheikh Wisam Sharieff",
    thumbnailUrl: "https://img.youtube.com/vi/Kf6BmDEpvEE/hqdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=Kf6BmDEpvEE",
    duration: 3300,
    isPremium: false,
  },
  {
    id: "sl-15",
    title: "Arabic Prepositions — Huroof al-Jarr",
    description: "Learn all Arabic prepositions (fi, ala, ila, min, bi, li, an, etc.) with their meanings, usage in sentences, and Quranic examples.",
    category: "Arabic Grammar",
    language: "English",
    speakerName: "Nouman Ali Khan",
    thumbnailUrl: "https://img.youtube.com/vi/JBqsaRFSFwI/hqdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=JBqsaRFSFwI",
    duration: 2880,
    isPremium: false,
  },
  {
    id: "sl-16",
    title: "Egyptian Arabic vs Modern Standard Arabic (MSA)",
    description: "Understand the key differences between colloquial Egyptian Arabic and the formal MSA (Fusha) used in Quran and media.",
    category: "Arabic",
    language: "English",
    speakerName: "ArabicPod101",
    thumbnailUrl: "https://img.youtube.com/vi/xFb3bEp1VGA/hqdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=xFb3bEp1VGA",
    duration: 1500,
    isPremium: false,
  },
  {
    id: "sl-17",
    title: "Surah Al-Fatiha — Word-by-Word Explanation",
    description: "Deep linguistic analysis of Surah Al-Fatiha. Learn the meaning of every single word, its grammatical role, and spiritual significance.",
    category: "Quranic Arabic",
    language: "English",
    speakerName: "Nouman Ali Khan",
    thumbnailUrl: "https://img.youtube.com/vi/hRd6bkR9YqA/hqdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=hRd6bkR9YqA",
    duration: 5100,
    isPremium: false,
  },
  {
    id: "sl-18",
    title: "Arabic Numbers 1–100 — Pronunciation & Writing",
    description: "Learn Arabic numbers from 1 to 100 with correct pronunciation, Eastern Arabic numerals, and practical usage in sentences.",
    category: "Arabic",
    language: "English",
    speakerName: "Learn Arabic with Maha",
    thumbnailUrl: "https://img.youtube.com/vi/6Tv14PsEwAA/hqdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=6Tv14PsEwAA",
    duration: 1800,
    isPremium: false,
  },
];

function formatDuration(seconds?: number | null) {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

export default function Library() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [offset, setOffset] = useState(0);
  const [favs, setFavs] = useState<Set<number>>(new Set());
  const [favsLoaded, setFavsLoaded] = useState(false);

  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useGetLectures({
    search: debouncedSearch || undefined,
    category: category !== "All" ? category : undefined,
    limit: PAGE_SIZE,
    offset,
  });

  useEffect(() => {
    if (!isAuthenticated || favsLoaded) return;
    const token = localStorage.getItem("nurulquran_token");
    if (!token) return;
    fetch("/api/users/favorites", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((lectures: { id: number }[]) => {
        setFavs(new Set(lectures.map(l => l.id)));
        setFavsLoaded(true);
      })
      .catch(() => setFavsLoaded(true));
  }, [isAuthenticated, favsLoaded]);

  useEffect(() => {
    if (!isAuthenticated) {
      setFavs(new Set());
      setFavsLoaded(false);
    }
  }, [isAuthenticated]);

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as any)._searchTimer);
    (window as any)._searchTimer = setTimeout(() => {
      setDebouncedSearch(val);
      setOffset(0);
    }, 350);
  };

  const toggleFav = async (lectureId: number) => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem("nurulquran_token");
    const isFav = favs.has(lectureId);
    setFavs(prev => {
      const next = new Set(prev);
      isFav ? next.delete(lectureId) : next.add(lectureId);
      return next;
    });
    await fetch(`/api/users/favorites/${lectureId}`, {
      method: isFav ? "DELETE" : "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {});
  };

  const openYoutube = (url?: string | null) => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const apiLectures = data?.lectures ?? [];
  const apiTotal = data?.total ?? 0;
  const hasApiData = !isLoading && apiTotal > 0;

  // Filter static lectures by category and search when API has no data
  const filteredStatic = STATIC_LECTURES.filter(l => {
    const matchCat = category === "All" || l.category === category;
    const matchSearch = !debouncedSearch ||
      l.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      l.speakerName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      l.description.toLowerCase().includes(debouncedSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const staticPage = filteredStatic.slice(offset, offset + PAGE_SIZE);
  const lectures = hasApiData ? apiLectures : staticPage;
  const total = hasApiData ? apiTotal : filteredStatic.length;
  const isStatic = !hasApiData;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <Youtube className="w-7 h-7 text-red-500" />
          <h1 className="text-3xl font-serif font-bold text-foreground">Arabic Learning</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Free curated Arabic lessons from the world's best educators — opens in YouTube
        </p>
      </motion.div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search lessons..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
      </div>

      {/* Category tab chips */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {CATEGORIES.map((cat) => {
          const active = cat.value === category;
          return (
            <button
              key={cat.value}
              onClick={() => { setCategory(cat.value); setOffset(0); }}
              data-testid={`filter-${cat.value.toLowerCase().replace(/\s+/g, "-")}`}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border-2"
              style={{
                backgroundColor: active ? cat.bg : "transparent",
                borderColor: active ? cat.border : "#E5E7EB",
                color: active ? cat.color : "#6B7280",
                boxShadow: active ? `0 2px 8px ${cat.border}66` : "none",
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground mb-4" data-testid="text-results-count">
          {total} lesson{total !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Lecture grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {isLoading
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)
          : lectures.map((lecture, i) => {
              const youtubeUrl = isStatic
                ? (lecture as StaticLecture).youtubeUrl
                : (lecture as any).youtubeUrl as string | null | undefined;
              const thumb = lecture.thumbnailUrl;
              const speakerName = isStatic
                ? (lecture as StaticLecture).speakerName
                : (lecture as any).speakerName;

              return (
                <motion.div
                  key={lecture.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  data-testid={`card-lecture-${lecture.id}`}
                  className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all hover:border-red-200 cursor-pointer"
                  onClick={() => openYoutube(youtubeUrl)}
                >
                  {/* Thumbnail */}
                  {thumb ? (
                    <div className="relative w-full aspect-video bg-muted overflow-hidden">
                      <img
                        src={thumb}
                        alt={lecture.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                          <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 ml-0.5">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
                      <Youtube className="w-10 h-10 text-red-400" />
                    </div>
                  )}

                  {/* Card body */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug flex-1">
                        {lecture.title}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        {isAuthenticated && !isStatic && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={e => { e.stopPropagation(); toggleFav(Number(lecture.id)); }}
                            data-testid={`button-fav-${lecture.id}`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${favs.has(Number(lecture.id)) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                          </Button>
                        )}
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mb-3">{speakerName ?? "Unknown"}</p>

                    {lecture.description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{lecture.description}</p>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{lecture.category}</Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{lecture.language}</Badge>
                      {lecture.duration && (
                        <span className="text-[10px] text-muted-foreground ml-auto">{formatDuration(lecture.duration)}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
      </div>

      {/* Empty state */}
      {!isLoading && lectures.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Youtube className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No lessons found for your search.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage === 1}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage === totalPages}
            onClick={() => setOffset(offset + PAGE_SIZE)}
            data-testid="button-next-page"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
