import { Router, type IRouter } from "express";
import healthRouter from "./health";
import messagingRouter from "./messaging";
import staffAuthRouter from "./staff-auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(staffAuthRouter);
router.use(messagingRouter);

export default router;
