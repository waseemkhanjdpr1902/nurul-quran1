import { Router, type IRouter } from "express";

const router: IRouter = Router();

const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  const Razorpay = require("razorpay");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

router.get("/payments/razorpay/config", (_req, res): void => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) {
    res.status(503).json({ configured: false, message: "Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." });
    return;
  }
  res.json({ configured: true, key_id: keyId });
});

router.post("/payments/razorpay/create-order", async (req, res): Promise<void> => {
  const { amount, currency = "INR", receipt } = req.body ?? {};

  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 100) {
    res.status(400).json({ error: "amount must be an integer >= 100 (in paise/cents)" });
    return;
  }

  const razorpay = getRazorpay();
  if (!razorpay) {
    res.status(503).json({ error: "Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment." });
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
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body ?? {};

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

    if (expectedSignature === razorpay_signature) {
      req.log.info({ orderId: razorpay_order_id, paymentId: razorpay_payment_id }, "Razorpay payment verified");
      res.json({ success: true, message: "Payment verified successfully. JazakAllah Khair!" });
    } else {
      res.status(400).json({ success: false, error: "Payment signature verification failed" });
    }
  } catch (err) {
    req.log.error({ err }, "Razorpay verify error");
    res.status(500).json({ error: "Verification failed" });
  }
});

router.post("/payments/razorpay/subscription", async (req, res): Promise<void> => {
  const razorpay = getRazorpay();
  if (!razorpay) {
    res.status(503).json({ error: "Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." });
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
