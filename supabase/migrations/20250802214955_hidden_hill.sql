/*
  # Fix Stripe Tables Primary Keys

  1. Database Changes
    - Add proper primary key columns to stripe_customers, stripe_orders, and stripe_subscriptions tables
    - Use SERIAL type for auto-incrementing primary keys
    - Safely handle existing data by recreating tables with proper structure

  2. Benefits
    - Enables row deletion in Supabase dashboard
    - Resolves webhook insertion issues
    - Provides proper unique identifiers for all Stripe records
*/

-- Fix stripe_customers table
DO $$
BEGIN
  -- Check if the table exists and needs fixing
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stripe_customers') THEN
    -- Create new table with proper structure
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
    ON CONFLICT DO NOTHING;

    -- Drop old table and rename new one
    DROP TABLE stripe_customers;
    ALTER TABLE stripe_customers_new RENAME TO stripe_customers;
  END IF;
END $$;

-- Fix stripe_orders table
DO $$
BEGIN
  -- Check if the table exists and needs fixing
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stripe_orders') THEN
    -- Create new table with proper structure
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
    ON CONFLICT DO NOTHING;

    -- Drop old table and rename new one
    DROP TABLE stripe_orders;
    ALTER TABLE stripe_orders_new RENAME TO stripe_orders;
  END IF;
END $$;

-- Fix stripe_subscriptions table
DO $$
BEGIN
  -- Check if the table exists and needs fixing
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stripe_subscriptions') THEN
    -- Create new table with proper structure
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
      status stripe_subscription_status DEFAULT 'not_started',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      deleted_at timestamptz,
      last_card_expiring_reminder_sent_at timestamptz
    );

    -- Copy existing data if any
    INSERT INTO stripe_subscriptions_new (customer_id, subscription_id, price_id, current_period_start, current_period_end, cancel_at_period_end, payment_method_brand, payment_method_last4, status, created_at, updated_at, deleted_at, last_card_expiring_reminder_sent_at)
    SELECT customer_id, subscription_id, price_id, current_period_start, current_period_end, cancel_at_period_end, payment_method_brand, payment_method_last4, status, created_at, updated_at, deleted_at, last_card_expiring_reminder_sent_at
    FROM stripe_subscriptions
    ON CONFLICT (customer_id) DO NOTHING;

    -- Drop old table and rename new one
    DROP TABLE stripe_subscriptions;
    ALTER TABLE stripe_subscriptions_new RENAME TO stripe_subscriptions;
  END IF;
END $$;

-- Recreate triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers back
DROP TRIGGER IF EXISTS update_stripe_customers_updated_at ON stripe_customers;
CREATE TRIGGER update_stripe_customers_updated_at
    BEFORE UPDATE ON stripe_customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stripe_orders_updated_at ON stripe_orders;
CREATE TRIGGER update_stripe_orders_updated_at
    BEFORE UPDATE ON stripe_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stripe_subscriptions_updated_at ON stripe_subscriptions;
CREATE TRIGGER update_stripe_subscriptions_updated_at
    BEFORE UPDATE ON stripe_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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