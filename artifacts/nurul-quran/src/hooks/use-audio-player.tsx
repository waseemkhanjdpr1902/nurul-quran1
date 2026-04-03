import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import type { Lecture } from '@workspace/api-client-react';

interface AudioPlayerContextType {
  currentLecture: Lecture | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  playbackRate: number;
  playLecture: (lecture: Lecture) => void;
  togglePlayPause: () => void;
  seek: (value: number) => void;
  skipForward: () => void;
  skipBackward: () => void;
  setPlaybackRate: (rate: number) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentLecture, setCurrentLecture] = useState<Lecture | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    const audio = audioRef.current;
    
    const updateProgress = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);
    
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const playLecture = async (lecture: Lecture) => {
    if (currentLecture?.id === lecture.id) {
      togglePlayPause();
      return;
    }
    
    setCurrentLecture(lecture);
    if (audioRef.current) {
      audioRef.current.src = lecture.audioUrl;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
      
      // Track recently played
      const token = localStorage.getItem('nurulquran_token');
      if (token) {
        fetch(`/api/users/recently-played/${lecture.id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
      }
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !currentLecture) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const seek = (value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setProgress(value);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
    }
  };

  const updatePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  return (
    <AudioPlayerContext.Provider 
      value={{ 
        currentLecture, 
        isPlaying, 
        progress, 
        duration, 
        playbackRate,
        playLecture, 
        togglePlayPause, 
        seek, 
        skipForward, 
        skipBackward,
        setPlaybackRate: updatePlaybackRate
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}
