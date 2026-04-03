import { Router, type IRouter } from "express";
import { eq, and, lt, ilike, sql } from "drizzle-orm";
import { db, inventoryProductsTable, inventoryAuditLogsTable, inventoryUserSubscriptionsTable } from "@workspace/db";
import {
  ListInventoryProductsQueryParams,
  CreateInventoryProductBody,
  GetInventoryProductParams,
  UpdateInventoryProductParams,
  UpdateInventoryProductBody,
  DeleteInventoryProductParams,
  ScanInventoryItemBody,
  ListInventoryAuditLogsQueryParams,
  CreateInventoryCheckoutSessionBody,
  CreateInventoryBillingPortalBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

interface StripeCheckoutSession {
  id: string;
  customer?: string | null;
  subscription?: string | null;
  client_reference_id?: string | null;
  metadata?: Record<string, string | undefined> | null;
}

interface StripeSubscription {
  id: string;
  customer?: string | null;
  metadata?: Record<string, string | undefined> | null;
}

type StripeEventObject = StripeCheckoutSession | StripeSubscription;

const router: IRouter = Router();

const LOW_STOCK_THRESHOLD = 5;
const FREE_TIER_LIMIT = 100;

const getStripe = () => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return null;
  const Stripe = require("stripe");
  return new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
};

router.get("/inventory/products", async (req, res): Promise<void> => {
  const parsed = ListInventoryProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, category, lowStock } = parsed.data;

  const conditions = [];

  if (search) {
    conditions.push(ilike(inventoryProductsTable.name, `%${search}%`));
  }
  if (category) {
    conditions.push(eq(inventoryProductsTable.category, category));
  }
  if (lowStock) {
    conditions.push(lt(inventoryProductsTable.quantity, LOW_STOCK_THRESHOLD));
  }

  const products = await db
    .select()
    .from(inventoryProductsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(inventoryProductsTable.createdAt);

  res.json(
    products.map((p) => ({
      ...p,
      unitPrice: parseFloat(p.unitPrice),
    })),
  );
});

router.post("/inventory/products", async (req, res): Promise<void> => {
  const parsed = CreateInventoryProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = parsed.data.userId || "demo-user";

  const [subscription] = await db
    .select()
    .from(inventoryUserSubscriptionsTable)
    .where(eq(inventoryUserSubscriptionsTable.userId, userId));

  const isPro = subscription?.isPro ?? false;

  if (!isPro) {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryProductsTable)
      .where(eq(inventoryProductsTable.userId, userId));

    if ((countResult?.count || 0) >= FREE_TIER_LIMIT) {
      res.status(403).json({
        error: "Free tier limit reached. Upgrade to Pro to add more products.",
        code: "FREE_TIER_LIMIT",
      });
      return;
    }
  }

  const [product] = await db
    .insert(inventoryProductsTable)
    .values({
      userId,
      name: parsed.data.name,
      sku: parsed.data.sku ?? null,
      category: parsed.data.category ?? null,
      quantity: parsed.data.quantity ?? 0,
      unitPrice: String(parsed.data.unitPrice ?? 0),
      imageUrl: parsed.data.imageUrl ?? null,
    })
    .returning();

  await db.insert(inventoryAuditLogsTable).values({
    userId,
    productId: product.id,
    productName: product.name,
    action: "added",
    delta: product.quantity,
    note: "Product created",
  });

  res.status(201).json({ ...product, unitPrice: parseFloat(product.unitPrice) });
});

router.get("/inventory/products/:id", async (req, res): Promise<void> => {
  const params = GetInventoryProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db
    .select()
    .from(inventoryProductsTable)
    .where(eq(inventoryProductsTable.id, params.data.id));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json({ ...product, unitPrice: parseFloat(product.unitPrice) });
});

