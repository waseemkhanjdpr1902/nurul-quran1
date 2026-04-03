-- Inventory AI Pro — Supabase PostgreSQL Migration
-- Run this in the Supabase SQL editor to set up the schema.
-- 
-- Tables:
--   inventory_user_subscriptions — Stripe subscription + tier tracking
--   inventory_products           — stock items per user
--   inventory_audit_logs         — change log for every inventory action

-- User subscriptions table (tier management + Stripe info)
CREATE TABLE IF NOT EXISTS inventory_user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  is_pro BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS inventory_products (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'demo-user',
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_products_user_id ON inventory_products (user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_products_quantity ON inventory_products (quantity);

-- Audit log table
CREATE TABLE IF NOT EXISTS inventory_audit_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'demo-user',
  product_id INTEGER REFERENCES inventory_products(id) ON DELETE SET NULL,
  product_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('added', 'removed', 'edited', 'deleted')),
  delta INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_audit_logs_user_id ON inventory_audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_logs_product_id ON inventory_audit_logs (product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_logs_created_at ON inventory_audit_logs (created_at DESC);

-- Trigger to auto-update updated_at on inventory_products
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_inventory_products_updated_at ON inventory_products;
CREATE TRIGGER set_inventory_products_updated_at
  BEFORE UPDATE ON inventory_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed 10 demo products (optional — remove if you want a clean start)
INSERT INTO inventory_products (user_id, name, sku, category, quantity, unit_price) VALUES
  ('demo-user', 'Ballpoint Pen Pack (12pcs)', 'SKU-001', 'Stationery', 50, 3.99),
  ('demo-user', 'A4 Paper Ream 500 sheets', 'SKU-002', 'Stationery', 15, 8.50),
  ('demo-user', 'Wireless Mouse', 'SKU-003', 'Electronics', 8, 24.99),
  ('demo-user', 'USB-C Hub 7-in-1', 'SKU-004', 'Electronics', 3, 45.00),
  ('demo-user', 'Coffee Mug 350ml', 'SKU-005', 'Kitchen', 20, 12.00),
  ('demo-user', 'Hand Sanitizer 500ml', 'SKU-006', 'Hygiene', 4, 6.75),
  ('demo-user', 'Sticky Notes 5-pack', 'SKU-007', 'Stationery', 30, 4.50),
  ('demo-user', 'Laptop Stand Adjustable', 'SKU-008', 'Electronics', 2, 35.00),
  ('demo-user', 'Whiteboard Marker Set', 'SKU-009', 'Stationery', 12, 9.99),
  ('demo-user', 'Mechanical Keyboard', 'SKU-010', 'Electronics', 0, 89.00)
ON CONFLICT DO NOTHING;
