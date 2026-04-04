import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import jwt from "jsonwebtoken";

const router: IRouter = Router();

const JWT_SECRET = process.env.SESSION_SECRET ?? "nurulquran_secret_key";

const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  const Razorpay = require("razorpay");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

const getAuthUserId = (req: any): number | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    return decoded.userId;
  } catch {
    return null;
  }
};

router.get("/payments/razorpay/config", (_req, res): void => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) {
    res.status(503).json({ configured: false, message: "Razorpay not configured." });
    return;
  }
  res.json({ configured: true, key_id: keyId });
});

router.post("/payments/razorpay/create-order", async (req, res): Promise<void> => {
  const { amount, currency = "INR", receipt } = req.body ?? {};

  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 100) {
    res.status(400).json({ error: "amount must be an integer >= 100 (in paise)" });
    return;
  }

  const razorpay = getRazorpay();
  if (!razorpay) {
    res.status(503).json({ error: "Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." });
    return;
  }

  try {
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1,
    });

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });
  } catch (err) {
    req.log.error({ err }, "Razorpay create order error");
    res.status(500).json({ error: "Failed to create Razorpay order" });
  }
});

router.post("/payments/razorpay/verify", async (req, res): Promise<void> => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body ?? {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ error: "Missing required payment fields" });
    return;
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    res.status(503).json({ error: "Razorpay not configured" });
    return;
  }

  try {
    const crypto = require("crypto");
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      res.status(400).json({ success: false, error: "Payment signature verification failed" });
      return;
    }

    req.log.info({ orderId: razorpay_order_id, paymentId: razorpay_payment_id }, "Razorpay payment verified");

    const userId = getAuthUserId(req);
    let user = null;

    if (userId) {
      const subscriptionPlan = plan === "annual" ? "annual" : "monthly";
      const durationDays = subscriptionPlan === "annual" ? 366 : 31;
      const subscriptionEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

      const [updated] = await db
        .update(usersTable)
        .set({
          isPremium: true,
          razorpayPaymentId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
          subscriptionPlan,
          subscriptionEnd,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, userId))
        .returning();

      if (updated) {
        user = {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          isPremium: updated.isPremium,
          subscriptionPlan: updated.subscriptionPlan,
          subscriptionEnd: updated.subscriptionEnd,
          createdAt: updated.createdAt,
        };
        req.log.info({ userId, plan: subscriptionPlan, subscriptionEnd }, "Premium activated");
      }
    }

    res.json({
      success: true,
      message: "Payment verified. JazakAllah Khair!",
      user,
    });
  } catch (err) {
    req.log.error({ err }, "Razorpay verify error");
    res.status(500).json({ error: "Verification failed" });
  }
});

router.get("/payments/razorpay/subscription-status", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const now = new Date();
  const isActive = user.isPremium && (!user.subscriptionEnd || user.subscriptionEnd > now);

  if (user.isPremium && user.subscriptionEnd && user.subscriptionEnd <= now) {
    await db
      .update(usersTable)
      .set({ isPremium: false, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));
  }

  res.json({
    isPremium: isActive,
    subscriptionPlan: user.subscriptionPlan,
    subscriptionEnd: user.subscriptionEnd,
    razorpayPaymentId: user.razorpayPaymentId,
  });
});

router.post("/payments/razorpay/subscription", async (req, res): Promise<void> => {
  const razorpay = getRazorpay();
  if (!razorpay) {
    res.status(503).json({ error: "Razorpay is not configured." });
    return;
  }

  try {
    const order = await razorpay.orders.create({
      amount: 99900,
      currency: "INR",
      receipt: `subscription_${Date.now()}`,
      payment_capture: 1,
      notes: { type: "subscription", plan: "premium_monthly" },
    });

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    req.log.error({ err }, "Razorpay subscription order error");
    res.status(500).json({ error: "Failed to create subscription order" });
  }
});

export default router;
