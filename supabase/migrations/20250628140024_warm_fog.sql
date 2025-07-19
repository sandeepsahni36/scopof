/*
  # Fix Duplicate Checkout Session IDs

  1. Changes
     - Handle duplicate checkout_session_id values in stripe_orders table
     - Add unique constraint to checkout_session_id after fixing duplicates
     - Ensure data integrity for future operations

  2. Implementation
     - Identify and handle duplicate checkout_session_id values
     - Keep the most recent record for each duplicate
     - Add unique constraint after cleaning up data
*/

-- First, identify and handle duplicate checkout_session_id values
DO $$ 
DECLARE
    duplicate_record RECORD;
    keep_id BIGINT;
BEGIN
    -- Find duplicate checkout_session_id values
    FOR duplicate_record IN 
        SELECT checkout_session_id, COUNT(*) as count
        FROM stripe_orders
        GROUP BY checkout_session_id
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Found duplicate checkout_session_id: % (% occurrences)', 
            duplicate_record.checkout_session_id, duplicate_record.count;
        
        -- Keep the most recent record (highest id) for each duplicate
        SELECT MAX(id) INTO keep_id
        FROM stripe_orders
        WHERE checkout_session_id = duplicate_record.checkout_session_id;
        
        -- Delete the older duplicate records
        DELETE FROM stripe_orders
        WHERE checkout_session_id = duplicate_record.checkout_session_id
        AND id != keep_id;
        
        RAISE NOTICE 'Kept record with id % and deleted % older duplicates', 
            keep_id, duplicate_record.count - 1;
    END LOOP;
END $$;

-- Now add the unique constraint
DO $$ 
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'stripe_orders_checkout_session_id_key' 
        AND conrelid = 'stripe_orders'::regclass
    ) THEN
        ALTER TABLE stripe_orders ADD CONSTRAINT stripe_orders_checkout_session_id_key UNIQUE (checkout_session_id);
        RAISE NOTICE 'Added unique constraint to checkout_session_id in stripe_orders table';
    ELSE
        RAISE NOTICE 'Unique constraint on checkout_session_id already exists';
    END IF;
END $$;

-- Log the changes
DO $$
BEGIN
    RAISE NOTICE 'Stripe orders table updated with unique constraint on checkout_session_id';
END $$;