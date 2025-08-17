/*
  # Fix handle_new_user function schema references

  1. Function Updates
    - Update `handle_new_user()` function to explicitly reference `public.admin` and `public.team_members`
    - This resolves the "relation does not exist" error by providing full schema qualification
    - Maintains all existing logic and error handling

  2. Security
    - Preserves SECURITY DEFINER for proper permissions
    - Maintains all existing validation and error handling

  3. Dependency Fix
    - First drops trigger that depends on the function
    - Then drops/recreates function
    - Finally recreates trigger
*/

-- FIRST: Drop the trigger that depends on the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- SECOND: Drop the function itself
DROP FUNCTION IF EXISTS public.handle_new_user();

-- THIRD: Recreate the function with proper schema qualification
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
  END IF;

  RAISE NOTICE 'handle_new_user: Function completed successfully for user %', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'handle_new_user: ERROR occurred - SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
    RAISE;
END;
$func$;

-- FINALLY: Recreate the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
