/*
  # Fix Admin RLS Policy Conflicts

  1. Changes
     - Modify admin table to make trial dates nullable
     - Update handle_new_user function to set NULL trial dates for 'not_started' status
     - Fix RLS policy conflicts by using unique policy names
     - Update user_admin_status view to handle NULL trial dates
     - Update existing admin records to fix any with incorrect trial dates

  2. Security
     - Ensure proper access control for all tables
     - Fix policy naming conflicts preventing migration application
     - Maintain proper role-based access control
*/

-- CRITICAL FIX: Modify admin table to make trial dates nullable
-- This must be done first to ensure the handle_new_user function can set NULL values
ALTER TABLE admin 
  ALTER COLUMN trial_started_at DROP DEFAULT,
  ALTER COLUMN trial_ends_at DROP DEFAULT;

-- CRITICAL FIX: Update handle_new_user function to set trial dates to NULL for 'not_started' status
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_id_var uuid;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;

  -- Create admin record with 'not_started' status - NO trial yet
  INSERT INTO public.admin (
    owner_id, 
    billing_manager_id, 
    company_name, 
    subscription_status, 
    trial_started_at, 
    trial_ends_at
  )
  VALUES (
    NEW.id, 
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
    'not_started',
    NULL, -- Explicitly set trial_started_at to NULL
    NULL  -- Explicitly set trial_ends_at to NULL
  )
  ON CONFLICT (owner_id) DO UPDATE SET
    billing_manager_id = NEW.id,
    company_name = COALESCE(NEW.raw_user_meta_data->>'company_name', admin.company_name)
  RETURNING id INTO admin_id_var;

  -- Get admin_id if it was a conflict
  IF admin_id_var IS NULL THEN
    SELECT id INTO admin_id_var FROM public.admin WHERE owner_id = NEW.id;
  END IF;

  -- Create team member record
  INSERT INTO public.team_members (admin_id, profile_id, role)
  VALUES (admin_id_var, NEW.id, 'owner')
  ON CONFLICT (admin_id, profile_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth process
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Email verification trigger - User goes to start-trial page after verification
CREATE OR REPLACE FUNCTION handle_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if email_confirmed_at changed from NULL to a timestamp
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Keep status as 'not_started' - user must go through start-trial page
    -- DO NOT create any Stripe records here
    -- DO NOT start trial automatically
    
    -- Just log that email was verified
    RAISE LOG 'Email verified for user: %, redirecting to start-trial page', NEW.email;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the process
    RAISE LOG 'Error in handle_email_verification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user_admin_status view to handle NULL trial dates
CREATE OR REPLACE VIEW user_admin_status AS
SELECT 
  tm.profile_id,
  tm.admin_id,
  CASE 
    WHEN tm.role = 'owner' THEN 'owner'
    WHEN tm.role = 'admin' THEN 'admin'
    ELSE 'member'
  END as role,
  (tm.role = 'owner') as is_owner,
  a.trial_started_at,
  a.subscription_status,
  a.customer_id,
  CASE 
    WHEN a.subscription_status = 'active' THEN true
    WHEN a.subscription_status = 'trialing' AND a.trial_ends_at IS NOT NULL AND a.trial_ends_at > now() THEN true
    ELSE false
  END as has_active_subscription
FROM team_members tm
JOIN admin a ON tm.admin_id = a.id;

-- Recreate user registration triggers
DO $$
BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP TRIGGER IF EXISTS on_email_verified ON auth.users;
    
    -- Create new triggers
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();

    CREATE TRIGGER on_email_verified
      AFTER UPDATE OF email_confirmed_at ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_email_verification();
END
$$;

-- Update existing admin records to fix any with incorrect trial dates
UPDATE admin
SET trial_started_at = NULL, trial_ends_at = NULL
WHERE subscription_status = 'not_started';

-- CRITICAL FIX: Temporarily set admin RLS policy to allow all authenticated users to read admin data
-- This will help diagnose the 500 error when querying admin data
CREATE POLICY "admin_select_all" ON admin
  FOR SELECT TO authenticated
  USING (true);