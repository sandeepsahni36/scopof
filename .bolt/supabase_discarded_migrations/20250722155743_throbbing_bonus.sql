/*
  # Property Management and Inspection Schema

  1. New Tables
    - `template_categories` - Categories for organizing templates
    - `templates` - Inspection templates
    - `template_items` - Items within templates (hierarchical structure)
    - `properties` - Property information
    - `property_checklists` - Checklists assigned to properties
    - `property_checklist_templates` - Templates assigned to property checklists
    - `inspections` - Individual inspection records
    - `inspection_items` - Inspection item responses
    - `report_service_teams` - Teams for report distribution
    - `admin` - Company/admin information
    - `team_members` - Team member relationships
    - `profiles` - User profile information
    - `stripe_customers` - Stripe customer records
    - `stripe_subscriptions` - Stripe subscription records
    - `stripe_orders` - Stripe order records

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on admin/team relationships
    - Postgres full access policies for system operations

  3. Features
    - Hierarchical template items with parent-child relationships
    - Multiple inspection types (check_in, check_out, move_in, move_out)
    - Comprehensive audit trails with created_at/updated_at
    - Stripe integration for subscription management
    - Report service team management
*/

-- Drop Auth Triggers first (to resolve dependencies)
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Drop other triggers
DROP TRIGGER IF EXISTS update_template_categories_updated_at ON public.template_categories;
DROP TRIGGER IF EXISTS update_templates_updated_at ON public.templates;
DROP TRIGGER IF EXISTS update_template_items_updated_at ON public.template_items;
DROP TRIGGER IF EXISTS update_properties_updated_at ON public.properties;
DROP TRIGGER IF EXISTS update_property_checklists_updated_at ON public.property_checklists;
DROP TRIGGER IF EXISTS update_property_checklist_templates_updated_at ON public.property_checklist_templates;
DROP TRIGGER IF EXISTS update_inspections_updated_at ON public.inspections;
DROP TRIGGER IF EXISTS update_inspection_items_updated_at ON public.inspection_items;
DROP TRIGGER IF EXISTS update_report_service_teams_updated_at ON public.report_service_teams;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_auth_user_changes() CASCADE;
DROP FUNCTION IF EXISTS public.handle_email_verification() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.update_properties_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_property_checklists_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_property_checklist_templates_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_inspections_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_inspection_items_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_report_service_teams_updated_at() CASCADE;

-- Drop policies
DROP POLICY IF EXISTS "template_categories_manage_admins" ON public.template_categories;
DROP POLICY IF EXISTS "template_categories_postgres_all" ON public.template_categories;
DROP POLICY IF EXISTS "template_categories_select_members" ON public.template_categories;
DROP POLICY IF EXISTS "templates_manage_admins" ON public.templates;
DROP POLICY IF EXISTS "templates_postgres_all" ON public.templates;
DROP POLICY IF EXISTS "templates_select_members" ON public.templates;
DROP POLICY IF EXISTS "template_items_manage_admins" ON public.template_items;
DROP POLICY IF EXISTS "template_items_postgres_all" ON public.template_items;
DROP POLICY IF EXISTS "template_items_select_members" ON public.template_items;
DROP POLICY IF EXISTS "properties_manage_admins" ON public.properties;
DROP POLICY IF EXISTS "properties_postgres_all" ON public.properties;
DROP POLICY IF EXISTS "properties_select_members" ON public.properties;
DROP POLICY IF EXISTS "property_checklists_manage_admins" ON public.property_checklists;
DROP POLICY IF EXISTS "property_checklists_postgres_all" ON public.property_checklists;
DROP POLICY IF EXISTS "property_checklists_select_members" ON public.property_checklists;
DROP POLICY IF EXISTS "property_checklist_templates_access_for_members" ON public.property_checklist_templates;
DROP POLICY IF EXISTS "property_checklist_templates_postgres_all" ON public.property_checklist_templates;
DROP POLICY IF EXISTS "inspections_access_for_members" ON public.inspections;
DROP POLICY IF EXISTS "inspections_postgres_all" ON public.inspections;
DROP POLICY IF EXISTS "inspection_items_access_for_members" ON public.inspection_items;
DROP POLICY IF EXISTS "inspection_items_postgres_all" ON public.inspection_items;
DROP POLICY IF EXISTS "report_service_teams_manage_admins" ON public.report_service_teams;
DROP POLICY IF EXISTS "report_service_teams_postgres_all" ON public.report_service_teams;
DROP POLICY IF EXISTS "report_service_teams_select_members" ON public.report_service_teams;
DROP POLICY IF EXISTS "admin_owner_full_access" ON public.admin;
DROP POLICY IF EXISTS "admin_postgres_access" ON public.admin;
DROP POLICY IF EXISTS "team_members_admin_manage" ON public.team_members;
DROP POLICY IF EXISTS "team_members_own_record" ON public.team_members;
DROP POLICY IF EXISTS "team_members_postgres_access" ON public.team_members;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_postgres_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "stripe_customers_postgres_all" ON public.stripe_customers;
DROP POLICY IF EXISTS "stripe_subscriptions_postgres_all" ON public.stripe_subscriptions;
DROP POLICY IF EXISTS "stripe_orders_postgres_all" ON public.stripe_orders;

