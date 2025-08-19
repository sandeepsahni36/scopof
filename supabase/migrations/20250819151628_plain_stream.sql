/*
  # Consolidate and refine RLS policies on public.invitations table

  This migration addresses a security issue where users could see invitations from other companies.
  The root cause was identified as the current_admin_ids() function potentially returning incorrect
  admin_ids or the broad ALL policy allowing unintended access.

  ## Changes Made

  1. **Removed Broad Policies**
     - Dropped `invitations_manage_by_admin` (ALL policy that was too permissive)
     - Dropped `invitations_select_for_authenticated` (to recreate with inlined logic)

  2. **Created Specific Policies**
     - `invitations_select_for_authenticated` - SELECT access with inlined admin logic
     - `invitations_insert_by_admin` - INSERT access for authorized admins
     - `invitations_update_by_admin` - UPDATE access for authorized admins  
     - `invitations_delete_by_admin` - DELETE access for authorized admins

  3. **Inlined Admin Access Logic**
     - Replaced current_admin_ids() function calls with direct subquery
     - Logic: Users can access invitations where admin_id matches either:
       - admin.id where they are the owner (owner_id = auth.uid())
       - team_members.admin_id where they are admin/owner role member

  ## Security Enhancement
  
  This ensures users can only see/manage invitations for companies where they have
  appropriate permissions, preventing cross-company data access.
*/

-- Step 1: Drop the broad 'invitations_manage_by_admin' ALL policy
-- This policy grants all permissions and can lead to unintended access if not carefully managed.
DROP POLICY IF EXISTS invitations_manage_by_admin ON public.invitations;

-- Step 2: Drop the existing 'invitations_select_for_authenticated' policy
-- We will recreate it with inlined logic for robustness.
DROP POLICY IF EXISTS invitations_select_for_authenticated ON public.invitations;

-- Step 3: Recreate specific policies for SELECT, INSERT, UPDATE, and DELETE operations
-- These policies will ensure that only authenticated users associated with the invitation's admin_id
-- (as determined by the inlined logic) can manage and view invitations.

-- Policy for SELECT operations (recreated with inlined logic)
CREATE POLICY invitations_select_for_authenticated
ON public.invitations FOR SELECT TO authenticated
USING (
    admin_id IN (
        SELECT id FROM public.admin WHERE owner_id = auth.uid()
        UNION
        SELECT admin_id FROM public.team_members WHERE profile_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- Policy for INSERT operations
CREATE POLICY invitations_insert_by_admin
ON public.invitations FOR INSERT TO authenticated
WITH CHECK (
    admin_id IN (
        SELECT id FROM public.admin WHERE owner_id = auth.uid()
        UNION
        SELECT admin_id FROM public.team_members WHERE profile_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- Policy for UPDATE operations
CREATE POLICY invitations_update_by_admin
ON public.invitations FOR UPDATE TO authenticated
USING (
    admin_id IN (
        SELECT id FROM public.admin WHERE owner_id = auth.uid()
        UNION
        SELECT admin_id FROM public.team_members WHERE profile_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- Policy for DELETE operations
CREATE POLICY invitations_delete_by_admin
ON public.invitations FOR DELETE TO authenticated
USING (
    admin_id IN (
        SELECT id FROM public.admin WHERE owner_id = auth.uid()
        UNION
        SELECT admin_id FROM public.team_members WHERE profile_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- Note: The 'invitations_select_for_public_by_token' policy remains unchanged as it serves a different purpose
-- for unauthenticated users accepting invitations.