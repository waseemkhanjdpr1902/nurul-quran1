'use client';

import { useEffect, useState } from 'react';

interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Midnight: string;
}

interface PrayerData {
  timings: PrayerTimings;
  date: {
    readable: string;
    hijri: {
      date: string;
      month: { en: string };
      year: string;
    };
  };
  meta: {
    latitude: number;
    longitude: number;
    timezone: string;
    method: {
      name: string;
    };
  };
}

const PRAYER_ICONS: Record<string, string> = {
  Fajr: '🌙',
  Sunrise: '🌅',
  Dhuhr: '☀️',
  Asr: '🌤',
  Maghrib: '🌇',
  Isha: '🌙',
  Midnight: '🌑',
};

const PRAYER_NAMES: Record<string, string> = {
  Fajr: 'Fajr',
  Sunrise: 'Sunrise',
  Dhuhr: 'Dhuhr',
  Asr: 'Asr',
  Maghrib: 'Maghrib',
  Isha: 'Isha',
  Midnight: 'Midnight',
};

const PRAYER_ARABIC: Record<string, string> = {
  Fajr: 'الفجر',
  Sunrise: 'الشروق',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
  Midnight: 'منتصف الليل',
};

const CALCULATION_METHODS = [
  { id: 2, name: 'Islamic Society of North America (ISNA)' },
  { id: 1, name: 'University of Islamic Sciences, Karachi' },
  { id: 4, name: 'Umm Al-Qura University, Makkah' },
  { id: 5, name: 'Egyptian General Authority' },
  { id: 3, name: 'Muslim World League' },
];

function to12h(time24: string) {
  const [h, m] = time24.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function getNextPrayer(timings: PrayerTimings): string | null {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
  for (const p of prayers) {
    const [h, m] = timings[p].split(':').map(Number);
    if (h * 60 + m > nowMinutes) return p;
  }
  return 'Fajr';
}

export default function PrayerTimesPage() {
  const [data, setData] = useState<PrayerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [method, setMethod] = useState(2);
  const [locationMode, setLocationMode] = useState<'manual' | 'gps'>('manual');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  const fetchByCity = async (c: string, co: string, m: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(c)}&country=${encodeURIComponent(co)}&method=${m}`);
      const json = await res.json();
      if (json.code === 200) setData(json.data);
      else setError('City not found. Try a different city or country name.');
    } catch {
      setError('Failed to fetch prayer times. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchByGPS = async () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    setLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=${method}`);
          const json = await res.json();
          if (json.code === 200) setData(json.data);
          else setError('Could not fetch prayer times for your location.');
        } catch {
          setError('Failed to fetch prayer times.');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('Location permission denied. Please use city search instead.');
        setLoading(false);
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (city) fetchByCity(city, country || 'India', method);
  };

  const nextPrayer = data ? getNextPrayer(data.timings) : null;
  const PRAYERS = data ? ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const : [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Prayer Times</h1>
        <p className="text-gray-500 text-sm">مَوَاقِيتُ الصَّلَاةِ — Accurate Islamic prayer times</p>
      </div>

      {/* Input mode */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex gap-2 mb-4">
          {(['manual', 'gps'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setLocationMode(m)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${locationMode === m ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
              style={locationMode === m ? { backgroundColor: '#1a6b36' } : {}}
            >
              {m === 'manual' ? '🏙️ City Search' : '📍 My Location'}
            </button>
          ))}
        </div>

        {locationMode === 'manual' ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="City (e.g. Hyderabad, Dubai, London)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-600"
            />
            <input
              type="text"
              placeholder="Country (e.g. India, UAE, UK)"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-600"
            />
            <select
              value={method}
              onChange={(e) => setMethod(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-600"
            >
              {CALCULATION_METHODS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-white font-semibold" style={{ backgroundColor: '#1a6b36' }}>
              {loading ? 'Fetching…' : 'Get Prayer Times'}
            </button>
          </form>
        ) : (
          <div>
            <select
              value={method}
              onChange={(e) => setMethod(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm mb-3 focus:outline-none focus:border-green-600"
            >
              {CALCULATION_METHODS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <button
              onClick={fetchByGPS}
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2"
              style={{ backgroundColor: '#1a6b36' }}
            >
              📍 {loading ? 'Fetching…' : 'Use My Location'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-600 text-sm">{error}</div>
      )}

      {data && (
        <>
          {/* Date & Location */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-bold text-gray-800">{data.date.readable}</p>
                <p className="text-sm text-gray-500">{data.date.hijri.date} {data.date.hijri.month.en} {data.date.hijri.year} AH</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{data.meta.timezone}</p>
                <p className="text-xs text-gray-400">{data.meta.method.name}</p>
              </div>
            </div>
            <div className="mt-3 text-center">
              <span className="text-3xl font-bold text-gray-800">
                {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
              </span>
              {nextPrayer && <span className="ml-3 px-3 py-1 rounded-full text-white text-xs font-medium" style={{ backgroundColor: '#c8a04a' }}>Next: {nextPrayer}</span>}
            </div>
          </div>

          {/* Prayer cards */}
          <div className="space-y-2">
            {PRAYERS.map((prayer) => {
              const isNext = prayer === nextPrayer;
              return (
                <div
                  key={prayer}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    isNext ? 'border-yellow-400 shadow-md' : 'bg-white border-gray-100 shadow-sm'
                  }`}
                  style={isNext ? { background: 'linear-gradient(135deg, #0f3d20, #1a6b36)' } : {}}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{PRAYER_ICONS[prayer]}</span>
                    <div>
                      <p className={`font-semibold ${isNext ? 'text-white' : 'text-gray-800'}`}>{PRAYER_NAMES[prayer]}</p>
                      <p className={`text-xs ${isNext ? 'text-green-200' : 'text-gray-400'}`}>{PRAYER_ARABIC[prayer]}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${isNext ? 'text-yellow-300' : 'text-gray-700'}`}>
                      {to12h(data.timings[prayer])}
                    </p>
                    {isNext && <p className="text-xs text-green-200">Next prayer</p>}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-center text-gray-400 mt-4">
            Times provided by Aladhan API · Powered by free public data
          </p>
        </>
      )}
    </div>
  );
}
