import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "stockswap-secret-key-change-in-prod";
const ADMIN_KEY = process.env.STOCKSWAP_ADMIN_KEY || "stockswap-admin";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  const Stripe = require("stripe");
  return new Stripe(key, { apiVersion: "2024-12-18.acacia" });
}

async function getUserFromToken(req: any): Promise<{ id: string } | null> {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  try {
    const token = auth.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    return decoded;
  } catch {
    return null;
  }
}

async function getShopForUser(userId: string): Promise<any | null> {
  const result = await pool.query("SELECT * FROM ss_shops WHERE user_id = $1 LIMIT 1", [userId]);
  return result.rows[0] || null;
}

function formatShop(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    address: row.address || null,
    lat: row.lat != null ? Number(row.lat) : null,
    lng: row.lng != null ? Number(row.lng) : null,
    isVerified: row.is_verified,
    verifiedAt: row.verified_at ? row.verified_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}

function formatListing(row: any) {
  return {
    id: row.id,
    shopId: row.shop_id,
    shopName: row.shop_name || null,
    shopVerified: !!row.shop_verified,
    title: row.title,
    category: row.category,
    brand: row.brand || null,
    originalPrice: Number(row.original_price),
    discountPrice: Number(row.discount_price),
    expiryDate: row.expiry_date ? String(row.expiry_date) : null,
    quantity: Number(row.quantity),
    condition: row.condition,
    imageUrl: row.image_url || null,
    lat: row.lat != null ? Number(row.lat) : null,
    lng: row.lng != null ? Number(row.lng) : null,
    isBoosted: !!row.is_boosted,
    boostedUntil: row.boosted_until ? row.boosted_until.toISOString() : null,
    distanceKm: row.distance_km != null ? Number(row.distance_km) : null,
    createdAt: row.created_at.toISOString(),
  };
}

function formatMessage(row: any) {
  return {
    id: row.id,
    listingId: row.listing_id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: row.content,
    createdAt: row.created_at.toISOString(),
  };
}

router.post("/stockswap/auth/register", async (req, res): Promise<void> => {
  try {
    const { email, phone, password } = req.body;
    if (!password) {
      res.status(400).json({ error: "Password is required" });
      return;
    }
    if (!email && !phone) {
      res.status(400).json({ error: "Email or phone is required" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);

    let userRow;
    if (email) {
      const existing = await pool.query("SELECT * FROM ss_users WHERE email = $1", [email]);
      if (existing.rows.length > 0) {
        userRow = existing.rows[0];
        const valid = await bcrypt.compare(password, userRow.password_hash);
        if (!valid) {
          res.status(400).json({ error: "Invalid credentials" });
          return;
        }
      } else {
        const insert = await pool.query(
          "INSERT INTO ss_users (email, phone, password_hash) VALUES ($1, $2, $3) RETURNING *",
          [email, phone || null, passwordHash]
        );
        userRow = insert.rows[0];
      }
    } else {
      const existing = await pool.query("SELECT * FROM ss_users WHERE phone = $1", [phone]);
      if (existing.rows.length > 0) {
        userRow = existing.rows[0];
        const valid = await bcrypt.compare(password, userRow.password_hash);
        if (!valid) {
          res.status(400).json({ error: "Invalid credentials" });
          return;
        }
      } else {
        const insert = await pool.query(
          "INSERT INTO ss_users (email, phone, password_hash) VALUES ($1, $2, $3) RETURNING *",
          [null, phone, passwordHash]
        );
        userRow = insert.rows[0];
      }
    }

    const token = jwt.sign({ id: userRow.id }, JWT_SECRET, { expiresIn: "30d" });
    const shopRow = await pool.query("SELECT * FROM ss_shops WHERE user_id = $1 LIMIT 1", [userRow.id]);
    const shop = shopRow.rows[0] ? formatShop(shopRow.rows[0]) : null;

    res.json({
      user: {
        id: userRow.id,
        email: userRow.email || null,
        phone: userRow.phone || null,
        isVerified: userRow.is_verified,
        termsAccepted: userRow.terms_accepted,
        createdAt: userRow.created_at.toISOString(),
      },
      token,
      shop,
    });
  } catch (err) {
    req.log.error({ err }, "stockswap register error");
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/stockswap/auth/terms", async (req, res): Promise<void> => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId required" });
      return;
    }
    await pool.query("UPDATE ss_users SET terms_accepted = true WHERE id = $1", [userId]);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "stockswap terms error");
    res.status(500).json({ error: "Failed to accept terms" });
  }
});

