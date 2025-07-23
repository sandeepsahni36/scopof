/*
  # Complete Database Schema Migration

  1. New Tables
    - `users` - Authentication users (references auth.users)
    - `profiles` - User profile information
    - `admin` - Company/admin accounts
    - `team_members` - Team member relationships
    - `properties` - Property management
    - `templates` - Inspection templates
    - `template_categories` - Template categorization
    - `template_items` - Template item definitions
    - `property_checklists` - Property-specific checklists
    - `property_checklist_templates` - Checklist-template relationships
    - `inspections` - Inspection records
    - `inspection_items` - Inspection item responses
    - `report_service_teams` - Report recipient teams
    - `stripe_customers` - Stripe customer records
    - `stripe_subscriptions` - Stripe subscription data
    - `stripe_orders` - Stripe order history

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for data access
    - Implement proper user isolation

  3. Performance
    - Add indexes for all foreign keys and frequently queried columns
    - Optimize for dashboard queries

  4. Functions & Triggers
    - Auto-update timestamps
    - Handle new user creation
    - Manage auth state changes
*/

-- Create custom types
CREATE TYPE inspection_type AS ENUM ('check_in', 'check_out', 'move_in', 'move_out');
CREATE TYPE inspection_status AS ENUM ('in_progress', 'completed', 'canceled');
CREATE TYPE template_item_type AS ENUM ('text', 'single_choice', 'multiple_choice', 'photo', 'section', 'divider');
CREATE TYPE team_member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE stripe_subscription_status AS ENUM ('active', 'canceled', 'incomplete', 'incomplete_expired', 'not_started', 'past_due', 'paused', 'trialing', 'unpaid');
CREATE TYPE stripe_order_status AS ENUM ('pending', 'completed', 'canceled');

-- Create users table (references auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create admin table
CREATE TABLE IF NOT EXISTS admin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
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
  updated_at timestamptz DEFAULT now()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role team_member_role DEFAULT 'owner',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(admin_id, profile_id)
);

-- Create properties table
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

-- Create template_categories table
CREATE TABLE IF NOT EXISTS template_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
  category_id uuid REFERENCES template_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create report_service_teams table
CREATE TABLE IF NOT EXISTS report_service_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
  designation text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(admin_id, designation)
);

-- Create template_items table
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
  CHECK (id != parent_id)
);

-- Create property_checklists table
CREATE TABLE IF NOT EXISTS property_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create property_checklist_templates table
CREATE TABLE IF NOT EXISTS property_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_checklist_id uuid NOT NULL REFERENCES property_checklists(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(property_checklist_id, template_id)
);

-- Create inspections table
CREATE TABLE IF NOT EXISTS inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  property_checklist_id uuid REFERENCES property_checklists(id) ON DELETE SET NULL,
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

-- Create inspection_items table
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

