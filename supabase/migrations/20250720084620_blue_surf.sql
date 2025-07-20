/*
  # Fix Team Members RLS Policy Recursion

  1. Problem
    - The team_members table has RLS policies that create infinite recursion
    - Policies reference admin table which in turn references team_members
    - This causes "infinite recursion detected in policy for relation" errors

  2. Solution
    - Drop all existing team_members RLS policies
    - Create new non-recursive policies that use direct auth.uid() checks
    - Ensure policies don't create circular dependencies with admin table

  3. Security
    - Users can access their own team member records
    - Admin owners can access team member records for their companies
    - Maintain proper access control without recursion
*/

-- Drop all existing team_members policies to prevent conflicts
DROP POLICY IF EXISTS "team_members_manage_authorized" ON team_members;
DROP POLICY IF EXISTS "team_members_select_authorized" ON team_members;
DROP POLICY IF EXISTS "team_members_postgres_all" ON team_members;

-- Create new non-recursive policies for team_members table

-- Policy 1: Users can access their own team member records
CREATE POLICY "team_members_own_access"
  ON team_members
  FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Policy 2: Admin owners can access team member records for their companies
-- This uses a direct subquery to admin table without creating recursion
CREATE POLICY "team_members_admin_access"
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

-- Policy 3: System access for postgres role
CREATE POLICY "team_members_postgres_all"
  ON team_members
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Verify RLS is enabled on team_members table
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;