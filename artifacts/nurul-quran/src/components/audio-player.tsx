import { useAudioPlayer } from "@/hooks/use-audio-player";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayer() {
  const { 
    currentLecture, 
    isPlaying, 
    progress, 
    duration, 
    playbackRate,
    togglePlayPause, 
    seek, 
    skipForward, 
    skipBackward,
    setPlaybackRate 
  } = useAudioPlayer();

  if (!currentLecture) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-primary text-primary-foreground border-t border-primary/20 p-2 md:p-4 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
      <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center gap-2 md:gap-6">
        
        {/* Track Info */}
        <div className="flex items-center w-full md:w-1/3 truncate">
          {currentLecture.thumbnailUrl && (
            <img src={currentLecture.thumbnailUrl} alt="" className="w-10 h-10 rounded object-cover mr-3 shrink-0 bg-primary/20" />
          )}
          <div className="truncate">
            <div className="font-semibold text-sm truncate">{currentLecture.title}</div>
            <div className="text-xs text-primary-foreground/70 truncate">{currentLecture.speakerName || "Unknown Speaker"}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center w-full md:w-1/3 gap-1">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={skipBackward} className="h-11 w-11 hover:bg-primary-foreground/10 text-primary-foreground">
              <SkipBack className="w-5 h-5" />
            </Button>
            <Button 
              variant="secondary" 
              size="icon" 
              onClick={togglePlayPause} 
              className="h-12 w-12 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:scale-105 transition-transform"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={skipForward} className="h-11 w-11 hover:bg-primary-foreground/10 text-primary-foreground">
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="flex items-center w-full gap-2 text-xs font-mono">
            <span>{formatTime(progress)}</span>
            <Slider
              value={[progress]}
              max={duration || 100}
              step={1}
              onValueChange={(val) => seek(val[0])}
              className="w-full cursor-pointer [&_[role=slider]]:bg-secondary [&_[role=slider]]:border-secondary"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Extra Controls */}
        <div className="hidden md:flex items-center justify-end w-1/3 gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs font-mono h-8 hover:bg-primary-foreground/10 text-primary-foreground">
                {playbackRate}x
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-primary border-primary/20 text-primary-foreground">
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                <DropdownMenuItem 
                  key={rate} 
                  onClick={() => setPlaybackRate(rate)}
                  className="cursor-pointer hover:bg-primary-foreground/10 focus:bg-primary-foreground/10 focus:text-primary-foreground"
                >
                  {rate}x
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>
    </div>
  );
}
