import { Readable } from "node:stream";
import { and, eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { RequestUploadUrlBody, RequestUploadUrlResponse } from "@workspace/api-zod";
import { db, projectsTable } from "@workspace/db";
import { Router, type IRouter, type Request } from "express";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();
const MAX_ICON_BYTES = 5 * 1024 * 1024;
const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function currentUserId(req: Request): string | null {
  return getAuth(req).userId ?? null;
}

router.post("/storage/uploads/request-url", async (req, res): Promise<void> => {
  const userId = currentUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (
    parsed.data.size > MAX_ICON_BYTES ||
    !allowedImageTypes.has(parsed.data.contentType)
  ) {
    res.status(400).json({ error: "Choose an image up to 5 MB (PNG, JPG, WebP, or GIF)." });
    return;
  }

  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json(RequestUploadUrlResponse.parse({ uploadURL, objectPath }));
  } catch (error) {
    req.log.error({ err: error, userId }, "Error generating icon upload URL");
    res.status(500).json({ error: "Could not prepare the icon upload." });
  }
});

router.get("/storage/objects/*path", async (req, res): Promise<void> => {
  const userId = currentUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const rawPath = req.params.path;
  const wildcardPath = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;
  const objectPath = `/objects/${wildcardPath}`;
  const [ownedProject] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(
      and(
        eq(projectsTable.ownerUserId, userId),
        eq(projectsTable.iconPath, objectPath),
      ),
    )
    .limit(1);

  if (!ownedProject) {
    res.status(404).json({ error: "Image not found." });
    return;
  }

  try {
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ objectPath }, "Project icon not found");
      res.status(404).json({ error: "Image not found." });
      return;
    }
    req.log.error({ err: error, objectPath }, "Error serving project icon");
    res.status(500).json({ error: "Could not serve the project icon." });
  }
});

export default router;