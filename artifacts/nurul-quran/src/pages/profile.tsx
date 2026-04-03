import { useGetUserFavorites, useGetRecentlyPlayed } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Heart, Clock, Crown, LogOut, Lock } from "lucide-react";
import { motion } from "framer-motion";

function formatDuration(seconds?: number | null) {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function LectureRow({ lecture, onPlay }: { lecture: any; onPlay: () => void }) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
      onClick={() => !lecture.isPremium && onPlay()}
      data-testid={`row-lecture-${lecture.id}`}
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        {lecture.isPremium ? (
          <Lock className="w-4 h-4 text-amber-500" />
        ) : (
          <div className="group-hover:block hidden">
            <Play className="w-4 h-4 text-primary" />
          </div>
        )}
        {!lecture.isPremium && <Play className="w-4 h-4 text-primary group-hover:hidden" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{lecture.title}</p>
        <p className="text-xs text-muted-foreground">{lecture.speakerName ?? "Unknown Speaker"}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">{lecture.category}</Badge>
        {lecture.duration && <span className="text-[10px] text-muted-foreground">{formatDuration(lecture.duration)}</span>}
      </div>
    </div>
  );
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { playLecture } = useAudioPlayer();

  const { data: favorites, isLoading: favsLoading } = useGetUserFavorites();
  const { data: recentlyPlayed, isLoading: recentLoading } = useGetRecentlyPlayed({ limit: 10 });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8 space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <h2 className="text-2xl font-serif font-bold text-foreground mb-3">Sign in to view your profile</h2>
        <p className="text-muted-foreground mb-6">Track your favorites and recently played lectures.</p>
        <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8">
          <Link href="/login" data-testid="link-login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6 mb-6 flex items-center gap-4"
      >
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-serif font-bold shrink-0">
          {user.name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-foreground truncate" data-testid="text-username">{user.name}</h1>
          <p className="text-sm text-muted-foreground truncate" data-testid="text-email">{user.email}</p>
          {user.isPremium && (
            <div className="flex items-center gap-1.5 mt-1">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-600" data-testid="status-premium">Premium Member</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive shrink-0"
          onClick={() => { logout(); setLocation("/"); }}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-1.5" />
          Logout
        </Button>
      </motion.div>

      {!user.isPremium && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-foreground text-sm">Unlock Premium Content</p>
            <p className="text-xs text-muted-foreground">Access all courses and premium lectures</p>
          </div>
          <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0" data-testid="button-go-premium">
            <Link href="/support">
              <Crown className="w-4 h-4 mr-1.5" />
              Go Premium
            </Link>
          </Button>
        </div>
      )}

      <Tabs defaultValue="favorites">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="favorites" className="flex-1 gap-1.5" data-testid="tab-favorites">
            <Heart className="w-4 h-4" /> Favorites
          </TabsTrigger>
          <TabsTrigger value="recent" className="flex-1 gap-1.5" data-testid="tab-recent">
            <Clock className="w-4 h-4" /> Recently Played
          </TabsTrigger>
        </TabsList>

        <TabsContent value="favorites">
          {favsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : favorites && favorites.length > 0 ? (
            <div className="space-y-1">
              {favorites.map(lecture => (
                <LectureRow key={lecture.id} lecture={lecture} onPlay={() => playLecture(lecture)} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Heart className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No favorites yet.</p>
              <p className="text-sm mt-1">Heart a lecture in the library to save it here.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="recent">
          {recentLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : recentlyPlayed && recentlyPlayed.length > 0 ? (
            <div className="space-y-1">
              {recentlyPlayed.map(lecture => (
                <LectureRow key={lecture.id} lecture={lecture} onPlay={() => playLecture(lecture)} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No recently played lectures.</p>
              <p className="text-sm mt-1">Play a lecture from the library to see it here.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
