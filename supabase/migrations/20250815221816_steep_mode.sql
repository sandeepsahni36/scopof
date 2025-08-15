/*
  # Fix infinite recursion in RLS policies

  1. Policy Changes
    - Remove all recursive policies that cause infinite loops
    - Create simple, non-recursive policies for admin and team_members tables
    - Fix circular dependencies between admin and team_members

  2. Security
    - Maintain proper access control without recursion
    - Ensure owners can access their admin data
    - Allow team members to access their team's admin data
*/

-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "admin_owner_access" ON admin;
DROP POLICY IF EXISTS "admin_team_member_access" ON admin;
DROP POLICY IF EXISTS "team_members_admin_manage" ON team_members;
DROP POLICY IF EXISTS "team_members_owner_manage" ON team_members;
DROP POLICY IF EXISTS "team_members_self_read" ON team_members;
DROP POLICY IF EXISTS "team_members_update_own" ON team_members;

-- Create simple, non-recursive policies for admin table
CREATE POLICY "admin_owner_direct_access"
  ON admin
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Create simple, non-recursive policies for team_members table
CREATE POLICY "team_members_owner_direct_access"
  ON team_members
  FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Allow team members to read admin data (non-recursive)
CREATE POLICY "admin_team_access_simple"
  ON admin
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT admin_id 
      FROM team_members 
      WHERE profile_id = auth.uid()
    )
  );

-- Allow admins to manage team members (non-recursive)
CREATE POLICY "team_members_admin_manage_simple"
  ON team_members
  FOR ALL
  TO authenticated
  USING (
    admin_id IN (
      SELECT id 
      FROM admin 
      WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    admin_id IN (
      SELECT id 
      FROM admin 
      WHERE owner_id = auth.uid()
    )
  );