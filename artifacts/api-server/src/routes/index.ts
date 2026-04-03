import { Router, type IRouter } from "express";
import healthRouter from "./health";
import lecturesRouter from "./lectures";
import coursesRouter from "./courses";
import speakersRouter from "./speakers";
import ayahRouter from "./ayah";
import dashboardRouter from "./dashboard";
import usersRouter from "./users";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(lecturesRouter);
router.use(coursesRouter);
router.use(speakersRouter);
router.use(ayahRouter);
router.use(dashboardRouter);
router.use(usersRouter);
router.use(paymentsRouter);

export default router;