-- Drop views
DROP VIEW IF EXISTS public.user_admin_status;
DROP VIEW IF EXISTS public.stripe_user_subscriptions;
DROP VIEW IF EXISTS public.stripe_user_orders;

-- Drop types
DROP TYPE IF EXISTS public.inspection_type CASCADE;
DROP TYPE IF EXISTS public.stripe_order_status CASCADE;
DROP TYPE IF EXISTS public.stripe_subscription_status CASCADE;
DROP TYPE IF EXISTS public.team_member_role CASCADE;
DROP TYPE IF EXISTS public.template_item_type CASCADE;
DROP TYPE IF EXISTS public.inspection_status CASCADE;

-- Create Types
DO $$ BEGIN
    CREATE TYPE public.inspection_type AS ENUM ('check_in', 'check_out', 'move_in', 'move_out');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.stripe_order_status AS ENUM ('canceled', 'completed', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.stripe_subscription_status AS ENUM ('active', 'canceled', 'incomplete', 'incomplete_expired', 'not_started', 'past_due', 'paused', 'trialing', 'unpaid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.team_member_role AS ENUM ('admin', 'member', 'owner');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.template_item_type AS ENUM ('divider', 'multiple_choice', 'photo', 'section', 'single_choice', 'text');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.inspection_status AS ENUM ('canceled', 'completed', 'in_progress');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Tables
CREATE TABLE IF NOT EXISTS public.template_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    category_id uuid,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.template_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    label text NOT NULL,
    required boolean DEFAULT false,
    options jsonb,
    report_enabled boolean DEFAULT false,
    maintenance_email text,
    "order" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    parent_id uuid,
    section_name text,
    report_recipient_id uuid,
    type public.template_item_type NOT NULL
);

CREATE TABLE IF NOT EXISTS public.properties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    type text NOT NULL,
    bedrooms text NOT NULL,
    bathrooms text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_checklists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_checklist_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_checklist_id uuid NOT NULL,
    template_id uuid NOT NULL,
    order_index integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inspections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    property_checklist_id uuid,
    inspector_id uuid NOT NULL,
    inspection_type public.inspection_type NOT NULL,
    primary_contact_name text,
    start_time timestamp with time zone DEFAULT now() NOT NULL,
    end_time timestamp with time zone,
    duration_seconds integer,
    primary_contact_signature_url text,
    status public.inspection_status DEFAULT 'in_progress'::public.inspection_status NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    inspector_name text,
    inspector_signature_image_url text,
    client_present_for_signature boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.inspection_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inspection_id uuid NOT NULL,
    template_item_id uuid NOT NULL,
    value jsonb,
    notes text,
    photo_urls text[],
    order_index integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_service_teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    designation text NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    billing_manager_id uuid,
    customer_id text,
    company_name text NOT NULL,
    logo_url text,
    brand_color text DEFAULT '#2563EB'::text,
    report_background text DEFAULT '#FFFFFF'::text,
    subscription_tier text DEFAULT 'starter'::text,
    subscription_status text DEFAULT 'trialing'::text,
    trial_started_at timestamp with time zone,
    trial_ends_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    role public.team_member_role DEFAULT 'owner'::public.team_member_role
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stripe_customers (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    customer_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.stripe_subscriptions (
    id bigint NOT NULL,
    customer_id text NOT NULL,
    subscription_id text,
    price_id text,
    current_period_start bigint,
    current_period_end bigint,
    cancel_at_period_end boolean DEFAULT false,
    payment_method_brand text,
    payment_method_last4 text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    status public.stripe_subscription_status DEFAULT 'not_started'::public.stripe_subscription_status NOT NULL
);

CREATE TABLE IF NOT EXISTS public.stripe_orders (
    id bigint NOT NULL,
    checkout_session_id text NOT NULL,
    payment_intent_id text NOT NULL,
    customer_id text NOT NULL,
    amount_subtotal bigint NOT NULL,
    amount_total bigint NOT NULL,
    currency text NOT NULL,
    payment_status text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    status public.stripe_order_status DEFAULT 'pending'::public.stripe_order_status
);

-- Create Primary Keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'template_categories_pkey' AND table_name = 'template_categories') THEN
        ALTER TABLE ONLY public.template_categories ADD CONSTRAINT template_categories_pkey PRIMARY KEY (id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'templates_pkey' AND table_name = 'templates') THEN
        ALTER TABLE ONLY public.templates ADD CONSTRAINT templates_pkey PRIMARY KEY (id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'template_items_pkey' AND table_name = 'template_items') THEN
        ALTER TABLE ONLY public.template_items ADD CONSTRAINT template_items_pkey PRIMARY KEY (id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'properties_pkey' AND table_name = 'properties') THEN
        ALTER TABLE ONLY public.properties ADD CONSTRAINT properties_pkey PRIMARY KEY (id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'property_checklists_pkey' AND table_name = 'property_checklists') THEN
        ALTER TABLE ONLY public.property_checklists ADD CONSTRAINT property_checklists_pkey PRIMARY KEY (id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'property_checklist_templates_pkey' AND table_name = 'property_checklist_templates') THEN
        ALTER TABLE ONLY public.property_checklist_templates ADD CONSTRAINT property_checklist_templates_pkey PRIMARY KEY (id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'inspections_pkey' AND table_name = 'inspections') THEN
        ALTER TABLE ONLY public.inspections ADD CONSTRAINT inspections_pkey PRIMARY KEY (id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'inspection_items_pkey' AND table_name = 'inspection_items') THEN
        ALTER TABLE ONLY public.inspection_items ADD CONSTRAINT inspection_items_pkey PRIMARY KEY (id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'report_service_teams_pkey' AND table_name = 'report_service_teams') THEN
        ALTER TABLE ONLY public.report_service_teams ADD CONSTRAINT report_service_teams_pkey PRIMARY KEY (id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'admin_pkey' AND table_name = 'admin') THEN
        ALTER TABLE ONLY public.admin ADD CONSTRAINT admin_pkey PRIMARY KEY (id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'team_members_pkey' AND table_name = 'team_members') THEN
        ALTER TABLE ONLY public.team_members ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_pkey' AND table_name = 'profiles') THEN
        ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'stripe_customers_pkey' AND table_name = 'stripe_customers') THEN
        ALTER TABLE ONLY public.stripe_customers ADD CONSTRAINT stripe_customers_pkey PRIMARY KEY (id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'stripe_subscriptions_pkey' AND table_name = 'stripe_subscriptions') THEN
        ALTER TABLE ONLY public.stripe_subscriptions ADD CONSTRAINT stripe_subscriptions_pkey PRIMARY KEY (id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'stripe_orders_pkey' AND table_name = 'stripe_orders') THEN
        ALTER TABLE ONLY public.stripe_orders ADD CONSTRAINT stripe_orders_pkey PRIMARY KEY (id);
    END IF;
