/*
  # Fix Admin Table RLS Policy Recursion

  1. Problem
    - Current admin table RLS policies are causing infinite recursion
    - Error: "infinite recursion detected in policy for relation \"admin\""
    - This prevents users from accessing admin data and causes authentication failures

  2. Solution
    - Drop all existing admin RLS policies that cause recursion
    - Create new non-recursive policies that directly check auth.uid()
    - Ensure policies don't reference the same table they're protecting
    - Maintain proper access control for owners and team members

  3. Security
    - Owners can access their own admin records
    - Team members can access admin records they belong to
    - No unauthorized access to other companies' admin data
*/

-- Drop all existing admin policies that might cause recursion
DROP POLICY IF EXISTS "admin_select_all" ON admin;
DROP POLICY IF EXISTS "admin_select_authorized" ON admin;
DROP POLICY IF EXISTS "admin_update_by_owner" ON admin;
DROP POLICY IF EXISTS "admin_insert_by_user" ON admin;
DROP POLICY IF EXISTS "admin_postgres_all_access" ON admin;

-- Create new non-recursive admin policies

-- Policy 1: Allow owners to access their own admin records
CREATE POLICY "admin_owner_access"
  ON admin
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Policy 2: Allow team members to read admin records they belong to
-- This uses a direct join to team_members without recursion
CREATE POLICY "admin_team_member_read"
  ON admin
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM team_members tm 
      WHERE tm.admin_id = admin.id 
      AND tm.profile_id = auth.uid()
    )
  );

-- Policy 3: Allow postgres role full access for system operations
CREATE POLICY "admin_postgres_all"
  ON admin
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Policy 4: Allow authenticated users to insert admin records for themselves
CREATE POLICY "admin_insert_own"
  ON admin
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());