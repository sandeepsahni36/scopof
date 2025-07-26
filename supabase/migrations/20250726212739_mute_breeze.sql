-- Drop existing triggers if they exist to prevent "already exists" errors on re-run
-- Use CASCADE to drop dependent objects like functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users CASCADE; -- Added based on error
DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users CASCADE;  -- Added based on error

-- Drop views first, as they depend on tables
DROP VIEW IF EXISTS user_admin_status;
DROP VIEW IF EXISTS stripe_user_subscriptions;
DROP VIEW IF EXISTS stripe_user_orders;

-- Drop tables in reverse dependency order, using CASCADE for safety
-- This will remove dependent foreign keys, indexes, and triggers on these tables.
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS inspection_items CASCADE;
DROP TABLE IF EXISTS property_checklist_templates CASCADE;
DROP TABLE IF EXISTS property_checklists CASCADE;
DROP TABLE IF EXISTS inspections CASCADE;
DROP TABLE IF EXISTS template_items CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS template_categories CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS report_service_teams CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS admin CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS stripe_customers CASCADE;
DROP TABLE IF EXISTS stripe_subscriptions CASCADE;
DROP TABLE IF EXISTS stripe_orders CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS handle_email_verification();

-- Drop existing ENUM types if they exist
DROP TYPE IF EXISTS inspection_type;
DROP TYPE IF EXISTS inspection_status;
DROP TYPE IF EXISTS stripe_order_status;
DROP TYPE IF EXISTS stripe_subscription_status;
DROP TYPE IF EXISTS team_member_role;
DROP TYPE IF EXISTS template_item_type;

-- Create ENUMs
CREATE TYPE inspection_type AS ENUM ('check_in', 'check_out', 'move_in', 'move_out');
CREATE TYPE inspection_status AS ENUM ('in_progress', 'completed', 'canceled');
CREATE TYPE stripe_order_status AS ENUM ('canceled', 'completed', 'pending');
CREATE TYPE stripe_subscription_status AS ENUM ('active', 'canceled', 'incomplete', 'incomplete_expired', 'not_started', 'past_due', 'paused', 'trialing', 'unpaid');
CREATE TYPE team_member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE template_item_type AS ENUM ('divider', 'multiple_choice', 'photo', 'section', 'single_choice', 'text');

-- Create Tables
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE admin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  billing_manager_id uuid REFERENCES profiles(id),
  customer_id text, -- Stripe customer ID
  company_name text NOT NULL,
  logo_url text,
  brand_color text DEFAULT '#2563EB',
  report_background text DEFAULT '#FFFFFF',
  subscription_tier text DEFAULT 'starter',
  subscription_status text DEFAULT 'trialing',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  trial_reminder_7day_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id),
  profile_id uuid NOT NULL REFERENCES profiles(id),
  role team_member_role DEFAULT 'owner',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE template_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id),
  category_id uuid REFERENCES template_categories(id),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE report_service_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
  designation text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE template_items (
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
  CONSTRAINT template_items_check CHECK (id <> parent_id)
);