END $$;

-- Create Unique Constraints
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'unique_checklist_template' AND table_name = 'property_checklist_templates') THEN
        ALTER TABLE ONLY public.property_checklist_templates ADD CONSTRAINT unique_checklist_template UNIQUE (property_checklist_id, template_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'report_service_teams_admin_id_designation_key' AND table_name = 'report_service_teams') THEN
        ALTER TABLE ONLY public.report_service_teams ADD CONSTRAINT report_service_teams_admin_id_designation_key UNIQUE (admin_id, designation);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'admin_customer_id_key' AND table_name = 'admin') THEN
        ALTER TABLE ONLY public.admin ADD CONSTRAINT admin_customer_id_key UNIQUE (customer_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'admin_owner_id_key' AND table_name = 'admin') THEN
        ALTER TABLE ONLY public.admin ADD CONSTRAINT admin_owner_id_key UNIQUE (owner_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'team_members_admin_id_profile_id_key' AND table_name = 'team_members') THEN
        ALTER TABLE ONLY public.team_members ADD CONSTRAINT team_members_admin_id_profile_id_key UNIQUE (admin_id, profile_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'stripe_customers_customer_id_key' AND table_name = 'stripe_customers') THEN
        ALTER TABLE ONLY public.stripe_customers ADD CONSTRAINT stripe_customers_customer_id_key UNIQUE (customer_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'stripe_customers_user_id_key' AND table_name = 'stripe_customers') THEN
        ALTER TABLE ONLY public.stripe_customers ADD CONSTRAINT stripe_customers_user_id_key UNIQUE (user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'stripe_subscriptions_customer_id_key' AND table_name = 'stripe_subscriptions') THEN
        ALTER TABLE ONLY public.stripe_subscriptions ADD CONSTRAINT stripe_subscriptions_customer_id_key UNIQUE (customer_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'stripe_orders_checkout_session_id_key' AND table_name = 'stripe_orders') THEN
        ALTER TABLE ONLY public.stripe_orders ADD CONSTRAINT stripe_orders_checkout_session_id_key UNIQUE (checkout_session_id);
    END IF;
