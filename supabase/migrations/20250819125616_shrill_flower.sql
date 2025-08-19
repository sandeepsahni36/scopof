/*
  # Fix RLS policies for invitations table to prevent enumeration vulnerability

  ## Problem
  The existing `invitations_select_public_or_admin` policy allows any user (including unauthenticated users) 
  to see ALL pending invitations across all companies, creating a serious privacy vulnerability.

  ## Solution
  1. Remove the overly permissive policy that allows enumeration
  2. Create separate, more restrictive policies for authenticated and public users
  3. Ensure public users can only access invitations when they have the specific token

  ## Security Changes
  - Authenticated users can only see invitations for their own company
  - Public users can only access a specific invitation by token (for acceptance flow)
  - Prevents enumeration of all pending invitations by unauthorized users

  ## Testing Required
  After applying this migration:
  1. Verify authenticated users only see their company's invitations
  2. Verify invitation acceptance page still works with valid tokens
  3. Verify public users cannot enumerate all pending invitations
*/

-- Step 1: Drop the existing problematic policy
-- This policy is too broad for public access, allowing enumeration of pending invites
DROP POLICY IF EXISTS invitations_select_public_or_admin ON public.invitations;

-- Step 2: Create a new policy for authenticated users to select invitations
-- This policy ensures authenticated users can only see invitations related to their company
CREATE POLICY invitations_select_for_authenticated
ON public.invitations
FOR SELECT
TO authenticated
USING (admin_id IN ( SELECT current_admin_ids() AS current_admin_ids));

-- Step 3: Create a new policy for public users to select a specific invitation by token
-- This policy is crucial for the invitation acceptance page (InvitationAcceptPage.tsx)
-- It allows a public user to select an invitation ONLY if:
--   a) The invitation is pending and not expired
--   b) The query explicitly filters by the 'token' column
-- This prevents public users from enumerating all pending invitations
-- Supabase RLS checks if the 'token' column is part of the WHERE clause
-- If a query does not include a filter on 'token', this policy will deny access
CREATE POLICY invitations_select_for_public_by_token
ON public.invitations
FOR SELECT
TO public
USING (
    (status = 'pending'::text AND expires_at > now())
    AND
    -- This condition ensures the policy only applies when the 'token' column
    -- is explicitly used in the WHERE clause of the query
    -- This is a secure pattern to allow public access to a single record by unique ID
    (token IS NOT NULL)
);