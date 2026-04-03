import { Router, type IRouter } from "express";
import { eq, and, desc, or } from "drizzle-orm";
import { db, coursesTable, speakersTable, lecturesTable } from "@workspace/db";
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

router.get("/courses/:id/lectures", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const courseId = parseInt(rawId, 10);
  if (isNaN(courseId)) {
    res.status(400).json({ error: "Invalid course ID" });
    return;
  }

  const [course] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.id, courseId));

  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  const conditions: ReturnType<typeof eq>[] = [eq(lecturesTable.category, course.category)];

  const lectures = await db
    .select({
      id: lecturesTable.id,
      title: lecturesTable.title,
      description: lecturesTable.description,
      audioUrl: lecturesTable.audioUrl,
      duration: lecturesTable.duration,
      language: lecturesTable.language,
      category: lecturesTable.category,
      isPremium: lecturesTable.isPremium,
      isFeatured: lecturesTable.isFeatured,
      playCount: lecturesTable.playCount,
      thumbnailUrl: lecturesTable.thumbnailUrl,
      speakerId: lecturesTable.speakerId,
      speakerName: speakersTable.name,
      createdAt: lecturesTable.createdAt,
    })
    .from(lecturesTable)
    .leftJoin(speakersTable, eq(lecturesTable.speakerId, speakersTable.id))
    .where(and(...conditions))
    .orderBy(lecturesTable.id)
    .limit(20);

  res.json(lectures);
});

export default router;
