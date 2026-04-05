import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

// ── GET /engage/verse/:mood ───────────────────────────────────────────────────
// Returns one random verse for the given mood category.
// Moods: stressed | grateful | anxious | peaceful
// Note: the /api prefix is added by the parent app.use("/api", router)
router.get("/engage/verse/:mood", async (req, res) => {
  try {
    const { mood } = req.params;
    const allowed = ["stressed", "grateful", "anxious", "peaceful"];
    if (!allowed.includes(mood.toLowerCase())) {
      return res.status(400).json({ error: "Invalid mood" });
    }

    // Fetch all verses for this mood, then pick one at random
    const rows = await db.execute(
      sql`SELECT id, arabic, translation, reference, mood
          FROM mood_verses
          WHERE mood = ${mood.toLowerCase()}
          ORDER BY RANDOM()
          LIMIT 1`
    );

    if (!rows.rows.length) {
      return res.status(404).json({ error: "No verse found for this mood" });
    }

    res.json({ verse: rows.rows[0] });
  } catch (err) {
    console.error("engage/verse error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET /engage/ummah-goal ────────────────────────────────────────────────────
// Returns the current global Ummah Goal stats (pages read, target, label).
router.get("/engage/ummah-goal", async (req, res) => {
  try {
    const rows = await db.execute(
      sql`SELECT id, pages_read, goal_target, label FROM global_stats WHERE id = 1`
    );

    if (!rows.rows.length) {
      return res.status(404).json({ error: "Stats not found" });
    }

    res.json({ stats: rows.rows[0] });
  } catch (err) {
    console.error("engage/ummah-goal error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── POST /engage/ummah-goal/increment ─────────────────────────────────────────
// Atomically increments the shared pages_read counter by 1.
// Uses PostgreSQL's atomic UPDATE — safe for concurrent requests.
router.post("/engage/ummah-goal/increment", async (req, res) => {
  try {
    const rows = await db.execute(
      sql`UPDATE global_stats
          SET pages_read = pages_read + 1
          WHERE id = 1
          RETURNING pages_read, goal_target, label`
    );

    if (!rows.rows.length) {
      return res.status(404).json({ error: "Stats not found" });
    }

    res.json({ stats: rows.rows[0] });
  } catch (err) {
    console.error("engage/increment error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
