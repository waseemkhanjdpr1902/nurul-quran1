'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Ayah {
  number: number;
  numberInSurah: number;
  text: string;
  audio?: string;
}

interface SurahData {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
  ayahs: Ayah[];
}

interface TranslationAyah {
  numberInSurah: number;
  text: string;
}

type TranslationLang = 'english' | 'urdu' | 'tafsir';

const TRANSLATIONS: Record<TranslationLang, { id: string; label: string }> = {
  english: { id: 'en.asad', label: 'English (Asad)' },
  urdu: { id: 'ur.jalandhry', label: 'Urdu (Jalandhry)' },
  tafsir: { id: 'en.maarifulquran', label: 'Tafsir (Maariful Quran)' },
};

export default function SurahPage() {
  const params = useParams();
  const id = params?.id as string;

  const [surah, setSurah] = useState<SurahData | null>(null);
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lang, setLang] = useState<TranslationLang>('english');
  const [currentAyah, setCurrentAyah] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [showBismillah, setShowBismillah] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchTranslation = useCallback(async (surahNum: number, langKey: TranslationLang) => {
    const edition = TRANSLATIONS[langKey].id;
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/${edition}`);
    const data = await res.json();
    if (data.data?.ayahs) {
      const map: Record<number, string> = {};
      (data.data.ayahs as TranslationAyah[]).forEach((a) => { map[a.numberInSurah] = a.text; });
      setTranslations(map);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    const num = parseInt(id);
    setLoading(true);
    setError('');
    setShowBismillah(num !== 1 && num !== 9);

    fetch(`https://api.alquran.cloud/v1/surah/${num}/quran-uthmani`)
      .then((r) => r.json())
      .then((data) => {
        if (data.data) {
          setSurah(data.data);
          setLoading(false);
          fetchTranslation(num, lang);
        } else {
          setError('Surah not found');
          setLoading(false);
        }
      })
      .catch(() => {
        setError('Failed to load. Check your connection.');
        setLoading(false);
      });
  }, [id, fetchTranslation]);

  useEffect(() => {
    if (surah) fetchTranslation(surah.number, lang);
  }, [lang, surah, fetchTranslation]);

  const playAyah = (ayahNumber: number, globalNum: number) => {
    const audioUrl = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalNum}.mp3`;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = audioUrl;
      audioRef.current.play().then(() => {
        setCurrentAyah(ayahNumber);
        setIsPlaying(true);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.onended = () => {
      setIsPlaying(false);
      if (autoPlay && surah && currentAyah) {
        const nextAyah = surah.ayahs.find((a) => a.numberInSurah === currentAyah + 1);
        if (nextAyah) {
          setTimeout(() => playAyah(nextAyah.numberInSurah, nextAyah.number), 500);
        } else {
          setCurrentAyah(null);
        }
      }
    };
    return () => { audio.pause(); };
  }, [autoPlay, currentAyah, surah]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="text-5xl animate-pulse">📖</div>
      <p className="text-gray-500">Loading surah…</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
      <div className="text-5xl">😔</div>
      <p className="text-red-500">{error}</p>
      <Link href="/quran" className="px-5 py-2 rounded-xl text-white" style={{ backgroundColor: '#1a6b36' }}>← Back to Surahs</Link>
    </div>
  );

  if (!surah) return null;

  const surahNum = surah.number;

  return (
    <div className="max-w-3xl mx-auto pb-36 md:pb-8">
      {/* Header */}
      <div className="sticky top-16 z-30 text-white shadow-md" style={{ background: 'linear-gradient(135deg, #0f3d20, #1a6b36)' }}>
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/quran" className="text-green-200 hover:text-white transition-colors text-sm">← Surahs</Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>{surahNum}</span>
                <div>
                  <div className="font-bold text-base">{surah.englishName}</div>
                  <div className="text-xs text-green-200">{surah.englishNameTranslation} · {surah.numberOfAyahs} ayahs · {surah.revelationType}</div>
                </div>
                <div className="ml-auto arabic-text text-xl" style={{ color: '#c8a04a', lineHeight: 1.6 }}>{surah.name}</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Translation selector */}
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as TranslationLang)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/15 text-white border border-white/20 focus:outline-none"
            >
              {Object.entries(TRANSLATIONS).map(([k, v]) => (
                <option key={k} value={k} className="text-gray-800">{v.label}</option>
              ))}
            </select>

            {/* Auto-play */}
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${autoPlay ? 'border-yellow-400 text-yellow-300 bg-yellow-400/10' : 'border-white/20 text-green-200 bg-white/10'}`}
            >
              {autoPlay ? '🔁 Auto-play ON' : '🔁 Auto-play'}
            </button>

            {/* Nav */}
            <div className="ml-auto flex gap-1">
              {surahNum > 1 && (
                <Link href={`/quran/${surahNum - 1}`} className="px-3 py-1.5 rounded-lg bg-white/10 text-green-200 text-xs hover:bg-white/20">← Prev</Link>
              )}
              {surahNum < 114 && (
                <Link href={`/quran/${surahNum + 1}`} className="px-3 py-1.5 rounded-lg bg-white/10 text-green-200 text-xs hover:bg-white/20">Next →</Link>
              )}
            </div>
          </div>
        </div>

        {/* Now playing */}
        {currentAyah && (
          <div className="px-4 pb-3 flex items-center gap-2 border-t border-white/10 pt-2">
            <button onClick={togglePlayPause} className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: '#c8a04a' }}>
              {isPlaying ? '⏸' : '▶️'}
            </button>
            <span className="text-xs text-green-200">Ayah {currentAyah} — Mishary Alafasy</span>
          </div>
        )}
      </div>

      {/* Bismillah */}
      {showBismillah && (
        <div className="text-center py-8 px-4" style={{ background: 'linear-gradient(180deg, #0f3d20 0%, #f9fafb 100%)' }}>
          <p className="arabic-text text-4xl md:text-5xl text-white" style={{ lineHeight: 2 }}>
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
        </div>
      )}

      {/* Ayahs */}
      <div className="px-4 space-y-4 mt-4">
        {surah.ayahs.map((ayah) => (
          <div
            key={ayah.numberInSurah}
            id={`ayah-${ayah.numberInSurah}`}
            className={`bg-white rounded-2xl border overflow-hidden transition-all ${
              currentAyah === ayah.numberInSurah ? 'border-yellow-400 shadow-lg' : 'border-gray-100 shadow-sm'
            }`}
          >
            {/* Ayah header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: currentAyah === ayah.numberInSurah ? '#c8a04a' : '#1a6b36' }}
                >
                  {ayah.numberInSurah}
                </span>
                <span className="text-xs text-gray-400">{surah.englishName} {surahNum}:{ayah.numberInSurah}</span>
              </div>
              <button
                onClick={() => {
                  if (currentAyah === ayah.numberInSurah && isPlaying) {
                    togglePlayPause();
                  } else {
                    playAyah(ayah.numberInSurah, ayah.number);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: currentAyah === ayah.numberInSurah && isPlaying ? '#c8a04a20' : '#1a6b3620',
                  color: currentAyah === ayah.numberInSurah && isPlaying ? '#b45309' : '#1a6b36',
                }}
              >
                {currentAyah === ayah.numberInSurah && isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
            </div>

            {/* Arabic */}
            <div className="px-5 py-5">
              <p className="arabic-text text-2xl md:text-3xl text-gray-800 leading-loose">{ayah.text}</p>
            </div>

            {/* Translation */}
            {translations[ayah.numberInSurah] && (
              <div className="px-5 pb-5 border-t border-gray-50 pt-4">
                <p className={`text-gray-600 text-sm leading-relaxed ${lang === 'urdu' ? 'arabic-text text-right text-base' : ''}`}>
                  {translations[ayah.numberInSurah]}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer nav */}
      <div className="flex justify-between px-4 mt-8 gap-3">
        {surahNum > 1 && (
          <Link href={`/quran/${surahNum - 1}`} className="flex-1 py-3 rounded-xl text-center font-medium text-white" style={{ backgroundColor: '#1a6b36' }}>
            ← Previous Surah
          </Link>
        )}
        <Link href="/quran" className="flex-1 py-3 rounded-xl text-center font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
          All Surahs
        </Link>
        {surahNum < 114 && (
          <Link href={`/quran/${surahNum + 1}`} className="flex-1 py-3 rounded-xl text-center font-medium text-white" style={{ backgroundColor: '#1a6b36' }}>
            Next Surah →
          </Link>
        )}
      </div>
    </div>
  );
}
