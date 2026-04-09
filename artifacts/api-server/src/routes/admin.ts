import { Router } from "express";
import { seedDatabase } from "../lib/seed";

const router = Router();

router.post("/admin/seed", async (_req, res) => {
  try {
    await seedDatabase(true);
    res.json({ ok: true, message: "Seed completed successfully" });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
