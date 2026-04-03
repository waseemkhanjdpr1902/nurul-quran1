import { pgTable, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { lecturesTable } from "./lectures";

export const favoritesTable = pgTable("favorites", {
  userId: integer("user_id").notNull().references(() => usersTable.id),
  lectureId: integer("lecture_id").notNull().references(() => lecturesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.lectureId] }),
}));

export type Favorite = typeof favoritesTable.$inferSelect;
