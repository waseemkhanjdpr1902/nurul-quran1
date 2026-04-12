'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/quran', label: 'Quran', icon: '📖' },
  { href: '/search', label: 'Search', icon: '🔍' },
  { href: '/prayer-times', label: 'Prayers', icon: '🕌' },
  { href: '/qibla', label: 'Qibla', icon: '🧭' },
  { href: '/hijri', label: 'Hijri', icon: '📅' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 shadow-lg" style={{ background: 'linear-gradient(135deg, #0f3d20 0%, #1a6b36 100%)' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">☪️</span>
              <div>
                <div className="text-white font-bold text-lg leading-tight">Nurul Quran</div>
                <div className="text-xs leading-tight" style={{ color: '#c8a04a' }}>نور القرآن</div>
              </div>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    pathname === link.href
                      ? 'text-white font-semibold'
                      : 'text-green-100 hover:text-white hover:bg-white/10'
                  }`}
                  style={pathname === link.href ? { backgroundColor: 'rgba(200,160,74,0.3)', color: '#d4b86a' } : {}}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden text-white p-2 rounded-lg hover:bg-white/10"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-green-700/50 pb-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-white/10 text-yellow-300'
                    : 'text-green-100 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom nav for mobile (fixed) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden shadow-lg border-t border-gray-200" style={{ background: '#0f3d20' }}>
        <div className="grid grid-cols-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center py-2 text-xs transition-colors ${
                pathname === link.href ? 'text-yellow-300' : 'text-green-300 hover:text-white'
              }`}
            >
              <span className="text-base mb-0.5">{link.icon}</span>
              <span className="text-[10px]">{link.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
