import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import rateLimit from "express-rate-limit";

const router: IRouter = Router();

const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  console.error("[SECURITY] SESSION_SECRET is not set — JWT tokens cannot be issued or verified safely.");
}

const ALLOWED_CURRENCIES = new Set(["INR", "USD"]);
const ALLOWED_PLANS = new Set(["monthly", "annual"]);
const MAX_AMOUNT_PAISE = 200_000_00;

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

function escapeJs(s: string): string {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/</g, "\\u003C")
    .replace(/>/g, "\\u003E")
    .replace(/&/g, "\\u0026");
}

function isSafeCallbackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const allowed = [
      "quran-master-prompt.replit.app",
      "www.nurulquran.info",
      "nurulquran.info",
    ];
    return parsed.protocol === "https:" && allowed.some(h => parsed.hostname === h || parsed.hostname.endsWith("." + h));
  } catch {
    return false;
  }
}

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many payment requests, please try again later." },
});

const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  const Razorpay = require("razorpay");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

const getAuthUserId = (req: any): number | null => {
  if (!JWT_SECRET) return null;
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

router.post("/payments/razorpay/create-order", paymentLimiter, async (req, res): Promise<void> => {
  const { amount, currency } = req.body ?? {};

  const cur = typeof currency === "string" && ALLOWED_CURRENCIES.has(currency) ? currency : "INR";

  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 100 || amount > MAX_AMOUNT_PAISE) {
    res.status(400).json({ error: `amount must be an integer between 100 and ${MAX_AMOUNT_PAISE} (in paise)` });
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
      currency: cur,
      payment_capture: 1,
    });

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    req.log.error({ err }, "Razorpay create order error");
    res.status(500).json({ error: "Failed to create Razorpay order" });
  }
});

