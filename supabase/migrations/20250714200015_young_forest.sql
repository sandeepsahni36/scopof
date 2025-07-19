/*
  # Fix RLS Policy Recursion Issues

  1. Problem
    - Infinite recursion detected in policy for relation "team_members"
    - admin_select_all policy is overly permissive
    - team_members policies are self-referencing causing circular dependencies

  2. Solution
    - Drop existing problematic policies
    - Create new non-recursive policies for admin table
    - Create new non-recursive policies for team_members table
    - Ensure proper access control without circular references

  3. Security
    - Maintain proper role-based access control
    - Ensure owners can manage their admin records
    - Ensure team members can access appropriate data
    - Remove overly broad access permissions
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "admin_select_all" ON admin;
DROP POLICY IF EXISTS "team_members_select_authorized" ON team_members;
DROP POLICY IF EXISTS "team_members_manage_authorized" ON team_members;

-- Create new admin policies without recursion
CREATE POLICY "admin_select_authorized"
  ON admin
  FOR SELECT
  TO authenticated
  USING (
    -- User is the owner of this admin record
    owner_id = auth.uid()
    OR
    -- User is a team member of this admin (direct check without recursion)
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.admin_id = admin.id 
      AND tm.profile_id = auth.uid()
    )
  );

-- Create new team_members policies without recursion
CREATE POLICY "team_members_select_authorized"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    -- User is this team member
    profile_id = auth.uid()
    OR
    -- User is the owner of the admin this team member belongs to
    EXISTS (
      SELECT 1 FROM admin a
      WHERE a.id = team_members.admin_id 
      AND a.owner_id = auth.uid()
    )
  );

CREATE POLICY "team_members_manage_authorized"
  ON team_members
  FOR ALL
  TO authenticated
  USING (
    -- User is this team member (for their own record)
    profile_id = auth.uid()
    OR
    -- User is the owner of the admin this team member belongs to
    EXISTS (
      SELECT 1 FROM admin a
      WHERE a.id = team_members.admin_id 
      AND a.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    -- User is this team member (for their own record)
    profile_id = auth.uid()
    OR
    -- User is the owner of the admin this team member belongs to
    EXISTS (
      SELECT 1 FROM admin a
      WHERE a.id = team_members.admin_id 
      AND a.owner_id = auth.uid()
    )
  );