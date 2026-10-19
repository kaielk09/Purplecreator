import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { Router, type IRouter } from "express";
import {
  billingPaymentsTable,
  db,
  userEntitlementsTable,
} from "@workspace/db";

const router: IRouter = Router();
const TOSTHOST_API_BASE = "https://my.tosthost.pl/api/v1";
const PLUS_PRICE_PLN = 20;

type TostHostStatus = {
  success?: boolean;
  data?: {
    id?: string | number;
    status?: string;
    amount?: string | number;
    currency?: string;
    customReference?: string;
    isSandbox?: boolean;
  };
};

function getPublicAppUrl(): URL {
  const configured = process.env.PUBLIC_APP_URL;
  if (!configured) throw new Error("PUBLIC_APP_URL is not configured");
  const appUrl = new URL(configured);
  if (appUrl.protocol !== "https:") {
    throw new Error("PUBLIC_APP_URL must use HTTPS");
  }
  return appUrl;
}

function apiKey(): string {
  const key = process.env.TOSTHOST_API_KEY;
  if (!key) throw new Error("TOSTHOST_API_KEY is not configured");
  return key;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeTokenMatches(token: string, expectedHash: string): boolean {
  const actualHash = Buffer.from(sha256(token), "hex");
  const storedHash = Buffer.from(expectedHash, "hex");
  return (
    actualHash.length === storedHash.length &&
    timingSafeEqual(actualHash, storedHash)
  );
}

function isPaidTostHostStatus(
  result: TostHostStatus,
  payment: typeof billingPaymentsTable.$inferSelect,
): boolean {
  const data = result.data;
  return (
    result.success === true &&
    !!data &&
    String(data.id) === payment.transactionId &&
    data.status?.toUpperCase() === "PAID" &&
    Number(data.amount) === PLUS_PRICE_PLN &&
    data.currency === "PLN" &&
    data.customReference === payment.id &&
    data.isSandbox === false
  );
}

async function verifyTostHostPayment(
  payment: typeof billingPaymentsTable.$inferSelect,
): Promise<boolean> {
  if (!payment.transactionId) return false;
  const response = await fetch(
    `${TOSTHOST_API_BASE}/transactions/status/${encodeURIComponent(payment.transactionId)}`,
    {
      headers: { Authorization: `Bearer ${apiKey()}` },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok) {
    throw new Error(`TostHost status request failed (${response.status})`);
  }
  const result = (await response.json()) as TostHostStatus;
  return isPaidTostHostStatus(result, payment);
}

async function activatePlus(
  payment: typeof billingPaymentsTable.$inferSelect,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(billingPaymentsTable)
      .set({ status: "PAID", paidAt: new Date() })
      .where(eq(billingPaymentsTable.id, payment.id));
    await tx
      .insert(userEntitlementsTable)
      .values({
        ownerUserId: payment.ownerUserId,
        plan: "plus",
        projectLimit: 100,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userEntitlementsTable.ownerUserId,
        set: { plan: "plus", projectLimit: 100, updatedAt: new Date() },
      });
  });
}

function appReturnUrl(result: "success" | "pending" | "cancelled" | "error"): string {
  const url = getPublicAppUrl();
  url.pathname = "/";
  url.search = new URLSearchParams({ payment: result }).toString();
  return url.toString();
}

router.get("/billing/status", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const [entitlement] = await db
    .select()
    .from(userEntitlementsTable)
    .where(eq(userEntitlementsTable.ownerUserId, userId))
    .limit(1);
  res.json({
    plan: entitlement?.plan ?? "free",
    projectLimit: entitlement?.projectLimit ?? 10,
  });
});

