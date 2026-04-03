# Nurul Quran — Islamic Education Platform

## Overview

Full-stack Islamic education web app built as a pnpm monorepo (React+Vite frontend + Express API server). Features Quran recitation library, structured courses, Daily Ayah display, persistent audio player with lock-screen controls (Media Session API), user auth (JWT), favorites/recently-played, Stripe donation/subscription, Halal Stock Screener, and full PWA capabilities.

**Design**: deep emerald green (`#004d40`) + gold accents, mobile-first, Playfair Display + Amiri Quran fonts.

## Artifacts

- **`artifacts/nurul-quran`** — React+Vite PWA frontend (port from `PORT` env)
- **`artifacts/api-server`** — Express 5 REST API (port 8080)
- **`artifacts/mockup-sandbox`** — Vite component preview server
- **`artifacts/trademaster-pro`** — TradeMaster Pro trading app frontend
- **`artifacts/inventory-ai-pro`** — Inventory AI Pro MSME stock management PWA (at `/inventory/`)

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

## TradeMaster Pro (`artifacts/trademaster-pro`)

Professional Trading Journal & Analytics Dashboard for Indian retail traders, at preview path `/trademaster/`. Fully SEBI-compliant SaaS (self-tracking tool, not investment advice).

### Pages (Nav)
1. **My Trades (Journal)** — primary landing; log trades manually (Asset, Entry/Exit, Qty, Strategy, Notes); auto-calculate P&L, win/loss outcome
2. **Analytics** — P&L curve (recharts AreaChart), win/loss pie, day-of-week bar chart, strategy breakdown table; powered by journal data
3. **Market Watchlist** — formerly "Signals"; renamed to technical levels (Support Level / Resistance Level / Price Objectives); premium gated
4. **Calculators** — 3 tools: Position Sizer (risk per trade → shares), Option Greeks (Black-Scholes: Delta/Gamma/Theta/Vega), Pivot Points & Fibonacci levels
5. **Reports** — investment reports by category (premium gated)
6. **Elite Pricing** — Razorpay Elite Monthly ₹4,999/month subscription

### Compliance (Legal-First)
- Disclaimer modal shown on **every launch** (not cached in localStorage)
- Permanent footer: "TradeMaster Pro is a self-tracking tool. We do not provide SEBI-registered investment advice."
- Signal card labels: "Bullish/Bearish Setup" (not BUY/SELL); "Support Level" (not Entry Price); "Resistance Level" (not Stop Loss); "Price Objective 1/2" (not Target)
- Watchlist sub-header: "Technical analysis levels · Educational reference only"

### DB Tables
- `trademaster_signals` — market watchlist entries with segment, prices, status
- `trademaster_subscriptions` — Razorpay subscription sessions
- `trademaster_journal` — user trade log (asset, entry/exit, qty, strategy, P&L, outcome)
- `trademaster_investment_reports` — curated investment reports by category

### API Routes (Journal)
- `GET /api/trademaster/journal?session_id=` — list all trades for session
- `POST /api/trademaster/journal` — log a new trade
- `PUT /api/trademaster/journal/:id` — close trade / update exit price → auto-calc P&L
- `DELETE /api/trademaster/journal/:id` — delete trade
- `GET /api/trademaster/journal/analytics?session_id=` — win rate, P&L curve, day analysis, strategy breakdown

### Monetization
- Free: Journal + Calculators + 3 Watchlist entries
- Elite (₹4,999/month): Full Watchlist, Reports, Advanced Analytics — Razorpay order at `POST /api/trademaster/payment/order` (amount: 499900 paise)

### Required Secrets
- `TRADEMASTER_ADMIN_TOKEN` — admin login token (set)
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — live Razorpay keys (set)
- `ADMOB_BANNER_UNIT_ID`, `ADMOB_INTERSTITIAL_UNIT_ID`, `ADMOB_PUBLISHER_ID` — AdMob (set)
- `TELEGRAM_BOT_TOKEN` — Telegram Bot API token (optional)
- `TELEGRAM_CHANNEL_ID` — Telegram channel/group ID (optional)
- `FINNHUB_API_KEY` — Finnhub free tier for price ticker (optional)

## Inventory AI Pro (`artifacts/inventory-ai-pro`)

Mobile-first MSME stock management PWA at `/inventory/`. Features AI-assisted product identification via camera, barcode/QR scanning with ZXing, inventory CRUD, low-stock alerts (< 5 units), full audit log timeline, freemium limits (100 products), Stripe Pro subscription ($5/month), and AdMob test banner for free users.

### Backend routes (`/api/inventory/...`)
- `GET/POST /api/inventory/products` — CRUD with search/category/lowStock filters; POST enforces 100-item free tier limit
- `GET/PUT/DELETE /api/inventory/products/:id`
- `POST /api/inventory/scan` — accepts base64 image (calls Google Vision if `GOOGLE_VISION_API_KEY` set) or barcode string; returns mock label if no key
- `GET /api/inventory/audit-logs` — paginated audit trail
- `GET /api/inventory/low-stock` — products with quantity < 5
- `GET /api/inventory/summary` — dashboard stats (totals, low-stock count, total value, categories, recent activity)
- `POST /api/inventory/create-checkout-session` — Stripe $5/month subscription checkout
- `POST /api/inventory/webhook` — Stripe webhook handler
- `POST /api/inventory/billing-portal` — Stripe billing portal session

### DB tables
- `inventory_products` — product catalog with userId, name, sku, category, quantity, unit_price, image_url
- `inventory_audit_logs` — change log: action (added/removed/edited/deleted), delta, note, timestamps

### SQL Migration
Run `artifacts/inventory-ai-pro/migrations/001_inventory_schema.sql` in Supabase SQL editor for Supabase deployment.

### Required Secrets (optional — app works with mocks if absent)
- `GOOGLE_VISION_API_KEY` — Google Vision for AI product identification from photos
- `STRIPE_SECRET_KEY` — Stripe for Pro subscription checkout
- `STRIPE_INVENTORY_WEBHOOK_SECRET` — Stripe webhook secret for inventory subscription events
- `ADMOB_BANNER_ID` — AdMob banner unit ID (defaults to test ID ca-app-pub-3940256099942544/6300978111)

## Important Notes
- `@tanstack/react-query` is in vite dedupe list (prevents duplicate React context errors)
- Yahoo Finance prices may show N/A in Replit environment (rate-limited) — falls back gracefully
- Stripe returns 500 if `STRIPE_SECRET_KEY` not configured
- TradeMaster Pro ticker shows "—" if Finnhub key not configured (graceful fallback)
- Inventory AI Pro camera falls back gracefully when camera is unavailable (headless/desktop environments)
