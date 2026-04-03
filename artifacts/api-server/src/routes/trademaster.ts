import { Router, type IRouter, type Request, type Response } from "express";
import { createHmac } from "crypto";
import { db } from "@workspace/db";
import { tradeMasterSignals, tradeMasterSubscriptions } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const VALID_SEGMENTS = ["nifty", "banknifty", "options", "equity", "intraday", "commodity", "currency"] as const;
type ValidSegment = typeof VALID_SEGMENTS[number];
const VALID_SIGNAL_TYPES = ["buy", "sell"] as const;
type ValidSignalType = typeof VALID_SIGNAL_TYPES[number];
const VALID_STATUSES = ["active", "target_hit", "sl_hit"] as const;
type ValidStatus = typeof VALID_STATUSES[number];

function isValidSegment(s: unknown): s is ValidSegment {
  return typeof s === "string" && (VALID_SEGMENTS as readonly string[]).includes(s);
}
function isValidSignalType(s: unknown): s is ValidSignalType {
  return typeof s === "string" && (VALID_SIGNAL_TYPES as readonly string[]).includes(s);
}
function isValidStatus(s: unknown): s is ValidStatus {
  return typeof s === "string" && (VALID_STATUSES as readonly string[]).includes(s);
}

type TickerQuote = { name: string; price: number | null; change: number | null; changePercent: number | null; high: number | null; low: number | null };
type TickerResults = Record<string, TickerQuote>;
type FinnhubQuote = { c: number; d: number; dp: number; h: number; l: number };

type SignalUpdatePayload = {
  status?: ValidStatus;
  assetName?: string;
  signalType?: ValidSignalType;
  entryPrice?: string;
  stopLoss?: string;
  target1?: string;
  target2?: string | null;
  iv?: string | null;
  pcr?: string | null;
  notes?: string | null;
  isPremium?: boolean;
  riskReward?: string | null;
};

type DbSignal = typeof tradeMasterSignals.$inferSelect;

function requireAdmin(req: Request, res: Response): boolean {
  const adminToken = process.env.TRADEMASTER_ADMIN_TOKEN;
  const authHeader = req.headers.authorization;
  if (!adminToken) { res.status(500).json({ error: "Admin token not configured" }); return false; }
  if (!authHeader || authHeader !== `Bearer ${adminToken}`) { res.status(401).json({ error: "Unauthorized" }); return false; }
  return true;
}

function calcRR(entry: number, sl: number, t1: number): string | null {
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(t1 - entry);
  return risk > 0 ? (reward / risk).toFixed(2) : null;
}

async function isSessionPremium(sessionId: string | undefined): Promise<boolean> {
  if (!sessionId || typeof sessionId !== "string") return false;
  try {
    const [sub] = await db.select().from(tradeMasterSubscriptions)
      .where(and(eq(tradeMasterSubscriptions.sessionId, sessionId), eq(tradeMasterSubscriptions.status, "active")));
    return !!sub;
  } catch { return false; }
}

function resolveAccessLevel(req: Request): "admin" | "session" | string | null {
  const adminToken = process.env.TRADEMASTER_ADMIN_TOKEN;
  const authHeader = req.headers.authorization;
  if (adminToken && authHeader === `Bearer ${adminToken}`) return "admin";
  return (req.query as Record<string, string>).sessionId ?? null;
}

function redactPremiumSignal(signal: DbSignal): DbSignal {
  return { ...signal, entryPrice: "—", stopLoss: "—", target1: "—", target2: null, riskReward: null, iv: null, pcr: null, notes: null };
}

router.get("/trademaster/admin/verify", (req: Request, res: Response): void => {
  if (!requireAdmin(req, res)) return;
  res.json({ ok: true });
});

router.get("/trademaster/config", (_req: Request, res: Response): void => {
  res.json({ razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? null });
});

router.get("/trademaster/signals", async (req: Request, res: Response): Promise<void> => {
  try {
    const { segment } = req.query as { segment?: string };
    const accessLevel = resolveAccessLevel(req);
    const isPremium = accessLevel === "admin" || await isSessionPremium(accessLevel ?? undefined);

    const rows = segment && isValidSegment(segment)
      ? await db.select().from(tradeMasterSignals).where(eq(tradeMasterSignals.segment, segment)).orderBy(desc(tradeMasterSignals.createdAt))
      : await db.select().from(tradeMasterSignals).orderBy(desc(tradeMasterSignals.createdAt));

    const signals = rows.map((s) => (s.isPremium && !isPremium ? redactPremiumSignal(s) : s));
    res.json({ signals });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch signals");
    res.status(500).json({ error: "Failed to fetch signals" });
  }
});

