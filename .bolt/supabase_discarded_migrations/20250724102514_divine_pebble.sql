/*
  # Add Trial Reminder Tracking

  1. Schema Changes
    - Add `trial_reminder_7day_sent` column to `admin` table
    - Add index for efficient querying of trial reminder status
  
  2. Purpose
    - Track which users have already received the 7-day trial expiration reminder
    - Prevent duplicate reminder emails from being sent
    - Support scheduled email automation functionality
*/

-- Add trial reminder tracking column to admin table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin' AND column_name = 'trial_reminder_7day_sent'
  ) THEN
    ALTER TABLE admin ADD COLUMN trial_reminder_7day_sent boolean DEFAULT false;
  END IF;
END $$;

-- Add index for efficient querying of trial reminder status
CREATE INDEX IF NOT EXISTS idx_admin_trial_reminder_status 
ON admin(subscription_status, trial_ends_at, trial_reminder_7day_sent)
WHERE subscription_status = 'trialing';

-- Add comment to document the new column
COMMENT ON COLUMN admin.trial_reminder_7day_sent IS 'Tracks whether the 7-day trial expiration reminder email has been sent to prevent duplicates';