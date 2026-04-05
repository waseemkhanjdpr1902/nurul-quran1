import { pgTable, serial, text, varchar, integer } from "drizzle-orm/pg-core";

// Mood-tagged Quranic verses
// Each verse is linked to one mood: stressed | grateful | anxious | peaceful
export const moodVerses = pgTable("mood_verses", {
  id: serial("id").primaryKey(),
  arabic: text("arabic").notNull(),
  translation: text("translation").notNull(),
  reference: varchar("reference", { length: 50 }).notNull(), // e.g. "Surah Al-Inshirah 94:6"
  mood: varchar("mood", { length: 30 }).notNull(),           // stressed | grateful | anxious | peaceful
});

// A single shared document tracking the global Ummah Goal
// Only one row exists — id=1 is the single global counter
export const globalStats = pgTable("global_stats", {
  id: serial("id").primaryKey(),
  pagesRead: integer("pages_read").notNull().default(0),
  goalTarget: integer("goal_target").notNull().default(10000),
  label: varchar("label", { length: 100 }).notNull().default("Total Quran Pages Read by the Ummah"),
});
