-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE stripe_order_status AS ENUM ('pending', 'completed', 'canceled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE stripe_subscription_status AS ENUM ('not_started', 'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE team_member_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE template_item_type AS ENUM ('text', 'single_choice', 'multiple_choice', 'photo', 'section');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE inspection_type AS ENUM ('check_in', 'check_out');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE inspection_status AS ENUM ('in_progress', 'completed', 'canceled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- CORE USER TABLES
-- =============================================

-- User profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Company/admin management table
CREATE TABLE IF NOT EXISTS admin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
  billing_manager_id uuid REFERENCES profiles(id),
  customer_id text UNIQUE,
  company_name text NOT NULL,
  logo_url text,
  brand_color text DEFAULT '#2563EB',
  report_background text DEFAULT '#FFFFFF',
  subscription_tier text DEFAULT 'starter',
  subscription_status text DEFAULT 'not_started',
  trial_started_at timestamptz DEFAULT now(),
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
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

-- =============================================
-- PROPERTY MANAGEMENT TABLES
-- =============================================

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['apartment', 'house', 'villa', 'condo'])),
  bedrooms text NOT NULL CHECK (bedrooms = ANY (ARRAY['studio', '1', '2', '3', '4', '5+'])),
  bathrooms text NOT NULL CHECK (bathrooms = ANY (ARRAY['1', '2', '3', '4', '5', '6+'])),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- TEMPLATE SYSTEM TABLES
-- =============================================

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

-- Report service teams table for structured reporting
CREATE TABLE IF NOT EXISTS report_service_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
  designation text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(admin_id, designation)
);

-- Template items table with hierarchical support and report recipients
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
  CONSTRAINT check_no_self_reference CHECK (id != parent_id),
  CONSTRAINT check_section_name CHECK (
    (type = 'section' AND section_name IS NOT NULL AND section_name != '') OR 
    (type != 'section')
  )
);

-- =============================================
-- INSPECTION WORKFLOW TABLES
-- =============================================

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

-- Property checklist templates junction table
CREATE TABLE IF NOT EXISTS property_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_checklist_id uuid NOT NULL REFERENCES property_checklists(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(property_checklist_id, template_id)
);

-- Inspections table with enhanced inspector details
CREATE TABLE IF NOT EXISTS inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  property_checklist_id uuid REFERENCES property_checklists(id),
  inspector_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  inspection_type inspection_type NOT NULL,
  guest_name text,
  inspector_name text,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_seconds integer,
  signature_image_url text,
  inspector_signature_image_url text,
  status inspection_status NOT NULL DEFAULT 'in_progress',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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

-- =============================================
-- STRIPE INTEGRATION TABLES
-- =============================================

-- Stripe customers table
CREATE TABLE IF NOT EXISTS stripe_customers (
  id bigint PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
  customer_id text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Stripe subscriptions table
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id bigint PRIMARY KEY,
  customer_id text NOT NULL UNIQUE,
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
  deleted_at timestamptz
);

-- Stripe orders table
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
  deleted_at timestamptz
);

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Core user indexes
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_admin_owner_id ON admin(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_admin_status_admin_id ON team_members(admin_id);
CREATE INDEX IF NOT EXISTS idx_user_admin_status_profile_id ON team_members(profile_id);

-- Property indexes
CREATE INDEX IF NOT EXISTS idx_properties_admin_id ON properties(admin_id);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);

-- Template system indexes
CREATE INDEX IF NOT EXISTS idx_template_categories_admin_id ON template_categories(admin_id);
CREATE INDEX IF NOT EXISTS idx_templates_admin_id ON templates(admin_id);
CREATE INDEX IF NOT EXISTS idx_templates_category_id ON templates(category_id);
CREATE INDEX IF NOT EXISTS idx_template_items_template_id ON template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_template_items_order ON template_items("order");
CREATE INDEX IF NOT EXISTS idx_template_items_parent_id ON template_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_template_items_hierarchy ON template_items(template_id, parent_id, "order");
CREATE INDEX IF NOT EXISTS idx_template_items_order_scoped ON template_items(template_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), "order");
CREATE INDEX IF NOT EXISTS idx_template_items_order_fallback ON template_items("order") WHERE parent_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_template_items_report_recipient_id ON template_items(report_recipient_id);

