/*
  # Add Card Expiring Reminder Tracking

  1. Database Changes
    - Add `last_card_expiring_reminder_sent_at` column to `stripe_subscriptions` table
    - Add index for efficient querying of reminder tracking

  2. Purpose
    - Track when expiring card reminder emails were last sent
    - Prevent duplicate reminder emails for the same card expiration
    - Enable efficient querying for cards that need expiring reminders
*/

-- Add column to track when expiring card reminder was last sent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_subscriptions' AND column_name = 'last_card_expiring_reminder_sent_at'
  ) THEN
    ALTER TABLE stripe_subscriptions 
    ADD COLUMN last_card_expiring_reminder_sent_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Add index for efficient querying of expiring card reminders
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_card_reminder 
ON stripe_subscriptions (last_card_expiring_reminder_sent_at, status) 
WHERE status IN ('active', 'trialing');