END $$;

-- Create Check Constraints
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_no_self_reference' AND table_name = 'template_items') THEN
        ALTER TABLE ONLY public.template_items ADD CONSTRAINT check_no_self_reference CHECK ((id <> parent_id));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'properties_bathrooms_check' AND table_name = 'properties') THEN
        ALTER TABLE ONLY public.properties ADD CONSTRAINT properties_bathrooms_check CHECK ((bathrooms = ANY (ARRAY['1'::text, '2'::text, '3'::text, '4'::text, '5'::text, '6+'::text])));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'properties_bedrooms_check' AND table_name = 'properties') THEN
        ALTER TABLE ONLY public.properties ADD CONSTRAINT properties_bedrooms_check CHECK ((bedrooms = ANY (ARRAY['studio'::text, '1'::text, '2'::text, '3'::text, '4'::text, '5+'::text])));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'properties_type_check' AND table_name = 'properties') THEN
        ALTER TABLE ONLY public.properties ADD CONSTRAINT properties_type_check CHECK ((type = ANY (ARRAY['apartment'::text, 'house'::text, 'villa'::text, 'condo'::text])));
    END IF;
END $$;

-- Create Foreign Keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'template_categories_admin_id_fkey' AND table_name = 'template_categories') THEN
        ALTER TABLE ONLY public.template_categories ADD CONSTRAINT template_categories_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin(id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'templates_admin_id_fkey' AND table_name = 'templates') THEN
        ALTER TABLE ONLY public.templates ADD CONSTRAINT templates_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin(id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'templates_category_id_fkey' AND table_name = 'templates') THEN
        ALTER TABLE ONLY public.templates ADD CONSTRAINT templates_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.template_categories(id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'template_items_template_id_fkey' AND table_name = 'template_items') THEN
        ALTER TABLE ONLY public.template_items ADD CONSTRAINT template_items_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'template_items_parent_id_fkey' AND table_name = 'template_items') THEN
        ALTER TABLE ONLY public.template_items ADD CONSTRAINT template_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.template_items(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'template_items_report_recipient_id_fkey' AND table_name = 'template_items') THEN
        ALTER TABLE ONLY public.template_items ADD CONSTRAINT template_items_report_recipient_id_fkey FOREIGN KEY (report_recipient_id) REFERENCES public.report_service_teams(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'properties_admin_id_fkey' AND table_name = 'properties') THEN
        ALTER TABLE ONLY public.properties ADD CONSTRAINT properties_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'property_checklists_property_id_fkey' AND table_name = 'property_checklists') THEN
        ALTER TABLE ONLY public.property_checklists ADD CONSTRAINT property_checklists_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'property_checklist_templates_property_checklist_id_fkey' AND table_name = 'property_checklist_templates') THEN
        ALTER TABLE ONLY public.property_checklist_templates ADD CONSTRAINT property_checklist_templates_property_checklist_id_fkey FOREIGN KEY (property_checklist_id) REFERENCES public.property_checklists(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'property_checklist_templates_template_id_fkey' AND table_name = 'property_checklist_templates') THEN
        ALTER TABLE ONLY public.property_checklist_templates ADD CONSTRAINT property_checklist_templates_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'inspections_property_id_fkey' AND table_name = 'inspections') THEN
        ALTER TABLE ONLY public.inspections ADD CONSTRAINT inspections_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'inspections_inspector_id_fkey' AND table_name = 'inspections') THEN
        ALTER TABLE ONLY public.inspections ADD CONSTRAINT inspections_inspector_id_fkey FOREIGN KEY (inspector_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'inspection_items_inspection_id_fkey' AND table_name = 'inspection_items') THEN
        ALTER TABLE ONLY public.inspection_items ADD CONSTRAINT inspection_items_inspection_id_fkey FOREIGN KEY (inspection_id) REFERENCES public.inspections(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'inspection_items_template_item_id_fkey' AND table_name = 'inspection_items') THEN
        ALTER TABLE ONLY public.inspection_items ADD CONSTRAINT inspection_items_template_item_id_fkey FOREIGN KEY (template_item_id) REFERENCES public.template_items(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'report_service_teams_admin_id_fkey' AND table_name = 'report_service_teams') THEN
        ALTER TABLE ONLY public.report_service_teams ADD CONSTRAINT report_service_teams_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'admin_owner_id_fkey' AND table_name = 'admin') THEN
        ALTER TABLE ONLY public.admin ADD CONSTRAINT admin_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'admin_billing_manager_id_fkey' AND table_name = 'admin') THEN
        ALTER TABLE ONLY public.admin ADD CONSTRAINT admin_billing_manager_id_fkey FOREIGN KEY (billing_manager_id) REFERENCES public.profiles(id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'team_members_admin_id_fkey' AND table_name = 'team_members') THEN
        ALTER TABLE ONLY public.team_members ADD CONSTRAINT team_members_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin(id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'team_members_profile_id_fkey' AND table_name = 'team_members') THEN
        ALTER TABLE ONLY public.team_members ADD CONSTRAINT team_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_id_fkey' AND table_name = 'profiles') THEN
        ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'stripe_customers_user_id_fkey' AND table_name = 'stripe_customers') THEN
        ALTER TABLE ONLY public.stripe_customers ADD CONSTRAINT stripe_customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
    END IF;
