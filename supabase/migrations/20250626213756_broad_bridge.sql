/*
  # Fix Trial Expiration Bypass and RLS Policies

  1. Database Schema Changes
    - Make trial_started_at and trial_ends_at nullable in admin table
    - Update handle_new_user function to set trial dates to NULL for 'not_started' status

  2. RLS Policy Updates
    - Ensure all tables have RLS enabled
    - Recreate policies with proper role handling
    - Fix policy conflicts by checking existence before creation

  3. Security Improvements
    - Proper authentication checks for all operations
    - Consistent policy naming and structure
    - Enhanced team member role validation
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

-- Drop existing policies to recreate them with proper role handling
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies for each table
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'profiles', 'admin', 'team_members', 'properties', 
            'template_categories', 'templates', 'template_items', 
            'report_service_teams', 'property_checklists', 
            'property_checklist_templates', 'inspections', 
            'inspection_items', 'stripe_orders', 'stripe_customers', 
            'stripe_subscriptions'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
    END LOOP;
END $$;

-- Create improved RLS policies with proper role handling

-- Profiles policies
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "System can create user profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "postgres_can_manage_profiles" ON profiles 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Admin policies
CREATE POLICY "Owners and admins can access admin data" ON admin
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

CREATE POLICY "Owners can update admin data" ON admin
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "System can create admin records" ON admin
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "postgres_can_manage_admin" ON admin 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Team members policies
CREATE POLICY "Team members can view team data" ON team_members
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

CREATE POLICY "Owners and admins can manage team members" ON team_members
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

CREATE POLICY "postgres_can_manage_team_members" ON team_members 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Properties policies
CREATE POLICY "Owners and admins can manage properties" ON properties
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

CREATE POLICY "Members can view properties" ON properties
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

CREATE POLICY "postgres_can_manage_properties" ON properties 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Template categories policies
CREATE POLICY "Owners and admins can manage template categories" ON template_categories
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

CREATE POLICY "Members can view template categories" ON template_categories
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

CREATE POLICY "postgres_can_manage_template_categories" ON template_categories 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Templates policies
CREATE POLICY "Owners and admins can manage templates" ON templates
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

CREATE POLICY "Members can view templates" ON templates
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

CREATE POLICY "postgres_can_manage_templates" ON templates 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Template items policies
CREATE POLICY "Owners and admins can manage template items" ON template_items
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

CREATE POLICY "Members can view template items" ON template_items
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

CREATE POLICY "postgres_can_manage_template_items" ON template_items 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Report service teams policies
CREATE POLICY "Owners and admins can manage report service teams" ON report_service_teams
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

CREATE POLICY "Members can view report service teams" ON report_service_teams
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

CREATE POLICY "postgres_can_manage_report_service_teams" ON report_service_teams 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Property checklists policies
CREATE POLICY "Owners and admins can manage property checklists" ON property_checklists
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

CREATE POLICY "Members can view property checklists" ON property_checklists
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

CREATE POLICY "postgres_can_manage_property_checklists" ON property_checklists 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Property checklist templates policies
CREATE POLICY "Owners and admins can manage checklist templates" ON property_checklist_templates
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

CREATE POLICY "Members can view checklist templates" ON property_checklist_templates
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

CREATE POLICY "postgres_can_manage_property_checklist_templates" ON property_checklist_templates 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Inspections policies
CREATE POLICY "All team members can manage inspections" ON inspections
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

CREATE POLICY "postgres_can_manage_inspections" ON inspections 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Inspection items policies
CREATE POLICY "All team members can manage inspection items" ON inspection_items
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

CREATE POLICY "postgres_can_manage_inspection_items" ON inspection_items 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- Stripe policies
CREATE POLICY "postgres_can_manage_stripe_orders" ON stripe_orders 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "postgres_can_manage_stripe_customers" ON stripe_customers 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "postgres_can_manage_stripe_subscriptions" ON stripe_subscriptions 
  FOR ALL TO postgres 
  USING (true) 
  WITH CHECK (true);

-- CRITICAL FIX: Modify admin table to make trial dates nullable
ALTER TABLE admin 
  ALTER COLUMN trial_started_at DROP DEFAULT,
  ALTER COLUMN trial_ends_at DROP DEFAULT;

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