# Nurul Quran — Islamic Education Platform

## Overview

Full-stack Islamic education web app built as a pnpm monorepo (React+Vite frontend + Express API server). Features Quran recitation library, structured courses, Daily Ayah display, persistent audio player with lock-screen controls (Media Session API), user auth (JWT), favorites/recently-played, Stripe donation/subscription, Halal Stock Screener, and full PWA capabilities.

**Design**: deep emerald green (`#004d40`) + gold accents, mobile-first, Playfair Display + Amiri Quran fonts.

## Artifacts

- **`artifacts/nurul-quran`** — React+Vite PWA frontend (port from `PORT` env)
- **`artifacts/api-server`** — Express 5 REST API (port 8080)
- **`artifacts/mockup-sandbox`** — Vite component preview server

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: JWT (localStorage key `nurulquran_token`, `/api/users/me` for auth check)
- **Payments**: Stripe (`STRIPE_SECRET_KEY` env var required)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Features Implemented

### Frontend (`artifacts/nurul-quran`)
- **7 pages**: Home, Library, Courses, Halal Stocks, Support/Donate, Login, Register, Profile
- **Audio player**: Persistent bottom bar with progress, playback rate, skip ±10s
- **Media Session API**: Lock-screen/notification controls (play/pause/seek/stop) + artwork metadata
- **Service Worker** (`public/sw.js`): Cache-first, offline-ready PWA
- **manifest.json**: Full PWA manifest with icons (72–512px), shortcuts, screenshots
- **PWA install prompt**: `PwaInstallPrompt` component with `beforeinstallprompt` handler
- **Premium gate**: `PremiumGate` overlay modal when clicking locked premium lectures
- **Halal Stock Screener**: 41 Shariah-compliant stocks, sector filter, live price fetching (Yahoo Finance), compliance badges
- **Daily Ayah**: Displayed on home hero with Arabic + translation
- **Favorites/recently-played**: Available when logged in
- **Fonts**: Inter + Playfair Display + Amiri Quran (Google Fonts)

### Backend (`artifacts/api-server`)
- **Routes**: `/api/lectures`, `/api/courses`, `/api/speakers`, `/api/users/*`, `/api/halal-stocks`, `/api/stripe/*`, `/api/dashboard`
- **32 Islamic lectures**: Real audio from `cdn.islamic.network/quran/audio-surah/128/ar.alafasy/{n}.mp3`
- **18 courses**: Full Islamic curriculum (Quran recitation, Tafseer, Fiqh, Aqeedah, Hadith, Islamic History)
- **Halal stocks**: 41 stocks across 6 sectors (Tech, Healthcare, Consumer, Finance, Energy, Real Estate)

## Navigation Order
Home → Library → Courses → Halal Stocks → Support

## Important Notes
- `@tanstack/react-query` is in vite dedupe list (prevents duplicate React context errors)
- Yahoo Finance prices may show N/A in Replit environment (rate-limited) — falls back gracefully
- Stripe returns 500 if `STRIPE_SECRET_KEY` not configured
