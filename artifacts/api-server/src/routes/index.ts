import { Router, type IRouter } from "express";
import healthRouter from "./health";
import feedbackRouter from "./feedback";
import menusRouter from "./menus";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(feedbackRouter);
router.use(menusRouter);
router.use(reportsRouter);

export default router;
export * from "./feedback";
