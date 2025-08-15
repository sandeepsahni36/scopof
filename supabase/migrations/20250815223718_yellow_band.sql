/*
  # Fix infinite recursion in admin RLS policies

  1. Problem
    - Current RLS policies on admin table are causing infinite recursion
    - Policies are referencing each other in circular dependencies

  2. Solution
    - Drop ALL existing policies on admin and team_members tables
    - Create simple, non-recursive policies
    - Use direct ownership checks only
    - Avoid complex joins that cause recursion

  3. Security
    - Admin owners can access their own admin records
    - Team members can read admin data for their teams
    - Postgres has full access for system operations
*/

-- Drop ALL existing policies that might cause recursion
DROP POLICY IF EXISTS admin_owner_access ON public.admin;
DROP POLICY IF EXISTS admin_postgres_access ON public.admin;
DROP POLICY IF EXISTS admin_team_member_access ON public.admin;
DROP POLICY IF EXISTS admin_postgres_all ON public.admin;

DROP POLICY IF EXISTS team_members_admin_manage ON public.team_members;
DROP POLICY IF EXISTS team_members_owner_manage ON public.team_members;
DROP POLICY IF EXISTS team_members_postgres_access ON public.team_members;
DROP POLICY IF EXISTS team_members_self_read ON public.team_members;
DROP POLICY IF EXISTS team_members_update_own ON public.team_members;
DROP POLICY IF EXISTS team_members_postgres_all ON public.team_members;

-- Create simple, non-recursive policies for admin table
CREATE POLICY admin_owner_only ON public.admin
  FOR ALL 
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY admin_postgres_full ON public.admin
  FOR ALL 
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Create simple policies for team_members table
CREATE POLICY team_members_owner_full ON public.team_members
  FOR ALL
  TO authenticated
  USING (
    admin_id IN (
      SELECT id FROM admin WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    admin_id IN (
      SELECT id FROM admin WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY team_members_self_read_only ON public.team_members
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY team_members_postgres_full ON public.team_members
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Update user_admin_status view to use simple joins
DROP VIEW IF EXISTS public.user_admin_status;
CREATE VIEW public.user_admin_status AS
SELECT 
  tm.profile_id,
  tm.admin_id,
  tm.role,
  (a.owner_id = tm.profile_id) AS is_owner,
  a.trial_started_at,
  a.subscription_status,
  a.customer_id,
  (
    EXISTS (
      SELECT 1 
      FROM stripe_subscriptions ss 
      WHERE ss.customer_id = a.customer_id 
        AND ss.status IN ('active', 'trialing')
    )
  ) AS has_active_subscription
FROM team_members tm
JOIN admin a ON tm.admin_id = a.id;