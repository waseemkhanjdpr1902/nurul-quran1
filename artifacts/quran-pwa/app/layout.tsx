import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Nurul Quran — Complete Islamic Learning App',
  description: 'Read Quran with Arabic text, English & Urdu translation, audio recitation, prayer times, Qibla direction, and Hijri calendar — all free, works offline.',
  keywords: ['Quran', 'Islamic app', 'Prayer times', 'Qibla', 'Hijri calendar', 'Quran audio', 'Tafsir'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Nurul Quran',
  },
  openGraph: {
    title: 'Nurul Quran — Complete Islamic Learning App',
    description: 'Free Quran app with Arabic text, translations, audio, prayer times and more.',
    type: 'website',
    locale: 'en_US',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#1a6b36',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preload" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" as="style" />
        <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Nurul Quran" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-gray-50">
        <Navbar />
        <main>{children}</main>

        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(registration) {
                    console.log('[SW] Registered:', registration.scope);
                  })
                  .catch(function(err) {
                    console.log('[SW] Registration failed:', err);
                  });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