router.post("/stockswap/shops", async (req, res): Promise<void> => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { name, address, lat, lng } = req.body;
    if (!name) {
      res.status(400).json({ error: "Shop name required" });
      return;
    }
    let result = await pool.query(
      "INSERT INTO ss_shops (user_id, name, address, lat, lng) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING RETURNING *",
      [user.id, name, address || null, lat || null, lng || null]
    );
    let row = result.rows[0];
    if (!row) {
      const existing = await pool.query("SELECT * FROM ss_shops WHERE user_id = $1 LIMIT 1", [user.id]);
      row = existing.rows[0];
    }
    res.status(201).json(formatShop(row));
  } catch (err) {
    req.log.error({ err }, "stockswap create shop error");
    res.status(500).json({ error: "Failed to create shop" });
  }
});

router.get("/stockswap/shops/me", async (req, res): Promise<void> => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const result = await pool.query("SELECT * FROM ss_shops WHERE user_id = $1 LIMIT 1", [user.id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    res.json(formatShop(result.rows[0]));
  } catch (err) {
    req.log.error({ err }, "stockswap get my shop error");
    res.status(500).json({ error: "Failed to get shop" });
  }
});

router.get("/stockswap/shops/:shopId", async (req, res): Promise<void> => {
  try {
    const result = await pool.query("SELECT * FROM ss_shops WHERE id = $1", [req.params.shopId]);
    if (!result.rows[0]) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    res.json(formatShop(result.rows[0]));
  } catch (err) {
    req.log.error({ err }, "stockswap get shop error");
    res.status(500).json({ error: "Failed to get shop" });
  }
});

router.get("/stockswap/listings", async (req, res): Promise<void> => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : null;
    const lng = req.query.lng ? Number(req.query.lng) : null;
    const radiusKm = req.query.radiusKm ? Number(req.query.radiusKm) : 10;
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = Math.min(Number(req.query.limit || 20), 100);
    const offset = Number(req.query.offset || 0);

    const params: any[] = [];
    let distanceSel = ", NULL::float AS distance_km";
    let distanceCond = "";
    let paramIdx = 1;

    if (lat != null && lng != null) {
      params.push(lat, lng);
      paramIdx = 3;
      distanceSel = `, (6371 * acos(GREATEST(-1, LEAST(1,
        cos(radians($1)) * cos(radians(l.lat)) * cos(radians(l.lng) - radians($2)) +
        sin(radians($1)) * sin(radians(l.lat))
      )))) AS distance_km`;
      distanceCond = ` AND l.lat IS NOT NULL AND l.lng IS NOT NULL
        AND (6371 * acos(GREATEST(-1, LEAST(1,
          cos(radians($1)) * cos(radians(l.lat)) * cos(radians(l.lng) - radians($2)) +
          sin(radians($1)) * sin(radians(l.lat))
        )))) <= $${paramIdx}`;
      params.push(radiusKm);
      paramIdx++;
    }

    let whereCond = "";
    if (category) {
      whereCond += ` AND l.category ILIKE $${paramIdx}`;
      params.push(`%${category}%`);
      paramIdx++;
    }
    if (search) {
      whereCond += ` AND (l.title ILIKE $${paramIdx} OR l.brand ILIKE $${paramIdx} OR l.category ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    const limitParam = paramIdx++;
    const offsetParam = paramIdx++;
    params.push(limit, offset);

    const query = `
      SELECT l.*, s.name AS shop_name, s.is_verified AS shop_verified
        ${distanceSel}
      FROM ss_listings l
      JOIN ss_shops s ON s.id = l.shop_id
      WHERE 1=1 ${distanceCond} ${whereCond}
      ORDER BY l.is_boosted DESC, l.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const countParams = params.slice(0, -2);
    const countQuery = `
      SELECT COUNT(*) FROM ss_listings l
      JOIN ss_shops s ON s.id = l.shop_id
      WHERE 1=1 ${distanceCond} ${whereCond}
    `;

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    res.json({
      listings: result.rows.map(formatListing),
      total: Number(countResult.rows[0]?.count || 0),
    });
  } catch (err) {
    req.log.error({ err }, "stockswap get listings error");
    res.status(500).json({ error: "Failed to get listings" });
  }
});

