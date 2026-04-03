import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, usersTable, favoritesTable, recentlyPlayedTable, lecturesTable, speakersTable } from "@workspace/db";
import { RegisterUserBody, LoginUserBody, AddFavoriteParams, RemoveFavoriteParams, AddRecentlyPlayedParams, GetRecentlyPlayedQueryParams } from "@workspace/api-zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router: IRouter = Router();

const JWT_SECRET = process.env.SESSION_SECRET ?? "nurulquran_secret_key";

const lectureSelectFields = {
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
};

const getAuthUser = (req: any): number | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    return decoded.userId;
  } catch {
    return null;
  }
};

router.post("/users/register", async (req, res): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password, name } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ email, passwordHash, name }).returning();

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isPremium: user.isPremium,
      createdAt: user.createdAt,
    },
    token,
  });
});

router.post("/users/login", async (req, res): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isPremium: user.isPremium,
      createdAt: user.createdAt,
    },
    token,
  });
});

router.post("/users/logout", async (_req, res): Promise<void> => {
  res.json({ success: true, message: "Logged out" });
});

router.get("/users/me", async (req, res): Promise<void> => {
  const userId = getAuthUser(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    isPremium: user.isPremium,
    createdAt: user.createdAt,
  });
});

router.get("/users/favorites", async (req, res): Promise<void> => {
  const userId = getAuthUser(req);
  if (!userId) {
    res.json([]);
    return;
  }

  const favorites = await db
    .select(lectureSelectFields)
    .from(favoritesTable)
    .innerJoin(lecturesTable, eq(favoritesTable.lectureId, lecturesTable.id))
    .leftJoin(speakersTable, eq(lecturesTable.speakerId, speakersTable.id))
    .where(eq(favoritesTable.userId, userId))
    .orderBy(desc(favoritesTable.createdAt));

  res.json(favorites);
});

router.post("/users/favorites/:lectureId", async (req, res): Promise<void> => {
  const userId = getAuthUser(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const rawId = Array.isArray(req.params.lectureId) ? req.params.lectureId[0] : req.params.lectureId;
  const parsed = AddFavoriteParams.safeParse({ lectureId: parseInt(rawId, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid lecture ID" });
    return;
  }

  await db
    .insert(favoritesTable)
    .values({ userId, lectureId: parsed.data.lectureId })
    .onConflictDoNothing();

  res.status(201).json({ success: true, message: "Added to favorites" });
});

router.delete("/users/favorites/:lectureId", async (req, res): Promise<void> => {
  const userId = getAuthUser(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const rawId = Array.isArray(req.params.lectureId) ? req.params.lectureId[0] : req.params.lectureId;
  const parsed = RemoveFavoriteParams.safeParse({ lectureId: parseInt(rawId, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid lecture ID" });
    return;
  }

  await db
    .delete(favoritesTable)
    .where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.lectureId, parsed.data.lectureId)));

  res.json({ success: true, message: "Removed from favorites" });
});

router.get("/users/recently-played", async (req, res): Promise<void> => {
  const userId = getAuthUser(req);
  if (!userId) {
    res.json([]);
    return;
  }

  const parsed = GetRecentlyPlayedQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 10) : 10;

  const played = await db
    .select(lectureSelectFields)
    .from(recentlyPlayedTable)
    .innerJoin(lecturesTable, eq(recentlyPlayedTable.lectureId, lecturesTable.id))
    .leftJoin(speakersTable, eq(lecturesTable.speakerId, speakersTable.id))
    .where(eq(recentlyPlayedTable.userId, userId))
    .orderBy(desc(recentlyPlayedTable.playedAt))
    .limit(limit);

  res.json(played);
});

router.post("/users/recently-played/:lectureId", async (req, res): Promise<void> => {
  const userId = getAuthUser(req);
  if (!userId) {
    res.status(201).json({ success: true, message: "Recorded" });
    return;
  }

  const rawId = Array.isArray(req.params.lectureId) ? req.params.lectureId[0] : req.params.lectureId;
  const parsed = AddRecentlyPlayedParams.safeParse({ lectureId: parseInt(rawId, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid lecture ID" });
    return;
  }

  await db.insert(recentlyPlayedTable).values({ userId, lectureId: parsed.data.lectureId });

  res.status(201).json({ success: true, message: "Recorded" });
});

export default router;
