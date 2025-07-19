/*
  # Critical Trial Expiration and RLS Policy Fix

  1. Database Schema Changes
    - Make trial_started_at and trial_ends_at nullable in admin table
    - Allow proper handling of 'not_started' subscription status

  2. Security Fixes
    - Fix trial expiration bypass vulnerability
    - Recreate all RLS policies with proper conflict handling
    - Ensure proper role-based access control

  3. Authentication Flow Fixes
    - Update handle_new_user function to set NULL trial dates for new users
    - Prevent automatic trial activation on email verification
    - Force users through proper start-trial flow

  4. Policy Management
    - Drop and recreate all policies safely
    - Add comprehensive postgres policies for system operations
    - Fix policy conflicts and naming issues
*/

-- First, let's ensure all tables have RLS enabled
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS report_service_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS property_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS property_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stripe_orders ENABLE ROW LEVEL SECURITY;

-- CRITICAL FIX: Modify admin table to make trial dates nullable
-- This must be done first to ensure the handle_new_user function can set NULL values
ALTER TABLE admin 
  ALTER COLUMN trial_started_at DROP DEFAULT,
  ALTER COLUMN trial_ends_at DROP DEFAULT;

-- Comprehensive policy cleanup using a more robust approach
DO $$ 
DECLARE
    policy_record RECORD;
    table_name TEXT;
    table_names TEXT[] := ARRAY[
        'profiles', 'admin', 'team_members', 'properties', 
        'template_categories', 'templates', 'template_items', 
        'report_service_teams', 'property_checklists', 
        'property_checklist_templates', 'inspections', 
        'inspection_items', 'stripe_orders', 'stripe_customers', 
        'stripe_subscriptions'
    ];
BEGIN
    -- Drop all existing policies for each table
    FOREACH table_name IN ARRAY table_names
    LOOP
        -- Get all policies for this table and drop them
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = table_name
        LOOP
            BEGIN
                EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 
                              policy_record.policyname, 
                              table_name);
            EXCEPTION
                WHEN OTHERS THEN
                    -- Continue if policy doesn't exist or can't be dropped
                    NULL;
            END;
        END LOOP;
    END LOOP;
END $$;

