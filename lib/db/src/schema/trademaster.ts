import { pgTable, text, serial, timestamp, boolean, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const segmentEnum = pgEnum("trademaster_segment", ["nifty", "banknifty", "options", "equity", "intraday", "commodity", "currency"]);
export const signalTypeEnum = pgEnum("trademaster_signal_type", ["buy", "sell"]);
export const signalStatusEnum = pgEnum("trademaster_signal_status", ["active", "target_hit", "sl_hit"]);

export const tradeMasterSignals = pgTable("trademaster_signals", {
  id: serial("id").primaryKey(),
  segment: segmentEnum("segment").notNull(),
  assetName: text("asset_name").notNull(),
  signalType: signalTypeEnum("signal_type").notNull(),
  entryPrice: numeric("entry_price", { precision: 12, scale: 4 }).notNull(),
  stopLoss: numeric("stop_loss", { precision: 12, scale: 4 }).notNull(),
  target1: numeric("target_1", { precision: 12, scale: 4 }).notNull(),
  target2: numeric("target_2", { precision: 12, scale: 4 }),
  riskReward: numeric("risk_reward", { precision: 8, scale: 2 }),
  iv: text("iv"),
  pcr: text("pcr"),
  notes: text("notes"),
  isPremium: boolean("is_premium").notNull().default(false),
  status: signalStatusEnum("status").notNull().default("active"),
  createdBy: text("created_by").notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTradeMasterSignalSchema = createInsertSchema(tradeMasterSignals).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTradeMasterSignal = z.infer<typeof insertTradeMasterSignalSchema>;
export type TradeMasterSignal = typeof tradeMasterSignals.$inferSelect;

export const tradeMasterSubscriptions = pgTable("trademaster_subscriptions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  email: text("email"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  plan: text("plan").notNull().default("professional"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type TradeMasterSubscription = typeof tradeMasterSubscriptions.$inferSelect;
