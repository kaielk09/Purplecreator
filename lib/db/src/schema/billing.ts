import {
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const accountPlanEnum = pgEnum("account_plan", ["free", "plus"]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "CREATING",
  "PENDING",
  "PAID",
  "FAILED",
]);

export const userEntitlementsTable = pgTable("user_entitlements", {
  ownerUserId: varchar("owner_user_id", { length: 255 }).primaryKey(),
  plan: accountPlanEnum("plan").notNull().default("free"),
  projectLimit: integer("project_limit").notNull().default(10),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const billingPaymentsTable = pgTable(
  "billing_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: varchar("owner_user_id", { length: 255 }).notNull(),
    transactionId: varchar("transaction_id", { length: 255 }),
    webhookTokenHash: varchar("webhook_token_hash", { length: 64 }).notNull(),
    amountGrosz: integer("amount_grosz").notNull().default(2000),
    currency: varchar("currency", { length: 3 }).notNull().default("PLN"),
    status: paymentStatusEnum("status").notNull().default("CREATING"),
    paymentUrl: varchar("payment_url", { length: 2048 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("billing_payments_transaction_id_unique").on(
      table.transactionId,
    ),
  ],
);

export type UserEntitlement = typeof userEntitlementsTable.$inferSelect;
export type BillingPayment = typeof billingPaymentsTable.$inferSelect;