router.put("/inventory/products/:id", async (req, res): Promise<void> => {
  const params = UpdateInventoryProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateInventoryProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(inventoryProductsTable)
    .where(eq(inventoryProductsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const updateData: Partial<typeof inventoryProductsTable.$inferInsert> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if (parsed.data.sku !== undefined) updateData.sku = parsed.data.sku;
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.quantity != null) updateData.quantity = parsed.data.quantity;
  if (parsed.data.unitPrice != null) updateData.unitPrice = String(parsed.data.unitPrice);
  if (parsed.data.imageUrl !== undefined) updateData.imageUrl = parsed.data.imageUrl;

  const [updated] = await db
    .update(inventoryProductsTable)
    .set(updateData)
    .where(eq(inventoryProductsTable.id, params.data.id))
    .returning();

  const quantityDelta =
    parsed.data.quantity != null
      ? parsed.data.quantity - existing.quantity
      : null;

  await db.insert(inventoryAuditLogsTable).values({
    userId: existing.userId,
    productId: existing.id,
    productName: updated.name,
    action: "edited",
    delta: quantityDelta,
    note: "Product updated",
  });

  res.json({ ...updated, unitPrice: parseFloat(updated.unitPrice) });
});

router.delete("/inventory/products/:id", async (req, res): Promise<void> => {
  const params = DeleteInventoryProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db
    .select()
    .from(inventoryProductsTable)
    .where(eq(inventoryProductsTable.id, params.data.id));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  await db.insert(inventoryAuditLogsTable).values({
    userId: product.userId,
    productId: product.id,
    productName: product.name,
    action: "deleted",
    delta: -product.quantity,
    note: "Product deleted",
  });

  await db
    .delete(inventoryProductsTable)
    .where(eq(inventoryProductsTable.id, params.data.id));

  res.sendStatus(204);
});

router.post("/inventory/scan", async (req, res): Promise<void> => {
  const parsed = ScanInventoryItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { imageBase64, barcode } = parsed.data;

  if (barcode) {
    res.json({
      suggestedName: `Barcode ${barcode}`,
      confidence: null,
      labels: [`barcode:${barcode}`],
      isMock: false,
    });
    return;
  }

  const visionKey = process.env.GOOGLE_VISION_API_KEY;
  if (visionKey && imageBase64) {
    try {
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${visionKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                image: { content: imageBase64 },
                features: [
                  { type: "LABEL_DETECTION", maxResults: 5 },
                  { type: "PRODUCT_SEARCH" },
                ],
              },
            ],
          }),
        },
      );
      const data = (await response.json()) as {
        responses?: Array<{ labelAnnotations?: Array<{ description: string; score: number }> }>;
      };
      const labels =
        data.responses?.[0]?.labelAnnotations?.map(
          (l) => l.description,
        ) || [];
      const topLabel = labels[0] || "Unknown Product";
      const confidence = data.responses?.[0]?.labelAnnotations?.[0]?.score ?? null;
      res.json({ suggestedName: topLabel, confidence, labels, isMock: false });
      return;
    } catch (err) {
      req.log.error({ err }, "Google Vision API error, falling back to mock");
    }
  }

  const mockProducts = [
    "Office Stapler",
    "Ballpoint Pen Pack",
    "A4 Paper Ream",
    "Sticky Notes",
    "USB Cable",
    "Laptop Stand",
    "Coffee Mug",
    "Hand Sanitizer",
    "Whiteboard Marker",
    "File Folder",
  ];
  const suggestedName = mockProducts[Math.floor(Math.random() * mockProducts.length)];
  res.json({
    suggestedName,
    confidence: 0.82,
    labels: [suggestedName, "Office supply", "Product"],
    isMock: true,
  });
});

