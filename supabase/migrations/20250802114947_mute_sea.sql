/*
  # Add unique constraint to stripe_subscriptions customer_id

  1. Database Changes
    - Add unique constraint on `customer_id` column in `stripe_subscriptions` table
    - This enables proper upsert operations in Stripe webhook processing
    
  2. Benefits
    - Resolves "ON CONFLICT specification" errors in stripe-webhook Edge Function
    - Prevents duplicate subscription records for the same customer
    - Enables reliable subscription status updates from Stripe webhooks
    
  3. Notes
    - Uses IF NOT EXISTS pattern to prevent errors if constraint already exists
    - Does not use OWNER TO supabase_admin to avoid permission errors
*/

-- Add unique constraint on customer_id if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stripe_subscriptions_customer_id_key' 
    AND table_name = 'stripe_subscriptions'
  ) THEN
    ALTER TABLE public.stripe_subscriptions 
    ADD CONSTRAINT stripe_subscriptions_customer_id_key UNIQUE (customer_id);
  END IF;
END $$;