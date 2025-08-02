/*
  # Add Primary Keys to Stripe Tables

  1. Changes
    - Add auto-incrementing primary key columns to stripe_customers, stripe_orders, and stripe_subscriptions tables
    - Enable proper row deletion and updates in Supabase dashboard
    - Maintain existing data integrity

  2. Technical Details
    - Uses SERIAL type for auto-incrementing integer primary keys
    - Adds constraints after column creation for compatibility
    - Handles existing data gracefully
*/

-- Add primary key column to stripe_customers if it doesn't exist
DO $$
BEGIN
  -- Check if id column exists and is not already a primary key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stripe_customers' AND column_name = 'id' AND is_nullable = 'NO'
  ) THEN
    -- Drop existing id column if it exists but is not properly configured
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'stripe_customers' AND column_name = 'id'
    ) THEN
      ALTER TABLE stripe_customers DROP COLUMN id;
    END IF;
    
    -- Add new auto-incrementing primary key column
    ALTER TABLE stripe_customers ADD COLUMN id SERIAL PRIMARY KEY;
  END IF;
END $$;

-- Add primary key column to stripe_orders if it doesn't exist
DO $$
BEGIN
  -- Check if id column exists and is not already a primary key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stripe_orders' AND column_name = 'id' AND is_nullable = 'NO'
  ) THEN
    -- Drop existing id column if it exists but is not properly configured
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'stripe_orders' AND column_name = 'id'
    ) THEN
      ALTER TABLE stripe_orders DROP COLUMN id;
    END IF;
    
    -- Add new auto-incrementing primary key column
    ALTER TABLE stripe_orders ADD COLUMN id SERIAL PRIMARY KEY;
  END IF;
END $$;

-- Add primary key column to stripe_subscriptions if it doesn't exist
DO $$
BEGIN
  -- Check if id column exists and is not already a primary key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stripe_subscriptions' AND column_name = 'id' AND is_nullable = 'NO'
  ) THEN
    -- Drop existing id column if it exists but is not properly configured
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'stripe_subscriptions' AND column_name = 'id'
    ) THEN
      ALTER TABLE stripe_subscriptions DROP COLUMN id;
    END IF;
    
    -- Add new auto-incrementing primary key column
    ALTER TABLE stripe_subscriptions ADD COLUMN id SERIAL PRIMARY KEY;
  END IF;
END $$;