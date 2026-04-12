import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "[DB] DATABASE_URL is not set. Database-dependent features will return errors gracefully. " +
    "Static content (lectures, courses, Quran, halal stocks) and payments work without a database."
  );
}

export const pool = new Pool({
  connectionString: connectionString || "postgres://localhost/nurulquran_no_db",
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