CREATE TABLE properties (
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

CREATE TABLE property_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE property_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_checklist_id uuid NOT NULL REFERENCES property_checklists(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE inspections (
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

CREATE TABLE inspection_items (
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

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  report_url text NOT NULL,
  report_type text NOT NULL,
  generated_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE stripe_customers (
  id bigint NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  customer_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE stripe_subscriptions (
  id bigint NOT NULL,
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
  deleted_at timestamptz
);

CREATE TABLE stripe_orders (
  id bigint NOT NULL,
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

-- Create Indexes
CREATE INDEX idx_profiles_id ON public.profiles USING btree (id);
CREATE INDEX idx_admin_owner_id ON public.admin USING btree (owner_id);
CREATE INDEX idx_user_admin_status_admin_id ON public.team_members USING btree (admin_id);
CREATE INDEX idx_user_admin_status_profile_id ON public.team_members USING btree (profile_id);
CREATE INDEX idx_template_categories_admin_id ON public.template_categories USING btree (admin_id);
CREATE INDEX idx_templates_admin_id ON public.templates USING btree (admin_id);
CREATE INDEX idx_templates_category_id ON public.templates USING btree (category_id);
CREATE INDEX idx_template_items_hierarchy ON public.template_items USING btree (template_id, parent_id, "order");
CREATE INDEX idx_template_items_order ON public.template_items USING btree ("order");
CREATE INDEX idx_template_items_order_fallback ON public.template_items USING btree ("order") WHERE (parent_id IS NULL);
CREATE INDEX idx_template_items_order_scoped ON public.template_items USING btree (template_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), "order");
CREATE INDEX idx_template_items_parent_id ON public.template_items USING btree (parent_id);
CREATE INDEX idx_template_items_report_recipient_id ON public.template_items USING btree (report_recipient_id);
CREATE INDEX idx_template_items_template_id ON public.template_items USING btree (template_id);
CREATE INDEX idx_template_items_type ON public.template_items USING btree (type);
CREATE INDEX idx_report_service_teams_admin_id ON public.report_service_teams USING btree (admin_id);
CREATE INDEX idx_properties_admin_id ON public.properties USING btree (admin_id);
CREATE INDEX idx_properties_created_at ON public.properties USING btree (created_at DESC);
CREATE INDEX idx_properties_type ON public.properties USING btree (type);
CREATE INDEX idx_property_checklists_active ON public.property_checklists USING btree (is_active);
CREATE INDEX idx_property_checklists_property_id ON public.property_checklists USING btree (property_id);
CREATE INDEX idx_property_checklist_templates_checklist_id ON public.property_checklist_templates USING btree (property_checklist_id);
CREATE INDEX idx_property_checklist_templates_order ON public.property_checklist_templates USING btree (order_index);
CREATE INDEX idx_inspections_created_at ON public.inspections USING btree (created_at DESC);
CREATE INDEX idx_inspections_inspector_id ON public.inspections USING btree (inspector_id);
CREATE INDEX idx_inspections_property_id ON public.inspections USING btree (property_id);
CREATE INDEX idx_inspections_status ON public.inspections USING btree (status);
CREATE INDEX idx_inspection_items_inspection_id ON public.inspection_items USING btree (inspection_id);
CREATE INDEX idx_inspection_items_order ON public.inspection_items USING btree (order_index);
CREATE INDEX idx_inspection_items_template_item_id ON public.inspection_items USING btree (template_item_id);
CREATE INDEX idx_reports_generated_at ON public.reports USING btree (generated_at DESC);
CREATE INDEX idx_reports_inspection_id ON public.reports USING btree (inspection_id);

-- Create Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
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
    ) VALUES (
      NEW.id,
      NEW.id,
      NEW.raw_user_meta_data->>'company_name',
      'starter',
      'trialing',
      now(),
      now() + interval '14 days'
    );

    -- Create team member record
    INSERT INTO public.team_members (
      admin_id,
      profile_id,
      role
    ) VALUES (
      (SELECT id FROM public.admin WHERE owner_id = NEW.id),
      NEW.id,
      'owner'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if email was just confirmed
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Check if user has admin record but no team member record
    IF EXISTS (
      SELECT 1 FROM public.admin WHERE owner_id = NEW.id
    ) AND NOT EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.admin a ON tm.admin_id = a.id
      WHERE a.owner_id = NEW.id AND tm.profile_id = NEW.id
    ) THEN
      -- Create team member record
      INSERT INTO public.team_members (
        admin_id,
        profile_id,
        role
      ) VALUES (
        (SELECT id FROM public.admin WHERE owner_id = NEW.id),
        NEW.id,
        'owner'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_updated_at BEFORE UPDATE ON public.admin FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_template_categories_updated_at BEFORE UPDATE ON public.template_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_template_items_updated_at BEFORE UPDATE ON public.template_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_report_service_teams_updated_at BEFORE UPDATE ON public.report_service_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_checklists_updated_at BEFORE UPDATE ON public.property_checklists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_checklist_templates_updated_at BEFORE UPDATE ON public.property_checklist_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON public.inspections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inspection_items_updated_at BEFORE UPDATE ON public.inspection_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stripe_customers_updated_at BEFORE UPDATE ON public.stripe_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stripe_subscriptions_updated_at BEFORE UPDATE ON public.stripe_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stripe_orders_updated_at BEFORE UPDATE ON public.stripe_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Re-create the auth.users triggers after dropping them
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_email_verification();

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_service_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_postgres_all" ON profiles FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "admin_owner_full_access" ON admin FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "admin_postgres_access" ON admin FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "team_members_own_record" ON team_members FOR ALL TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
CREATE POLICY "team_members_admin_manage" ON team_members FOR ALL TO authenticated USING (admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid())) WITH CHECK (admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid()));
CREATE POLICY "team_members_postgres_access" ON team_members FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "template_categories_manage_admins" ON template_categories FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = template_categories.admin_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND ((tm.role)::text = ANY (ARRAY['owner'::text, 'admin'::text]))))))))) WITH CHECK (EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = template_categories.admin_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND ((tm.role)::text = ANY (ARRAY['owner'::text, 'admin'::text])))))))));
CREATE POLICY "template_categories_postgres_all" ON template_categories FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "templates_manage_admins" ON templates FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = templates.admin_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND ((tm.role)::text = ANY (ARRAY['owner'::text, 'admin'::text]))))))))) WITH CHECK (EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = templates.admin_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND ((tm.role)::text = ANY (ARRAY['owner'::text, 'admin'::text])))))))));
CREATE POLICY "templates_postgres_all" ON templates FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "templates_select_members" ON templates FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = templates.admin_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid())))))));

