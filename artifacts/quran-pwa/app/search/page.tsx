'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface SearchResult {
  number: number;
  numberInSurah: number;
  text: string;
  surah: {
    number: number;
    name: string;
    englishName: string;
  };
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setError('');
    try {
      const encoded = encodeURIComponent(q.trim());
      const res = await fetch(`https://api.alquran.cloud/v1/search/${encoded}/all/en.asad`);
      const data = await res.json();
      setResults(data.data?.matches || []);
      setSearched(true);
    } catch {
      setError('Search failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(query);
  };

  const highlightText = (text: string, q: string) => {
    if (!q.trim()) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-yellow-200 text-gray-800 rounded px-0.5">{part}</mark> : part
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Search the Quran</h1>
        <p className="text-gray-500 text-sm">Search by keyword, surah name, or verse content</p>
      </div>

      {/* Search box */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
          <input
            type="search"
            value={query}
            onChange={handleChange}
            placeholder="e.g. mercy, patience, Al-Fatiha, paradise…"
            className="w-full pl-12 pr-16 py-4 border-2 border-gray-200 rounded-2xl text-base focus:outline-none focus:border-green-600 shadow-sm"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl text-white text-sm font-medium"
            style={{ backgroundColor: '#1a6b36' }}
          >
            {loading ? '…' : 'Search'}
          </button>
        </div>
      </form>

      {/* Quick searches */}
      {!searched && !loading && (
        <div className="mb-8">
          <p className="text-sm text-gray-500 mb-3">Try searching:</p>
          <div className="flex flex-wrap gap-2">
            {['mercy', 'patience', 'paradise', 'prayer', 'forgiveness', 'gratitude', 'knowledge', 'justice'].map((s) => (
              <button
                key={s}
                onClick={() => { setQuery(s); doSearch(s); }}
                className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-sm hover:bg-green-50 hover:text-green-700 transition-colors capitalize"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3 animate-bounce">🔍</div>
          <p className="text-gray-500">Searching…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">{error}</div>
      )}

      {/* Results */}
      {searched && !loading && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            {results.length > 0 ? `${results.length} result${results.length > 1 ? 's' : ''} for "${query}"` : `No results for "${query}"`}
          </p>

          {results.length === 0 && (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-gray-500">No ayahs found. Try a different keyword.</p>
              <p className="text-xs text-gray-400 mt-2">Search works on English translations</p>
            </div>
          )}

          <div className="space-y-4">
            {results.map((r) => (
              <Link
                key={r.number}
                href={`/quran/${r.surah.number}#ayah-${r.numberInSurah}`}
                className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-green-200 transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: '#1a6b36' }}>
                    {r.surah.englishName} {r.surah.number}:{r.numberInSurah}
                  </span>
                  <span className="text-gray-400 text-sm arabic-text" style={{ lineHeight: 1.4 }}>{r.surah.name}</span>
                  <span className="ml-auto text-green-600 text-sm">Read →</span>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {highlightText(r.text, query)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
