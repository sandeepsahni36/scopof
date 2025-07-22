/*
  # Complete Database Schema Migration

  This migration creates the complete database schema for the scopoStay application.

  ## Tables Created
  - users (auth.users reference)
  - profiles (user profile information)
  - admin (company/admin information)
  - team_members (team member relationships)
  - properties (property information)
  - template_categories (template organization)
  - templates (inspection templates)
  - template_items (template item definitions)
  - report_service_teams (reporting team contacts)
  - property_checklists (property-specific checklists)
  - property_checklist_templates (checklist-template relationships)
  - inspections (inspection records)
  - inspection_items (inspection item responses)
  - stripe_customers (Stripe customer data)
  - stripe_subscriptions (Stripe subscription data)
  - stripe_orders (Stripe order data)

  ## Security
  - Row Level Security enabled on all tables
  - Appropriate policies for data access control
  - Proper foreign key relationships

  ## Functions and Triggers
  - User profile creation triggers
  - Updated timestamp triggers
  - Email verification handling
*/

-- Drop existing objects to ensure clean state
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_email_verification() CASCADE;
DROP FUNCTION IF EXISTS handle_auth_user_changes() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_properties_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_inspections_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_inspection_items_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_property_checklists_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_property_checklist_templates_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_report_service_teams_updated_at() CASCADE;

-- Drop views
DROP VIEW IF EXISTS stripe_user_orders CASCADE;
DROP VIEW IF EXISTS stripe_user_subscriptions CASCADE;
DROP VIEW IF EXISTS user_admin_status CASCADE;

-- Drop tables in correct order (respecting foreign key dependencies)
DROP TABLE IF EXISTS inspection_items CASCADE;
DROP TABLE IF EXISTS inspections CASCADE;
DROP TABLE IF EXISTS property_checklist_templates CASCADE;
DROP TABLE IF EXISTS property_checklists CASCADE;
DROP TABLE IF EXISTS template_items CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS template_categories CASCADE;
DROP TABLE IF EXISTS report_service_teams CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS stripe_orders CASCADE;
DROP TABLE IF EXISTS stripe_subscriptions CASCADE;
DROP TABLE IF EXISTS stripe_customers CASCADE;
DROP TABLE IF EXISTS admin CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS inspection_status CASCADE;
DROP TYPE IF EXISTS template_item_type CASCADE;
DROP TYPE IF EXISTS team_member_role CASCADE;
DROP TYPE IF EXISTS stripe_subscription_status CASCADE;
DROP TYPE IF EXISTS stripe_order_status CASCADE;
DROP TYPE IF EXISTS inspection_type CASCADE;

-- Create custom types
CREATE TYPE inspection_type AS ENUM ('check_in', 'check_out', 'move_in', 'move_out');
CREATE TYPE stripe_order_status AS ENUM ('canceled', 'completed', 'pending');
CREATE TYPE stripe_subscription_status AS ENUM ('active', 'canceled', 'incomplete', 'incomplete_expired', 'not_started', 'past_due', 'paused', 'trialing', 'unpaid');
CREATE TYPE team_member_role AS ENUM ('admin', 'member', 'owner');
CREATE TYPE template_item_type AS ENUM ('divider', 'multiple_choice', 'photo', 'section', 'single_choice', 'text');
CREATE TYPE inspection_status AS ENUM ('canceled', 'completed', 'in_progress');

-- Add comments to types
COMMENT ON TYPE inspection_type IS 'Inspection types: check_in/check_out for STR, move_in/move_out for real estate';
COMMENT ON TYPE template_item_type IS 'Type of template item: text, single_choice, multiple_choice, photo, section, or divider';

-- Create tables

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Admin table (company information)
CREATE TABLE IF NOT EXISTS admin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  billing_manager_id uuid REFERENCES profiles(id),
  customer_id text UNIQUE,
  company_name text NOT NULL,
  logo_url text,
  brand_color text DEFAULT '#2563EB',
  report_background text DEFAULT '#FFFFFF',
  subscription_tier text DEFAULT 'starter',
  subscription_status text DEFAULT 'trialing',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(owner_id)
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id),
  profile_id uuid NOT NULL REFERENCES profiles(id),
  role team_member_role DEFAULT 'owner',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(admin_id, profile_id)
);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  type text NOT NULL CHECK (type IN ('apartment', 'house', 'villa', 'condo')),
  bedrooms text NOT NULL CHECK (bedrooms IN ('studio', '1', '2', '3', '4', '5+')),
  bathrooms text NOT NULL CHECK (bathrooms IN ('1', '2', '3', '4', '5', '6+')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Template categories table
CREATE TABLE IF NOT EXISTS template_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id),
  category_id uuid REFERENCES template_categories(id),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Report service teams table