router.get("/inventory/audit-logs", async (req, res): Promise<void> => {
  const parsed = ListInventoryAuditLogsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { productId, limit = 50, offset = 0 } = parsed.data;

  const conditions = [];
  if (productId != null) {
    conditions.push(eq(inventoryAuditLogsTable.productId, productId));
  }

  const logs = await db
    .select()
    .from(inventoryAuditLogsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${inventoryAuditLogsTable.createdAt} DESC`)
    .limit(limit)
    .offset(offset);

  res.json(logs);
});

router.get("/inventory/low-stock", async (_req, res): Promise<void> => {
  const products = await db
    .select()
    .from(inventoryProductsTable)
    .where(lt(inventoryProductsTable.quantity, LOW_STOCK_THRESHOLD))
    .orderBy(inventoryProductsTable.quantity);

  res.json(
    products.map((p) => ({ ...p, unitPrice: parseFloat(p.unitPrice) })),
  );
});

router.get("/inventory/summary", async (_req, res): Promise<void> => {
  const [totalRow] = await db
    .select({
      totalProducts: sql<number>`count(*)::int`,
      lowStockCount: sql<number>`count(*) filter (where ${inventoryProductsTable.quantity} < ${LOW_STOCK_THRESHOLD})::int`,
      totalValue: sql<number>`coalesce(sum(${inventoryProductsTable.quantity} * ${inventoryProductsTable.unitPrice}::numeric), 0)`,
    })
    .from(inventoryProductsTable);

  const categoryRows = await db
    .select({
      name: inventoryProductsTable.category,
      count: sql<number>`count(*)::int`,
    })
    .from(inventoryProductsTable)
    .groupBy(inventoryProductsTable.category);

  const [activityRow] = await db
    .select({ recentActivity: sql<number>`count(*)::int` })
    .from(inventoryAuditLogsTable)
    .where(
      sql`${inventoryAuditLogsTable.createdAt} > now() - interval '24 hours'`,
    );

  res.json({
    totalProducts: totalRow?.totalProducts ?? 0,
    lowStockCount: totalRow?.lowStockCount ?? 0,
    totalValue: parseFloat(String(totalRow?.totalValue ?? 0)),
    categories: categoryRows
      .filter((c) => c.name != null)
      .map((c) => ({ name: c.name as string, count: c.count })),
    recentActivity: activityRow?.recentActivity ?? 0,
  });
});

router.post(
  "/inventory/create-checkout-session",
  async (req, res): Promise<void> => {
    const parsed = CreateInventoryCheckoutSessionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const stripe = getStripe();
    if (!stripe) {
      res.status(500).json({
        error:
          "Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment.",
      });
      return;
    }

    const { successUrl, cancelUrl, userId } = parsed.data;
    const resolvedUserId = userId || "demo-user";

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Inventory AI Pro",
                description: "Unlimited products, AI scanning, priority support",
              },
              unit_amount: 500,
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: resolvedUserId,
        metadata: { userId: resolvedUserId },
        subscription_data: { metadata: { userId: resolvedUserId } },
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (err) {
      req.log.error({ err }, "Stripe inventory checkout error");
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  },
);

router.post("/inventory/webhook", async (req, res): Promise<void> => {
  const stripe = getStripe();
  if (!stripe) {
    res.json({ success: true });
    return;
  }

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_INVENTORY_WEBHOOK_SECRET;

  let event: { type: string; data: { object: StripeEventObject } };

  if (webhookSecret) {
    if (!sig) {
      res.status(400).json({ error: "Missing Stripe-Signature header" });
      return;
    }
    try {
      event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        sig,
        webhookSecret,
      );
    } catch (err) {
      logger.error({ err }, "Inventory webhook signature verification failed");
      res.status(400).json({ error: "Webhook signature verification failed" });
      return;
    }
  } else {
    try {
      const raw = req.body;
      event = Buffer.isBuffer(raw)
        ? JSON.parse(raw.toString("utf8"))
        : typeof raw === "string"
          ? JSON.parse(raw)
          : raw;
    } catch {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
  }

  logger.info({ type: event.type }, "Inventory Stripe webhook received");

  const upsertUserTier = async (userId: string, isPro: boolean, stripeCustomerId?: string, stripeSubscriptionId?: string) => {
    await db
      .insert(inventoryUserSubscriptionsTable)
      .values({ userId, tier: isPro ? "pro" : "free", isPro, stripeCustomerId: stripeCustomerId ?? null, stripeSubscriptionId: stripeSubscriptionId ?? null })
      .onConflictDoUpdate({
        target: inventoryUserSubscriptionsTable.userId,
        set: { tier: isPro ? "pro" : "free", isPro, stripeCustomerId: stripeCustomerId ?? undefined, stripeSubscriptionId: stripeSubscriptionId ?? undefined },
      });
  };

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as StripeCheckoutSession;
    const userId = session.metadata?.["userId"] ?? session.client_reference_id ?? null;
    if (userId) {
      await upsertUserTier(
        userId,
        true,
        session.customer ?? undefined,
        session.subscription ?? undefined,
      );
      logger.info({ sessionId: session.id, userId }, "Inventory Pro subscription activated");
    }
  } else if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as StripeSubscription;
    const userId = sub.metadata?.["userId"] ?? null;
    if (userId) {
      await upsertUserTier(userId, false, sub.customer ?? undefined, sub.id);
      logger.info({ subscriptionId: sub.id, userId }, "Inventory Pro subscription cancelled");
    }
  }

  res.json({ success: true });
});

router.post("/inventory/billing-portal", async (req, res): Promise<void> => {
  const parsed = CreateInventoryBillingPortalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const stripe = getStripe();
  if (!stripe) {
    res.status(500).json({ error: "Stripe is not configured." });
    return;
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: parsed.data.customerId,
      return_url: parsed.data.returnUrl,
    });
    res.json({ url: session.url });
  } catch (err) {
    req.log.error({ err }, "Stripe billing portal error");
    res.status(500).json({ error: "Failed to create billing portal session" });
  }
});

export default router;
