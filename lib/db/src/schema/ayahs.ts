import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ayahsTable = pgTable("ayahs", {
  id: serial("id").primaryKey(),
  arabicText: text("arabic_text").notNull(),
  translation: text("translation").notNull(),
  surahName: text("surah_name").notNull(),
  surahNumber: integer("surah_number").notNull(),
  ayahNumber: integer("ayah_number").notNull(),
  reference: text("reference").notNull(),
  displayDate: text("display_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAyahSchema = createInsertSchema(ayahsTable).omit({ id: true, createdAt: true });
export type InsertAyah = z.infer<typeof insertAyahSchema>;
export type Ayah = typeof ayahsTable.$inferSelect;
