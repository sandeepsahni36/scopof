/*
  # Complete Database Schema Migration

  This migration creates the complete database schema for the property inspection platform.

  ## Tables Created
  1. profiles - User profile information
  2. admin - Company/admin records
  3. team_members - Team membership and roles
  4. properties - Property records
  5. template_categories - Template organization
  6. templates - Inspection templates
  7. template_items - Template item definitions with proper type column
  8. report_service_teams - Service team contacts
  9. property_checklists - Property-specific checklists
  10. property_checklist_templates - Checklist-template associations
  11. inspections - Inspection records
  12. inspection_items - Inspection item responses
  13. stripe_customers - Stripe customer records
  14. stripe_subscriptions - Stripe subscription records
  15. stripe_orders - Stripe order records

  ## Security
  - Row Level Security enabled on all tables
  - Appropriate policies for data access
  - Proper foreign key constraints
*/

-- Create enum types first
DO $$ BEGIN
  CREATE TYPE public.inspection_type AS ENUM ('check_in', 'check_out', 'move_in', 'move_out');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.inspection_status AS ENUM ('in_progress', 'completed', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.team_member_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.stripe_subscription_status AS ENUM ('active', 'canceled', 'incomplete', 'incomplete_expired', 'not_started', 'past_due', 'paused', 'trialing', 'unpaid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.stripe_order_status AS ENUM ('pending', 'completed', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CRITICAL: Create the template_item_type enum BEFORE creating template_items table
DO $$ BEGIN
  CREATE TYPE public.template_item_type AS ENUM ('text', 'single_choice', 'multiple_choice', 'photo', 'section', 'divider');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create admin table
CREATE TABLE IF NOT EXISTS public.admin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  billing_manager_id uuid REFERENCES public.profiles(id),
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
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.admin(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.team_member_role DEFAULT 'owner',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(admin_id, profile_id)
);

-- Create properties table
CREATE TABLE IF NOT EXISTS public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.admin(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS public.template_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.admin(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create templates table
CREATE TABLE IF NOT EXISTS public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.admin(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.template_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create report_service_teams table
CREATE TABLE IF NOT EXISTS public.report_service_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.admin(id) ON DELETE CASCADE,
  designation text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(admin_id, designation)
);

-- CRITICAL: Create template_items table with explicit type column definition
CREATE TABLE IF NOT EXISTS public.template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.template_items(id) ON DELETE CASCADE,
  type public.template_item_type NOT NULL,
  label text NOT NULL,
  section_name text,
  required boolean DEFAULT false,
  options jsonb,
  report_enabled boolean DEFAULT false,
  maintenance_email text,
  report_recipient_id uuid REFERENCES public.report_service_teams(id) ON DELETE SET NULL,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT check_no_self_reference CHECK (id <> parent_id)
);

-- Create property_checklists table
CREATE TABLE IF NOT EXISTS public.property_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create property_checklist_templates table
CREATE TABLE IF NOT EXISTS public.property_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_checklist_id uuid NOT NULL REFERENCES public.property_checklists(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(property_checklist_id, template_id)
);

-- Create inspections table
CREATE TABLE IF NOT EXISTS public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  property_checklist_id uuid REFERENCES public.property_checklists(id) ON DELETE SET NULL,
  inspector_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  inspection_type public.inspection_type NOT NULL,
  primary_contact_name text,
  inspector_name text,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_seconds integer,
  primary_contact_signature_url text,
  inspector_signature_image_url text,
  client_present_for_signature boolean DEFAULT false,
  status public.inspection_status NOT NULL DEFAULT 'in_progress',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create inspection_items table
CREATE TABLE IF NOT EXISTS public.inspection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  template_item_id uuid NOT NULL REFERENCES public.template_items(id) ON DELETE CASCADE,
  value jsonb,
  notes text,
  photo_urls text[],
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create Stripe tables
CREATE TABLE IF NOT EXISTS public.stripe_customers (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  customer_id text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.stripe_subscriptions (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  customer_id text NOT NULL UNIQUE,
  subscription_id text,
  price_id text,
  current_period_start bigint,
  current_period_end bigint,
  cancel_at_period_end boolean DEFAULT false,
  payment_method_brand text,
  payment_method_last4 text,
  status public.stripe_subscription_status NOT NULL DEFAULT 'not_started',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.stripe_orders (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  checkout_session_id text NOT NULL UNIQUE,
  payment_intent_id text NOT NULL,
  customer_id text NOT NULL,
  amount_subtotal bigint NOT NULL,
  amount_total bigint NOT NULL,
  currency text NOT NULL,
  payment_status text NOT NULL,
  status public.stripe_order_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Create indexes AFTER all tables exist
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_admin_owner_id ON public.admin(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_admin_status_admin_id ON public.team_members(admin_id);
CREATE INDEX IF NOT EXISTS idx_user_admin_status_profile_id ON public.team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_properties_admin_id ON public.properties(admin_id);
CREATE INDEX IF NOT EXISTS idx_properties_type ON public.properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_template_categories_admin_id ON public.template_categories(admin_id);
CREATE INDEX IF NOT EXISTS idx_templates_admin_id ON public.templates(admin_id);
CREATE INDEX IF NOT EXISTS idx_templates_category_id ON public.templates(category_id);
CREATE INDEX IF NOT EXISTS idx_template_items_template_id ON public.template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_template_items_parent_id ON public.template_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_template_items_type ON public.template_items(type);
CREATE INDEX IF NOT EXISTS idx_template_items_order ON public.template_items("order");
CREATE INDEX IF NOT EXISTS idx_template_items_report_recipient_id ON public.template_items(report_recipient_id);
CREATE INDEX IF NOT EXISTS idx_template_items_hierarchy ON public.template_items(template_id, parent_id, "order");
CREATE INDEX IF NOT EXISTS idx_template_items_order_scoped ON public.template_items(template_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), "order");
CREATE INDEX IF NOT EXISTS idx_template_items_order_fallback ON public.template_items("order") WHERE parent_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_report_service_teams_admin_id ON public.report_service_teams(admin_id);
CREATE INDEX IF NOT EXISTS idx_property_checklists_property_id ON public.property_checklists(property_id);
CREATE INDEX IF NOT EXISTS idx_property_checklists_active ON public.property_checklists(is_active);
CREATE INDEX IF NOT EXISTS idx_property_checklist_templates_checklist_id ON public.property_checklist_templates(property_checklist_id);
CREATE INDEX IF NOT EXISTS idx_property_checklist_templates_order ON public.property_checklist_templates(order_index);
CREATE INDEX IF NOT EXISTS idx_inspections_property_id ON public.inspections(property_id);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector_id ON public.inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON public.inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON public.inspections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection_id ON public.inspection_items(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_items_template_item_id ON public.inspection_items(template_item_id);
CREATE INDEX IF NOT EXISTS idx_inspection_items_order ON public.inspection_items(order_index);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_service_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies with proper existence checks
DO $$
BEGIN
  -- Profiles policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_insert_own') THEN
    CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK ((uid() = id));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select_own') THEN
    CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING ((uid() = id));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_update_own') THEN
    CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING ((uid() = id)) WITH CHECK ((uid() = id));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_postgres_all') THEN
    CREATE POLICY "profiles_postgres_all" ON public.profiles FOR ALL TO postgres USING (true) WITH CHECK (true);
  END IF;

  -- Admin policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin' AND policyname = 'admin_owner_full_access') THEN
    CREATE POLICY "admin_owner_full_access" ON public.admin FOR ALL USING ((owner_id = uid()));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin' AND policyname = 'admin_postgres_access') THEN
    CREATE POLICY "admin_postgres_access" ON public.admin FOR ALL TO postgres USING (true) WITH CHECK (true);
  END IF;

  -- Team members policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'team_members_own_record') THEN
    CREATE POLICY "team_members_own_record" ON public.team_members FOR ALL USING ((profile_id = uid()));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'team_members_admin_manage') THEN
    CREATE POLICY "team_members_admin_manage" ON public.team_members FOR ALL USING ((admin_id IN (SELECT admin.id FROM admin WHERE (admin.owner_id = uid()))));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'team_members_postgres_access') THEN
    CREATE POLICY "team_members_postgres_access" ON public.team_members FOR ALL TO postgres USING (true) WITH CHECK (true);
  END IF;

  -- Properties policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'properties' AND policyname = 'properties_manage_admins') THEN
    CREATE POLICY "properties_manage_admins" ON public.properties FOR ALL USING ((EXISTS (SELECT 1 FROM admin a WHERE ((a.id = properties.admin_id) AND ((a.owner_id = uid()) OR (EXISTS (SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'properties' AND policyname = 'properties_select_members') THEN
    CREATE POLICY "properties_select_members" ON public.properties FOR SELECT USING ((EXISTS (SELECT 1 FROM admin a WHERE ((a.id = properties.admin_id) AND (EXISTS (SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()))))))));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'properties' AND policyname = 'properties_postgres_all') THEN
    CREATE POLICY "properties_postgres_all" ON public.properties FOR ALL TO postgres USING (true) WITH CHECK (true);
  END IF;

  -- Template categories policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_categories' AND policyname = 'template_categories_manage_admins') THEN
    CREATE POLICY "template_categories_manage_admins" ON public.template_categories FOR ALL USING ((EXISTS (SELECT 1 FROM admin a WHERE ((a.id = template_categories.admin_id) AND ((a.owner_id = uid()) OR (EXISTS (SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_categories' AND policyname = 'template_categories_select_members') THEN
    CREATE POLICY "template_categories_select_members" ON public.template_categories FOR SELECT USING ((EXISTS (SELECT 1 FROM admin a WHERE ((a.id = template_categories.admin_id) AND (EXISTS (SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()))))))));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_categories' AND policyname = 'template_categories_postgres_all') THEN
    CREATE POLICY "template_categories_postgres_all" ON public.template_categories FOR ALL TO postgres USING (true) WITH CHECK (true);
  END IF;

  -- Templates policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'templates_manage_admins') THEN
    CREATE POLICY "templates_manage_admins" ON public.templates FOR ALL USING ((EXISTS (SELECT 1 FROM admin a WHERE ((a.id = templates.admin_id) AND ((a.owner_id = uid()) OR (EXISTS (SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'templates_select_members') THEN
    CREATE POLICY "templates_select_members" ON public.templates FOR SELECT USING ((EXISTS (SELECT 1 FROM admin a WHERE ((a.id = templates.admin_id) AND (EXISTS (SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()))))))));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'templates_postgres_all') THEN
    CREATE POLICY "templates_postgres_all" ON public.templates FOR ALL TO postgres USING (true) WITH CHECK (true);
  END IF;

  -- Template items policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_items' AND policyname = 'template_items_manage_admins') THEN
    CREATE POLICY "template_items_manage_admins" ON public.template_items FOR ALL USING ((EXISTS (SELECT 1 FROM templates t JOIN admin a ON ((t.admin_id = a.id)) WHERE ((t.id = template_items.template_id) AND ((a.owner_id = uid()) OR (EXISTS (SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_items' AND policyname = 'template_items_select_members') THEN
    CREATE POLICY "template_items_select_members" ON public.template_items FOR SELECT USING ((EXISTS (SELECT 1 FROM templates t JOIN admin a ON ((t.admin_id = a.id)) WHERE ((t.id = template_items.template_id) AND (EXISTS (SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()))))))));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_items' AND policyname = 'template_items_postgres_all') THEN
    CREATE POLICY "template_items_postgres_all" ON public.template_items FOR ALL TO postgres USING (true) WITH CHECK (true);
  END IF;

  -- Report service teams policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_service_teams' AND policyname = 'report_service_teams_manage_admins') THEN
    CREATE POLICY "report_service_teams_manage_admins" ON public.report_service_teams FOR ALL USING ((EXISTS (SELECT 1 FROM admin a WHERE ((a.id = report_service_teams.admin_id) AND ((a.owner_id = uid()) OR (EXISTS (SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_service_teams' AND policyname = 'report_service_teams_select_members') THEN
    CREATE POLICY "report_service_teams_select_members" ON public.report_service_teams FOR SELECT USING ((EXISTS (SELECT 1 FROM admin a WHERE ((a.id = report_service_teams.admin_id) AND (EXISTS (SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()))))))));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_service_teams' AND policyname = 'report_service_teams_postgres_all') THEN
    CREATE POLICY "report_service_teams_postgres_all" ON public.report_service_teams FOR ALL TO postgres USING (true) WITH CHECK (true);
  END IF;

  -- Property checklists policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_checklists' AND policyname = 'property_checklists_manage_admins') THEN
    CREATE POLICY "property_checklists_manage_admins" ON public.property_checklists FOR ALL USING ((EXISTS (SELECT 1 FROM properties p JOIN admin a ON ((p.admin_id = a.id)) WHERE ((p.id = property_checklists.property_id) AND ((a.owner_id = uid()) OR (EXISTS (SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_checklists' AND policyname = 'property_checklists_select_members') THEN
    CREATE POLICY "property_checklists_select_members" ON public.property_checklists FOR SELECT USING ((EXISTS (SELECT 1 FROM properties p JOIN admin a ON ((p.admin_id = a.id)) WHERE ((p.id = property_checklists.property_id) AND (EXISTS (SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()))))))));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_checklists' AND policyname = 'property_checklists_postgres_all') THEN
    CREATE POLICY "property_checklists_postgres_all" ON public.property_checklists FOR ALL TO postgres USING (true) WITH CHECK (true);
  END IF;

  -- Property checklist templates policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_checklist_templates' AND policyname = 'property_checklist_templates_access_for_members') THEN
    CREATE POLICY "property_checklist_templates_access_for_members" ON public.property_checklist_templates FOR ALL USING ((EXISTS (SELECT 1 FROM property_checklists pc JOIN properties p ON ((pc.property_id = p.id)) JOIN team_members tm ON ((tm.admin_id = p.admin_id)) WHERE ((pc.id = property_checklist_templates.property_checklist_id) AND (tm.profile_id = uid())))));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_checklist_templates' AND policyname = 'property_checklist_templates_postgres_all') THEN
    CREATE POLICY "property_checklist_templates_postgres_all" ON public.property_checklist_templates FOR ALL TO postgres USING (true) WITH CHECK (true);
  END IF;

  -- Inspections policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspections' AND policyname = 'inspections_access_for_members') THEN
    CREATE POLICY "inspections_access_for_members" ON public.inspections FOR ALL USING ((EXISTS (SELECT 1 FROM properties p JOIN admin a ON ((p.admin_id = a.id)) JOIN team_members tm ON ((tm.admin_id = a.id)) WHERE ((p.id = inspections.property_id) AND (tm.profile_id = uid())))));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspections' AND policyname = 'inspections_postgres_all') THEN
    CREATE POLICY "inspections_postgres_all" ON public.inspections FOR ALL TO postgres USING (true) WITH CHECK (true);
  END IF;

  -- Inspection items policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspection_items' AND policyname = 'inspection_items_access_for_members') THEN
    CREATE POLICY "inspection_items_access_for_members" ON public.inspection_items FOR ALL USING ((EXISTS (SELECT 1 FROM inspections i JOIN properties p ON ((i.property_id = p.id)) JOIN admin a ON ((p.admin_id = a.id)) JOIN team_members tm ON ((tm.admin_id = a.id)) WHERE ((i.id = inspection_items.inspection_id) AND (tm.profile_id = uid())))));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspection_items' AND policyname = 'inspection_items_postgres_all') THEN
    CREATE POLICY "inspection_items_postgres_all" ON public.inspection_items FOR ALL TO postgres USING (true) WITH CHECK (true);
  END IF;

  -- Stripe tables policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stripe_customers' AND policyname = 'stripe_customers_postgres_all') THEN
    CREATE POLICY "stripe_customers_postgres_all" ON public.stripe_customers FOR ALL TO postgres USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stripe_subscriptions' AND policyname = 'stripe_subscriptions_postgres_all') THEN
    CREATE POLICY "stripe_subscriptions_postgres_all" ON public.stripe_subscriptions FOR ALL TO postgres USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stripe_orders' AND policyname = 'stripe_orders_postgres_all') THEN
    CREATE POLICY "stripe_orders_postgres_all" ON public.stripe_orders FOR ALL TO postgres USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Create views
CREATE OR REPLACE VIEW public.user_admin_status AS
SELECT 
  tm.profile_id,
  tm.admin_id,
  tm.role,
  (tm.role = 'owner') AS is_owner,
  a.trial_started_at,
  a.subscription_status,
  a.customer_id,
  CASE 
    WHEN a.subscription_status = 'active' THEN true
    WHEN a.subscription_status = 'trialing' AND a.trial_ends_at > now() THEN true
    ELSE false
  END AS has_active_subscription
FROM team_members tm
JOIN admin a ON tm.admin_id = a.id;

CREATE OR REPLACE VIEW public.stripe_user_subscriptions AS
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

CREATE OR REPLACE VIEW public.stripe_user_orders AS
SELECT 
  sc.customer_id,
  so.id AS order_id,
  so.checkout_session_id,
  so.payment_intent_id,
  so.amount_subtotal,
  so.amount_total,
  so.currency,
  so.payment_status,
  so.status AS order_status,
  so.created_at AS order_date
FROM stripe_customers sc
LEFT JOIN stripe_orders so ON sc.customer_id = so.customer_id;

-- Create trigger functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_inspections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_inspection_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_property_checklists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_property_checklist_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_report_service_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_templates_updated_at') THEN
    CREATE TRIGGER update_templates_updated_at
      BEFORE UPDATE ON public.templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_template_items_updated_at') THEN
    CREATE TRIGGER update_template_items_updated_at
      BEFORE UPDATE ON public.template_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_template_categories_updated_at') THEN
    CREATE TRIGGER update_template_categories_updated_at
      BEFORE UPDATE ON public.template_categories
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_properties_updated_at') THEN
    CREATE TRIGGER update_properties_updated_at
      BEFORE UPDATE ON public.properties
      FOR EACH ROW EXECUTE FUNCTION update_properties_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_inspections_updated_at') THEN
    CREATE TRIGGER update_inspections_updated_at
      BEFORE UPDATE ON public.inspections
      FOR EACH ROW EXECUTE FUNCTION update_inspections_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_inspection_items_updated_at') THEN
    CREATE TRIGGER update_inspection_items_updated_at
      BEFORE UPDATE ON public.inspection_items
      FOR EACH ROW EXECUTE FUNCTION update_inspection_items_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_property_checklists_updated_at') THEN
    CREATE TRIGGER update_property_checklists_updated_at
      BEFORE UPDATE ON public.property_checklists
      FOR EACH ROW EXECUTE FUNCTION update_property_checklists_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_property_checklist_templates_updated_at') THEN
    CREATE TRIGGER update_property_checklist_templates_updated_at
      BEFORE UPDATE ON public.property_checklist_templates
      FOR EACH ROW EXECUTE FUNCTION update_property_checklist_templates_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_report_service_teams_updated_at') THEN
    CREATE TRIGGER update_report_service_teams_updated_at
      BEFORE UPDATE ON public.report_service_teams
      FOR EACH ROW EXECUTE FUNCTION update_report_service_teams_updated_at();
  END IF;
END $$;

-- Create auth trigger functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
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
    INSERT INTO public.team_members (admin_id, profile_id, role)
    SELECT a.id, NEW.id, 'owner'
    FROM public.admin a
    WHERE a.owner_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_auth_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Update profile when auth.users is updated
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

CREATE OR REPLACE FUNCTION public.handle_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be used to handle post-email-verification logic
  -- Currently just returns the new record
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create auth triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_updated') THEN
    CREATE TRIGGER on_auth_user_updated
      AFTER UPDATE ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_changes();
  END IF;
END $$;