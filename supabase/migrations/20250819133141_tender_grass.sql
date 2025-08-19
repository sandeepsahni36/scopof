```sql
-- Migration to fix circular RLS dependencies on admin and team_members tables

-- Step 1: Harden the current_admin_ids() function
-- This makes the function more robust and explicitly handles auth.uid() context.
CREATE OR REPLACE FUNCTION public.current_admin_ids()
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp -- Explicitly set search path for reliability
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

-- Step 2: Fix RLS policies on public.admin to avoid circular dependencies
-- The admin_team_member_access policy is likely causing issues.
-- We will replace it with a policy that uses current_admin_ids() directly.
DROP POLICY IF EXISTS admin_team_member_access ON public.admin;

CREATE POLICY admin_select_by_current_admin_ids
ON public.admin
FOR SELECT
TO authenticated
USING (id IN (SELECT public.current_admin_ids()));

-- Step 3: Fix RLS policies on public.team_members to avoid circular dependencies
-- The team_members_access_by_admin and team_members_manage_by_admin policies are problematic.
-- We will replace them with a single policy that uses current_admin_ids() directly.
DROP POLICY IF EXISTS team_members_access_by_admin ON public.team_members;
DROP POLICY IF EXISTS team_members_manage_by_admin ON public.team_members;

CREATE POLICY team_members_select_by_current_admin_ids
ON public.team_members
FOR SELECT
TO authenticated
USING (admin_id IN (SELECT public.current_admin_ids()));

-- Ensure the self-read policy is still present for team_members
-- This policy allows a user to always see their own team_member record.
-- If it was dropped, re-add it.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'team_members_self_read_only' AND tablename = 'team_members') THEN
        CREATE POLICY team_members_self_read_only
        ON public.team_members
        FOR SELECT
        TO authenticated
        USING (profile_id = auth.uid());
    END IF;
END $$;
```