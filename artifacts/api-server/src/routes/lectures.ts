import { Router, type IRouter } from "express";
import { eq, ilike, and, desc, sql } from "drizzle-orm";
import { db, lecturesTable, speakersTable } from "@workspace/db";
import {
  GetLecturesQueryParams,
  GetLectureParams,
  GetRecentLecturesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const lectureWithSpeaker = async (lectureId?: number, filters?: {
  search?: string;
  speakerId?: number | null;
  language?: string | null;
  category?: string | null;
  isPremium?: boolean | null;
  limit?: number;
  offset?: number;
}) => {
  let query = db
    .select({
      id: lecturesTable.id,
      title: lecturesTable.title,
      description: lecturesTable.description,
      audioUrl: lecturesTable.audioUrl,
      youtubeUrl: lecturesTable.youtubeUrl,
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
    .$dynamic();

  const conditions = [];

  if (lectureId !== undefined) {
    conditions.push(eq(lecturesTable.id, lectureId));
  }

  if (filters?.search) {
    conditions.push(ilike(lecturesTable.title, `%${filters.search}%`));
  }

  if (filters?.speakerId != null) {
    conditions.push(eq(lecturesTable.speakerId, filters.speakerId));
  }

  if (filters?.language) {
    conditions.push(eq(lecturesTable.language, filters.language));
  }

  if (filters?.category) {
    conditions.push(eq(lecturesTable.category, filters.category));
  }

  if (filters?.isPremium != null) {
    conditions.push(eq(lecturesTable.isPremium, filters.isPremium));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  query = query.orderBy(desc(lecturesTable.createdAt));

  if (filters?.limit !== undefined) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset !== undefined) {
    query = query.offset(filters.offset);
  }

  return query;
};

router.get("/lectures", async (req, res): Promise<void> => {
  const parsed = GetLecturesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, speakerId, language, category, isPremium, limit = 20, offset = 0 } = parsed.data;

  const lectures = await lectureWithSpeaker(undefined, {
    search: search ?? undefined,
    speakerId: speakerId ?? undefined,
    language: language ?? undefined,
    category: category ?? undefined,
    isPremium: isPremium ?? undefined,
    limit,
    offset,
  });

  const countQuery = db
    .select({ count: sql<number>`count(*)::int` })
    .from(lecturesTable);

  const [{ count }] = await countQuery;

  res.json({ lectures, total: count, limit, offset });
});

router.get("/lectures/recent", async (req, res): Promise<void> => {
  const parsed = GetRecentLecturesQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 6) : 6;

  const lectures = await lectureWithSpeaker(undefined, { limit, offset: 0 });
  res.json(lectures);
});

router.get("/lectures/featured", async (req, res): Promise<void> => {
  const lectures = await db
    .select({
      id: lecturesTable.id,
      title: lecturesTable.title,
      description: lecturesTable.description,
      audioUrl: lecturesTable.audioUrl,
      youtubeUrl: lecturesTable.youtubeUrl,
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
    .where(eq(lecturesTable.isFeatured, true))
    .orderBy(desc(lecturesTable.createdAt))
    .limit(6);

  res.json(lectures);
});

router.get("/lectures/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetLectureParams.safeParse({ id: parseInt(rawId, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid lecture ID" });
    return;
  }

  const lectures = await lectureWithSpeaker(parsed.data.id);
  const lecture = lectures[0];

  if (!lecture) {
    res.status(404).json({ error: "Lecture not found" });
    return;
  }

  res.json(lecture);
});

export default router;
