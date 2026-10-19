import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { Router, type IRouter } from "express";
import {
  CreateProjectBody,
  CreateProjectResponse,
  DeleteProjectParams,
  GetProjectParams,
  GetProjectResponse,
  ListProjectsResponse,
  UpdateProjectBody,
  UpdateProjectParams,
  UpdateProjectResponse,
} from "@workspace/api-zod";
import {
  db,
  projectsTable,
  userEntitlementsTable,
} from "@workspace/db";

const router: IRouter = Router();

function getUserId(req: Parameters<typeof getAuth>[0]): string | null {
  return getAuth(req).userId ?? null;
}

function serializeProject(project: typeof projectsTable.$inferSelect) {
  return {
    id: project.id,
    name: project.name,
    category: project.category,
    version: project.version,
    iconPath: project.iconPath,
    blocks: project.blocks,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

router.get("/projects", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.ownerUserId, userId))
    .orderBy(desc(projectsTable.updatedAt));

  res.json(ListProjectsResponse.parse(projects.map(serializeProject)));
});

router.post("/projects", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const created = await db.transaction(async (tx) => {
    // Serialize concurrent creates from one account so the cap cannot be raced.
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`,
    );
    const [entitlement] = await tx
      .select()
      .from(userEntitlementsTable)
      .where(eq(userEntitlementsTable.ownerUserId, userId))
      .limit(1);
    const projectLimit = entitlement?.projectLimit ?? 10;
    const [total] = await tx
      .select({ count: count() })
      .from(projectsTable)
      .where(eq(projectsTable.ownerUserId, userId));
    if ((total?.count ?? 0) >= projectLimit) {
      return { kind: "limit" as const, projectLimit };
    }

    const [project] = await tx
      .insert(projectsTable)
      .values({
        ownerUserId: userId,
        name: parsed.data.name,
        category: parsed.data.category,
        version: parsed.data.version,
        iconPath: parsed.data.iconPath ?? null,
        blocks: parsed.data.blocks,
      })
      .returning();
    return { kind: "created" as const, project: project! };
  });

  if (created.kind === "limit") {
    res.status(409).json({
      error: `Osiągnięto limit ${created.projectLimit} projektów. Kup Plus, aby zwiększyć go do 100.`,
    });
    return;
  }
  res
    .status(201)
    .json(CreateProjectResponse.parse(serializeProject(created.project)));
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
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

  res.json(GetProjectResponse.parse(serializeProject(project)));
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .update(projectsTable)
    .set({
      name: parsed.data.name,
      category: parsed.data.category,
      version: parsed.data.version,
      iconPath: parsed.data.iconPath ?? null,
      blocks: parsed.data.blocks,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projectsTable.id, params.data.id),
        eq(projectsTable.ownerUserId, userId),
      ),
    )
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(UpdateProjectResponse.parse(serializeProject(project)));
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .delete(projectsTable)
    .where(
      and(
        eq(projectsTable.id, params.data.id),
        eq(projectsTable.ownerUserId, userId),
      ),
    )
    .returning({ id: projectsTable.id });

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;