CREATE TABLE IF NOT EXISTS report_service_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
  designation text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(admin_id, designation)
);

-- Template items table
CREATE TABLE IF NOT EXISTS template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES template_items(id) ON DELETE CASCADE,
  type template_item_type NOT NULL,
  label text NOT NULL,
  section_name text,
  required boolean DEFAULT false,
  options jsonb,
  report_enabled boolean DEFAULT false,
  maintenance_email text,
  report_recipient_id uuid REFERENCES report_service_teams(id) ON DELETE SET NULL,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (id <> parent_id)
);

-- Property checklists table
CREATE TABLE IF NOT EXISTS property_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Property checklist templates table
CREATE TABLE IF NOT EXISTS property_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_checklist_id uuid NOT NULL REFERENCES property_checklists(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(property_checklist_id, template_id)
);

-- Inspections table
CREATE TABLE IF NOT EXISTS inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  property_checklist_id uuid REFERENCES property_checklists(id),
  inspector_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  inspection_type inspection_type NOT NULL,
  primary_contact_name text,
  inspector_name text,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_seconds integer,
  primary_contact_signature_url text,
  inspector_signature_image_url text,
  client_present_for_signature boolean DEFAULT false,
  status inspection_status NOT NULL DEFAULT 'in_progress',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add comments to inspections table
COMMENT ON COLUMN inspections.primary_contact_name IS 'Contact name - Guest name for STR, Client name for real estate';
COMMENT ON COLUMN inspections.primary_contact_signature_url IS 'Primary contact signature URL - Guest or client signature';
COMMENT ON COLUMN inspections.client_present_for_signature IS 'Whether client is present and signature is required (real estate only)';

-- Inspection items table
CREATE TABLE IF NOT EXISTS inspection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  template_item_id uuid NOT NULL REFERENCES template_items(id) ON DELETE CASCADE,
  value jsonb,
  notes text,
  photo_urls text[],
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stripe tables
CREATE TABLE IF NOT EXISTS stripe_customers (
  id bigint PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  customer_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(user_id),
  UNIQUE(customer_id)
);

CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id bigint PRIMARY KEY,
  customer_id text NOT NULL,
  subscription_id text,
  price_id text,
  current_period_start bigint,
  current_period_end bigint,
  cancel_at_period_end boolean DEFAULT false,
  payment_method_brand text,
  payment_method_last4 text,
  status stripe_subscription_status NOT NULL DEFAULT 'not_started',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(customer_id)
);