END $$;

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_template_categories_admin_id ON public.template_categories USING btree (admin_id);
CREATE INDEX IF NOT EXISTS idx_templates_admin_id ON public.templates USING btree (admin_id);
CREATE INDEX IF NOT EXISTS idx_templates_category_id ON public.templates USING btree (category_id);
CREATE INDEX IF NOT EXISTS idx_template_items_template_id ON public.template_items USING btree (template_id);
CREATE INDEX IF NOT EXISTS idx_template_items_parent_id ON public.template_items USING btree (parent_id);
CREATE INDEX IF NOT EXISTS idx_template_items_report_recipient_id ON public.template_items USING btree (report_recipient_id);
CREATE INDEX IF NOT EXISTS idx_template_items_type ON public.template_items USING btree (type);
CREATE INDEX IF NOT EXISTS idx_template_items_order ON public.template_items USING btree ("order");
CREATE INDEX IF NOT EXISTS idx_template_items_hierarchy ON public.template_items USING btree (template_id, parent_id, "order");
CREATE INDEX IF NOT EXISTS idx_template_items_order_fallback ON public.template_items USING btree ("order") WHERE (parent_id IS NULL);
CREATE INDEX IF NOT EXISTS idx_template_items_order_scoped ON public.template_items USING btree (template_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), "order");
CREATE INDEX IF NOT EXISTS idx_properties_admin_id ON public.properties USING btree (admin_id);
CREATE INDEX IF NOT EXISTS idx_properties_type ON public.properties USING btree (type);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_checklists_property_id ON public.property_checklists USING btree (property_id);
CREATE INDEX IF NOT EXISTS idx_property_checklists_active ON public.property_checklists USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_property_checklist_templates_checklist_id ON public.property_checklist_templates USING btree (property_checklist_id);
CREATE INDEX IF NOT EXISTS idx_property_checklist_templates_order ON public.property_checklist_templates USING btree (order_index);
CREATE INDEX IF NOT EXISTS idx_inspections_property_id ON public.inspections USING btree (property_id);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector_id ON public.inspections USING btree (inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON public.inspections USING btree (status);
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON public.inspections USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection_id ON public.inspection_items USING btree (inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_items_template_item_id ON public.inspection_items USING btree (template_item_id);
CREATE INDEX IF NOT EXISTS idx_inspection_items_order ON public.inspection_items USING btree (order_index);
CREATE INDEX IF NOT EXISTS idx_report_service_teams_admin_id ON public.report_service_teams USING btree (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_owner_id ON public.admin USING btree (owner_id);
CREATE INDEX IF NOT EXISTS idx_user_admin_status_admin_id ON public.team_members USING btree (admin_id);
CREATE INDEX IF NOT EXISTS idx_user_admin_status_profile_id ON public.team_members USING btree (profile_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles USING btree (id);

-- Enable RLS
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_service_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_orders ENABLE ROW LEVEL SECURITY;

-- Create Functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION public.update_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION public.update_property_checklists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION public.update_property_checklist_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION public.update_inspections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION public.update_inspection_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION public.update_report_service_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

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
      NOW(),
      NOW() + INTERVAL '14 days'
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

CREATE OR REPLACE FUNCTION public.handle_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if email was just confirmed
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    -- Check if profile exists, create if not
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

    -- Create admin record if company_name is provided and doesn't exist
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
        NOW(),
        NOW() + INTERVAL '14 days'
      )
      ON CONFLICT (owner_id) DO NOTHING;

      -- Create team member record if it doesn't exist
      INSERT INTO public.team_members (admin_id, profile_id, role)
      SELECT a.id, NEW.id, 'owner'
      FROM public.admin a
      WHERE a.owner_id = NEW.id
      ON CONFLICT (admin_id, profile_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_auth_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle email updates
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.profiles
    SET email = NEW.email
    WHERE id = NEW.id;
  END IF;

  -- Handle metadata updates
  IF OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data THEN
    UPDATE public.profiles
    SET full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', profiles.full_name)
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Policies
CREATE POLICY "template_categories_manage_admins" ON public.template_categories
    FOR ALL USING ((EXISTS ( SELECT 1
   FROM public.admin a
  WHERE ((a.id = template_categories.admin_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::public.team_member_role, 'admin'::public.team_member_role])))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin a
  WHERE ((a.id = template_categories.admin_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::public.team_member_role, 'admin'::public.team_member_role]))))))))));

