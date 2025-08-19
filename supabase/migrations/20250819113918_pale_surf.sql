/*
  # Create current_admin_ids function for RLS policies

  ## Overview
  This migration creates the missing `current_admin_ids()` function that is referenced by multiple RLS policies throughout the database. The absence of this function is causing privacy issues where users can see data from other companies.

  ## Changes Made
  1. **New Function**: `public.current_admin_ids()`
     - Returns a set of admin_ids that the current authenticated user has access to
     - Uses SECURITY DEFINER to bypass RLS on underlying tables for accurate filtering
     - Includes admin_ids where user is the owner OR a team member with 'owner'/'admin' role

  ## Security
  - Function uses SECURITY DEFINER to run with elevated privileges
  - Only returns admin_ids associated with the authenticated user
  - Granted execute permission to authenticated role only

  ## Impact
  - Fixes privacy issue where users see invitations/data from other companies
  - Enables proper RLS filtering across all tables using current_admin_ids()
  - Resolves "function does not exist" errors in RLS policies

  ## Tables Affected
  - All tables with RLS policies using current_admin_ids() will now filter correctly:
    - invitations
    - properties  
    - templates
    - team_members
    - admin
    - reports
    - storage_usage
    - And others
*/

-- Create the current_admin_ids function that returns admin_ids accessible to the current user
CREATE OR REPLACE FUNCTION public.current_admin_ids()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER -- CRITICAL: Runs with definer's privileges to bypass RLS
AS $$
BEGIN
    -- Return admin_id if the current user is the owner of an admin record
    RETURN QUERY SELECT id FROM public.admin WHERE owner_id = auth.uid();

    -- Return admin_id if the current user is a team member with 'owner' or 'admin' role
    RETURN QUERY SELECT admin_id FROM public.team_members
    WHERE profile_id = auth.uid() AND role IN ('owner', 'admin');
END;
$$;

-- Grant execute permission to authenticated users
-- This allows RLS policies to call this function
GRANT EXECUTE ON FUNCTION public.current_admin_ids() TO authenticated;