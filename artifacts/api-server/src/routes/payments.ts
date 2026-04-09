import { Router, type IRouter } from "express";
import { CreateCheckoutSessionBody, CreateSubscriptionBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const getStripe = () => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return null;
  }
  const Stripe = require("stripe");
  return new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
};

router.post("/payments/create-checkout-session", async (req, res): Promise<void> => {
  const parsed = CreateCheckoutSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const stripe = getStripe();
  if (!stripe) {
    res.status(500).json({ error: "Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment." });
    return;
  }

  const { amount, currency = "usd", successUrl, cancelUrl } = parsed.data;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: "Islamic Learning Fee — Nurul Quran",
              description: "Support Islamic education and learning for all",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    req.log.error({ err }, "Stripe checkout session error");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.post("/payments/create-subscription", async (req, res): Promise<void> => {
  const parsed = CreateSubscriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const stripe = getStripe();
  if (!stripe) {
    res.status(500).json({ error: "Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment." });
    return;
  }

  const { successUrl, cancelUrl } = parsed.data;

  try {
    const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID;

    let lineItems;
    if (premiumPriceId) {
      lineItems = [{ price: premiumPriceId, quantity: 1 }];
    } else {
      lineItems = [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Nurul Quran Premium",
              description: "Unlock all premium courses and content",
            },
            unit_amount: 999,
            recurring: { interval: "month" as const },
          },
          quantity: 1,
        },
      ];
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    req.log.error({ err }, "Stripe subscription session error");
    res.status(500).json({ error: "Failed to create subscription session" });
  }
});

router.post("/payments/webhook", async (req, res): Promise<void> => {
  const stripe = getStripe();
  if (!stripe) {
    res.status(500).json({ error: "Stripe not configured" });
    return;
  }

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (webhookSecret && sig) {
    try {
      const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      logger.info({ type: event.type }, "Stripe webhook received");

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        logger.info({ sessionId: session.id }, "Payment completed");
      }
    } catch (err) {
      logger.error({ err }, "Stripe webhook signature verification failed");
      res.status(400).json({ error: "Webhook signature verification failed" });
      return;
    }
  }

  res.json({ success: true });
});

export default router;
