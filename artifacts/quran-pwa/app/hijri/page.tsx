'use client';

import { useEffect, useState } from 'react';

interface HijriDate {
  date: string;
  format: string;
  day: string;
  weekday: { en: string; ar: string };
  month: { number: number; en: string; ar: string };
  year: string;
  designation: { abbreviated: string; expanded: string };
  holidays: string[];
}

interface GregorianDate {
  date: string;
  format: string;
  day: string;
  weekday: { en: string };
  month: { number: number; en: string };
  year: string;
  designation: { abbreviated: string };
}

interface CalendarData {
  hijri: HijriDate;
  gregorian: GregorianDate;
}

const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhu al-Qa'dah", 'Dhu al-Hijjah'
];

const MONTH_EVENTS: Record<string, string[]> = {
  'Muharram': ['Islamic New Year (1st)', 'Day of Ashura (10th)'],
  'Rabi\' al-Awwal': ['Mawlid al-Nabi — Birth of Prophet ﷺ (12th)'],
  'Rajab': ['Isra and Mi\'raj (27th)'],
  'Sha\'ban': ['Laylat al-Bara\'ah — Night of Forgiveness (15th)'],
  'Ramadan': ['Beginning of Ramadan fasting', 'Laylat al-Qadr — Night of Power (last 10 nights)', 'Eid al-Fitr at the end'],
  'Shawwal': ['Eid al-Fitr (1st)', 'Six days of Shawwal (2nd–7th)'],
  'Dhu al-Hijjah': ['Day of Arafah (9th)', 'Eid al-Adha (10th)', 'Days of Tashreeq (11th–13th)'],
};

function padDate(n: number) { return String(n).padStart(2, '0'); }