CREATE TABLE IF NOT EXISTS stripe_orders (
  id bigint PRIMARY KEY,
  checkout_session_id text NOT NULL,
  payment_intent_id text NOT NULL,
  customer_id text NOT NULL,
  amount_subtotal bigint NOT NULL,
  amount_total bigint NOT NULL,
  currency text NOT NULL,
  payment_status text NOT NULL,
  status stripe_order_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(checkout_session_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_admin_owner_id ON admin(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_admin_status_admin_id ON team_members(admin_id);
CREATE INDEX IF NOT EXISTS idx_user_admin_status_profile_id ON team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_properties_admin_id ON properties(admin_id);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_template_categories_admin_id ON template_categories(admin_id);
CREATE INDEX IF NOT EXISTS idx_templates_admin_id ON templates(admin_id);
CREATE INDEX IF NOT EXISTS idx_templates_category_id ON templates(category_id);
CREATE INDEX IF NOT EXISTS idx_report_service_teams_admin_id ON report_service_teams(admin_id);
CREATE INDEX IF NOT EXISTS idx_template_items_template_id ON template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_template_items_parent_id ON template_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_template_items_type ON template_items(type);
CREATE INDEX IF NOT EXISTS idx_template_items_report_recipient_id ON template_items(report_recipient_id);
CREATE INDEX IF NOT EXISTS idx_template_items_order ON template_items("order");
CREATE INDEX IF NOT EXISTS idx_template_items_hierarchy ON template_items(template_id, parent_id, "order");
CREATE INDEX IF NOT EXISTS idx_template_items_order_scoped ON template_items(template_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), "order");
CREATE INDEX IF NOT EXISTS idx_template_items_order_fallback ON template_items("order") WHERE parent_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_property_checklists_property_id ON property_checklists(property_id);
CREATE INDEX IF NOT EXISTS idx_property_checklists_active ON property_checklists(is_active);
CREATE INDEX IF NOT EXISTS idx_property_checklist_templates_checklist_id ON property_checklist_templates(property_checklist_id);
CREATE INDEX IF NOT EXISTS idx_property_checklist_templates_order ON property_checklist_templates(order_index);
CREATE INDEX IF NOT EXISTS idx_inspections_property_id ON inspections(property_id);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector_id ON inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON inspections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection_id ON inspection_items(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_items_template_item_id ON inspection_items(template_item_id);
CREATE INDEX IF NOT EXISTS idx_inspection_items_order ON inspection_items(order_index);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_service_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Profiles policies
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_postgres_all" ON profiles FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Admin policies
CREATE POLICY "admin_owner_full_access" ON admin FOR ALL TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "admin_postgres_access" ON admin FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Team members policies
CREATE POLICY "team_members_own_record" ON team_members FOR ALL TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "team_members_admin_manage" ON team_members FOR ALL TO authenticated USING (admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid()));
CREATE POLICY "team_members_postgres_access" ON team_members FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Properties policies
CREATE POLICY "properties_select_members" ON properties FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admin a 
    WHERE a.id = properties.admin_id 
    AND EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.admin_id = a.id AND tm.profile_id = auth.uid()
    )
  )
);
CREATE POLICY "properties_manage_admins" ON properties FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admin a 
    WHERE a.id = properties.admin_id 
    AND (
      a.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid() 
        AND tm.role IN ('owner', 'admin')
      )
    )
  )
);
CREATE POLICY "properties_postgres_all" ON properties FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Template categories policies
CREATE POLICY "template_categories_select_members" ON template_categories FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admin a 
    WHERE a.id = template_categories.admin_id 
    AND EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.admin_id = a.id AND tm.profile_id = auth.uid()
    )
  )
);
CREATE POLICY "template_categories_manage_admins" ON template_categories FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admin a 
    WHERE a.id = template_categories.admin_id 
    AND (
      a.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid() 
        AND tm.role IN ('owner', 'admin')
      )
    )
  )
);
CREATE POLICY "template_categories_postgres_all" ON template_categories FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Templates policies
CREATE POLICY "templates_select_members" ON templates FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admin a 
    WHERE a.id = templates.admin_id 
    AND EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.admin_id = a.id AND tm.profile_id = auth.uid()
    )
  )
);
CREATE POLICY "templates_manage_admins" ON templates FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admin a 
    WHERE a.id = templates.admin_id 
    AND (
      a.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid() 
        AND tm.role IN ('owner', 'admin')
      )
    )
  )
);
CREATE POLICY "templates_postgres_all" ON templates FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Report service teams policies
CREATE POLICY "report_service_teams_select_members" ON report_service_teams FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admin a 
    WHERE a.id = report_service_teams.admin_id 
    AND EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.admin_id = a.id AND tm.profile_id = auth.uid()
    )
  )
);
CREATE POLICY "report_service_teams_manage_admins" ON report_service_teams FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admin a 
    WHERE a.id = report_service_teams.admin_id 
    AND (
      a.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid() 
        AND tm.role IN ('owner', 'admin')
      )
    )
  )
);
CREATE POLICY "report_service_teams_postgres_all" ON report_service_teams FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Template items policies
CREATE POLICY "template_items_select_members" ON template_items FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM templates t 
    JOIN admin a ON t.admin_id = a.id 
    WHERE t.id = template_items.template_id 
    AND EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.admin_id = a.id AND tm.profile_id = auth.uid()
    )
  )
);
CREATE POLICY "template_items_manage_admins" ON template_items FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM templates t 
    JOIN admin a ON t.admin_id = a.id 
    WHERE t.id = template_items.template_id 
    AND (
      a.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid() 
        AND tm.role IN ('owner', 'admin')
      )
    )
  )
);
CREATE POLICY "template_items_postgres_all" ON template_items FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Property checklists policies
CREATE POLICY "property_checklists_select_members" ON property_checklists FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM properties p 
    JOIN admin a ON p.admin_id = a.id 
    WHERE p.id = property_checklists.property_id 
    AND EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.admin_id = a.id AND tm.profile_id = auth.uid()
    )
  )
);
CREATE POLICY "property_checklists_manage_admins" ON property_checklists FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM properties p 
    JOIN admin a ON p.admin_id = a.id 
    WHERE p.id = property_checklists.property_id 
    AND (
      a.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid() 
        AND tm.role IN ('owner', 'admin')
      )
    )
  )
);
CREATE POLICY "property_checklists_postgres_all" ON property_checklists FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Property checklist templates policies
CREATE POLICY "property_checklist_templates_access_for_members" ON property_checklist_templates FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM property_checklists pc 
    JOIN properties p ON pc.property_id = p.id 
    JOIN team_members tm ON tm.admin_id = p.admin_id 
    WHERE pc.id = property_checklist_templates.property_checklist_id 
    AND tm.profile_id = auth.uid()
  )
);
CREATE POLICY "property_checklist_templates_postgres_all" ON property_checklist_templates FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Inspections policies
CREATE POLICY "inspections_access_for_members" ON inspections FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM properties p 
    JOIN admin a ON p.admin_id = a.id 
    JOIN team_members tm ON tm.admin_id = a.id 
    WHERE p.id = inspections.property_id 
    AND tm.profile_id = auth.uid()
  )
);
CREATE POLICY "inspections_postgres_all" ON inspections FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Inspection items policies
CREATE POLICY "inspection_items_access_for_members" ON inspection_items FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM inspections i 
    JOIN properties p ON i.property_id = p.id 
    JOIN admin a ON p.admin_id = a.id 
    JOIN team_members tm ON tm.admin_id = a.id 
    WHERE i.id = inspection_items.inspection_id 
    AND tm.profile_id = auth.uid()
  )
);
CREATE POLICY "inspection_items_postgres_all" ON inspection_items FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Stripe policies (postgres only for security)
CREATE POLICY "stripe_customers_postgres_all" ON stripe_customers FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "stripe_subscriptions_postgres_all" ON stripe_subscriptions FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "stripe_orders_postgres_all" ON stripe_orders FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Create utility functions

