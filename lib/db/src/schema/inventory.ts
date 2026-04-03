import {
  pgTable,
  text,
  serial,
  integer,
  numeric,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const inventoryProductsTable = pgTable("inventory_products", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("demo-user"),
  name: text("name").notNull(),
  sku: text("sku"),
  category: text("category"),
  quantity: integer("quantity").notNull().default(0),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertInventoryProductSchema = createInsertSchema(
  inventoryProductsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInventoryProduct = z.infer<
  typeof insertInventoryProductSchema
>;
export type InventoryProduct = typeof inventoryProductsTable.$inferSelect;

export const inventoryAuditLogsTable = pgTable("inventory_audit_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("demo-user"),
  productId: integer("product_id"),
  productName: text("product_name"),
  action: text("action").notNull(),
  delta: integer("delta"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertInventoryAuditLogSchema = createInsertSchema(
  inventoryAuditLogsTable,
).omit({ id: true, createdAt: true });
export type InsertInventoryAuditLog = z.infer<
  typeof insertInventoryAuditLogSchema
>;
export type InventoryAuditLog = typeof inventoryAuditLogsTable.$inferSelect;

export const inventoryUserSubscriptionsTable = pgTable(
  "inventory_user_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().unique(),
    tier: text("tier").notNull().default("free"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    isPro: boolean("is_pro").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
);

export type InventoryUserSubscription =
  typeof inventoryUserSubscriptionsTable.$inferSelect;
