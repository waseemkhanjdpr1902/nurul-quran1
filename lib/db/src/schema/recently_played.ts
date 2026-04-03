import { pgTable, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { lecturesTable } from "./lectures";

export const recentlyPlayedTable = pgTable("recently_played", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  lectureId: integer("lecture_id").notNull().references(() => lecturesTable.id),
  playedAt: timestamp("played_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RecentlyPlayed = typeof recentlyPlayedTable.$inferSelect;