CREATE POLICY "template_items_manage_admins" ON template_items FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM (templates t JOIN admin a ON ((t.admin_id = a.id))) WHERE ((t.id = template_items.template_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND ((tm.role)::text = ANY (ARRAY['owner'::text, 'admin'::text]))))))))) WITH CHECK (EXISTS ( SELECT 1 FROM (templates t JOIN admin a ON ((t.admin_id = a.id))) WHERE ((t.id = template_items.template_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND ((tm.role)::text = ANY (ARRAY['owner'::text, 'admin'::text])))))))));
CREATE POLICY "template_items_postgres_all" ON template_items FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "template_items_select_members" ON template_items FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM (templates t JOIN admin a ON ((t.admin_id = a.id))) WHERE ((t.id = template_items.template_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid())))))));

CREATE POLICY "report_service_teams_manage_admins" ON report_service_teams FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = report_service_teams.admin_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND ((tm.role)::text = ANY (ARRAY['owner'::text, 'admin'::text]))))))))) WITH CHECK (EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = report_service_teams.admin_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND ((tm.role)::text = ANY (ARRAY['owner'::text, 'admin'::text])))))))));
CREATE POLICY "report_service_teams_postgres_all" ON report_service_teams FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "report_service_teams_select_members" ON report_service_teams FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = report_service_teams.admin_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid())))))));

CREATE POLICY "properties_manage_admins" ON properties FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = properties.admin_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND ((tm.role)::text = ANY (ARRAY['owner'::text, 'admin'::text]))))))))) WITH CHECK (EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = properties.admin_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND ((tm.role)::text = ANY (ARRAY['owner'::text, 'admin'::text])))))))));
CREATE POLICY "properties_postgres_all" ON properties FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "properties_select_members" ON properties FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = properties.admin_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid())))))));

CREATE POLICY "property_checklists_manage_admins" ON property_checklists FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM (properties p JOIN admin a ON ((p.admin_id = a.id))) WHERE ((p.id = property_checklists.property_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND ((tm.role)::text = ANY (ARRAY['owner'::text, 'admin'::text]))))))))) WITH CHECK (EXISTS ( SELECT 1 FROM (properties p JOIN admin a ON ((p.admin_id = a.id))) WHERE ((p.id = property_checklists.property_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND ((tm.role)::text = ANY (ARRAY['owner'::text, 'admin'::text])))))))));
CREATE POLICY "property_checklists_postgres_all" ON property_checklists FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "property_checklists_select_members" ON property_checklists FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM (properties p JOIN admin a ON ((p.admin_id = a.id))) WHERE ((p.id = property_checklists.property_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid())))))));

