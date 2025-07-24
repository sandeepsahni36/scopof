/*
  # Add Trial Reminder Tracking

  1. New Columns
    - `trial_reminder_7day_sent` (boolean) - Tracks if 7-day reminder email has been sent
  
  2. Indexes
    - Index on `trial_reminder_7day_sent` for efficient querying
  
  3. Purpose
    - Prevents duplicate reminder emails
    - Enables efficient querying of users who need reminders
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

-- Add index for efficient querying of users who need reminders
CREATE INDEX IF NOT EXISTS idx_admin_trial_reminder_7day ON admin(trial_reminder_7day_sent) 
WHERE subscription_status = 'trialing' AND trial_ends_at IS NOT NULL;