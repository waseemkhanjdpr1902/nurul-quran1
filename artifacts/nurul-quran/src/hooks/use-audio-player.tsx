import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
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
  onEnded: (cb: () => void) => () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

const ICON_URL = '/icons/icon-192.svg';

function updateMediaSession(lecture: Lecture, isPlaying: boolean) {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: lecture.title,
    artist: lecture.speakerName ?? 'Nurul Quran',
    album: lecture.category ?? 'Islamic Lecture',
    artwork: [
      { src: lecture.thumbnailUrl ?? ICON_URL, sizes: '192x192', type: 'image/svg+xml' },
      { src: lecture.thumbnailUrl ?? ICON_URL, sizes: '512x512', type: 'image/svg+xml' },
    ],
  });

  navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentLecture, setCurrentLecture] = useState<Lecture | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const endedCallbacksRef = useRef<Set<() => void>>(new Set());

  // Audio element setup
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
    }

    const audio = audioRef.current;

    const updateProgress = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      endedCallbacksRef.current.forEach(cb => cb());
    };
    const onPlay = () => {
      setIsPlaying(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    };
    const onPause = () => {
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  // Media Session action handlers (kept in sync with current state via refs)
  const currentLectureRef = useRef(currentLecture);
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => { currentLectureRef.current = currentLecture; }, [currentLecture]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause();
    });

    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - (details.seekOffset ?? 10));
      }
    });

    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      if (audioRef.current) {
        const dur = audioRef.current.duration || 0;
        audioRef.current.currentTime = Math.min(dur, audioRef.current.currentTime + (details.seekOffset ?? 10));
      }
    });

    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (audioRef.current && details.seekTime != null) {
        audioRef.current.currentTime = details.seekTime;
      }
    });

    navigator.mediaSession.setActionHandler('stop', () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    });
  }, []);

  // Update Media Session position state as audio plays
  useEffect(() => {
    if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;
    if (duration > 0 && currentLecture) {
      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate,
          position: progress,
        });
      } catch {}
    }
  }, [progress, duration, playbackRate, currentLecture]);

  const playLecture = useCallback(async (lecture: Lecture) => {
    if (currentLectureRef.current?.id === lecture.id) {
      if (audioRef.current) {
        if (isPlayingRef.current) {
          audioRef.current.pause();
        } else {
          await audioRef.current.play().catch(console.error);
        }
      }
      return;
    }

    setCurrentLecture(lecture);
    setProgress(0);
    setDuration(0);

    if (audioRef.current) {
      audioRef.current.src = lecture.audioUrl;
      audioRef.current.playbackRate = playbackRate;
      try {
        await audioRef.current.play();
        updateMediaSession(lecture, true);
      } catch (err) {
        console.error('Playback failed:', err);
      }

      // Track recently played
      const token = localStorage.getItem('nurulquran_token');
      if (token) {
        fetch(`/api/users/recently-played/${lecture.id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    }
  }, [playbackRate]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !currentLecture) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  }, [isPlaying, currentLecture]);

  // Update media session metadata whenever lecture or play state changes
  useEffect(() => {
    if (currentLecture) {
      updateMediaSession(currentLecture, isPlaying);
    }
  }, [currentLecture, isPlaying]);

  const seek = useCallback((value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setProgress(value);
    }
  }, []);

  const skipForward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration);
    }
  }, [duration]);

  const skipBackward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const onEnded = useCallback((cb: () => void) => {
    endedCallbacksRef.current.add(cb);
    return () => { endedCallbacksRef.current.delete(cb); };
  }, []);

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
        setPlaybackRate,
        onEnded,
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
