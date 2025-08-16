/*
  # Fix handle_new_invited_user function data type

  1. Function Updates
    - Fix `_invitation_token` variable type from `uuid` to `text`
    - Remove explicit `::uuid` cast when extracting from user metadata
    - Ensure proper search_path is set for table access

  2. Security
    - Maintain SECURITY DEFINER for proper access to auth schema
    - Keep existing invitation validation logic
    - Preserve role assignment functionality

  This fixes the "operator does not exist: text = uuid" error during invited user signup.
*/

-- Fix the handle_new_invited_user function to use correct data types
CREATE OR REPLACE FUNCTION public.handle_new_invited_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _invitation_token text; -- Changed from uuid to text to match invitations.token column
  _invitation_email text;
  _admin_id uuid;
  _role public.team_member_role;
BEGIN
  -- Set search_path to ensure tables are found
  SET search_path = public;

  -- Extract invitation token as text (no uuid cast)
  _invitation_token := NEW.raw_user_meta_data->>'invitation_token';
  _invitation_email := NEW.email;

  -- Only process if invitation token is provided
  IF _invitation_token IS NOT NULL AND _invitation_token != '' THEN
    -- Fetch invitation details
    SELECT admin_id, role
    INTO _admin_id, _role
    FROM public.invitations
    WHERE token = _invitation_token 
      AND email = _invitation_email 
      AND status = 'pending' 
      AND expires_at > NOW();

    IF _admin_id IS NOT NULL THEN
      -- Create profile if it doesn't exist
      INSERT INTO public.profiles (id, email, full_name)
      VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
      ON CONFLICT (id) DO UPDATE SET 
        email = EXCLUDED.email, 
        full_name = EXCLUDED.full_name;

      -- Add user to team_members
      INSERT INTO public.team_members (admin_id, profile_id, role)
      VALUES (_admin_id, NEW.id, _role);

      -- Update invitation status
      UPDATE public.invitations
      SET status = 'accepted', accepted_at = NOW()
      WHERE token = _invitation_token;
      
    ELSE
      -- Log warning but don't fail the signup for invalid invitations
      -- This allows the user to still be created even if invitation is invalid/expired
      RAISE WARNING 'Invalid or expired invitation token for email %', _invitation_email;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;