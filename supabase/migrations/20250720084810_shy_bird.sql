/*
  # Fix RLS Infinite Recursion - Complete Solution

  1. Problem
    - Infinite recursion detected in policy for relation "admin"
    - Circular dependencies between admin and team_members table policies
    - RLS policies referencing each other causing evaluation loops

  2. Solution
    - Drop ALL existing policies on admin and team_members tables
    - Recreate with simple, non-recursive policies
    - Use direct auth.uid() checks and simple subqueries
    - Avoid any circular references between tables

  3. Security
    - Maintain proper access control
    - Owners can access their admin records
    - Team members can access their own records
    - Admin owners can manage their team members
*/

-- First, completely drop all existing policies on both tables
DROP POLICY IF EXISTS "admin_owner_access" ON admin;
DROP POLICY IF EXISTS "admin_team_member_read" ON admin;
DROP POLICY IF EXISTS "admin_postgres_all" ON admin;
DROP POLICY IF EXISTS "admin_insert_own" ON admin;
DROP POLICY IF EXISTS "admin_manage_authorized" ON admin;
DROP POLICY IF EXISTS "admin_select_authorized" ON admin;

DROP POLICY IF EXISTS "team_members_own_access" ON team_members;
DROP POLICY IF EXISTS "team_members_admin_access" ON team_members;
DROP POLICY IF EXISTS "team_members_postgres_all" ON team_members;
DROP POLICY IF EXISTS "team_members_manage_authorized" ON team_members;
DROP POLICY IF EXISTS "team_members_select_authorized" ON team_members;

-- Create simple, non-recursive policies for admin table
CREATE POLICY "admin_owner_full_access"
  ON admin
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "admin_postgres_access"
  ON admin
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Create simple, non-recursive policies for team_members table
CREATE POLICY "team_members_own_record"
  ON team_members
  FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "team_members_admin_manage"
  ON team_members
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

CREATE POLICY "team_members_postgres_access"
  ON team_members
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);