router.get("/stockswap/listings/mine", async (req, res): Promise<void> => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const result = await pool.query(
      `SELECT l.*, s.name AS shop_name, s.is_verified AS shop_verified, NULL::float AS distance_km
       FROM ss_listings l
       JOIN ss_shops s ON s.id = l.shop_id
       WHERE s.user_id = $1
       ORDER BY l.created_at DESC`,
      [user.id]
    );
    res.json(result.rows.map(formatListing));
  } catch (err) {
    req.log.error({ err }, "stockswap get my listings error");
    res.status(500).json({ error: "Failed to get listings" });
  }
});

router.get("/stockswap/listings/:listingId", async (req, res): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT l.*, s.name AS shop_name, s.is_verified AS shop_verified, NULL::float AS distance_km
       FROM ss_listings l
       JOIN ss_shops s ON s.id = l.shop_id
       WHERE l.id = $1`,
      [req.params.listingId]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    res.json(formatListing(result.rows[0]));
  } catch (err) {
    req.log.error({ err }, "stockswap get listing error");
    res.status(500).json({ error: "Failed to get listing" });
  }
});

router.delete("/stockswap/listings/:listingId", async (req, res): Promise<void> => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    await pool.query(
      `DELETE FROM ss_listings
       WHERE id = $1 AND shop_id IN (SELECT id FROM ss_shops WHERE user_id = $2)`,
      [req.params.listingId, user.id]
    );
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "stockswap delete listing error");
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

router.post("/stockswap/listings/:listingId/boost", async (req, res): Promise<void> => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { successUrl, cancelUrl } = req.body;
    if (!successUrl || !cancelUrl) {
      res.status(400).json({ error: "successUrl and cancelUrl required" });
      return;
    }
    const stripe = getStripe();
    if (!stripe) {
      res.status(500).json({ error: "Stripe not configured. Add STRIPE_SECRET_KEY." });
      return;
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Boost Listing for 24 Hours",
              description: "Feature your listing at the top of the local feed for 24 hours",
            },
            unit_amount: 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${successUrl}?listingId=${req.params.listingId}&boosted=1`,
      cancel_url: cancelUrl,
      metadata: {
        listingId: req.params.listingId,
        type: "boost_listing",
      },
    });
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    req.log.error({ err }, "stockswap boost listing error");
    res.status(500).json({ error: "Failed to create boost checkout" });
  }
});