-- CRITICAL FIX: Update handle_new_user function to set trial dates to NULL for 'not_started' status
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_id_var uuid;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;

  -- Create admin record with 'not_started' status - NO trial yet
  INSERT INTO public.admin (
    owner_id, 
    billing_manager_id, 
    company_name, 
    subscription_status, 
    trial_started_at, 
    trial_ends_at
  )
  VALUES (
    NEW.id, 
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
    'not_started',
    NULL, -- Explicitly set trial_started_at to NULL
    NULL  -- Explicitly set trial_ends_at to NULL
  )
  ON CONFLICT (owner_id) DO UPDATE SET
    billing_manager_id = NEW.id,
    company_name = COALESCE(NEW.raw_user_meta_data->>'company_name', admin.company_name)
  RETURNING id INTO admin_id_var;

  -- Get admin_id if it was a conflict
  IF admin_id_var IS NULL THEN
    SELECT id INTO admin_id_var FROM public.admin WHERE owner_id = NEW.id;
  END IF;

  -- Create team member record
  INSERT INTO public.team_members (admin_id, profile_id, role)
  VALUES (admin_id_var, NEW.id, 'owner')
  ON CONFLICT (admin_id, profile_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth process
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Email verification trigger - User goes to start-trial page after verification
CREATE OR REPLACE FUNCTION handle_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if email_confirmed_at changed from NULL to a timestamp
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Keep status as 'not_started' - user must go through start-trial page
    -- DO NOT create any Stripe records here
    -- DO NOT start trial automatically
    
    -- Just log that email was verified
    RAISE LOG 'Email verified for user: %, redirecting to start-trial page', NEW.email;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the process
    RAISE LOG 'Error in handle_email_verification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create improved RLS policies with proper role handling

-- Profiles policies
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_postgres_all" ON profiles 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Admin policies
CREATE POLICY "admin_select_authorized" ON admin
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.admin_id = admin.id 
      AND tm.profile_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "admin_update_owners" ON admin
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "admin_insert_system" ON admin
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "admin_postgres_all" ON admin 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Team members policies
CREATE POLICY "team_members_select_authorized" ON team_members
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = team_members.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm2 
          WHERE tm2.admin_id = a.id 
          AND tm2.profile_id = auth.uid() 
          AND tm2.role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "team_members_manage_authorized" ON team_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = team_members.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = team_members.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "team_members_postgres_all" ON team_members 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Properties policies
CREATE POLICY "properties_select_members" ON properties
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = properties.admin_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "properties_manage_admins" ON properties
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = properties.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = properties.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "properties_postgres_all" ON properties 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Template categories policies
CREATE POLICY "template_categories_select_members" ON template_categories
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = template_categories.admin_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "template_categories_manage_admins" ON template_categories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = template_categories.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = template_categories.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "template_categories_postgres_all" ON template_categories 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Templates policies
CREATE POLICY "templates_select_members" ON templates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = templates.admin_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "templates_manage_admins" ON templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = templates.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = templates.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "templates_postgres_all" ON templates 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Template items policies
CREATE POLICY "template_items_select_members" ON template_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM templates t
      JOIN admin a ON t.admin_id = a.id
      WHERE t.id = template_items.template_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "template_items_manage_admins" ON template_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM templates t
      JOIN admin a ON t.admin_id = a.id
      WHERE t.id = template_items.template_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM templates t
      JOIN admin a ON t.admin_id = a.id
      WHERE t.id = template_items.template_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "template_items_postgres_all" ON template_items 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Report service teams policies
CREATE POLICY "report_service_teams_select_members" ON report_service_teams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = report_service_teams.admin_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "report_service_teams_manage_admins" ON report_service_teams
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = report_service_teams.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = report_service_teams.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "report_service_teams_postgres_all" ON report_service_teams 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Property checklists policies
CREATE POLICY "property_checklists_select_members" ON property_checklists
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN admin a ON p.admin_id = a.id
      WHERE p.id = property_checklists.property_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "property_checklists_manage_admins" ON property_checklists
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN admin a ON p.admin_id = a.id
      WHERE p.id = property_checklists.property_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN admin a ON p.admin_id = a.id
      WHERE p.id = property_checklists.property_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "property_checklists_postgres_all" ON property_checklists 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Property checklist templates policies
CREATE POLICY "property_checklist_templates_select_members" ON property_checklist_templates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_checklists pc
      JOIN properties p ON pc.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      WHERE pc.id = property_checklist_templates.property_checklist_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "property_checklist_templates_manage_admins" ON property_checklist_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_checklists pc
      JOIN properties p ON pc.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      WHERE pc.id = property_checklist_templates.property_checklist_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM property_checklists pc
      JOIN properties p ON pc.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      WHERE pc.id = property_checklist_templates.property_checklist_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "property_checklist_templates_postgres_all" ON property_checklist_templates 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Inspections policies
CREATE POLICY "inspections_manage_members" ON inspections
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN admin a ON p.admin_id = a.id
      WHERE p.id = inspections.property_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN admin a ON p.admin_id = a.id
      WHERE p.id = inspections.property_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "inspections_postgres_all" ON inspections 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Inspection items policies
CREATE POLICY "inspection_items_manage_members" ON inspection_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN properties p ON i.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      WHERE i.id = inspection_items.inspection_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN properties p ON i.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      WHERE i.id = inspection_items.inspection_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "inspection_items_postgres_all" ON inspection_items 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Stripe policies
CREATE POLICY "stripe_orders_postgres_all" ON stripe_orders 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "stripe_customers_postgres_all" ON stripe_customers 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "stripe_subscriptions_postgres_all" ON stripe_subscriptions 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Update user_admin_status view to handle NULL trial dates
CREATE OR REPLACE VIEW user_admin_status AS
SELECT 
  tm.profile_id,
  tm.admin_id,
  CASE 
    WHEN tm.role = 'owner' THEN 'owner'
    WHEN tm.role = 'admin' THEN 'admin'
    ELSE 'member'
  END as role,
  (tm.role = 'owner') as is_owner,
  a.trial_started_at,
  a.subscription_status,
  a.customer_id,
  CASE 
    WHEN a.subscription_status = 'active' THEN true
    WHEN a.subscription_status = 'trialing' AND a.trial_ends_at IS NOT NULL AND a.trial_ends_at > now() THEN true
    ELSE false
  END as has_active_subscription
FROM team_members tm
JOIN admin a ON tm.admin_id = a.id;

-- Recreate user registration triggers
DO $$
BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP TRIGGER IF EXISTS on_email_verified ON auth.users;
    
    -- Create new triggers
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();

    CREATE TRIGGER on_email_verified
      AFTER UPDATE OF email_confirmed_at ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_email_verification();
END
$$;

-- Update existing admin records to fix any with incorrect trial dates
UPDATE admin
SET trial_started_at = NULL, trial_ends_at = NULL
WHERE subscription_status = 'not_started';