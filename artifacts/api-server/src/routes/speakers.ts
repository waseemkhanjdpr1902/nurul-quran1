import { Router, type IRouter } from "express";
import { db, speakersTable } from "@workspace/db";
import { asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/speakers", async (_req, res): Promise<void> => {
  const speakers = await db
    .select()
    .from(speakersTable)
    .orderBy(asc(speakersTable.name));

  res.json(speakers);
});

export default router;
