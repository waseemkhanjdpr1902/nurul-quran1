import { pgTable, text, serial, timestamp, boolean, numeric, pgEnum, integer } from "drizzle-orm/pg-core";
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
  delta: numeric("delta", { precision: 6, scale: 4 }),
  volumeConfirmed: boolean("volume_confirmed").notNull().default(false),
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

export const webhookPlatformEnum = pgEnum("trademaster_webhook_platform", ["generic", "sensibull", "tradetron"]);

export const tradeMasterWebhooks = pgTable("trademaster_webhooks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  platform: webhookPlatformEnum("platform").notNull().default("generic"),
  secret: text("secret"),
  isActive: boolean("is_active").notNull().default(true),
  lastFiredAt: timestamp("last_fired_at", { withTimezone: true }),
  lastStatusCode: integer("last_status_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TradeMasterWebhook = typeof tradeMasterWebhooks.$inferSelect;

export const investmentReportCategoryEnum = pgEnum("trademaster_report_category", [
  "large_cap_equity", "etf", "mutual_fund", "government_bond", "gold_silver", "reit", "fixed_deposit"
]);
export const analystRatingEnum = pgEnum("trademaster_analyst_rating", ["strong_buy", "buy", "hold", "sell"]);
export const riskLevelEnum = pgEnum("trademaster_risk_level", ["low", "medium", "high"]);

export const tradeMasterInvestmentReports = pgTable("trademaster_investment_reports", {
  id: serial("id").primaryKey(),
  category: investmentReportCategoryEnum("category").notNull(),
  instrumentName: text("instrument_name").notNull(),
  instrumentCode: text("instrument_code"),
  analystRating: analystRatingEnum("analyst_rating").notNull().default("buy"),
  riskLevel: riskLevelEnum("risk_level").notNull().default("medium"),
  suggestedAllocationPct: integer("suggested_allocation_pct").notNull().default(10),
  recommendedHorizon: text("recommended_horizon").notNull(),
  rationale: text("rationale").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type TradeMasterInvestmentReport = typeof tradeMasterInvestmentReports.$inferSelect;

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

export const tradeDirectionEnum = pgEnum("tm_trade_direction", ["long", "short"]);
export const tradeOutcomeEnum = pgEnum("tm_trade_outcome", ["open", "win", "loss", "breakeven"]);

export const tradeMasterJournal = pgTable("trademaster_journal", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  assetName: text("asset_name").notNull(),
  assetType: text("asset_type").notNull().default("equity"),
  direction: tradeDirectionEnum("direction").notNull().default("long"),
  entryPrice: numeric("entry_price", { precision: 12, scale: 4 }).notNull(),
  exitPrice: numeric("exit_price", { precision: 12, scale: 4 }),
  quantity: integer("quantity").notNull(),
  strategyUsed: text("strategy_used"),
  notes: text("notes"),
  entryDate: timestamp("entry_date", { withTimezone: true }).notNull().defaultNow(),
  exitDate: timestamp("exit_date", { withTimezone: true }),
  outcome: tradeOutcomeEnum("outcome").notNull().default("open"),
  pnl: numeric("pnl", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJournalTradeSchema = createInsertSchema(tradeMasterJournal).omit({ id: true, createdAt: true });
export type InsertJournalTrade = z.infer<typeof insertJournalTradeSchema>;
export type JournalTrade = typeof tradeMasterJournal.$inferSelect;

export const tradeMasterConsent = pgTable("trademaster_consent", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TradeMasterConsent = typeof tradeMasterConsent.$inferSelect;
