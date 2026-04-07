# TradeMaster Pro — Vercel Deployment

A professional Indian equity trading signals and journal app. This is the standalone, Vercel-deployable version.

## Deploy to Vercel in 3 Steps

### 1. Push to GitHub
Push this folder to a new GitHub repository.

### 2. Import in Vercel
- Go to [vercel.com/new](https://vercel.com/new)
- Import your repository
- Vercel will auto-detect the Vite frontend

### 3. Set Environment Variables in Vercel Dashboard

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string (Vercel Postgres, Neon, Supabase, etc.) |
| `RAZORPAY_KEY_ID` | ✅ Yes | Razorpay live or test key ID |
| `RAZORPAY_KEY_SECRET` | ✅ Yes | Razorpay key secret |
| `TRADEMASTER_ADMIN_TOKEN` | ✅ Yes | Strong random string for admin API access |
| `FMP_API_KEY` | Optional | Financial Modeling Prep key for live data feed |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram bot token for signal notifications |
| `TELEGRAM_CHANNEL_ID` | Optional | Telegram channel ID (e.g. `@yourchannel`) |

### Recommended Databases
- **[Neon](https://neon.tech)** — Free PostgreSQL with serverless driver (best for Vercel)
- **[Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)** — One-click setup in Vercel dashboard
- **[Supabase](https://supabase.com)** — Free tier with 500MB storage

## Local Development

```bash
npm install

# Create .env.local from example
cp .env.example .env.local
# Edit .env.local with your values

# Start frontend dev server
npm run dev
```

For the API during local dev, set up a local proxy or deploy to Vercel preview.

## Project Structure

```
trademaster-vercel/
├── api/
│   └── index.ts        # All API routes (Vercel serverless function)
├── src/                # React frontend
│   ├── components/     # UI components (shadcn/ui based)
│   ├── pages/          # App pages
│   ├── lib/api.ts      # Frontend API client
│   └── App.tsx         # Router + layout
├── public/             # Static assets, PWA manifest, icons
├── index.html
├── package.json
├── vite.config.ts
└── vercel.json         # Routing: /api/* → serverless, /* → SPA
```

## After Deploying

1. Visit your Vercel URL
2. The app works without any data — signals can be added via admin API
3. Seed investment reports: `POST /api/trademaster/reports/seed` (with Authorization header)

## Admin API Access

All admin endpoints require: `Authorization: Bearer <TRADEMASTER_ADMIN_TOKEN>`

- `GET /api/trademaster/admin/verify` — Check if token is valid
- `POST /api/trademaster/signals` — Create a new signal
- `PATCH /api/trademaster/signals/:id` — Update a signal
- `DELETE /api/trademaster/signals/:id` — Delete a signal
- `POST /api/trademaster/reports/seed` — Seed investment reports
- `GET /api/trademaster/subscriptions` — List all subscriptions