router.get("/trademaster/signals/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const accessLevel = resolveAccessLevel(req);
    const isPremium = accessLevel === "admin" || await isSessionPremium(accessLevel ?? undefined);
    const [signal] = await db.select().from(tradeMasterSignals).where(eq(tradeMasterSignals.id, id));
    if (!signal) { res.status(404).json({ error: "Signal not found" }); return; }
    res.json({ signal: signal.isPremium && !isPremium ? redactPremiumSignal(signal) : signal });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch signal");
    res.status(500).json({ error: "Failed to fetch signal" });
  }
});

router.post("/trademaster/signals", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const { segment, assetName, signalType, entryPrice, stopLoss, target1, target2, iv, pcr, notes, isPremium } = req.body as Record<string, unknown>;
    if (!isValidSegment(segment)) { res.status(400).json({ error: "Invalid segment" }); return; }
    if (!isValidSignalType(signalType)) { res.status(400).json({ error: "Invalid signalType" }); return; }
    if (typeof assetName !== "string" || !assetName.trim()) { res.status(400).json({ error: "assetName required" }); return; }
    const entry = parseFloat(String(entryPrice));
    const sl = parseFloat(String(stopLoss));
    const t1 = parseFloat(String(target1));
    if (isNaN(entry) || isNaN(sl) || isNaN(t1)) { res.status(400).json({ error: "entryPrice, stopLoss, target1 must be numbers" }); return; }
    const [signal] = await db.insert(tradeMasterSignals).values({
      segment,
      assetName: String(assetName).trim(),
      signalType,
      entryPrice: String(entry),
      stopLoss: String(sl),
      target1: String(t1),
      target2: target2 != null && String(target2).trim() !== "" ? String(target2) : null,
      riskReward: calcRR(entry, sl, t1),
      iv: typeof iv === "string" && iv.trim() ? iv.trim() : null,
      pcr: typeof pcr === "string" && pcr.trim() ? pcr.trim() : null,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      isPremium: isPremium === true || isPremium === "true",
      status: "active",
      createdBy: "admin",
    }).returning();
    res.status(201).json({ signal });
  } catch (err) {
    req.log.error({ err }, "Failed to create signal");
    res.status(500).json({ error: "Failed to create signal" });
  }
});

router.patch("/trademaster/signals/:id", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const body = req.body as Record<string, unknown>;
    const update: SignalUpdatePayload = {};
    if ("status" in body) { if (!isValidStatus(body.status)) { res.status(400).json({ error: "Invalid status" }); return; } update.status = body.status; }
    if ("signalType" in body) { if (!isValidSignalType(body.signalType)) { res.status(400).json({ error: "Invalid signalType" }); return; } update.signalType = body.signalType; }
    if ("assetName" in body && typeof body.assetName === "string") update.assetName = body.assetName.trim();
    if ("iv" in body) update.iv = typeof body.iv === "string" && body.iv.trim() ? body.iv.trim() : null;
    if ("pcr" in body) update.pcr = typeof body.pcr === "string" && body.pcr.trim() ? body.pcr.trim() : null;
    if ("notes" in body) update.notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
    if ("isPremium" in body) update.isPremium = body.isPremium === true || body.isPremium === "true";
    let entry: number | undefined, sl: number | undefined, t1: number | undefined;
    if ("entryPrice" in body) { entry = parseFloat(String(body.entryPrice)); if (isNaN(entry)) { res.status(400).json({ error: "Invalid entryPrice" }); return; } update.entryPrice = String(entry); }
    if ("stopLoss" in body) { sl = parseFloat(String(body.stopLoss)); if (isNaN(sl)) { res.status(400).json({ error: "Invalid stopLoss" }); return; } update.stopLoss = String(sl); }
    if ("target1" in body) { t1 = parseFloat(String(body.target1)); if (isNaN(t1)) { res.status(400).json({ error: "Invalid target1" }); return; } update.target1 = String(t1); }
    if ("target2" in body) update.target2 = body.target2 != null && String(body.target2).trim() !== "" ? String(body.target2) : null;
    if (entry !== undefined && sl !== undefined && t1 !== undefined) update.riskReward = calcRR(entry, sl, t1);
    const [signal] = await db.update(tradeMasterSignals).set(update).where(eq(tradeMasterSignals.id, id)).returning();
    if (!signal) { res.status(404).json({ error: "Signal not found" }); return; }
    res.json({ signal });
  } catch (err) {
    req.log.error({ err }, "Failed to update signal");
    res.status(500).json({ error: "Failed to update signal" });
  }
});

router.delete("/trademaster/signals/:id", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [deleted] = await db.delete(tradeMasterSignals).where(eq(tradeMasterSignals.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Signal not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete signal");
    res.status(500).json({ error: "Failed to delete signal" });
  }
});

