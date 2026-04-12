'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DailyAyah {
  arabic: string;
  english: string;
  reference: string;
  surahName: string;
}

const FEATURED_AYAHS: DailyAyah[] = [
  { arabic: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ', english: 'And whoever fears Allah — He will make for him a way out and will provide for him from where he does not expect.', reference: '65:2-3', surahName: 'At-Talaq' },
  { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', english: 'Indeed, with hardship will be ease.', reference: '94:6', surahName: 'Ash-Sharh' },
  { arabic: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ', english: 'And when My servants ask you about Me — indeed I am near.', reference: '2:186', surahName: 'Al-Baqarah' },
  { arabic: 'اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ', english: 'Allah is the Light of the heavens and the earth.', reference: '24:35', surahName: 'An-Nur' },
  { arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', english: 'Our Lord, give us in this world good and in the Hereafter good and protect us from the punishment of the Fire.', reference: '2:201', surahName: 'Al-Baqarah' },
  { arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ', english: 'So remember Me; I will remember you.', reference: '2:152', surahName: 'Al-Baqarah' },
  { arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', english: 'Indeed, Allah is with the patient.', reference: '2:153', surahName: 'Al-Baqarah' },
];

const FEATURES = [
  { icon: '📖', title: 'Quran Reader', desc: 'All 114 surahs with Arabic text, English & Urdu translations, and audio recitation', href: '/quran', color: '#1a6b36' },
  { icon: '🔍', title: 'Smart Search', desc: 'Search by surah name, ayah number, or keyword across the entire Quran', href: '/search', color: '#1e40af' },
  { icon: '🕌', title: 'Prayer Times', desc: 'Accurate prayer times for your location using Fajr, Dhuhr, Asr, Maghrib, Isha', href: '/prayer-times', color: '#7c3aed' },
  { icon: '🧭', title: 'Qibla Direction', desc: 'Find the exact direction of the Kaaba from anywhere in the world', href: '/qibla', color: '#b45309' },
  { icon: '📅', title: 'Hijri Calendar', desc: 'View today\'s Islamic date and convert between Hijri and Gregorian calendars', href: '/hijri', color: '#be123c' },
  { icon: '📡', title: 'Works Offline', desc: 'Install as an app on your phone — full Quran works without internet after first load', href: '/quran', color: '#0369a1' },
];

export default function HomePage() {
  const [dailyAyah, setDailyAyah] = useState<DailyAyah | null>(null);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Pick daily ayah based on day of year
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const day = Math.floor(diff / (1000 * 60 * 60 * 24));
    setDailyAyah(FEATURED_AYAHS[day % FEATURED_AYAHS.length]);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    (installPrompt as any).prompt();
    const result = await (installPrompt as any).userChoice;
    if (result.outcome === 'accepted') setIsInstalled(true);
    setInstallPrompt(null);
  };

  return (
    <div className="pb-20 md:pb-0">
      {/* Hero */}
      <section className="green-gradient text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-6xl mb-4">☪️</div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3 text-shadow">Nurul Quran</h1>
          <p className="text-lg md:text-xl mb-1 font-arabic text-2xl" style={{ color: '#c8a04a' }}>نُورُ الْقُرْآنِ</p>
          <p className="text-green-100 text-base md:text-lg mb-8 max-w-2xl mx-auto">
            Your complete Islamic companion — Quran with audio, prayer times, Qibla direction, and more. Free forever. Works offline.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/quran" className="px-6 py-3 rounded-xl font-semibold text-white transition-transform hover:scale-105" style={{ backgroundColor: '#c8a04a' }}>
              📖 Read Quran
            </Link>
            <Link href="/prayer-times" className="px-6 py-3 rounded-xl font-semibold bg-white/20 text-white border border-white/30 transition-transform hover:scale-105 hover:bg-white/30">
              🕌 Prayer Times
            </Link>
          </div>

          {/* PWA install banner */}
          {installPrompt && !isInstalled && (
            <div className="mt-6 inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-white/15 border border-white/20 backdrop-blur-sm">
              <span className="text-xl">📲</span>
              <span className="text-sm text-green-100">Install as app for offline access</span>
              <button
                onClick={handleInstall}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: '#c8a04a' }}
              >
                Install
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Daily Ayah */}
      {dailyAyah && (
        <section className="max-w-3xl mx-auto px-4 -mt-6">
          <div className="bg-white rounded-2xl shadow-lg border border-green-100 overflow-hidden">
            <div className="px-5 py-3 flex items-center gap-2" style={{ backgroundColor: '#1a6b36' }}>
              <span className="text-yellow-300 text-sm">✨</span>
              <span className="text-white text-sm font-semibold">Ayah of the Day</span>
              <span className="ml-auto text-green-200 text-xs">{dailyAyah.surahName} ({dailyAyah.reference})</span>
            </div>
            <div className="p-6">
              <p className="arabic-text text-3xl text-gray-800 leading-loose mb-5">{dailyAyah.arabic}</p>
              <p className="text-gray-600 text-base italic leading-relaxed border-l-4 pl-4" style={{ borderColor: '#c8a04a' }}>
                "{dailyAyah.english}"
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Bismillah banner */}
      <section className="max-w-3xl mx-auto px-4 mt-6">
        <div className="rounded-2xl text-center py-6 px-4" style={{ background: 'linear-gradient(135deg, #fef9f0, #fef3e2)' }}>
          <p className="text-4xl md:text-5xl font-arabic" style={{ color: '#1a6b36', lineHeight: 2 }}>
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          <p className="text-sm text-gray-500 mt-2">In the name of Allah, the Most Gracious, the Most Merciful</p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-4 mt-10">
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">Everything You Need</h2>
        <p className="text-gray-500 text-center mb-8">Complete Islamic tools in one free app</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <Link
              key={f.href + f.title}
              href={f.href}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:border-green-200 group"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 transition-transform group-hover:scale-110" style={{ backgroundColor: f.color + '20' }}>
                {f.icon}
              </div>
              <h3 className="font-bold text-gray-800 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* iOS install instructions */}
      <section className="max-w-3xl mx-auto px-4 mt-10 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span>📲</span> Add to Home Screen (iOS)
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: '#1a6b36' }}>1</span>
              <p>Tap the <strong>Share</strong> button at the bottom of Safari</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: '#1a6b36' }}>2</span>
              <p>Scroll down and tap <strong>"Add to Home Screen"</strong></p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: '#1a6b36' }}>3</span>
              <p>Tap <strong>Add</strong> — it works like a native app!</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
