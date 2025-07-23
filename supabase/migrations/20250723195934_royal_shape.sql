-- Create ONLY the missing handle_new_user function and trigger
-- This file contains NO type definitions or table creations

-- Authentication function
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

-- Drop existing trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();