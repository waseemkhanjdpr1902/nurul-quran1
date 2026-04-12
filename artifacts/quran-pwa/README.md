# Nurul Quran — PWA

A fully functional, offline-capable Islamic Progressive Web App built with **Next.js 14 App Router** and **Tailwind CSS**.

## Features

- 📖 **Quran Reader** — All 114 surahs with Arabic text, English & Urdu translations, Tafsir
- 🔊 **Audio Recitation** — Ayah-by-ayah playback with Mishary Alafasy via cdn.islamic.network
- 🔍 **Smart Search** — Search across the full Quran by keyword (English)
- 🕌 **Prayer Times** — Accurate times by city or GPS using Aladhan API
- 🧭 **Qibla Direction** — Live compass using device orientation + geolocation
- 📅 **Hijri Calendar** — Today's Islamic date + Gregorian ↔ Hijri converter
- 📡 **Offline Support** — Service Worker caches all Quran data for offline use
- 📲 **PWA Ready** — Install on Android and iOS home screen

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| Next.js 14 (App Router) | Framework |
| Tailwind CSS 3 | Styling |
| AlQuran.cloud API | Quran text, audio, translations |
| Aladhan API | Prayer times, Hijri calendar |
| Service Worker | Offline caching |

**No database. No authentication. No API keys required.**

---

## Deploy to Vercel (5 minutes)

### Step 1 — Push to GitHub

In Replit: **File > Connect to GitHub** and push this project to your GitHub account.

Or via terminal:
```bash
git init
git add .
git commit -m "Initial commit — Nurul Quran PWA"
git remote add origin https://github.com/YOUR_USERNAME/nurul-quran-pwa.git
git push -u origin main
```

### Step 2 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"New Project"**
3. Click **"Import from GitHub"** and select your repo
4. Vercel auto-detects Next.js — click **"Deploy"**
5. Your site is live at `https://your-project.vercel.app` in ~2 minutes

**The `vercel.json` in this repo is pre-configured:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

### Step 3 — Custom Domain (Optional)

In Vercel Dashboard: **Settings > Domains > Add Domain** (e.g., nurulquran.info)

---

## Run Locally

```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## APIs Used (All Free, No Key Needed)

| API | Endpoint | Use |
|-----|----------|-----|
| AlQuran.cloud | `api.alquran.cloud/v1/surah` | Quran text + translations |
| Islamic Network CDN | `cdn.islamic.network/quran/audio/128/ar.alafasy/{n}.mp3` | Audio recitation |
| Aladhan | `api.aladhan.com/v1/timingsByCity` | Prayer times |
| Aladhan | `api.aladhan.com/v1/gToH` | Hijri calendar |

---

## PWA Setup

The app includes:
- `/public/sw.js` — Service Worker (caches Quran API responses)
- `/public/manifest.json` — PWA manifest
- Dynamic icons via Next.js `/app/icon.tsx`

After first visit, the Quran text is available offline. Audio requires internet connection.

---

## Project Structure

```
quran-pwa/
├── app/
│   ├── layout.tsx          # Root layout, PWA meta, SW registration
│   ├── page.tsx            # Home — daily ayah, feature cards
│   ├── icon.tsx            # Dynamic app icon (512x512)
│   ├── apple-icon.tsx      # Dynamic Apple touch icon (180x180)
│   ├── quran/
│   │   ├── page.tsx        # Surah list with search + filter
│   │   └── [id]/page.tsx   # Surah reader — Arabic, translation, audio
│   ├── search/page.tsx     # Full-text search
│   ├── prayer-times/page.tsx
│   ├── qibla/page.tsx
│   └── hijri/page.tsx
├── components/
│   └── Navbar.tsx          # Desktop nav + mobile bottom nav
├── public/
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service worker
├── next.config.js
├── tailwind.config.js
├── vercel.json
└── README.md
```

---

## License

MIT — Free to use for Islamic education purposes.

بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