router.post("/billing/tosthost/checkout", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  let appUrl: URL;
  let key: string;
  try {
    appUrl = getPublicAppUrl();
    key = apiKey();
  } catch {
    res.status(503).json({
      error: "Płatności nie są jeszcze skonfigurowane na serwerze.",
    });
    return;
  }

  const callbackToken = randomBytes(32).toString("hex");
  const paymentRecord = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`,
    );

    const [entitlement] = await tx
      .select()
      .from(userEntitlementsTable)
      .where(eq(userEntitlementsTable.ownerUserId, userId))
      .limit(1);
    if (entitlement?.plan === "plus") return { kind: "already-plus" as const };

    const [existing] = await tx
      .select()
      .from(billingPaymentsTable)
      .where(
        and(
          eq(billingPaymentsTable.ownerUserId, userId),
          inArray(billingPaymentsTable.status, ["PENDING", "CREATING"]),
        ),
      )
      .orderBy(desc(billingPaymentsTable.createdAt))
      .limit(1);
    if (existing) {
      return existing.status === "PENDING" && existing.paymentUrl
        ? ({ kind: "existing" as const, paymentUrl: existing.paymentUrl } as const)
        : ({ kind: "creating" as const } as const);
    }

    const [created] = await tx
      .insert(billingPaymentsTable)
      .values({
        ownerUserId: userId,
        webhookTokenHash: sha256(callbackToken),
        amountGrosz: 2000,
        currency: "PLN",
        status: "CREATING",
      })
      .returning();
    return { kind: "created" as const, payment: created! };
  });

  if (paymentRecord.kind === "already-plus") {
    res.status(409).json({ error: "Masz już aktywny plan Plus." });
    return;
  }
  if (paymentRecord.kind === "existing") {
    res.json({ paymentUrl: paymentRecord.paymentUrl, amount: 20, currency: "PLN" });
    return;
  }
  if (paymentRecord.kind === "creating") {
    res.status(409).json({
      error: "Płatność jest przygotowywana. Spróbuj ponownie za chwilę.",
    });
    return;
  }

  const payment = paymentRecord.payment;
  const webhookUrl = new URL("/api/billing/tosthost/webhook", appUrl);
  webhookUrl.searchParams.set("token", callbackToken);
  const successUrl = new URL("/api/billing/tosthost/return", appUrl);
  successUrl.searchParams.set("reference", payment.id);
  const cancelUrl = new URL("/", appUrl);
  cancelUrl.searchParams.set("payment", "cancelled");

  try {
    const response = await fetch(`${TOSTHOST_API_BASE}/transactions/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: PLUS_PRICE_PLN,
        currency: "PLN",
        name: "Purple Creator Plus",
        successUrl: successUrl.toString(),
        cancelUrl: cancelUrl.toString(),
        notifyUrl: webhookUrl.toString(),
        feePayer: "recipient",
        customReference: payment.id,
        isSandbox: false,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const result = (await response.json()) as {
      success?: boolean;
      transactionId?: string | number;
      paymentLink?: string;
    };
    if (!response.ok || result.success !== true || !result.transactionId || !result.paymentLink) {
      throw new Error("TostHost did not return a valid checkout link");
    }

    const paymentUrl = new URL(result.paymentLink);
    if (
      paymentUrl.protocol !== "https:" ||
      paymentUrl.hostname !== "my.tosthost.pl"
    ) {
      throw new Error("TostHost returned an unexpected payment host");
    }

    await db
      .update(billingPaymentsTable)
      .set({
        transactionId: String(result.transactionId),
        paymentUrl: paymentUrl.toString(),
        status: "PENDING",
      })
      .where(eq(billingPaymentsTable.id, payment.id));

    res.json({ paymentUrl: paymentUrl.toString(), amount: 20, currency: "PLN" });
  } catch (error) {
    await db
      .update(billingPaymentsTable)
      .set({ status: "FAILED" })
      .where(eq(billingPaymentsTable.id, payment.id));
    req.log.warn({ err: error, userId }, "TostHost checkout creation failed");
    res.status(502).json({
      error: "Nie udało się utworzyć płatności. Spróbuj ponownie.",
    });
  }
});

router.post("/billing/tosthost/webhook", async (req, res): Promise<void> => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  const transactionId =
    typeof req.body?.transactionId === "string" ||
    typeof req.body?.transactionId === "number"
      ? String(req.body.transactionId)
      : "";
  if (!token || !transactionId) {
    res.sendStatus(401);
    return;
  }

  const [payment] = await db
    .select()
    .from(billingPaymentsTable)
    .where(eq(billingPaymentsTable.transactionId, transactionId))
    .limit(1);
  if (!payment || !safeTokenMatches(token, payment.webhookTokenHash)) {
    res.sendStatus(401);
    return;
  }

  try {
    if (await verifyTostHostPayment(payment)) await activatePlus(payment);
    res.sendStatus(204);
  } catch (error) {
    req.log.warn({ err: error, transactionId }, "TostHost webhook verification failed");
    res.status(503).json({ error: "Status płatności nie jest teraz dostępny." });
  }
});

router.get("/billing/tosthost/return", async (req, res): Promise<void> => {
  const reference = typeof req.query.reference === "string" ? req.query.reference : "";
  if (!/^[0-9a-f-]{36}$/i.test(reference)) {
    res.redirect(302, appReturnUrl("error"));
    return;
  }

  const [payment] = await db
    .select()
    .from(billingPaymentsTable)
    .where(eq(billingPaymentsTable.id, reference))
    .limit(1);
  if (!payment) {
    res.redirect(302, appReturnUrl("error"));
    return;
  }

  try {
    const paid = await verifyTostHostPayment(payment);
    if (paid) {
      await activatePlus(payment);
      res.redirect(302, appReturnUrl("success"));
      return;
    }
    res.redirect(302, appReturnUrl("pending"));
  } catch (error) {
    req.log.warn({ err: error, reference }, "TostHost return verification failed");
    res.redirect(302, appReturnUrl("pending"));
  }
});

export default router;
