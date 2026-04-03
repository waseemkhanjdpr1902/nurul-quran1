import { Router, type IRouter } from "express";
import { db, lecturesTable, coursesTable, speakersTable, usersTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [lectureCount] = await db.select({ count: sql<number>`count(*)::int` }).from(lecturesTable);
  const [courseCount] = await db.select({ count: sql<number>`count(*)::int` }).from(coursesTable);
  const [speakerCount] = await db.select({ count: sql<number>`count(*)::int` }).from(speakersTable);
  const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);

  const totalPlays = await db.select({ total: sql<number>`sum(play_count)::int` }).from(lecturesTable);
  const listenerCount = (totalPlays[0]?.total ?? 0) + userCount.count;

  const categoryRows = await db
    .select({
      category: lecturesTable.category,
      count: sql<number>`count(*)::int`,
    })
    .from(lecturesTable)
    .groupBy(lecturesTable.category);

  res.json({
    totalLectures: lectureCount.count,
    totalCourses: courseCount.count,
    totalSpeakers: speakerCount.count,
    totalListeners: listenerCount,
    categories: categoryRows.map((r) => ({ name: r.category, count: r.count })),
  });
});

export default router;
