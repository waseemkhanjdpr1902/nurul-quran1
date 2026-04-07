# TradeMaster Pro — Signal Engine (Next.js + Vercel)

A deployment-ready Next.js App Router application for real-time Nifty/BankNifty/FinNifty option chain signals, powered by a 9 EMA + VWAP + RSI scalping engine.

## Architecture

- **Framework**: Next.js 15 App Router + TypeScript
- **Database**: PostgreSQL (Supabase-compatible, or your existing `DATABASE_URL`)
- **Signal Engine**: Yahoo Finance 5-min OHLCV → 9 EMA + VWAP + RSI(14) + Volume Spike
- **Scheduling**: Vercel Cron Jobs — runs every 3 minutes automatically
- **State-Change Detection**: Only dispatches alerts when signal changes (BUY→SELL, SELL→BUY), eliminating duplicate noise
- **UI**: Mobile-responsive dashboard with React Query polling every 30 seconds

## Signal Logic

| Condition | Signal |
|-----------|--------|
| Price > 9 EMA AND Price > VWAP AND RSI 50–70 AND Volume ≥ 1.2× avg | **BUY** |
| Price < 9 EMA AND Price < VWAP AND RSI 30–50 AND Volume ≥ 1.2× avg | **SELL** |
| Otherwise | **NEUTRAL** |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/signals` | GET | Fetch latest signal states for all segments |
| `/api/generate-signals` | GET/POST | Run signal engine (called by Vercel Cron) |
| `/api/webhooks` | GET/POST/DELETE | Manage webhook dispatch targets |

## Deploy to Vercel in 4 Steps

### Step 1 — Push to GitHub
```bash
git init && git add . && git commit -m "TradeMaster Signal Engine"
git remote add origin https://github.com/yourname/trademaster-signals
git push -u origin main
```

### Step 2 — Import in Vercel
Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub.

### Step 3 — Set Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `CRON_SECRET` | Recommended | Random string to secure the cron endpoint |
| `TRADEMASTER_ADMIN_TOKEN` | Optional | Token for webhook admin endpoints |

### Step 4 — Deploy
Click Deploy. Vercel automatically detects Next.js and configures cron jobs from `vercel.json`.

## Cron Schedule

The `vercel.json` configures the signal engine to run every 3 minutes:
```json
{
  "crons": [
    { "path": "/api/generate-signals", "schedule": "*/3 * * * *" }
  ]
}
```

> Note: Vercel Cron requires a Pro plan or higher for schedules shorter than 1 day.

## Webhook Dispatch

Add webhook targets for automated trade execution:

| Platform | Payload Format |
|----------|----------------|
| **Generic** | Full JSON with all signal data |
| **Sensibull** | Structured with strategy, action, strike, expiry |
| **Tradetron** | Tradetron-compatible condition payload |

Webhooks only fire on **state changes** — no duplicate alerts.

## Local Development

```bash
npm install
# Create .env.local from .env.example
npm run dev
# Open http://localhost:3000
# Manually trigger engine: POST http://localhost:3000/api/generate-signals
```

## Database Tables

Created automatically on first API call:
- `trademaster_signal_states` — current signal state per segment (NIFTY/BANKNIFTY/FINNIFTY)
- `trademaster_signals` — historical signal log (with delta & volume_confirmed columns)
- `trademaster_webhooks` — webhook dispatch configuration