-- Create stripe_customers table
CREATE TABLE IF NOT EXISTS stripe_customers (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  customer_id text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Create stripe_subscriptions table
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
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

-- Create stripe_orders table
CREATE TABLE IF NOT EXISTS stripe_orders (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  checkout_session_id text NOT NULL UNIQUE,
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

-- Create indexes for performance
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
CREATE INDEX IF NOT EXISTS idx_template_items_template_id ON template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_template_items_parent_id ON template_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_template_items_order ON template_items("order");
CREATE INDEX IF NOT EXISTS idx_template_items_type ON template_items(type);
CREATE INDEX IF NOT EXISTS idx_template_items_report_recipient_id ON template_items(report_recipient_id);
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
CREATE INDEX IF NOT EXISTS idx_report_service_teams_admin_id ON report_service_teams(admin_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_service_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_postgres_all" ON profiles FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Create RLS policies for admin
CREATE POLICY "admin_owner_full_access" ON admin FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "admin_postgres_access" ON admin FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Create RLS policies for team_members
CREATE POLICY "team_members_own_record" ON team_members FOR ALL TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
CREATE POLICY "team_members_admin_manage" ON team_members FOR ALL TO authenticated USING (admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid())) WITH CHECK (admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid()));
CREATE POLICY "team_members_postgres_access" ON team_members FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Create RLS policies for properties
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
        WHERE tm.admin_id = a.id AND tm.profile_id = auth.uid() AND tm.role IN ('owner', 'admin')
      )
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin a
    WHERE a.id = properties.admin_id
    AND (
      a.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.admin_id = a.id AND tm.profile_id = auth.uid() AND tm.role IN ('owner', 'admin')
      )
    )
  )
);
CREATE POLICY "properties_postgres_all" ON properties FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Create RLS policies for template_categories
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
        WHERE tm.admin_id = a.id AND tm.profile_id = auth.uid() AND tm.role IN ('owner', 'admin')
      )
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin a
    WHERE a.id = template_categories.admin_id
    AND (
      a.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.admin_id = a.id AND tm.profile_id = auth.uid() AND tm.role IN ('owner', 'admin')
      )
    )
  )
);
CREATE POLICY "template_categories_postgres_all" ON template_categories FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Create RLS policies for templates
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
        WHERE tm.admin_id = a.id AND tm.profile_id = auth.uid() AND tm.role IN ('owner', 'admin')
      )
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin a
    WHERE a.id = templates.admin_id
    AND (
      a.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.admin_id = a.id AND tm.profile_id = auth.uid() AND tm.role IN ('owner', 'admin')
      )
    )
  )
);
CREATE POLICY "templates_postgres_all" ON templates FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Create RLS policies for template_items
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
        WHERE tm.admin_id = a.id AND tm.profile_id = auth.uid() AND tm.role IN ('owner', 'admin')
      )
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM templates t
    JOIN admin a ON t.admin_id = a.id
    WHERE t.id = template_items.template_id
    AND (
      a.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.admin_id = a.id AND tm.profile_id = auth.uid() AND tm.role IN ('owner', 'admin')
      )
    )
  )
);
CREATE POLICY "template_items_postgres_all" ON template_items FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Create RLS policies for property_checklists
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
        WHERE tm.admin_id = a.id AND tm.profile_id = auth.uid() AND tm.role IN ('owner', 'admin')
      )
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties p
    JOIN admin a ON p.admin_id = a.id
    WHERE p.id = property_checklists.property_id
    AND (
      a.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.admin_id = a.id AND tm.profile_id = auth.uid() AND tm.role IN ('owner', 'admin')
      )
    )
  )
);
CREATE POLICY "property_checklists_postgres_all" ON property_checklists FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Create RLS policies for property_checklist_templates
CREATE POLICY "property_checklist_templates_access_for_members" ON property_checklist_templates FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM property_checklists pc
    JOIN properties p ON pc.property_id = p.id
    JOIN team_members tm ON tm.admin_id = p.admin_id
    WHERE pc.id = property_checklist_templates.property_checklist_id
    AND tm.profile_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM property_checklists pc
    JOIN properties p ON pc.property_id = p.id
    JOIN team_members tm ON tm.admin_id = p.admin_id
    WHERE pc.id = property_checklist_templates.property_checklist_id
    AND tm.profile_id = auth.uid()
  )
);
CREATE POLICY "property_checklist_templates_postgres_all" ON property_checklist_templates FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Create RLS policies for inspections
CREATE POLICY "inspections_access_for_members" ON inspections FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM properties p
    JOIN admin a ON p.admin_id = a.id
    JOIN team_members tm ON tm.admin_id = a.id
    WHERE p.id = inspections.property_id
    AND tm.profile_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties p
    JOIN admin a ON p.admin_id = a.id
    JOIN team_members tm ON tm.admin_id = a.id
    WHERE p.id = inspections.property_id
    AND tm.profile_id = auth.uid()
  )
);
CREATE POLICY "inspections_postgres_all" ON inspections FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Create RLS policies for inspection_items
CREATE POLICY "inspection_items_access_for_members" ON inspection_items FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM inspections i
    JOIN properties p ON i.property_id = p.id
    JOIN admin a ON p.admin_id = a.id
    JOIN team_members tm ON tm.admin_id = a.id
    WHERE i.id = inspection_items.inspection_id
    AND tm.profile_id = auth.uid()
  )
) WITH CHECK (
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

-- Create RLS policies for report_service_teams
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
        WHERE tm.admin_id = a.id AND tm.profile_id = auth.uid() AND tm.role IN ('owner', 'admin')
      )
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin a
    WHERE a.id = report_service_teams.admin_id
    AND (
      a.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.admin_id = a.id AND tm.profile_id = auth.uid() AND tm.role IN ('owner', 'admin')
      )
    )
  )
);
CREATE POLICY "report_service_teams_postgres_all" ON report_service_teams FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Create RLS policies for Stripe tables
CREATE POLICY "stripe_customers_postgres_all" ON stripe_customers FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "stripe_subscriptions_postgres_all" ON stripe_subscriptions FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "stripe_orders_postgres_all" ON stripe_orders FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Create database views
CREATE OR REPLACE VIEW user_admin_status AS
SELECT 
  tm.profile_id,
  tm.admin_id,
  tm.role::text,
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

