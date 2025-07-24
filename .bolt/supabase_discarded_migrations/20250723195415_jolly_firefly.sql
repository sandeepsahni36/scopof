/*
  # Create Missing Authentication Functions

  This migration creates only the missing functions that are causing registration errors.
  It uses CREATE OR REPLACE to safely update existing functions.
*/

-- Authentication functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    admin_record_id uuid;
BEGIN
    -- Create profile record
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );

    -- Create admin record if company_name is provided
    IF NEW.raw_user_meta_data->>'company_name' IS NOT NULL THEN
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
            NEW.raw_user_meta_data->>'company_name',
            'starter',
            'not_started',
            NULL,
            NULL
        )
        RETURNING id INTO admin_record_id;

        -- Create team member record
        INSERT INTO public.team_members (admin_id, profile_id, role)
        VALUES (admin_record_id, NEW.id, 'owner');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_email_verification()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if email was just confirmed
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        -- Update any existing admin record to start trial
        UPDATE public.admin 
        SET 
            subscription_status = 'not_started',
            trial_started_at = NULL,
            trial_ends_at = NULL
        WHERE owner_id = NEW.id AND subscription_status IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_auth_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profile when auth.users is updated
    IF TG_OP = 'UPDATE' THEN
        UPDATE public.profiles
        SET 
            email = NEW.email,
            full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            updated_at = now()
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create auth triggers (these will replace existing ones if they exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;
CREATE TRIGGER on_auth_user_verified
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_email_verification();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_auth_user_changes();