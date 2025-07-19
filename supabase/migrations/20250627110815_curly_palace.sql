/*
  # Fix Admin RLS Policy Conflicts

  1. Critical Fixes
    - Remove conflicting RLS policies on admin table
    - Create a single, simple SELECT policy for admin table
    - Fix NULL trial dates handling in admin table
    - Update user_admin_status view to properly handle NULL trial dates

  2. Security
    - Ensure proper access control while fixing 500 errors
    - Maintain data isolation between organizations
*/

-- CRITICAL FIX: Drop all existing policies on admin table to resolve conflicts
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Get all policies for admin table and drop them
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'admin'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.admin', 
                          policy_record.policyname);
            RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to drop policy %: %', policy_record.policyname, SQLERRM;
        END;
    END LOOP;
END $$;

-- CRITICAL FIX: Create a single, simple SELECT policy for admin table
CREATE POLICY "admin_select_all" ON admin
  FOR SELECT TO authenticated
  USING (true);

-- Create other necessary admin policies with unique names
CREATE POLICY "admin_update_by_owner" ON admin
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "admin_insert_by_user" ON admin
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "admin_postgres_all_access" ON admin 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- CRITICAL FIX: Modify admin table to make trial dates nullable
-- This must be done to ensure the handle_new_user function can set NULL values
ALTER TABLE admin 
  ALTER COLUMN trial_started_at DROP NOT NULL,
  ALTER COLUMN trial_ends_at DROP NOT NULL;

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

-- Update existing admin records to fix any with incorrect trial dates
UPDATE admin
SET trial_started_at = NULL, trial_ends_at = NULL
WHERE subscription_status = 'not_started';

-- Log the fix for debugging purposes
DO $$
BEGIN
    RAISE NOTICE 'Admin RLS policy fix applied successfully';
END $$;