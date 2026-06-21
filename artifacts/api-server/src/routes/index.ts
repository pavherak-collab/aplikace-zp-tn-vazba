import { Router, type IRouter } from "express";
import healthRouter from "./health";
import feedbackRouter from "./feedback";
import menusRouter from "./menus";
import reportsRouter from "./reports";
import emailRouter from "./email";

const router: IRouter = Router();

router.use(healthRouter);
router.use(feedbackRouter);
router.use(menusRouter);
router.use(reportsRouter);
router.use(emailRouter);

export default router;
export * from "./feedback";
