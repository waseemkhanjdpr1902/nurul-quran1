import { Router } from "express";
import { pool } from "@workspace/db";

const router = Router();

router.get("/soul-search", async (req, res) => {
  try {
    const query = ((req.query["q"] as string) ?? "").toLowerCase().trim();
    if (!query || query.length < 2) {
      return res.status(400).json({ error: "Query too short" });
    }

    const words = query.split(/\s+/).filter(Boolean).slice(0, 8);

    // Build scoring expression and WHERE clause
    const scoreExpr = words
      .map((_, i) => `(CASE WHEN keywords ILIKE $${i + 1} THEN 1 ELSE 0 END)`)
      .join(" + ");
    const whereClause = words.map((_, i) => `keywords ILIKE $${i + 1}`).join(" OR ");
    const params = words.map((w) => `%${w}%`);

    const sql = `
      SELECT id, arabic, translation, reference, modern_insight,
             (${scoreExpr}) AS score
      FROM soul_search_verses
      WHERE ${whereClause}
      ORDER BY score DESC, RANDOM()
      LIMIT 1
    `;

    const result = await pool.query(sql, params);

    if (result.rows.length === 0) {
      const fallback = await pool.query(
        `SELECT id, arabic, translation, reference, modern_insight
         FROM soul_search_verses
         ORDER BY RANDOM() LIMIT 1`
      );
      return res.json({ verse: fallback.rows[0] ?? null, fallback: true });
    }

    const { score: _score, ...verse } = result.rows[0];
    return res.json({ verse, fallback: false });
  } catch (err) {
    console.error("soul-search error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