export default function HijriPage() {
  const [today, setToday] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Converter state
  const [convDir, setConvDir] = useState<'gToH' | 'hToG'>('gToH');
  const [inputDate, setInputDate] = useState('');
  const [convResult, setConvResult] = useState<CalendarData | null>(null);
  const [convLoading, setConvLoading] = useState(false);
  const [convError, setConvError] = useState('');

  useEffect(() => {
    const now = new Date();
    const dateStr = `${padDate(now.getDate())}-${padDate(now.getMonth() + 1)}-${now.getFullYear()}`;
    fetch(`https://api.aladhan.com/v1/gToH/${dateStr}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.code === 200) setToday(data.data);
        else setError('Could not load Hijri date');
      })
      .catch(() => setError('Network error — check your connection'))
      .finally(() => setLoading(false));
  }, []);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputDate) return;
    setConvLoading(true);
    setConvError('');
    setConvResult(null);
    try {
      let apiDate = inputDate;
      if (convDir === 'gToH') {
        // Input: YYYY-MM-DD → convert to DD-MM-YYYY
        const [y, m, d] = inputDate.split('-');
        apiDate = `${d}-${m}-${y}`;
      }
      const endpoint = convDir === 'gToH' ? 'gToH' : 'hToG';
      const res = await fetch(`https://api.aladhan.com/v1/${endpoint}/${apiDate}`);
      const data = await res.json();
      if (data.code === 200) setConvResult(data.data);
      else setConvError('Conversion failed. Check the date and try again.');
    } catch {
      setConvError('Network error');
    } finally {
      setConvLoading(false);
    }
  };

  const monthEvents = today ? (MONTH_EVENTS[today.hijri.month.en] || []) : [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Hijri Calendar</h1>
        <p className="text-gray-500 text-sm">التَّقْوِيمُ الْهِجْرِيُّ — Islamic Lunar Calendar</p>
      </div>

      {/* Today's date */}
      {loading && (
        <div className="text-center py-12">
          <div className="text-4xl animate-pulse mb-3">📅</div>
          <p className="text-gray-500">Loading today's date…</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-600 text-sm">{error}</div>
      )}

      {today && (
        <>
          {/* Hijri date card */}
          <div className="rounded-3xl text-white mb-5 overflow-hidden shadow-xl" style={{ background: 'linear-gradient(135deg, #0f3d20, #1a6b36)' }}>
            <div className="p-7 text-center">
              <p className="text-green-200 text-sm mb-1">{today.hijri.weekday.en}</p>
              <div className="arabic-text text-5xl mb-1" style={{ color: '#c8a04a', lineHeight: 1.6 }}>
                {today.hijri.day}
              </div>
              <p className="text-2xl font-bold mb-1">{today.hijri.month.en}</p>
              <p className="text-green-200 text-sm mb-3">{today.hijri.month.ar}</p>
              <div className="text-4xl font-bold mb-3" style={{ color: '#c8a04a' }}>{today.hijri.year}</div>
              <p className="text-green-200 text-sm">{today.hijri.designation.expanded}</p>
            </div>

            <div className="border-t border-white/10 px-7 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-green-300">Gregorian Date</p>
                <p className="font-semibold">{today.gregorian.weekday.en}, {today.gregorian.day} {today.gregorian.month.en} {today.gregorian.year}</p>
              </div>
              <div className="text-3xl">📅</div>
            </div>
          </div>

          {/* Islamic events this month */}
          {monthEvents.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5">
              <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                ⭐ Events in {today.hijri.month.en}
              </h3>
              <ul className="space-y-2">
                {monthEvents.map((event, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {event}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Holidays from API */}
          {today.hijri.holidays.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-5">
              <h3 className="font-bold text-green-800 mb-2">🌙 Today's Significance</h3>
              <ul className="space-y-1">
                {today.hijri.holidays.map((h, i) => (
                  <li key={i} className="text-sm text-green-700">• {h}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Converter */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-bold text-gray-800 mb-4">Date Converter</h2>

        {/* Direction toggle */}
        <div className="flex gap-2 mb-4">
          {(['gToH', 'hToG'] as const).map((d) => (
            <button
              key={d}
              onClick={() => { setConvDir(d); setConvResult(null); setInputDate(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${convDir === d ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
              style={convDir === d ? { backgroundColor: '#1a6b36' } : {}}
            >
              {d === 'gToH' ? 'Gregorian → Hijri' : 'Hijri → Gregorian'}
            </button>
          ))}
        </div>

        <form onSubmit={handleConvert} className="space-y-3">
          {convDir === 'gToH' ? (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Gregorian Date</label>
              <input
                type="date"
                value={inputDate}
                onChange={(e) => setInputDate(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-600"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Hijri Date (DD-MM-YYYY)</label>
              <input
                type="text"
                placeholder="e.g. 01-09-1445"
                value={inputDate}
                onChange={(e) => setInputDate(e.target.value)}
                pattern="\d{2}-\d{2}-\d{4}"
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-600"
              />
              <p className="text-xs text-gray-400 mt-1">Format: DD-MM-YYYY (e.g. 01-09-1445)</p>
            </div>
          )}
          <button
            type="submit"
            disabled={convLoading}
            className="w-full py-3 rounded-xl text-white font-semibold"
            style={{ backgroundColor: '#1a6b36' }}
          >
            {convLoading ? 'Converting…' : 'Convert'}
          </button>
        </form>

        {convError && <p className="text-red-500 text-sm mt-3">{convError}</p>}

        {convResult && (
          <div className="mt-4 rounded-xl overflow-hidden border border-gray-100">
            <div className="px-4 py-3" style={{ backgroundColor: '#1a6b36' }}>
              <p className="text-white text-sm font-semibold">Conversion Result</p>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Gregorian</span>
                <span className="font-medium">{convResult.gregorian.weekday.en}, {convResult.gregorian.day} {convResult.gregorian.month.en} {convResult.gregorian.year}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Hijri</span>
                <span className="font-medium">{convResult.hijri.day} {convResult.hijri.month.en} {convResult.hijri.year} AH</span>
              </div>
              {convResult.hijri.holidays.length > 0 && (
                <div className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  ⭐ {convResult.hijri.holidays.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Month reference */}
      <div className="mt-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-3">Hijri Months</h3>
        <div className="grid grid-cols-2 gap-2">
          {HIJRI_MONTHS.map((month, i) => (
            <div key={month} className="flex items-center gap-2 text-sm py-1.5">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#1a6b36' }}>
                {i + 1}
              </span>
              <span className="text-gray-700">{month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
