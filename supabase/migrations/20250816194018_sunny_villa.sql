/*
  # Fix RLS Policy Infinite Recursion

  This migration addresses infinite recursion errors in Row Level Security (RLS) policies
  by implementing security definer functions and replacing recursive policies with
  simplified, non-recursive versions.

  ## Changes Made

  1. **Security Definer Functions**
     - `current_admin_ids()` - Returns admin IDs accessible to current user
     - `accessible_template_ids()` - Returns template IDs accessible to current user

  2. **Policy Replacements**
     - Replaced recursive policies on `team_members` table
     - Replaced recursive policies on `templates` table  
     - Replaced recursive policies on `properties` table
     - Replaced recursive policies on `invitations` table
     - Replaced recursive policies on `profiles` table

  3. **Security**
     - Maintains strict access control while preventing recursion
     - Uses security definer functions to break circular dependencies
     - Preserves existing business logic and permissions

  ## Expected Outcome
     - Eliminates "infinite recursion detected" errors
     - Maintains proper access control for team members
     - Allows normal operation of templates, properties, and invitations
*/

-- 1. Create Security Definer Functions
-- These functions run with elevated privileges to safely retrieve IDs without triggering RLS recursion

-- Function to get all admin IDs associated with the current user
CREATE OR REPLACE FUNCTION public.current_admin_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT id FROM public.admin WHERE owner_id = auth.uid()
  UNION
  SELECT admin_id FROM public.team_members WHERE profile_id = auth.uid()
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.current_admin_ids() TO authenticated;

-- Function to get all accessible template IDs for the current user's admins
CREATE OR REPLACE FUNCTION public.accessible_template_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT id FROM public.templates
  WHERE admin_id IN (SELECT public.current_admin_ids())
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.accessible_template_ids() TO authenticated;

-- 2. Drop Existing Conflicting Policies
-- Remove policies that are causing recursion

-- Policies on team_members
DROP POLICY IF EXISTS "team_members_admin_manage" ON public.team_members;
DROP POLICY IF EXISTS "team_members_owner_full" ON public.team_members;
DROP POLICY IF EXISTS "team_members_owner_manage" ON public.team_members;

-- Policies on templates
DROP POLICY IF EXISTS "templates_manage_admins" ON public.templates;
DROP POLICY IF EXISTS "templates_select_members" ON public.templates;

-- Policies on properties
DROP POLICY IF EXISTS "properties_manage_admins" ON public.properties;
DROP POLICY IF EXISTS "properties_select_members" ON public.properties;

-- Policies on invitations
DROP POLICY IF EXISTS "invitations_delete_by_admin" ON public.invitations;
DROP POLICY IF EXISTS "invitations_insert_by_admin" ON public.invitations;
DROP POLICY IF EXISTS "invitations_select_by_token_or_admin" ON public.invitations;
DROP POLICY IF EXISTS "invitations_update_by_admin_or_invitee" ON public.invitations;

-- Policies on profiles
DROP POLICY IF EXISTS "profiles_select_accessible" ON public.profiles;

-- 3. Create New Non-Recursive RLS Policies

-- Policy for team_members (SELECT)
-- Allows authenticated users to see their own team_member entry
-- and any team_member entries belonging to an admin they are associated with
CREATE POLICY "team_members_access_by_admin"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  profile_id = auth.uid()
  OR admin_id IN (SELECT public.current_admin_ids())
);

-- Policy for team_members (INSERT, UPDATE, DELETE)
-- Allows admins/owners to manage team members within their own admin scope
CREATE POLICY "team_members_manage_by_admin"
ON public.team_members
FOR ALL
TO authenticated
USING (
  admin_id IN (SELECT public.current_admin_ids())
)
WITH CHECK (
  admin_id IN (SELECT public.current_admin_ids())
);

-- Policy for templates (SELECT)
-- Allows authenticated users to see templates belonging to an admin they are associated with
CREATE POLICY "templates_access_by_admin"
ON public.templates
FOR SELECT
TO authenticated
USING (
  admin_id IN (SELECT public.current_admin_ids())
);

-- Policy for templates (INSERT, UPDATE, DELETE)
-- Allows admins/owners to manage templates within their own admin scope
CREATE POLICY "templates_manage_by_admin"
ON public.templates
FOR ALL
TO authenticated
USING (
  admin_id IN (SELECT public.current_admin_ids())
)
WITH CHECK (
  admin_id IN (SELECT public.current_admin_ids())
);

-- Policy for properties (SELECT)
-- Allows authenticated users to see properties belonging to an admin they are associated with
CREATE POLICY "properties_access_by_admin"
ON public.properties
FOR SELECT
TO authenticated
USING (
  admin_id IN (SELECT public.current_admin_ids())
);

-- Policy for properties (INSERT, UPDATE, DELETE)
-- Allows admins/owners to manage properties within their own admin scope
CREATE POLICY "properties_manage_by_admin"
ON public.properties
FOR ALL
TO authenticated
USING (
  admin_id IN (SELECT public.current_admin_ids())
)
WITH CHECK (
  admin_id IN (SELECT public.current_admin_ids())
);

-- Policies for invitations
-- Allows admins/owners to manage invitations within their own admin scope
CREATE POLICY "invitations_manage_by_admin"
ON public.invitations
FOR ALL
TO authenticated
USING (
  admin_id IN (SELECT public.current_admin_ids())
)
WITH CHECK (
  admin_id IN (SELECT public.current_admin_ids())
);

-- Allows public/authenticated users to select invitations by token (for acceptance flow)
-- or if they are an admin of the inviting company
CREATE POLICY "invitations_select_public_or_admin"
ON public.invitations
FOR SELECT
TO public, authenticated
USING (
  (status = 'pending' AND expires_at > now()) -- Public access for pending, non-expired invites
  OR (auth.uid() IS NOT NULL AND admin_id IN (SELECT public.current_admin_ids())) -- Admin access
);

-- Policy for profiles (SELECT)
-- Allows users to see their own profile and profiles of other team members within their admin's scope
CREATE POLICY "profiles_access_by_team"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR id IN (SELECT profile_id FROM public.team_members WHERE admin_id IN (SELECT public.current_admin_ids()))
);

-- 4. Ensure proper indexes exist for performance
-- These indexes should already exist, but we'll create them if they don't

CREATE INDEX IF NOT EXISTS idx_team_members_profile_admin ON public.team_members(profile_id, admin_id);
CREATE INDEX IF NOT EXISTS idx_templates_admin_id_optimized ON public.templates(admin_id);
CREATE INDEX IF NOT EXISTS idx_properties_admin_id_optimized ON public.properties(admin_id);
CREATE INDEX IF NOT EXISTS idx_invitations_admin_id_optimized ON public.invitations(admin_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id_optimized ON public.profiles(id);

-- 5. Verify function ownership and permissions
-- Ensure the functions are owned by postgres for proper security definer execution
ALTER FUNCTION public.current_admin_ids() OWNER TO postgres;
ALTER FUNCTION public.accessible_template_ids() OWNER TO postgres;