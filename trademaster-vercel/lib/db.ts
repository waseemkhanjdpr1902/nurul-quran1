import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required");
    pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 30000 });
  }
  return pool;
}

export type DbRow = Record<string, unknown>;

export async function query<T = DbRow>(sql: string, params?: unknown[]): Promise<T[]> {
  const p = getPool();
  const result = await p.query(sql, params);
  return result.rows as T[];
}

export async function ensureSchema(): Promise<void> {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS trademaster_signal_states (
      id SERIAL PRIMARY KEY,
      symbol TEXT NOT NULL UNIQUE,
      segment TEXT NOT NULL,
      signal TEXT NOT NULL DEFAULT 'neutral',
      price NUMERIC(12,4),
      ema9 NUMERIC(12,4),
      vwap NUMERIC(12,4),
      rsi NUMERIC(8,4),
      pcr NUMERIC(8,4),
      volume_ratio NUMERIC(8,4),
      volume_confirmed BOOLEAN DEFAULT false,
      delta NUMERIC(6,4),
      candle_high NUMERIC(12,4),
      candle_low NUMERIC(12,4),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await p.query(`
    ALTER TABLE trademaster_signals
    ADD COLUMN IF NOT EXISTS delta NUMERIC(6,4),
    ADD COLUMN IF NOT EXISTS volume_confirmed BOOLEAN NOT NULL DEFAULT false;
  `);
  await p.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trademaster_webhook_platform') THEN
        CREATE TYPE trademaster_webhook_platform AS ENUM ('generic', 'sensibull', 'tradetron');
      END IF;
    END $$;
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS trademaster_webhooks (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'generic',
      secret TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      last_fired_at TIMESTAMPTZ,
      last_status_code INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}
