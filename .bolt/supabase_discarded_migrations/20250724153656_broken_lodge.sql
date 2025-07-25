/*
  # Fix Missing Authentication Functions

  This migration adds the essential authentication functions that should be present
  in every Supabase project but appear to be missing.

  1. Functions Added
    - `uid()` - Returns the current authenticated user's ID
    - `role()` - Returns the current user's role
    - `email()` - Returns the current user's email

  2. Security
    - These functions are essential for Row Level Security policies
    - They provide secure access to the current user's authentication context
*/

-- Create the uid() function if it doesn't exist
CREATE OR REPLACE FUNCTION uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )::uuid
$$;

-- Create the role() function if it doesn't exist
CREATE OR REPLACE FUNCTION role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.role', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
  )::text
$$;

-- Create the email() function if it doesn't exist
CREATE OR REPLACE FUNCTION email()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.email', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'email')
  )::text
$$;

-- Grant execute permissions to authenticated and anon roles
GRANT EXECUTE ON FUNCTION uid() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION email() TO authenticated, anon;

-- Verify the functions work by testing them (this will only work when called by an authenticated user)
-- SELECT uid(), role(), email();