CREATE POLICY "template_categories_postgres_all" ON public.template_categories
    FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "template_categories_select_members" ON public.template_categories
    FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin a
  WHERE ((a.id = template_categories.admin_id) AND (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()))))))));

CREATE POLICY "templates_manage_admins" ON public.templates
    FOR ALL USING ((EXISTS ( SELECT 1
   FROM public.admin a
  WHERE ((a.id = templates.admin_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::public.team_member_role, 'admin'::public.team_member_role])))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin a
  WHERE ((a.id = templates.admin_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::public.team_member_role, 'admin'::public.team_member_role]))))))))));

CREATE POLICY "templates_postgres_all" ON public.templates
    FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "templates_select_members" ON public.templates
    FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin a
  WHERE ((a.id = templates.admin_id) AND (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()))))))));

CREATE POLICY "template_items_manage_admins" ON public.template_items
    FOR ALL USING ((EXISTS ( SELECT 1
   FROM (public.templates t
     JOIN public.admin a ON ((t.admin_id = a.id)))
  WHERE ((t.id = template_items.template_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::public.team_member_role, 'admin'::public.team_member_role])))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.templates t
     JOIN public.admin a ON ((t.admin_id = a.id)))
  WHERE ((t.id = template_items.template_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::public.team_member_role, 'admin'::public.team_member_role]))))))))));

CREATE POLICY "template_items_postgres_all" ON public.template_items
    FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "template_items_select_members" ON public.template_items
    FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.templates t
     JOIN public.admin a ON ((t.admin_id = a.id)))
  WHERE ((t.id = template_items.template_id) AND (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()))))))));