router.post("/payments/razorpay/verify", paymentLimiter, async (req, res): Promise<void> => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body ?? {};

  if (
    typeof razorpay_order_id !== "string" || !razorpay_order_id ||
    typeof razorpay_payment_id !== "string" || !razorpay_payment_id ||
    typeof razorpay_signature !== "string" || !razorpay_signature
  ) {
    res.status(400).json({ error: "Missing or invalid required payment fields" });
    return;
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    res.status(503).json({ error: "Razorpay not configured" });
    return;
  }

  try {
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    let signatureValid = false;
    try {
      const expBuf = Buffer.from(expectedSignature, "hex");
      const recvBuf = Buffer.from(razorpay_signature.slice(0, 64), "hex");
      signatureValid = expBuf.length === recvBuf.length && crypto.timingSafeEqual(expBuf, recvBuf);
    } catch {
      signatureValid = false;
    }
    if (!signatureValid) {
      res.status(400).json({ success: false, error: "Payment signature verification failed" });
      return;
    }

    req.log.info({ orderId: razorpay_order_id, paymentId: razorpay_payment_id }, "Razorpay payment verified");

    const userId = getAuthUserId(req);
    let user = null;

    if (userId) {
      const subscriptionPlan = (typeof plan === "string" && ALLOWED_PLANS.has(plan)) ? plan : "monthly";
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

router.get("/payments/razorpay/checkout", paymentLimiter, (req, res): void => {
  const {
    key, order_id, amount, currency = "INR",
    name = "Nurul Quran", description = "Premium Subscription",
    prefill_email = "", callback_url, cancel_url,
  } = req.query as Record<string, string>;

  if (!key || !order_id || !amount) {
    res.status(400).send("<h1>Missing required parameters</h1>");
    return;
  }

  if (!ALLOWED_CURRENCIES.has(currency)) {
    res.status(400).send("<h1>Invalid currency</h1>");
    return;
  }

  const amountNum = Number(amount);
  if (!Number.isInteger(amountNum) || amountNum < 100 || amountNum > MAX_AMOUNT_PAISE) {
    res.status(400).send("<h1>Invalid amount</h1>");
    return;
  }

  const safeCallbackUrl = callback_url && isSafeCallbackUrl(callback_url)
    ? callback_url
    : null;

  const safeCancelUrl = cancel_url && isSafeCallbackUrl(cancel_url)
    ? cancel_url
    : null;

  const safeHtml = {
    name: escapeHtml(name.slice(0, 100)),
    description: escapeHtml(description.slice(0, 200)),
    amount: Math.round(amountNum / 100).toLocaleString("en-IN"),
  };

  const safeJs = {
    key: escapeJs(key.slice(0, 40)),
    amount: String(amountNum),
    currency: escapeJs(currency),
    order_id: escapeJs(order_id.slice(0, 40)),
    name: escapeJs(name.slice(0, 100)),
    description: escapeJs(description.slice(0, 200)),
    prefill_email: escapeJs(prefill_email.slice(0, 200)),
    callback_url: safeCallbackUrl ? escapeJs(safeCallbackUrl) : "",
    cancel_url: safeCancelUrl ? escapeJs(safeCancelUrl) : "",
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'nonce-RZPNONCE' https://checkout.razorpay.com; frame-src https://api.razorpay.com; style-src 'unsafe-inline'; connect-src https://api.razorpay.com;">
  <title>Nurul Quran — Premium</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0D4A3E; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 20px; padding: 32px 28px; max-width: 360px; width: 90%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .logo { font-size: 32px; margin-bottom: 8px; }
    h1 { color: #0D4A3E; font-size: 20px; margin-bottom: 6px; }
    p { color: #666; font-size: 14px; margin-bottom: 24px; }
    .amount { font-size: 32px; font-weight: 700; color: #0D4A3E; margin-bottom: 4px; }
    .plan { color: #888; font-size: 13px; margin-bottom: 28px; }
    .btn { background: #0D4A3E; color: #fff; border: none; border-radius: 14px; padding: 16px 32px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%; }
    .btn:active { opacity: 0.85; }
    .secure { color: #aaa; font-size: 11px; margin-top: 16px; }
    .loading .btn { display: none; }
    .loading .spinner { display: block; color: #0D4A3E; margin: 16px auto; }
    .spinner { display: none; }
  </style>
</head>
<body>
<div class="card">
  <div class="logo">&#9770;&#65039;</div>
  <h1>${safeHtml.name}</h1>
  <p>${safeHtml.description}</p>
  <div class="amount">&#8377;${safeHtml.amount}</div>
  <div class="plan">Secure payment via Razorpay</div>
  <button class="btn" id="payBtn" onclick="startPayment()">Pay Now &#8594;</button>
  <div class="spinner">Processing...</div>
  <p class="secure">&#128274; Your payment is secured by Razorpay</p>
</div>
<script>
var RZP_KEY = '${safeJs.key}';
var RZP_AMOUNT = '${safeJs.amount}';
var RZP_CURRENCY = '${safeJs.currency}';
var RZP_ORDER_ID = '${safeJs.order_id}';
var RZP_NAME = '${safeJs.name}';
var RZP_DESC = '${safeJs.description}';
var RZP_EMAIL = '${safeJs.prefill_email}';
var RZP_CALLBACK = '${safeJs.callback_url}';
var RZP_CANCEL = '${safeJs.cancel_url}';
function startPayment() {
  document.body.classList.add('loading');
  var options = {
    key: RZP_KEY,
    amount: RZP_AMOUNT,
    currency: RZP_CURRENCY,
    order_id: RZP_ORDER_ID,
    name: RZP_NAME,
    description: RZP_DESC,
    prefill: { email: RZP_EMAIL },
    theme: { color: '#0D4A3E' },
    handler: function(response) {
      var params = new URLSearchParams({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
      if (RZP_CALLBACK) {
        window.location.href = RZP_CALLBACK + '?' + params.toString();
      }
    },
    modal: {
      ondismiss: function() {
        document.body.classList.remove('loading');
        if (RZP_CANCEL) { window.location.href = RZP_CANCEL; }
      }
    }
  };
  var rzp = new Razorpay(options);
  rzp.open();
}
window.onload = function() { setTimeout(startPayment, 800); };
</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.send(html);
});

router.get("/payments/razorpay/mobile-callback", paymentLimiter, async (req, res): Promise<void> => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.query as Record<string, string>;

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#fff;">
      <div style="font-size:48px">&#10060;</div>
      <h2 style="color:#333">Payment Failed</h2>
      <p style="color:#666">Missing payment details</p>
    </body></html>`);
    return;
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto.createHmac("sha256", keySecret).update(body).digest("hex");

  let signaturesMatch = false;
  try {
    const sigBuf = Buffer.from(razorpay_signature.slice(0, 64), "hex");
    const expBuf = Buffer.from(expectedSignature, "hex");
    signaturesMatch = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    signaturesMatch = false;
  }

  if (!signaturesMatch) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:40px;">
      <div style="font-size:48px">&#10060;</div><h2>Verification Failed</h2><p>Please contact support.</p>
    </body></html>`);
    return;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#E8F5E9;">
    <div style="font-size:60px">&#9989;</div>
    <h2 style="color:#1B5E20;margin:16px 0">Payment Successful!</h2>
    <p style="color:#388E3C;font-size:16px">JazakAllah Khair! Your premium access is now active.</p>
    <p style="color:#888;margin-top:24px;font-size:13px">You can close this window and return to the app.</p>
    <script>
      setTimeout(function() { window.location.href = window.location.href + "&status=success"; }, 1500);
    </script>
  </body></html>`);
});

router.get("/payments/razorpay/mobile-cancel", (_req, res): void => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#FFF3E0;">
    <div style="font-size:60px">&#8505;&#65039;</div>
    <h2 style="color:#E65100;margin:16px 0">Payment Cancelled</h2>
    <p style="color:#BF360C">No charge was made. You can return to the app.</p>
    <p style="color:#888;margin-top:24px;font-size:13px">Close this window to go back.</p>
  </body></html>`);
});

router.post("/payments/razorpay/subscription", paymentLimiter, async (req, res): Promise<void> => {
  const razorpay = getRazorpay();
  if (!razorpay) {
    res.status(503).json({ error: "Razorpay is not configured." });
    return;
  }

  try {
    const order = await razorpay.orders.create({
      amount: 99900,
      currency: "INR",
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
