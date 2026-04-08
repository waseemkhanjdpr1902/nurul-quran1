import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/engage/verse/:mood", async (req: Request, res: Response): Promise<void> => {
  try {
    const mood = String(req.params["mood"]);
    const allowed = ["stressed", "grateful", "anxious", "peaceful"];
    if (!allowed.includes(mood.toLowerCase())) {
      res.status(400).json({ error: "Invalid mood" }); return;
    }
    const rows = await db.execute(
      sql`SELECT id, arabic, translation, reference, mood
          FROM mood_verses
          WHERE mood = ${mood.toLowerCase()}
          ORDER BY RANDOM()
          LIMIT 1`
    );
    if (!rows.rows.length) {
      res.status(404).json({ error: "No verse found for this mood" }); return;
    }
    res.json({ verse: rows.rows[0] });
  } catch (err) {
    console.error("engage/verse error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/engage/ummah-goal", async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.execute(
      sql`SELECT id, pages_read, goal_target, label FROM global_stats WHERE id = 1`
    );
    if (!rows.rows.length) {
      res.status(404).json({ error: "Stats not found" }); return;
    }
    res.json({ stats: rows.rows[0] });
  } catch (err) {
    console.error("engage/ummah-goal error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/engage/ummah-goal/increment", async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.execute(
      sql`UPDATE global_stats
          SET pages_read = pages_read + 1
          WHERE id = 1
          RETURNING pages_read, goal_target, label`
    );
    if (!rows.rows.length) {
      res.status(404).json({ error: "Stats not found" }); return;
    }
    res.json({ stats: rows.rows[0] });
  } catch (err) {
    console.error("engage/increment error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
