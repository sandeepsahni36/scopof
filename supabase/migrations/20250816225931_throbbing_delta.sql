/*
  # Debug handle_new_user function with detailed logging

  1. Dependency Fix
    - First drops the trigger that depends on the function
    - Then drops/recreates the function
    - Finally recreates the trigger
    - Maintains all debugging improvements and core logic

  2. Security
    - Preserves SECURITY DEFINER
    - Maintains explicit public schema references

  3. Changes
    - Added proper dependency order as per Bolt's solution
    - Kept all logging and business logic unchanged
*/

-- FIRST: Drop the trigger that depends on the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- SECOND: Recreate the function with all debugging improvements
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_name text;
  v_registration_type text;
  v_admin_id uuid;
  v_full_name text;
BEGIN
  RAISE NOTICE 'handle_new_user: Function started for user ID: %', NEW.id;
  RAISE NOTICE 'handle_new_user: User email: %', NEW.email;
  RAISE NOTICE 'handle_new_user: Raw user metadata: %', NEW.raw_user_meta_data;

  -- Extract full_name safely
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  RAISE NOTICE 'handle_new_user: Extracted full_name: %', v_full_name;

  RAISE NOTICE 'handle_new_user: Attempting insert into public.profiles...';
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    v_full_name
  );
  RAISE NOTICE 'handle_new_user: Successfully inserted into public.profiles for user %', NEW.id;

  -- Extract registration_type and invitation_token safely
  v_registration_type := NEW.raw_user_meta_data->>'registration_type';
  RAISE NOTICE 'handle_new_user: Invitation token: %, Registration type: %', NEW.raw_user_meta_data->>'invitation_token', v_registration_type;

  IF NEW.raw_user_meta_data->>'invitation_token' IS NULL THEN
    v_company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company');
    RAISE NOTICE 'handle_new_user: Attempting to insert into public.admin. Company Name: %', v_company_name;

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
    RAISE NOTICE 'handle_new_user: Successfully inserted into public.admin. Admin ID: %', v_admin_id;

    RAISE NOTICE 'handle_new_user: Attempting insert into public.team_members...';
    INSERT INTO public.team_members (admin_id, profile_id, role)
    VALUES (
      v_admin_id,
      NEW.id,
      'owner'
    );
    RAISE NOTICE 'handle_new_user: Successfully inserted into public.team_members.';

  END IF;

  RAISE NOTICE 'handle_new_user: Function finished successfully for user %', NEW.id;
  RETURN NEW;
END;
$$;

-- THIRD: Recreate the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