-- Report service teams indexes
CREATE INDEX IF NOT EXISTS idx_report_service_teams_admin_id ON report_service_teams(admin_id);

-- Inspection workflow indexes
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

-- =============================================
-- ROW LEVEL SECURITY SETUP
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_service_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES (with existence checks)
-- =============================================

-- Helper function to safely create policies
DO $$
BEGIN
    -- Profiles policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can read own profile') THEN
        CREATE POLICY "Users can read own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'System can create user profiles') THEN
        CREATE POLICY "System can create user profiles" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'postgres_can_manage_profiles') THEN
        CREATE POLICY "postgres_can_manage_profiles" ON profiles FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    -- Admin policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin' AND policyname = 'allow_admin_access') THEN
        CREATE POLICY "allow_admin_access" ON admin FOR SELECT TO authenticated USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM team_members WHERE team_members.admin_id = admin.id AND team_members.profile_id = auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin' AND policyname = 'allow_admin_updates') THEN
        CREATE POLICY "allow_admin_updates" ON admin FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin' AND policyname = 'enable_admin_registration') THEN
        CREATE POLICY "enable_admin_registration" ON admin FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin' AND policyname = 'postgres_can_manage_admin') THEN
        CREATE POLICY "postgres_can_manage_admin" ON admin FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    -- Team members policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'enable_team_member_registration') THEN
        CREATE POLICY "enable_team_member_registration" ON team_members FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid() OR EXISTS (SELECT 1 FROM admin WHERE admin.id = team_members.admin_id AND admin.owner_id = auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'postgres_can_manage_team_members') THEN
        CREATE POLICY "postgres_can_manage_team_members" ON team_members FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    -- Properties policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'properties' AND policyname = 'Admins can manage their properties') THEN
        CREATE POLICY "Admins can manage their properties" ON properties FOR ALL TO authenticated USING (admin_id IN (SELECT admin.id FROM admin WHERE admin.owner_id = auth.uid())) WITH CHECK (admin_id IN (SELECT admin.id FROM admin WHERE admin.owner_id = auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'properties' AND policyname = 'Members can view admin properties') THEN
        CREATE POLICY "Members can view admin properties" ON properties FOR SELECT TO authenticated USING (admin_id IN (SELECT tm.admin_id FROM team_members tm WHERE tm.profile_id = auth.uid() AND tm.role = 'member'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'properties' AND policyname = 'postgres_can_manage_properties') THEN
        CREATE POLICY "postgres_can_manage_properties" ON properties FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    -- Template system policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_categories' AND policyname = 'postgres_can_manage_template_categories') THEN
        CREATE POLICY "postgres_can_manage_template_categories" ON template_categories FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'postgres_can_manage_templates') THEN
        CREATE POLICY "postgres_can_manage_templates" ON templates FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_items' AND policyname = 'postgres_can_manage_template_items') THEN
        CREATE POLICY "postgres_can_manage_template_items" ON template_items FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    -- Report service teams policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_service_teams' AND policyname = 'Admins can manage their report service teams') THEN
        CREATE POLICY "Admins can manage their report service teams" ON report_service_teams FOR ALL TO authenticated USING (admin_id IN (SELECT admin.id FROM admin WHERE admin.owner_id = auth.uid())) WITH CHECK (admin_id IN (SELECT admin.id FROM admin WHERE admin.owner_id = auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_service_teams' AND policyname = 'Team members can view report service teams') THEN
        CREATE POLICY "Team members can view report service teams" ON report_service_teams FOR SELECT TO authenticated USING (admin_id IN (SELECT tm.admin_id FROM team_members tm WHERE tm.profile_id = auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_service_teams' AND policyname = 'postgres_can_manage_report_service_teams') THEN
        CREATE POLICY "postgres_can_manage_report_service_teams" ON report_service_teams FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    -- Property checklists policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_checklists' AND policyname = 'Property owners can manage their property checklists') THEN
        CREATE POLICY "Property owners can manage their property checklists" ON property_checklists FOR ALL TO authenticated USING (property_id IN (SELECT p.id FROM properties p JOIN admin a ON p.admin_id = a.id WHERE a.owner_id = auth.uid())) WITH CHECK (property_id IN (SELECT p.id FROM properties p JOIN admin a ON p.admin_id = a.id WHERE a.owner_id = auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_checklists' AND policyname = 'Team members can access property checklists') THEN
        CREATE POLICY "Team members can access property checklists" ON property_checklists FOR SELECT TO authenticated USING (property_id IN (SELECT p.id FROM properties p JOIN admin a ON p.admin_id = a.id JOIN team_members tm ON tm.admin_id = a.id WHERE tm.profile_id = auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_checklists' AND policyname = 'postgres_can_manage_property_checklists') THEN
        CREATE POLICY "postgres_can_manage_property_checklists" ON property_checklists FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    -- Property checklist templates policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_checklist_templates' AND policyname = 'Property owners can manage checklist templates') THEN
        CREATE POLICY "Property owners can manage checklist templates" ON property_checklist_templates FOR ALL TO authenticated USING (property_checklist_id IN (SELECT pc.id FROM property_checklists pc JOIN properties p ON pc.property_id = p.id JOIN admin a ON p.admin_id = a.id WHERE a.owner_id = auth.uid())) WITH CHECK (property_checklist_id IN (SELECT pc.id FROM property_checklists pc JOIN properties p ON pc.property_id = p.id JOIN admin a ON p.admin_id = a.id WHERE a.owner_id = auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_checklist_templates' AND policyname = 'Team members can access checklist templates') THEN
        CREATE POLICY "Team members can access checklist templates" ON property_checklist_templates FOR SELECT TO authenticated USING (property_checklist_id IN (SELECT pc.id FROM property_checklists pc JOIN properties p ON pc.property_id = p.id JOIN admin a ON p.admin_id = a.id JOIN team_members tm ON tm.admin_id = a.id WHERE tm.profile_id = auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_checklist_templates' AND policyname = 'postgres_can_manage_property_checklist_templates') THEN
        CREATE POLICY "postgres_can_manage_property_checklist_templates" ON property_checklist_templates FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    -- Inspections policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspections' AND policyname = 'Admins can manage inspections for their properties') THEN
        CREATE POLICY "Admins can manage inspections for their properties" ON inspections FOR ALL TO authenticated USING (property_id IN (SELECT p.id FROM properties p JOIN admin a ON p.admin_id = a.id WHERE a.owner_id = auth.uid())) WITH CHECK (property_id IN (SELECT p.id FROM properties p JOIN admin a ON p.admin_id = a.id WHERE a.owner_id = auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspections' AND policyname = 'Team members can access inspections for admin properties') THEN
        CREATE POLICY "Team members can access inspections for admin properties" ON inspections FOR ALL TO authenticated USING (property_id IN (SELECT p.id FROM properties p JOIN admin a ON p.admin_id = a.id JOIN team_members tm ON tm.admin_id = a.id WHERE tm.profile_id = auth.uid())) WITH CHECK (property_id IN (SELECT p.id FROM properties p JOIN admin a ON p.admin_id = a.id JOIN team_members tm ON tm.admin_id = a.id WHERE tm.profile_id = auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspections' AND policyname = 'postgres_can_manage_inspections') THEN
        CREATE POLICY "postgres_can_manage_inspections" ON inspections FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    -- Inspection items policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspection_items' AND policyname = 'Users can manage inspection items for their inspections') THEN
        CREATE POLICY "Users can manage inspection items for their inspections" ON inspection_items FOR ALL TO authenticated USING (inspection_id IN (SELECT i.id FROM inspections i JOIN properties p ON i.property_id = p.id JOIN admin a ON p.admin_id = a.id WHERE a.owner_id = auth.uid() OR a.id IN (SELECT tm.admin_id FROM team_members tm WHERE tm.profile_id = auth.uid()))) WITH CHECK (inspection_id IN (SELECT i.id FROM inspections i JOIN properties p ON i.property_id = p.id JOIN admin a ON p.admin_id = a.id WHERE a.owner_id = auth.uid() OR a.id IN (SELECT tm.admin_id FROM team_members tm WHERE tm.profile_id = auth.uid())));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspection_items' AND policyname = 'postgres_can_manage_inspection_items') THEN
        CREATE POLICY "postgres_can_manage_inspection_items" ON inspection_items FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    -- Stripe policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stripe_customers' AND policyname = 'postgres_can_manage_stripe_customers') THEN
        CREATE POLICY "postgres_can_manage_stripe_customers" ON stripe_customers FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stripe_subscriptions' AND policyname = 'postgres_can_manage_stripe_subscriptions') THEN
        CREATE POLICY "postgres_can_manage_stripe_subscriptions" ON stripe_subscriptions FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stripe_orders' AND policyname = 'postgres_can_manage_stripe_orders') THEN
        CREATE POLICY "postgres_can_manage_stripe_orders" ON stripe_orders FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;
END
$$;

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- User admin status view
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
  ss.status::text as subscription_status,
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
  so.status::text as order_status,
  so.created_at as order_date
FROM stripe_customers sc
LEFT JOIN stripe_orders so ON sc.customer_id = so.customer_id;

-- =============================================
-- TRIGGER FUNCTIONS
-- =============================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Specific trigger functions for different tables
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

-- =============================================
-- USER REGISTRATION AND EMAIL VERIFICATION
-- =============================================

-- User registration trigger - Creates basic records, NO Stripe data
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
  INSERT INTO public.admin (owner_id, billing_manager_id, company_name, subscription_status)
  VALUES (
    NEW.id, 
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
    'not_started'
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

-- =============================================
-- TRIGGERS (with existence checks)
-- =============================================

-- User registration triggers
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

-- Updated_at triggers (with existence checks)
DO $$
BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
    DROP TRIGGER IF EXISTS update_template_categories_updated_at ON template_categories;
    DROP TRIGGER IF EXISTS update_template_items_updated_at ON template_items;
    DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
    DROP TRIGGER IF EXISTS update_inspections_updated_at ON inspections;
    DROP TRIGGER IF EXISTS update_inspection_items_updated_at ON inspection_items;
    DROP TRIGGER IF EXISTS update_property_checklists_updated_at ON property_checklists;
    DROP TRIGGER IF EXISTS update_property_checklist_templates_updated_at ON property_checklist_templates;
    DROP TRIGGER IF EXISTS update_report_service_teams_updated_at ON report_service_teams;
    
    -- Create new triggers
    CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_template_categories_updated_at BEFORE UPDATE ON template_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_template_items_updated_at BEFORE UPDATE ON template_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_properties_updated_at();
    CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections FOR EACH ROW EXECUTE FUNCTION update_inspections_updated_at();
    CREATE TRIGGER update_inspection_items_updated_at BEFORE UPDATE ON inspection_items FOR EACH ROW EXECUTE FUNCTION update_inspection_items_updated_at();
    CREATE TRIGGER update_property_checklists_updated_at BEFORE UPDATE ON property_checklists FOR EACH ROW EXECUTE FUNCTION update_property_checklists_updated_at();
    CREATE TRIGGER update_property_checklist_templates_updated_at BEFORE UPDATE ON property_checklist_templates FOR EACH ROW EXECUTE FUNCTION update_property_checklist_templates_updated_at();
    CREATE TRIGGER update_report_service_teams_updated_at BEFORE UPDATE ON report_service_teams FOR EACH ROW EXECUTE FUNCTION update_report_service_teams_updated_at();
END
$$;