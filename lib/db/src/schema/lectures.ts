import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { speakersTable } from "./speakers";

export const lecturesTable = pgTable("lectures", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  audioUrl: text("audio_url").notNull(),
  duration: integer("duration"),
  language: text("language").notNull().default("English"),
  category: text("category").notNull(),
  isPremium: boolean("is_premium").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  playCount: integer("play_count").notNull().default(0),
  thumbnailUrl: text("thumbnail_url"),
  speakerId: integer("speaker_id").references(() => speakersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLectureSchema = createInsertSchema(lecturesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLecture = z.infer<typeof insertLectureSchema>;
export type Lecture = typeof lecturesTable.$inferSelect;
