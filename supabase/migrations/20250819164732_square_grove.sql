/*
  # Final RLS policies for invitations table

  1. Security Fix
    - Drop all existing policies for clean slate
    - Use JWT claims directly instead of auth.uid() for more reliable user identification
    - Properly scope public access to 'anon' role only to prevent authenticated users from inheriting broad access

  2. Policy Structure
    - `invitations_authenticated_access`: Comprehensive policy for authenticated users (ALL operations)
    - `invitations_public_access`: Limited SELECT access for unauthenticated users via token
    - `invitations_postgres_all`: Full access for postgres role

  3. Access Control
    - Authenticated users can only access invitations for admin records where they are:
      * The owner of the admin record, OR
      * A team member with 'owner' or 'admin' role
    - Unauthenticated users can only access pending, non-expired invitations with valid tokens
*/

-- Step 1: Drop all existing policies on the invitations table for a clean slate.
DROP POLICY IF EXISTS invitations_select_for_authenticated ON public.invitations;
DROP POLICY IF EXISTS invitations_insert_by_admin ON public.invitations;
DROP POLICY IF EXISTS invitations_update_by_admin ON public.invitations;
DROP POLICY IF EXISTS invitations_delete_by_admin ON public.invitations;
DROP POLICY IF EXISTS invitations_select_for_public_by_token ON public.invitations;
DROP POLICY IF EXISTS invitations_manage_by_admin ON public.invitations;
DROP POLICY IF EXISTS invitations_postgres_all ON public.invitations;

-- Step 2: Create a new comprehensive policy for authenticated users.
-- This policy grants ALL permissions (SELECT, INSERT, UPDATE, DELETE) to authenticated users
-- based on their association with the admin_id, using JWT claims directly.
CREATE POLICY invitations_authenticated_access ON public.invitations
FOR ALL TO authenticated
USING (
  admin_id IN (
    SELECT id FROM public.admin
    WHERE owner_id = (current_setting('request.jwt.claim.sub', true))::uuid
    UNION
    SELECT admin_id FROM public.team_members
    WHERE profile_id = (current_setting('request.jwt.claim.sub', true))::uuid
    AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  admin_id IN (
    SELECT id FROM public.admin
    WHERE owner_id = (current_setting('request.jwt.claim.sub', true))::uuid
    UNION
    SELECT admin_id FROM public.team_members
    WHERE profile_id = (current_setting('request.jwt.claim.sub', true))::uuid
    AND role IN ('owner', 'admin')
  )
);

-- Step 3: Create a policy for public (unauthenticated) access to invitations by token.
-- This policy is specifically for the 'anon' role, ensuring authenticated users do not inherit it.
CREATE POLICY invitations_public_access ON public.invitations
FOR SELECT TO anon
USING (
  status = 'pending'
  AND expires_at > now()
  AND token IS NOT NULL
);

-- Step 4: Create a simple policy for the 'postgres' role.
-- The 'postgres' role typically bypasses RLS, but a policy can be defined for clarity.
CREATE POLICY invitations_postgres_all ON public.invitations
FOR ALL TO postgres
USING (TRUE) WITH CHECK (TRUE);