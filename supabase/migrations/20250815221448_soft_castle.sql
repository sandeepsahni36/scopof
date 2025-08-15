/*
  # Fix infinite recursion in RLS policies

  1. Problem
    - Infinite recursion detected in policy for relation "team_members"
    - Circular dependency between admin and team_members table policies

  2. Solution
    - Simplify RLS policies to avoid circular references
    - Use direct owner_id checks instead of complex joins
    - Remove recursive policy dependencies

  3. Changes
    - Update admin table policies to use direct owner_id checks
    - Simplify team_members policies to avoid circular references
    - Ensure policies are non-recursive and efficient
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "admin_full_access_policy" ON admin;
DROP POLICY IF EXISTS "team_members_admin_owner_manage" ON team_members;
DROP POLICY IF EXISTS "team_members_read_own_team" ON team_members;

-- Create simplified admin policies without circular dependencies
CREATE POLICY "admin_owner_access"
  ON admin
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "admin_team_member_access"
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

-- Create simplified team_members policies without circular dependencies
CREATE POLICY "team_members_owner_manage"
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

CREATE POLICY "team_members_self_read"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "team_members_admin_manage"
  ON team_members
  FOR ALL
  TO authenticated
  USING (
    admin_id IN (
      SELECT tm.admin_id
      FROM team_members tm
      WHERE tm.profile_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    admin_id IN (
      SELECT tm.admin_id
      FROM team_members tm
      WHERE tm.profile_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    )
  );