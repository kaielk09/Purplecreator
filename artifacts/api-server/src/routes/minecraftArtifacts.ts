import { and, eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { GenerateProjectArtifactParams } from "@workspace/api-zod";
import { db, projectsTable } from "@workspace/db";
import { Router, type IRouter } from "express";
import {
  generateMinecraftArtifact,
  MinecraftBuildError,
} from "../lib/minecraftArtifactBuilder";

const router: IRouter = Router();

router.post(
  "/projects/:id/generate",
  async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const params = GenerateProjectArtifactParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [project] = await db
      .select({
        id: projectsTable.id,
        name: projectsTable.name,
        category: projectsTable.category,
        version: projectsTable.version,
        blocks: projectsTable.blocks,
      })
      .from(projectsTable)
      .where(
        and(
          eq(projectsTable.id, params.data.id),
          eq(projectsTable.ownerUserId, userId),
        ),
      )
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    try {
      const artifact = await generateMinecraftArtifact(project);
      res
        .status(200)
        .set({
          "Cache-Control": "no-store",
          "Content-Disposition": `attachment; filename="${artifact.fileName}"`,
          "Content-Length": String(artifact.buffer.length),
          "Content-Type": "application/java-archive",
          "X-Minecraft-Version": artifact.gameVersion,
        })
        .send(artifact.buffer);
    } catch (error) {
      if (error instanceof MinecraftBuildError) {
        req.log.warn(
          {
            err: error,
            diagnostic: error.diagnostic,
            projectId: project.id,
            userId,
          },
          "Minecraft jar generation failed",
        );
        res
          .status(error.statusCode)
          .json({ error: error.message });
        return;
      }

      req.log.error(
        { err: error, projectId: project.id, userId },
        "Unexpected Minecraft jar generation error",
      );
      res
        .status(503)
        .json({
          error: "Nie udało się teraz wygenerować pliku .jar. Spróbuj ponownie.",
        });
    }
  },
);

export default router;