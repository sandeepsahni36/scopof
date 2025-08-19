/*
  # Fix RLS Policies and Harden current_admin_ids Function

  This migration addresses the security vulnerability where users can see invitations 
  from other companies by:

  1. Function Hardening
     - Hardens the `current_admin_ids()` function to prevent RLS context issues
     - Adds explicit search path and auth.uid() capture for reliability
     - Prevents circular RLS dependencies

  2. RLS Policy Updates
     - Updates policies on `admin` table to use hardened function
     - Updates policies on `team_members` table to prevent circular dependencies
     - Ensures proper isolation between companies

  3. Security Improvements
     - Breaks circular RLS dependencies that could cause incorrect policy evaluation
     - Ensures users only see data from their own company/admin context
     - Maintains existing functionality while fixing security issues
*/

-- Step 1: Harden the public.current_admin_ids() function
-- This function is SECURITY DEFINER and needs to be robust against RLS context issues.
-- It will now explicitly capture auth.uid() and set search_path for reliability.
CREATE OR REPLACE FUNCTION public.current_admin_ids()
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
    _auth_uid uuid;
BEGIN
    -- Get the current authenticated user's UID safely
    _auth_uid := auth.uid();

    -- If no user is authenticated, return an empty set
    IF _auth_uid IS NULL THEN
        RETURN;
    END IF;

    -- Return admin_id if the current user is the owner of an admin record
    RETURN QUERY SELECT id FROM public.admin WHERE owner_id = _auth_uid;

    -- Return admin_id if the current user is a team member with 'owner' or 'admin' role
    RETURN QUERY SELECT admin_id FROM public.team_members
    WHERE profile_id = _auth_uid AND role IN ('owner', 'admin');
END;
$function$;

-- Step 2: Update RLS policies on public.admin table
-- This resolves potential circular dependencies and ensures correct access to admin records.

-- Drop the old policy that might cause circularity or be redundant
DROP POLICY IF EXISTS admin_team_member_access ON public.admin;

-- Create a new policy to allow authenticated users to select admin records
-- based on the admin_ids returned by the hardened current_admin_ids() function.
CREATE POLICY admin_select_by_current_admin_ids
ON public.admin FOR SELECT TO authenticated
USING (id IN (SELECT public.current_admin_ids()));

-- Step 3: Update RLS policies on public.team_members table
-- This resolves potential circular dependencies and ensures correct access to team_member records.

-- Drop old policies that might cause circularity or be redundant
DROP POLICY IF EXISTS team_members_access_by_admin ON public.team_members;
DROP POLICY IF EXISTS team_members_manage_by_admin ON public.team_members;

-- Ensure the policy allowing a user to read their own team_member record exists.
-- This is a simple, non-circular policy.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'team_members_self_read_only' AND tablename = 'team_members') THEN
        CREATE POLICY team_members_self_read_only
        ON public.team_members FOR SELECT TO public
        USING (profile_id = auth.uid());
    END IF;
END
$$;

-- Create a new policy to allow authenticated users to select team_member records
-- based on the admin_ids returned by the hardened current_admin_ids() function.
CREATE POLICY team_members_select_by_current_admin_ids
ON public.team_members FOR SELECT TO authenticated
USING (admin_id IN (SELECT public.current_admin_ids()));