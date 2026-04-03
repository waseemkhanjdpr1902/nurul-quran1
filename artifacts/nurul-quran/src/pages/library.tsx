import { useState } from "react";
import { useGetLectures, useGetSpeakers } from "@workspace/api-client-react";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Play, Lock, Heart, ChevronRight, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

const CATEGORIES = ["All", "Quran Recitation", "Tafseer", "Fiqh", "Aqeedah", "Hadith", "Spirituality", "Islamic History"];
const LANGUAGES = ["All", "English", "Arabic", "Urdu"];
const PAGE_SIZE = 9;

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
  const [language, setLanguage] = useState("All");
  const [offset, setOffset] = useState(0);
  const [favs, setFavs] = useState<Set<number>>(new Set());

  const { playLecture } = useAudioPlayer();
  const { isAuthenticated, user } = useAuth();
  const { data: speakers } = useGetSpeakers();

  const { data, isLoading } = useGetLectures({
    search: debouncedSearch || undefined,
    category: category !== "All" ? category : undefined,
    language: language !== "All" ? language : undefined,
    limit: PAGE_SIZE,
    offset,
  });

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

  const lectures = data?.lectures ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Lecture Library</h1>
        <p className="text-muted-foreground mb-8">Browse our collection of authentic Islamic lectures</p>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search lectures..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={category} onValueChange={v => { setCategory(v); setOffset(0); }}>
          <SelectTrigger className="w-full sm:w-44" data-testid="select-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={language} onValueChange={v => { setLanguage(v); setOffset(0); }}>
          <SelectTrigger className="w-full sm:w-36" data-testid="select-language">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground mb-4" data-testid="text-results-count">
          {total} lecture{total !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Lecture grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {isLoading
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)
          : lectures.map((lecture, i) => (
              <motion.div
                key={lecture.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                data-testid={`card-lecture-${lecture.id}`}
                className="group bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all hover:border-primary/30"
              >
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">{lecture.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{lecture.speakerName ?? "Unknown Speaker"}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isAuthenticated && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleFav(lecture.id)}
                        data-testid={`button-fav-${lecture.id}`}
                      >
                        <Heart className={`w-4 h-4 ${favs.has(lecture.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                      </Button>
                    )}
                    {lecture.isPremium ? (
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-amber-500" />
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => playLecture(lecture)}
                        data-testid={`button-play-${lecture.id}`}
                      >
                        <Play className="w-4 h-4 ml-0.5" />
                      </Button>
                    )}
                  </div>
                </div>
                {lecture.description && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{lecture.description}</p>
                )}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{lecture.category}</Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{lecture.language}</Badge>
                  {lecture.isPremium && <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-0">Premium</Badge>}
                  {lecture.duration && <span className="text-[10px] text-muted-foreground ml-auto">{formatDuration(lecture.duration)}</span>}
                </div>
              </motion.div>
            ))}
      </div>

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
