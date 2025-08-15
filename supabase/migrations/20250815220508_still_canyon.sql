/*
  # Fix Admin RLS Policies for Team Members

  1. Security Updates
    - Fix admin table RLS policies to properly handle team members
    - Add better policies for user_admin_status view
    - Ensure team members can access admin data when they're part of the team

  2. Policy Updates
    - Update admin_owner_full_access policy to include team members
    - Add explicit policy for team member access to admin data
    - Fix any gaps in the permission chain
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "admin_owner_full_access" ON admin;

-- Create comprehensive admin access policy
CREATE POLICY "admin_full_access_policy"
  ON admin
  FOR ALL
  TO authenticated
  USING (
    -- Owner has full access
    owner_id = auth.uid()
    OR
    -- Team members (admin or owner role) have access
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.admin_id = admin.id
      AND tm.profile_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    -- Owner has full access
    owner_id = auth.uid()
    OR
    -- Team members (admin or owner role) have access
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.admin_id = admin.id
      AND tm.profile_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

-- Ensure team_members policies are correct
DROP POLICY IF EXISTS "team_members_admin_manage" ON team_members;
DROP POLICY IF EXISTS "team_members_own_record" ON team_members;

-- Policy for admin owners to manage team members
CREATE POLICY "team_members_admin_owner_manage"
  ON team_members
  FOR ALL
  TO authenticated
  USING (
    admin_id IN (
      SELECT admin.id
      FROM admin
      WHERE admin.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    admin_id IN (
      SELECT admin.id
      FROM admin
      WHERE admin.owner_id = auth.uid()
    )
  );

-- Policy for team members to read their own record and other team members
CREATE POLICY "team_members_read_own_team"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    -- Can read own record
    profile_id = auth.uid()
    OR
    -- Can read other team members if user is admin/owner of the same admin
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.admin_id = team_members.admin_id
      AND tm.profile_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

-- Policy for team members to update their own record
CREATE POLICY "team_members_update_own"
  ON team_members
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Ensure profiles policies allow team members to read each other
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;

CREATE POLICY "profiles_select_accessible"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Can read own profile
    auth.uid() = id
    OR
    -- Can read profiles of team members in same admin
    EXISTS (
      SELECT 1 FROM team_members tm1
      JOIN team_members tm2 ON tm1.admin_id = tm2.admin_id
      WHERE tm1.profile_id = auth.uid()
      AND tm2.profile_id = profiles.id
      AND tm1.role IN ('owner', 'admin')
    )
  );

-- Add index for better performance on team member lookups
CREATE INDEX IF NOT EXISTS idx_team_members_admin_profile ON team_members(admin_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);

-- Refresh the user_admin_status view to ensure it works with new policies
DROP VIEW IF EXISTS user_admin_status;

CREATE VIEW user_admin_status AS
SELECT 
  tm.profile_id,
  tm.admin_id,
  tm.role,
  (tm.role = 'owner') as is_owner,
  a.trial_started_at,
  a.subscription_status,
  a.customer_id,
  CASE 
    WHEN a.subscription_status = 'active' THEN true
    WHEN a.subscription_status = 'trialing' AND a.trial_ends_at > now() THEN true
    ELSE false
  END as has_active_subscription
FROM team_members tm
JOIN admin a ON tm.admin_id = a.id
WHERE tm.profile_id = auth.uid();

-- Grant access to the view
GRANT SELECT ON user_admin_status TO authenticated;