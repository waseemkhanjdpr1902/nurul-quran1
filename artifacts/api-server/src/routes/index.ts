import { Router, type IRouter } from "express";
import healthRouter from "./health";
import lecturesRouter from "./lectures";
import coursesRouter from "./courses";
import speakersRouter from "./speakers";
import ayahRouter from "./ayah";
import dashboardRouter from "./dashboard";
import usersRouter from "./users";
import paymentsRouter from "./payments";
import halalStocksRouter from "./halal-stocks";
import razorpayRouter from "./razorpay";
import tradeMasterRouter from "./trademaster";
import inventoryRouter from "./inventory";
import stockswapRouter from "./stockswap";
import engageRouter from "./engage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(lecturesRouter);
router.use(coursesRouter);
router.use(speakersRouter);
router.use(ayahRouter);
router.use(dashboardRouter);
router.use(usersRouter);
router.use(paymentsRouter);
router.use(halalStocksRouter);
router.use(razorpayRouter);
router.use(tradeMasterRouter);
router.use(inventoryRouter);
router.use(stockswapRouter);
router.use(engageRouter);

export default router;