router.post("/stockswap/listings", async (req, res): Promise<void> => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const shop = await getShopForUser(user.id);
    if (!shop) {
      res.status(400).json({ error: "You must set up a shop first" });
      return;
    }
    const { title, category, brand, originalPrice, discountPrice, expiryDate, quantity, condition, imageUrl } = req.body;
    if (!title || !category || originalPrice == null || discountPrice == null) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    const result = await pool.query(
      `INSERT INTO ss_listings 
        (shop_id, title, category, brand, original_price, discount_price, expiry_date, quantity, condition, image_url, lat, lng)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        shop.id, title, category, brand || null, originalPrice, discountPrice,
        expiryDate || null, quantity || 1, condition || "Good", imageUrl || null,
        shop.lat, shop.lng
      ]
    );
    const row = result.rows[0];
    res.status(201).json(formatListing({ ...row, shop_name: shop.name, shop_verified: shop.is_verified }));
  } catch (err) {
    req.log.error({ err }, "stockswap create listing error");
    res.status(500).json({ error: "Failed to create listing" });
  }
});

router.get("/stockswap/listings/:listingId/messages", async (req, res): Promise<void> => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const peerId = req.query.peerId as string;
    if (!peerId) {
      res.status(400).json({ error: "peerId required" });
      return;
    }
    const result = await pool.query(
      `SELECT * FROM ss_messages 
       WHERE listing_id = $1 
         AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2))
       ORDER BY created_at ASC`,
      [req.params.listingId, user.id, peerId]
    );
    res.json(result.rows.map(formatMessage));
  } catch (err) {
    req.log.error({ err }, "stockswap get messages error");
    res.status(500).json({ error: "Failed to get messages" });
  }
});

router.post("/stockswap/listings/:listingId/messages", async (req, res): Promise<void> => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { content, receiverId } = req.body;
    if (!content || !receiverId) {
      res.status(400).json({ error: "content and receiverId required" });
      return;
    }
    const result = await pool.query(
      "INSERT INTO ss_messages (listing_id, sender_id, receiver_id, content) VALUES ($1,$2,$3,$4) RETURNING *",
      [req.params.listingId, user.id, receiverId, content]
    );
    res.status(201).json(formatMessage(result.rows[0]));
  } catch (err) {
    req.log.error({ err }, "stockswap send message error");
    res.status(500).json({ error: "Failed to send message" });
  }
});

router.post("/stockswap/ai/suggest", async (req, res): Promise<void> => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: "imageBase64 required" });
      return;
    }

    const visionKey = process.env.GOOGLE_VISION_API_KEY;
    if (!visionKey) {
      res.json({
        category: "General Merchandise",
        brand: null,
        title: "Stock Item",
        confidence: 0.5,
      });
      return;
    }

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${visionKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: imageBase64.replace(/^data:[^;]+;base64,/, "") },
              features: [
                { type: "LABEL_DETECTION", maxResults: 10 },
                { type: "LOGO_DETECTION", maxResults: 3 },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      res.json({ category: "General Merchandise", brand: null, title: "Stock Item", confidence: 0.5 });
      return;
    }

    const data = await response.json() as any;
    const annotations = data.responses?.[0];
    const labels = annotations?.labelAnnotations?.map((l: any) => l.description) || [];
    const logos = annotations?.logoAnnotations?.map((l: any) => l.description) || [];

    const categoryMap: Record<string, string> = {
      "clothing": "Clothing", "shirt": "Clothing", "pants": "Clothing", "dress": "Clothing",
      "electronics": "Electronics", "phone": "Electronics", "laptop": "Electronics", "tv": "Electronics",
      "food": "Food & Grocery", "vegetable": "Food & Grocery", "fruit": "Food & Grocery",
      "furniture": "Furniture", "chair": "Furniture", "table": "Furniture",
      "toy": "Toys & Games", "game": "Toys & Games",
      "book": "Books & Stationery", "pen": "Books & Stationery",
    };

    let detectedCategory = "General Merchandise";
    let confidence = 0.6;
    for (const label of labels) {
      const lower = label.toLowerCase();
      for (const [key, cat] of Object.entries(categoryMap)) {
        if (lower.includes(key)) {
          detectedCategory = cat;
          confidence = 0.8;
          break;
        }
      }
      if (detectedCategory !== "General Merchandise") break;
    }

    const brand = logos[0] || null;
    const topLabel = labels[0] || "Stock Item";
    const title = brand ? `${brand} ${topLabel}` : topLabel;

    res.json({ category: detectedCategory, brand, title, confidence });
  } catch (err) {
    logger.error({ err }, "stockswap ai suggest error");
    res.json({ category: "General Merchandise", brand: null, title: "Stock Item", confidence: 0.5 });
  }
});

router.post("/stockswap/admin/verify-shop", async (req, res): Promise<void> => {
  try {
    const { shopId, adminKey } = req.body;
    if (adminKey !== ADMIN_KEY) {
      res.status(403).json({ error: "Invalid admin key" });
      return;
    }
    const result = await pool.query(
      "UPDATE ss_shops SET is_verified = true, verified_at = NOW() WHERE id = $1 RETURNING *",
      [shopId]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    res.json(formatShop(result.rows[0]));
  } catch (err) {
    req.log.error({ err }, "stockswap verify shop error");
    res.status(500).json({ error: "Failed to verify shop" });
  }
});

router.post("/stockswap/upload", async (req, res): Promise<void> => {
  try {
    const { imageBase64, fileName } = req.body;
    if (!imageBase64 || !fileName) {
      res.status(400).json({ error: "imageBase64 and fileName required" });
      return;
    }
    res.json({ url: imageBase64 });
  } catch (err) {
    logger.error({ err }, "stockswap upload error");
    res.status(500).json({ error: "Failed to upload image" });
  }
});

export default router;