router.get("/trademaster/ticker", async (req: Request, res: Response): Promise<void> => {
  try {
    const finnhubToken = process.env.FINNHUB_API_KEY;
    const symbols = [
      { symbol: "NSE:NIFTY50", name: "Nifty 50", key: "nifty" },
      { symbol: "NSE:BANKNIFTY", name: "Bank Nifty", key: "banknifty" },
    ];
    const results: TickerResults = {};
    if (finnhubToken) {
      for (const { symbol, name, key } of symbols) {
        try {
          const resp = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${finnhubToken}`, { signal: AbortSignal.timeout(5000) });
          if (resp.ok) {
            const data = await resp.json() as FinnhubQuote;
            results[key] = { name, price: data.c ?? null, change: data.d ?? null, changePercent: data.dp ?? null, high: data.h ?? null, low: data.l ?? null };
          } else {
            results[key] = { name, price: null, change: null, changePercent: null, high: null, low: null };
          }
        } catch {
          results[key] = { name, price: null, change: null, changePercent: null, high: null, low: null };
        }
      }
    } else {
      for (const { name, key } of symbols) results[key] = { name, price: null, change: null, changePercent: null, high: null, low: null };
    }
    res.json({ ticker: results });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch ticker");
    res.status(500).json({ error: "Failed to fetch ticker" });
  }
});

router.post("/trademaster/telegram", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const { message } = req.body as { message?: unknown };
    if (typeof message !== "string" || !message.trim()) { res.status(400).json({ error: "Message is required" }); return; }
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    if (!botToken || !channelId) { res.status(500).json({ error: "Telegram not configured." }); return; }
    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: channelId, text: message.trim(), parse_mode: "HTML" }),
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) { res.status(500).json({ error: "Failed to send to Telegram" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to send Telegram message");
    res.status(500).json({ error: "Failed to send Telegram message" });
  }
});

router.post("/trademaster/payment/order", async (req: Request, res: Response): Promise<void> => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) { res.status(500).json({ error: "Payment gateway not configured" }); return; }
    const Razorpay = require("razorpay");
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.create({
      amount: 249900,
      currency: "INR",
      receipt: `tm_${Date.now()}`,
      notes: { product: "TradeMaster Pro — Professional Plan" },
    });
    res.json({ orderId: order.id as string, amount: order.amount as number, currency: order.currency as string, keyId });
  } catch (err) {
    req.log.error({ err }, "Failed to create Razorpay order");
    res.status(500).json({ error: "Failed to initiate payment" });
  }
});

router.post("/trademaster/payment/verify", async (req: Request, res: Response): Promise<void> => {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) { res.status(500).json({ error: "Payment gateway not configured" }); return; }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email } = req.body as Record<string, unknown>;
    if (typeof razorpay_order_id !== "string" || typeof razorpay_payment_id !== "string" || typeof razorpay_signature !== "string") {
      res.status(400).json({ error: "Missing payment verification fields" }); return;
    }
    const expectedSignature = createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (expectedSignature !== razorpay_signature) {
      res.status(400).json({ error: "Payment verification failed — invalid signature" }); return;
    }
    const sessionId = `rzp_${razorpay_payment_id}`;
    await db.insert(tradeMasterSubscriptions).values({
      sessionId,
      email: typeof email === "string" && email.trim() ? email.trim() : null,
      stripeCustomerId: null,
      stripeSubscriptionId: razorpay_payment_id,
      plan: "professional",
      status: "active",
    }).onConflictDoNothing();
    res.json({ success: true, sessionId });
  } catch (err) {
    req.log.error({ err }, "Failed to verify Razorpay payment");
    res.status(500).json({ error: "Payment verification failed" });
  }
});

router.get("/trademaster/subscription/check", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.query as { sessionId?: string };
    if (!sessionId || typeof sessionId !== "string") { res.json({ isPremium: false }); return; }
    const [sub] = await db.select().from(tradeMasterSubscriptions)
      .where(and(eq(tradeMasterSubscriptions.sessionId, sessionId), eq(tradeMasterSubscriptions.status, "active")));
    res.json({ isPremium: !!sub, subscription: sub ?? null });
  } catch (err) {
    req.log.error({ err }, "Failed to check subscription");
    res.json({ isPremium: false, subscription: null });
  }
});

router.get("/trademaster/subscriptions", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const subscriptions = await db.select().from(tradeMasterSubscriptions).orderBy(desc(tradeMasterSubscriptions.createdAt));
    res.json({ subscriptions, total: subscriptions.length });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch subscriptions");
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});

router.patch("/trademaster/subscriptions/:id", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { status } = req.body as { status?: unknown };
    if (typeof status !== "string" || !["active", "cancelled", "expired"].includes(status)) {
      res.status(400).json({ error: "status must be active, cancelled, or expired" }); return;
    }
    const [sub] = await db.update(tradeMasterSubscriptions).set({ status }).where(eq(tradeMasterSubscriptions.id, id)).returning();
    if (!sub) { res.status(404).json({ error: "Subscription not found" }); return; }
    res.json({ subscription: sub });
  } catch (err) {
    req.log.error({ err }, "Failed to update subscription");
    res.status(500).json({ error: "Failed to update subscription" });
  }
});

export default router;
