import { Router, type IRouter } from "express";
import healthRouter from "./health";
import staffAuthRouter from "./staff-auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(staffAuthRouter);

export default router;