-- Create functions for timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_inspections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_inspection_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_property_checklists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_property_checklist_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_report_service_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  full_name_value text;
  company_name_value text;
  admin_record_id uuid;
BEGIN
  -- Extract metadata
  full_name_value := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  company_name_value := COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company');

  -- Insert into users table
  INSERT INTO users (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  -- Insert into profiles table
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, full_name_value)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

  -- Create admin record
  INSERT INTO admin (
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
    company_name_value,
    'starter',
    'trialing',
    now(),
    now() + interval '14 days'
  )
  ON CONFLICT (owner_id) DO NOTHING
  RETURNING id INTO admin_record_id;

  -- Get admin_id if it already existed
  IF admin_record_id IS NULL THEN
    SELECT id INTO admin_record_id FROM admin WHERE owner_id = NEW.id;
  END IF;

  -- Create team member record
  IF admin_record_id IS NOT NULL THEN
    INSERT INTO team_members (admin_id, profile_id, role)
    VALUES (admin_record_id, NEW.id, 'owner')
    ON CONFLICT (admin_id, profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle auth user changes
CREATE OR REPLACE FUNCTION handle_auth_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Update profile email if changed
    UPDATE profiles 
    SET email = NEW.email, updated_at = now()
    WHERE id = NEW.id AND email != NEW.email;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle email verification
CREATE OR REPLACE FUNCTION handle_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if email was just confirmed
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Call the handle_new_user function to ensure all records are created
    PERFORM handle_new_user();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_updated_at BEFORE UPDATE ON admin FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_properties_updated_at();
CREATE TRIGGER update_template_categories_updated_at BEFORE UPDATE ON template_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_template_items_updated_at BEFORE UPDATE ON template_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_checklists_updated_at BEFORE UPDATE ON property_checklists FOR EACH ROW EXECUTE FUNCTION update_property_checklists_updated_at();
CREATE TRIGGER update_property_checklist_templates_updated_at BEFORE UPDATE ON property_checklist_templates FOR EACH ROW EXECUTE FUNCTION update_property_checklist_templates_updated_at();
CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections FOR EACH ROW EXECUTE FUNCTION update_inspections_updated_at();
CREATE TRIGGER update_inspection_items_updated_at BEFORE UPDATE ON inspection_items FOR EACH ROW EXECUTE FUNCTION update_inspection_items_updated_at();
CREATE TRIGGER update_report_service_teams_updated_at BEFORE UPDATE ON report_service_teams FOR EACH ROW EXECUTE FUNCTION update_report_service_teams_updated_at();

-- Create triggers for auth handling
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_auth_user_changes();

CREATE OR REPLACE TRIGGER on_email_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_email_verification();