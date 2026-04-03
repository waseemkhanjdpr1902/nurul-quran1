import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const speakersTable = pgTable("speakers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  bio: text("bio"),
  imageUrl: text("image_url"),
  lectureCount: integer("lecture_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSpeakerSchema = createInsertSchema(speakersTable).omit({ id: true, createdAt: true });
export type InsertSpeaker = z.infer<typeof insertSpeakerSchema>;
export type Speaker = typeof speakersTable.$inferSelect;
