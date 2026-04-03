import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, coursesTable, speakersTable } from "@workspace/db";
import { GetCourseParams, GetCoursesQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/courses", async (req, res): Promise<void> => {
  const parsed = GetCoursesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { category, isPremium } = parsed.data;
  const conditions = [];

  if (category) {
    conditions.push(eq(coursesTable.category, category));
  }

  if (isPremium != null) {
    conditions.push(eq(coursesTable.isPremium, isPremium));
  }

  const courses = await db
    .select({
      id: coursesTable.id,
      title: coursesTable.title,
      description: coursesTable.description,
      category: coursesTable.category,
      isPremium: coursesTable.isPremium,
      lectureCount: coursesTable.lectureCount,
      thumbnailUrl: coursesTable.thumbnailUrl,
      speakerId: coursesTable.speakerId,
      speakerName: speakersTable.name,
      createdAt: coursesTable.createdAt,
    })
    .from(coursesTable)
    .leftJoin(speakersTable, eq(coursesTable.speakerId, speakersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(coursesTable.createdAt));

  res.json(courses);
});

router.get("/courses/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetCourseParams.safeParse({ id: parseInt(rawId, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid course ID" });
    return;
  }

  const [course] = await db
    .select({
      id: coursesTable.id,
      title: coursesTable.title,
      description: coursesTable.description,
      category: coursesTable.category,
      isPremium: coursesTable.isPremium,
      lectureCount: coursesTable.lectureCount,
      thumbnailUrl: coursesTable.thumbnailUrl,
      speakerId: coursesTable.speakerId,
      speakerName: speakersTable.name,
      createdAt: coursesTable.createdAt,
    })
    .from(coursesTable)
    .leftJoin(speakersTable, eq(coursesTable.speakerId, speakersTable.id))
    .where(eq(coursesTable.id, parsed.data.id));

  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  res.json(course);
});

export default router;
