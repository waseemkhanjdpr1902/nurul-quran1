import { Router, type IRouter } from "express";
import { db, ayahsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/ayah/daily", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const [ayah] = await db
    .select()
    .from(ayahsTable)
    .where(sql`${ayahsTable.displayDate} = ${today}`)
    .limit(1);

  if (ayah) {
    res.json(ayah);
    return;
  }

  const allAyahs = await db.select().from(ayahsTable);
  if (allAyahs.length === 0) {
    res.status(404).json({ error: "No ayahs found" });
    return;
  }

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const selectedAyah = allAyahs[dayOfYear % allAyahs.length];
  res.json(selectedAyah);
});

export default router;
