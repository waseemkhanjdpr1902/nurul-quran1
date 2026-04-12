'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

const JUZAA = [
  { juz: 1, surah: 1, ayah: 1 }, { juz: 2, surah: 2, ayah: 142 }, { juz: 3, surah: 2, ayah: 253 },
  { juz: 4, surah: 3, ayah: 92 }, { juz: 5, surah: 4, ayah: 24 }, { juz: 6, surah: 4, ayah: 148 },
  { juz: 7, surah: 5, ayah: 82 }, { juz: 8, surah: 6, ayah: 111 }, { juz: 9, surah: 7, ayah: 88 },
  { juz: 10, surah: 8, ayah: 41 },
];

export default function QuranPage() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'meccan' | 'medinan'>('all');

  useEffect(() => {
    fetch('https://api.alquran.cloud/v1/surah')
      .then((r) => r.json())
      .then((data) => {
        setSurahs(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = surahs.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || s.englishName.toLowerCase().includes(q) || s.name.includes(q) || String(s.number).includes(q);
    const matchesFilter = filter === 'all' || s.revelationType.toLowerCase() === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">الْقُرْآنُ الْكَرِيمُ</h1>
        <p className="text-gray-500">The Holy Quran — 114 Surahs</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search by name or number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm"
            style={{ '--tw-ring-color': '#1a6b36' } as React.CSSProperties}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'meccan', 'medinan'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                filter === f ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={filter === f ? { backgroundColor: '#1a6b36' } : {}}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3 animate-pulse">📖</div>
          <p className="text-gray-500">Loading Quran…</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((surah) => (
            <Link
              key={surah.number}
              href={`/quran/${surah.number}`}
              className="flex items-center gap-4 bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all group"
            >
              {/* Number badge */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #1a6b36, #2d8a4e)' }}
              >
                {surah.number}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-gray-800 text-sm">{surah.englishName}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: surah.revelationType === 'Meccan' ? '#b45309' : '#1e40af' }}>
                    {surah.revelationType}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{surah.englishNameTranslation} · {surah.numberOfAyahs} ayahs</p>
              </div>

              {/* Arabic name */}
              <div className="text-right flex-shrink-0">
                <p className="arabic-text text-xl text-gray-700" style={{ lineHeight: 1.6 }}>{surah.name}</p>
              </div>

              <span className="text-gray-300 group-hover:text-green-500 transition-colors text-lg">›</span>
            </Link>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500">No surahs found for "{search}"</p>
        </div>
      )}
    </div>
  );
}
