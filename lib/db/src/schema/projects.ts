import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const projectCategoryEnum = pgEnum("project_category", ["mod", "plugin"]);

export type ProjectBlockData = {
  id: string;
  kind: string;
  title: string;
  settings: Record<string, unknown>;
};

export const projectsTable = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: varchar("owner_user_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  category: projectCategoryEnum("category").notNull(),
  version: varchar("version", { length: 32 }).notNull(),
  iconPath: text("icon_path"),
  blocks: jsonb("blocks").$type<ProjectBlockData[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Project = typeof projectsTable.$inferSelect;
export type NewProject = typeof projectsTable.$inferInsert;