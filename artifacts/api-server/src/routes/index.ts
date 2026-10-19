import { Router, type IRouter } from "express";
import healthRouter from "./health";
import billingRouter from "./billing";
import minecraftArtifactsRouter from "./minecraftArtifacts";
import minecraftVersionsRouter from "./minecraftVersions";
import projectsRouter from "./projects";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(billingRouter);
router.use(minecraftVersionsRouter);
router.use(projectsRouter);
router.use(minecraftArtifactsRouter);
router.use(storageRouter);

export default router;