-- Updated timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Specific update functions for each table
CREATE OR REPLACE FUNCTION update_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_inspections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_inspection_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_property_checklists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_property_checklist_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_report_service_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- User management functions
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_record_id uuid;
BEGIN
  -- Only proceed if email is confirmed
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

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
        'trialing',
        now(),
        now() + interval '14 days'
      )
      ON CONFLICT (owner_id) DO UPDATE SET
        company_name = EXCLUDED.company_name
      RETURNING id INTO admin_record_id;

      -- Create team member record
      INSERT INTO public.team_members (admin_id, profile_id, role)
      VALUES (admin_record_id, NEW.id, 'owner')
      ON CONFLICT (admin_id, profile_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Email verification function
CREATE OR REPLACE FUNCTION handle_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- This function handles email verification events
  -- Called when a user confirms their email
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    -- Email was just confirmed, trigger user setup
    PERFORM handle_new_user();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auth user changes function
CREATE OR REPLACE FUNCTION handle_auth_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Handle new user registration
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle email confirmation
    IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
      PERFORM handle_new_user();
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers

-- Updated timestamp triggers
CREATE TRIGGER update_template_categories_updated_at
  BEFORE UPDATE ON template_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_items_updated_at
  BEFORE UPDATE ON template_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_properties_updated_at();

CREATE TRIGGER update_inspections_updated_at
  BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_inspections_updated_at();

CREATE TRIGGER update_inspection_items_updated_at
  BEFORE UPDATE ON inspection_items
  FOR EACH ROW EXECUTE FUNCTION update_inspection_items_updated_at();

CREATE TRIGGER update_property_checklists_updated_at
  BEFORE UPDATE ON property_checklists
  FOR EACH ROW EXECUTE FUNCTION update_property_checklists_updated_at();

CREATE TRIGGER update_property_checklist_templates_updated_at
  BEFORE UPDATE ON property_checklist_templates
  FOR EACH ROW EXECUTE FUNCTION update_property_checklist_templates_updated_at();

CREATE TRIGGER update_report_service_teams_updated_at
  BEFORE UPDATE ON report_service_teams
  FOR EACH ROW EXECUTE FUNCTION update_report_service_teams_updated_at();

-- Auth triggers
CREATE TRIGGER handle_new_user_trigger
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_email_verification();

-- Create views

-- User admin status view
CREATE OR REPLACE VIEW user_admin_status AS
SELECT 
  tm.profile_id,
  tm.admin_id,
  tm.role,
  (a.owner_id = tm.profile_id) as is_owner,
  a.trial_started_at,
  a.subscription_status,
  a.customer_id,
  CASE 
    WHEN a.subscription_status = 'active' THEN true
    WHEN a.subscription_status = 'trialing' AND a.trial_ends_at > now() THEN true
    ELSE false
  END as has_active_subscription
FROM team_members tm
JOIN admin a ON tm.admin_id = a.id;

-- Stripe user subscriptions view
CREATE OR REPLACE VIEW stripe_user_subscriptions AS
SELECT 
  sc.customer_id,
  ss.subscription_id,
  ss.status as subscription_status,
  ss.price_id,
  ss.current_period_start,
  ss.current_period_end,
  ss.cancel_at_period_end,
  ss.payment_method_brand,
  ss.payment_method_last4
FROM stripe_customers sc
LEFT JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id;

-- Stripe user orders view
CREATE OR REPLACE VIEW stripe_user_orders AS
SELECT 
  sc.customer_id,
  so.id as order_id,
  so.checkout_session_id,
  so.payment_intent_id,
  so.amount_subtotal,
  so.amount_total,
  so.currency,
  so.payment_status,
  so.status as order_status,
  so.created_at as order_date
FROM stripe_customers sc
LEFT JOIN stripe_orders so ON sc.customer_id = so.customer_id;