CREATE POLICY "property_checklist_templates_access_for_members" ON property_checklist_templates FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM ((property_checklists pc JOIN properties p ON ((pc.property_id = p.id))) JOIN team_members tm ON ((tm.admin_id = p.admin_id))) WHERE ((pc.id = property_checklist_templates.property_checklist_id) AND (tm.profile_id = auth.uid())))) WITH CHECK (EXISTS ( SELECT 1 FROM ((property_checklists pc JOIN properties p ON ((pc.property_id = p.id))) JOIN team_members tm ON ((tm.admin_id = p.admin_id))) WHERE ((pc.id = property_checklist_templates.property_checklist_id) AND (tm.profile_id = auth.uid()))));
CREATE POLICY "property_checklist_templates_manage_admins" ON property_checklist_templates FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM ((property_checklists pc JOIN properties p ON ((pc.property_id = p.id))) JOIN admin a ON ((p.admin_id = a.id))) WHERE ((pc.id = property_checklist_templates.property_checklist_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND ((tm.role)::text = ANY (ARRAY['owner'::text, 'admin'::text]))))))))) WITH CHECK (EXISTS ( SELECT 1 FROM ((property_checklists pc JOIN properties p ON ((pc.property_id = p.id))) JOIN admin a ON ((p.admin_id = a.id))) WHERE ((pc.id = property_checklist_templates.property_checklist_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND ((tm.role)::text = ANY (ARRAY['owner'::text, 'admin'::text])))))))));
CREATE POLICY "property_checklist_templates_postgres_all" ON property_checklist_templates FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "inspections_access_for_members" ON inspections FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM ((properties p JOIN admin a ON ((p.admin_id = a.id))) JOIN team_members tm ON ((tm.admin_id = a.id))) WHERE ((p.id = inspections.property_id) AND (tm.profile_id = auth.uid())))) WITH CHECK (EXISTS ( SELECT 1 FROM ((properties p JOIN admin a ON ((p.admin_id = a.id))) JOIN team_members tm ON ((tm.admin_id = a.id))) WHERE ((p.id = inspections.property_id) AND (tm.profile_id = auth.uid()))));
CREATE POLICY "inspections_manage_admins" ON inspections FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM (properties p JOIN admin a ON ((p.admin_id = a.id))) WHERE ((p.id = inspections.property_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))) WITH CHECK (EXISTS ( SELECT 1 FROM (properties p JOIN admin a ON ((p.admin_id = a.id))) WHERE ((p.id = inspections.property_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role])))))))));
CREATE POLICY "inspections_manage_team" ON inspections FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM (properties p JOIN admin a ON ((p.admin_id = a.id))) WHERE ((p.id = inspections.property_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()))))))) WITH CHECK (EXISTS ( SELECT 1 FROM (properties p JOIN admin a ON ((p.admin_id = a.id))) WHERE ((p.id = inspections.property_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid())))))));
CREATE POLICY "inspections_postgres_all" ON inspections FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "inspection_items_access_for_members" ON inspection_items FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM (((inspections i JOIN properties p ON ((i.property_id = p.id))) JOIN admin a ON ((p.admin_id = a.id))) JOIN team_members tm ON ((tm.admin_id = a.id))) WHERE ((i.id = inspection_items.inspection_id) AND (tm.profile_id = auth.uid())))) WITH CHECK (EXISTS ( SELECT 1 FROM (((inspections i JOIN properties p ON ((i.property_id = p.id))) JOIN admin a ON ((p.admin_id = a.id))) JOIN team_members tm ON ((tm.admin_id = a.id))) WHERE ((i.id = inspection_items.inspection_id) AND (tm.profile_id = auth.uid()))));
CREATE POLICY "inspection_items_manage_admins" ON inspection_items FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM ((inspections i JOIN properties p ON ((i.property_id = p.id))) JOIN admin a ON ((p.admin_id = a.id))) WHERE ((i.id = inspection_items.inspection_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))) WITH CHECK (EXISTS ( SELECT 1 FROM ((inspections i JOIN properties p ON ((i.property_id = p.id))) JOIN admin a ON ((p.admin_id = a.id))) WHERE ((i.id = inspection_items.inspection_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role])))))))));
CREATE POLICY "inspection_items_manage_team" ON inspection_items FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM ((inspections i JOIN properties p ON ((i.property_id = p.id))) JOIN admin a ON ((p.admin_id = a.id))) WHERE ((i.id = inspection_items.inspection_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()))))))) WITH CHECK (EXISTS ( SELECT 1 FROM ((inspections i JOIN properties p ON ((i.property_id = p.id))) JOIN admin a ON ((p.admin_id = a.id))) WHERE ((i.id = inspection_items.inspection_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid())))))));
CREATE POLICY "inspection_items_postgres_all" ON inspection_items FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "reports_manage_admins" ON reports FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM ((inspections i JOIN properties p ON ((i.property_id = p.id))) JOIN admin a ON ((p.admin_id = a.id))) WHERE ((i.id = reports.inspection_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))) WITH CHECK (EXISTS ( SELECT 1 FROM ((inspections i JOIN properties p ON ((i.property_id = p.id))) JOIN admin a ON ((p.admin_id = a.id))) WHERE ((i.id = reports.inspection_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role])))))))));
CREATE POLICY "reports_manage_team" ON reports FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM ((inspections i JOIN properties p ON ((i.property_id = p.id))) JOIN admin a ON ((p.admin_id = a.id))) WHERE ((i.id = reports.inspection_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()))))))) WITH CHECK (EXISTS ( SELECT 1 FROM ((inspections i JOIN properties p ON ((i.property_id = p.id))) JOIN admin a ON ((p.admin_id = a.id))) WHERE ((i.id = reports.inspection_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid())))))));
CREATE POLICY "reports_postgres_all" ON reports FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "stripe_customers_postgres_all" ON stripe_customers FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "stripe_subscriptions_postgres_all" ON stripe_subscriptions FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "stripe_orders_postgres_all" ON stripe_orders FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Create Views
CREATE VIEW user_admin_status AS
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

CREATE VIEW stripe_user_subscriptions AS
SELECT 
  sc.customer_id,
  ss.subscription_id,
  ss.status AS subscription_status,
  ss.price_id,
  ss.current_period_start,
  ss.current_period_end,
  ss.cancel_at_period_end,
  ss.payment_method_brand,
  ss.payment_method_last4
FROM stripe_customers sc
LEFT JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id;

CREATE VIEW stripe_user_orders AS
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