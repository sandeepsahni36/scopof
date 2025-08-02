/*
  # Fix Stripe Tables Primary Keys

  This migration adds proper primary key constraints to Stripe tables to enable
  row deletion operations in Supabase dashboard and fix webhook insertion issues.

  ## Changes Made
  1. Add SERIAL PRIMARY KEY to stripe_customers table
  2. Add SERIAL PRIMARY KEY to stripe_orders table  
  3. Add SERIAL PRIMARY KEY to stripe_subscriptions table
  4. Recreate all necessary triggers and constraints

  ## Important Notes
  - This migration preserves all existing data
  - Uses SERIAL type for auto-incrementing primary keys
  - Recreates tables to ensure proper structure
*/

-- First, let's backup and recreate stripe_customers table
CREATE TABLE IF NOT EXISTS stripe_customers_new (
  id SERIAL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  customer_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Copy existing data if any
INSERT INTO stripe_customers_new (user_id, customer_id, created_at, updated_at, deleted_at)
SELECT user_id, customer_id, created_at, updated_at, deleted_at
FROM stripe_customers
WHERE EXISTS (SELECT 1 FROM stripe_customers LIMIT 1);

-- Drop old table and rename new one
DROP TABLE IF EXISTS stripe_customers CASCADE;
ALTER TABLE stripe_customers_new RENAME TO stripe_customers;

-- Recreate stripe_orders table
CREATE TABLE IF NOT EXISTS stripe_orders_new (
  id SERIAL PRIMARY KEY,
  checkout_session_id text NOT NULL,
  payment_intent_id text NOT NULL,
  customer_id text NOT NULL,
  amount_subtotal bigint NOT NULL,
  amount_total bigint NOT NULL,
  currency text NOT NULL,
  payment_status text NOT NULL,
  status stripe_order_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Copy existing data if any
INSERT INTO stripe_orders_new (checkout_session_id, payment_intent_id, customer_id, amount_subtotal, amount_total, currency, payment_status, status, created_at, updated_at, deleted_at)
SELECT checkout_session_id, payment_intent_id, customer_id, amount_subtotal, amount_total, currency, payment_status, status, created_at, updated_at, deleted_at
FROM stripe_orders
WHERE EXISTS (SELECT 1 FROM stripe_orders LIMIT 1);

-- Drop old table and rename new one
DROP TABLE IF EXISTS stripe_orders CASCADE;
ALTER TABLE stripe_orders_new RENAME TO stripe_orders;

-- Recreate stripe_subscriptions table
CREATE TABLE IF NOT EXISTS stripe_subscriptions_new (
  id SERIAL PRIMARY KEY,
  customer_id text UNIQUE NOT NULL,
  subscription_id text,
  price_id text,
  current_period_start bigint,
  current_period_end bigint,
  cancel_at_period_end boolean DEFAULT false,
  payment_method_brand text,
  payment_method_last4 text,
  status stripe_subscription_status DEFAULT 'not_started' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  last_card_expiring_reminder_sent_at timestamptz
);

-- Copy existing data if any
INSERT INTO stripe_subscriptions_new (customer_id, subscription_id, price_id, current_period_start, current_period_end, cancel_at_period_end, payment_method_brand, payment_method_last4, status, created_at, updated_at, deleted_at, last_card_expiring_reminder_sent_at)
SELECT customer_id, subscription_id, price_id, current_period_start, current_period_end, cancel_at_period_end, payment_method_brand, payment_method_last4, status, created_at, updated_at, deleted_at, last_card_expiring_reminder_sent_at
FROM stripe_subscriptions
WHERE EXISTS (SELECT 1 FROM stripe_subscriptions LIMIT 1);

-- Drop old table and rename new one
DROP TABLE IF EXISTS stripe_subscriptions CASCADE;
ALTER TABLE stripe_subscriptions_new RENAME TO stripe_subscriptions;

-- Enable RLS on all tables
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "stripe_customers_postgres_all"
  ON stripe_customers
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "stripe_orders_postgres_all"
  ON stripe_orders
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "stripe_subscriptions_postgres_all"
  ON stripe_subscriptions
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stripe_customers_updated_at
    BEFORE UPDATE ON stripe_customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_orders_updated_at
    BEFORE UPDATE ON stripe_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_subscriptions_updated_at
    BEFORE UPDATE ON stripe_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_card_reminder 
  ON stripe_subscriptions (last_card_expiring_reminder_sent_at, status) 
  WHERE status IN ('active', 'trialing');