CREATE POLICY "properties_manage_admins" ON public.properties
    FOR ALL USING ((EXISTS ( SELECT 1
   FROM public.admin a
  WHERE ((a.id = properties.admin_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::public.team_member_role, 'admin'::public.team_member_role])))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin a
  WHERE ((a.id = properties.admin_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::public.team_member_role, 'admin'::public.team_member_role]))))))))));

CREATE POLICY "properties_postgres_all" ON public.properties
    FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "properties_select_members" ON public.properties
    FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin a
  WHERE ((a.id = properties.admin_id) AND (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()))))))));

CREATE POLICY "property_checklists_manage_admins" ON public.property_checklists
    FOR ALL USING ((EXISTS ( SELECT 1
   FROM (public.properties p
     JOIN public.admin a ON ((p.admin_id = a.id)))
  WHERE ((p.id = property_checklists.property_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::public.team_member_role, 'admin'::public.team_member_role])))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.properties p
     JOIN public.admin a ON ((p.admin_id = a.id)))
  WHERE ((p.id = property_checklists.property_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::public.team_member_role, 'admin'::public.team_member_role]))))))))));

CREATE POLICY "property_checklists_postgres_all" ON public.property_checklists
    FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "property_checklists_select_members" ON public.property_checklists
    FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.properties p
     JOIN public.admin a ON ((p.admin_id = a.id)))
  WHERE ((p.id = property_checklists.property_id) AND (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()))))))));

CREATE POLICY "property_checklist_templates_access_for_members" ON public.property_checklist_templates
    FOR ALL USING ((EXISTS ( SELECT 1
   FROM ((public.property_checklists pc
     JOIN public.properties p ON ((pc.property_id = p.id)))
     JOIN public.team_members tm ON ((tm.admin_id = p.admin_id)))
  WHERE ((pc.id = property_checklist_templates.property_checklist_id) AND (tm.profile_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.property_checklists pc
     JOIN public.properties p ON ((pc.property_id = p.id)))
     JOIN public.team_members tm ON ((tm.admin_id = p.admin_id)))
  WHERE ((pc.id = property_checklist_templates.property_checklist_id) AND (tm.profile_id = auth.uid())))));

CREATE POLICY "property_checklist_templates_postgres_all" ON public.property_checklist_templates
    FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "inspections_access_for_members" ON public.inspections
    FOR ALL USING ((EXISTS ( SELECT 1
   FROM ((public.properties p
     JOIN public.admin a ON ((p.admin_id = a.id)))
     JOIN public.team_members tm ON ((tm.admin_id = a.id)))
  WHERE ((p.id = inspections.property_id) AND (tm.profile_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.properties p
     JOIN public.admin a ON ((p.admin_id = a.id)))
     JOIN public.team_members tm ON ((tm.admin_id = a.id)))
  WHERE ((p.id = inspections.property_id) AND (tm.profile_id = auth.uid())))));

CREATE POLICY "inspections_postgres_all" ON public.inspections
    FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "inspection_items_access_for_members" ON public.inspection_items
    FOR ALL USING ((EXISTS ( SELECT 1
   FROM (((public.inspections i
     JOIN public.properties p ON ((i.property_id = p.id)))
     JOIN public.admin a ON ((p.admin_id = a.id)))
     JOIN public.team_members tm ON ((tm.admin_id = a.id)))
  WHERE ((i.id = inspection_items.inspection_id) AND (tm.profile_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (((public.inspections i
     JOIN public.properties p ON ((i.property_id = p.id)))
     JOIN public.admin a ON ((p.admin_id = a.id)))
     JOIN public.team_members tm ON ((tm.admin_id = a.id)))
  WHERE ((i.id = inspection_items.inspection_id) AND (tm.profile_id = auth.uid())))));

CREATE POLICY "inspection_items_postgres_all" ON public.inspection_items
    FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "report_service_teams_manage_admins" ON public.report_service_teams
    FOR ALL USING ((EXISTS ( SELECT 1
   FROM public.admin a
  WHERE ((a.id = report_service_teams.admin_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::public.team_member_role, 'admin'::public.team_member_role])))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin a
  WHERE ((a.id = report_service_teams.admin_id) AND ((a.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::public.team_member_role, 'admin'::public.team_member_role]))))))))));

