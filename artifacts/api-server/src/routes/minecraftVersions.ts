import { Router, type IRouter } from "express";
import { listMinecraftReleaseVersions } from "../lib/minecraftArtifactBuilder";

const router: IRouter = Router();

router.get("/minecraft/versions", async (_req, res): Promise<void> => {
  try {
    res.json({ versions: await listMinecraftReleaseVersions() });
  } catch {
    res.status(503).json({
      error: "Nie udało się pobrać listy wersji Minecrafta. Spróbuj ponownie.",
    });
  }
});

export default router;
