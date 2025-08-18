/*
  # Add demo templates creation to handle_new_user function

  1. Function Update
    - Updates the handle_new_user function to call create_demo_templates
    - Only creates demo templates for new admin users (not invited users)
    - Maintains all existing functionality and logging

  2. Changes Made
    - Added call to public.create_demo_templates(v_admin_id) after team member creation
    - Only affects non-invited users who create new companies
    - Preserves all existing error handling and logging

  3. Dependencies
    - Requires create_demo_templates function from golden_wildflower migration
    - Updates existing handle_new_user function from shiny_meadow migration
*/

-- Drop the trigger that depends on the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the existing function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with demo templates creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_company_name text;
  v_registration_type text;
  v_admin_id uuid;
  v_user_exists boolean;
  v_invitation_token text;
  v_invitation_record record;
BEGIN
  RAISE NOTICE 'handle_new_user: Function triggered for user %', NEW.id;
  RAISE NOTICE 'handle_new_user: User email: %', NEW.email;
  RAISE NOTICE 'handle_new_user: User metadata: %', NEW.raw_user_meta_data;

  -- Ensure the user record is visible (this should force commit visibility)
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = NEW.id) INTO v_user_exists;
  RAISE NOTICE 'handle_new_user: User exists check: %', v_user_exists;

  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User record not visible in transaction';
  END IF;

  -- Insert into profiles first
  RAISE NOTICE 'handle_new_user: Inserting into profiles table';
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RAISE NOTICE 'handle_new_user: Profile created successfully';

  -- Check if this is an invited user
  v_invitation_token := NEW.raw_user_meta_data->>'invitation_token';
  RAISE NOTICE 'handle_new_user: Invitation token: %', v_invitation_token;

  IF v_invitation_token IS NOT NULL THEN
    RAISE NOTICE 'handle_new_user: Processing invited user with token: %', v_invitation_token;
    
    -- Get invitation details
    SELECT * INTO v_invitation_record
    FROM public.invitations
    WHERE token = v_invitation_token
      AND status = 'pending'
      AND expires_at > NOW();
    
    IF v_invitation_record IS NULL THEN
      RAISE EXCEPTION 'Invalid or expired invitation token: %', v_invitation_token;
    END IF;
    
    RAISE NOTICE 'handle_new_user: Found valid invitation for admin_id: %', v_invitation_record.admin_id;
    
    -- Add user to the team
    INSERT INTO public.team_members (admin_id, profile_id, role)
    VALUES (v_invitation_record.admin_id, NEW.id, v_invitation_record.role);
    
    -- Mark invitation as accepted
    UPDATE public.invitations
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = v_invitation_record.id;
    
    RAISE NOTICE 'handle_new_user: Invited user processed successfully';
  ELSE
    -- Only create admin record if this is NOT an invited user
    RAISE NOTICE 'handle_new_user: Processing new admin user (not invited)';
    
    v_company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company');
    v_registration_type := NEW.raw_user_meta_data->>'registration_type';
    
    RAISE NOTICE 'handle_new_user: Company name: %, Registration type: %', v_company_name, v_registration_type;

    RAISE NOTICE 'handle_new_user: Inserting into admin table';
    INSERT INTO public.admin (
      owner_id,
      billing_manager_id,
      company_name,
      subscription_tier,
      subscription_status,
      trial_started_at,
      trial_ends_at
    )
    VALUES (
      NEW.id,
      NEW.id,
      v_company_name,
      'starter',
      CASE
        WHEN v_registration_type = 'no_trial' THEN 'not_started'
        ELSE 'trialing'
      END,
      CASE
        WHEN v_registration_type = 'no_trial' THEN NULL
        ELSE NOW()
      END,
      CASE
        WHEN v_registration_type = 'no_trial' THEN NULL
        ELSE NOW() + INTERVAL '14 days'
      END
    )
    RETURNING id INTO v_admin_id;
    RAISE NOTICE 'handle_new_user: Admin record created with ID: %', v_admin_id;

    RAISE NOTICE 'handle_new_user: Inserting into team_members table';
    INSERT INTO public.team_members (admin_id, profile_id, role)
    VALUES (v_admin_id, NEW.id, 'owner');
    RAISE NOTICE 'handle_new_user: Team member record created successfully';
    
    -- ***************** CRITICAL FIX ADDED HERE *****************
    -- Create demo templates for new admin
    RAISE NOTICE 'handle_new_user: Creating demo templates for admin: %', v_admin_id;
    PERFORM public.create_demo_templates(v_admin_id);
    RAISE NOTICE 'handle_new_user: Demo templates created successfully';
    -- ***********************************************************

  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'handle_new_user: Error occurred: %', SQLERRM;
    RAISE;
END;
$func$;

-- FOURTH: Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();