CREATE POLICY "report_service_teams_postgres_all" ON public.report_service_teams
    FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "report_service_teams_select_members" ON public.report_service_teams
    FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin a
  WHERE ((a.id = report_service_teams.admin_id) AND (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.admin_id = a.id) AND (tm.profile_id = auth.uid()))))))));

CREATE POLICY "admin_owner_full_access" ON public.admin
    FOR ALL USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));

CREATE POLICY "admin_postgres_access" ON public.admin
    FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "team_members_admin_manage" ON public.team_members
    FOR ALL USING ((admin_id IN ( SELECT admin.id
   FROM public.admin
  WHERE (admin.owner_id = auth.uid())))) WITH CHECK ((admin_id IN ( SELECT admin.id
   FROM public.admin
  WHERE (admin.owner_id = auth.uid()))));

CREATE POLICY "team_members_own_record" ON public.team_members
    FOR ALL USING ((profile_id = auth.uid())) WITH CHECK ((profile_id = auth.uid()));

CREATE POLICY "team_members_postgres_access" ON public.team_members
    FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK ((auth.uid() = id));

CREATE POLICY "profiles_postgres_all" ON public.profiles
    FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING ((auth.uid() = id));

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));

CREATE POLICY "stripe_customers_postgres_all" ON public.stripe_customers
    FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "stripe_subscriptions_postgres_all" ON public.stripe_subscriptions
    FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "stripe_orders_postgres_all" ON public.stripe_orders
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Create Views
CREATE OR REPLACE VIEW public.user_admin_status AS
 SELECT tm.profile_id,
    tm.admin_id,
    tm.role::text AS role,
    (tm.role = 'owner'::public.team_member_role) AS is_owner,
    a.trial_started_at,
    a.subscription_status,
    a.customer_id,
    (a.subscription_status = ANY (ARRAY['active'::text, 'trialing'::text])) AS has_active_subscription
   FROM (public.team_members tm
     JOIN public.admin a ON ((tm.admin_id = a.id)));

CREATE OR REPLACE VIEW public.stripe_user_subscriptions AS
 SELECT sc.customer_id,
    ss.subscription_id,
    ss.status::text AS subscription_status,
    ss.price_id,
    ss.current_period_start,
    ss.current_period_end,
    ss.cancel_at_period_end,
    ss.payment_method_brand,
    ss.payment_method_last4
   FROM (public.stripe_customers sc
     JOIN public.stripe_subscriptions ss ON ((sc.customer_id = ss.customer_id)));

CREATE OR REPLACE VIEW public.stripe_user_orders AS
 SELECT sc.customer_id,
    so.id AS order_id,
    so.checkout_session_id,
    so.payment_intent_id,
    so.amount_subtotal,
    so.amount_total,
    so.currency,
    so.payment_status,
    so.status::text AS order_status,
    so.created_at AS order_date
   FROM (public.stripe_customers sc
     JOIN public.stripe_orders so ON ((sc.customer_id = so.customer_id)));

-- Create Triggers
CREATE TRIGGER update_template_categories_updated_at
    BEFORE UPDATE ON public.template_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON public.templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_template_items_updated_at
    BEFORE UPDATE ON public.template_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION public.update_properties_updated_at();

CREATE TRIGGER update_property_checklists_updated_at
    BEFORE UPDATE ON public.property_checklists
    FOR EACH ROW EXECUTE FUNCTION public.update_property_checklists_updated_at();

CREATE TRIGGER update_property_checklist_templates_updated_at
    BEFORE UPDATE ON public.property_checklist_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_property_checklist_templates_updated_at();

CREATE TRIGGER update_inspections_updated_at
    BEFORE UPDATE ON public.inspections
    FOR EACH ROW EXECUTE FUNCTION public.update_inspections_updated_at();

CREATE TRIGGER update_inspection_items_updated_at
    BEFORE UPDATE ON public.inspection_items
    FOR EACH ROW EXECUTE FUNCTION public.update_inspection_items_updated_at();

CREATE TRIGGER update_report_service_teams_updated_at
    BEFORE UPDATE ON public.report_service_teams
    FOR EACH ROW EXECUTE FUNCTION public.update_report_service_teams_updated_at();

-- Create Auth Triggers
CREATE TRIGGER on_auth_user_confirmed
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_changes();

CREATE TRIGGER on_email_verified
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW
    WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
    EXECUTE FUNCTION public.handle_email_verification();