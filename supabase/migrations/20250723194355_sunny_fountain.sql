/*
  # Safe Database Migration - Handle Existing Objects

  This migration safely creates all necessary database objects using IF NOT EXISTS
  and CREATE OR REPLACE to handle cases where objects already exist.

  1. Custom Types (with IF NOT EXISTS equivalent)
  2. Functions (with CREATE OR REPLACE)
  3. Tables (with IF NOT EXISTS)
  4. Indexes (with IF NOT EXISTS)
  5. Foreign Keys (with conditional creation)
  6. RLS Policies (with conditional creation)
  7. Triggers (with conditional creation)
*/

-- Create custom types (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_type') THEN
        CREATE TYPE public.inspection_type AS ENUM (
            'check_in',
            'check_out',
            'move_in',
            'move_out'
        );
        COMMENT ON TYPE public.inspection_type IS 'Inspection types: check_in/check_out for STR, move_in/move_out for real estate';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stripe_order_status') THEN
        CREATE TYPE public.stripe_order_status AS ENUM (
            'canceled',
            'completed',
            'pending'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stripe_subscription_status') THEN
        CREATE TYPE public.stripe_subscription_status AS ENUM (
            'active',
            'canceled',
            'incomplete',
            'incomplete_expired',
            'not_started',
            'past_due',
            'paused',
            'trialing',
            'unpaid'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_member_role') THEN
        CREATE TYPE public.team_member_role AS ENUM (
            'admin',
            'member',
            'owner'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'template_item_type') THEN
        CREATE TYPE public.template_item_type AS ENUM (
            'divider',
            'multiple_choice',
            'photo',
            'section',
            'single_choice',
            'text'
        );
        COMMENT ON TYPE public.template_item_type IS 'Type of template item: text, single_choice, multiple_choice, photo, section, or divider';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_status') THEN
        CREATE TYPE public.inspection_status AS ENUM (
            'canceled',
            'completed',
            'in_progress'
        );
    END IF;
END $$;

-- Create trigger functions (using CREATE OR REPLACE)
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

CREATE OR REPLACE FUNCTION public.update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CRITICAL: Create the missing handle_new_user function
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
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = now();

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
        ON CONFLICT (owner_id) DO UPDATE SET
            company_name = EXCLUDED.company_name,
            updated_at = now()
        RETURNING id INTO admin_record_id;

        -- Get the admin_record_id if it was an update
        IF admin_record_id IS NULL THEN
            SELECT id INTO admin_record_id FROM public.admin WHERE owner_id = NEW.id;
        END IF;

        -- Create team member record
        INSERT INTO public.team_members (admin_id, profile_id, role)
        VALUES (admin_record_id, NEW.id, 'owner')
        ON CONFLICT (admin_id, profile_id) DO NOTHING;
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
            trial_ends_at = NULL,
            updated_at = now()
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

-- Create tables (using IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.admin (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL UNIQUE,
    billing_manager_id uuid,
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

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY NOT NULL,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    role team_member_role DEFAULT 'owner',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(admin_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.properties (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    type text NOT NULL CHECK (type = ANY (ARRAY['apartment'::text, 'house'::text, 'villa'::text, 'condo'::text])),
    bedrooms text NOT NULL CHECK (bedrooms = ANY (ARRAY['studio'::text, '1'::text, '2'::text, '3'::text, '4'::text, '5+'::text])),
    bathrooms text NOT NULL CHECK (bathrooms = ANY (ARRAY['1'::text, '2'::text, '3'::text, '4'::text, '5'::text, '6+'::text])),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.template_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL,
    category_id uuid,
    name text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.template_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid NOT NULL,
    parent_id uuid,
    type template_item_type NOT NULL,
    label text NOT NULL,
    section_name text,
    required boolean DEFAULT false,
    options jsonb,
    report_enabled boolean DEFAULT false,
    maintenance_email text,
    report_recipient_id uuid,
    "order" integer NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CHECK (id <> parent_id)
);

CREATE TABLE IF NOT EXISTS public.report_service_teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL,
    designation text NOT NULL,
    email text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(admin_id, designation)
);

CREATE TABLE IF NOT EXISTS public.property_checklists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_checklist_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_checklist_id uuid NOT NULL,
    template_id uuid NOT NULL,
    order_index integer NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(property_checklist_id, template_id)
);

CREATE TABLE IF NOT EXISTS public.inspections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL,
    property_checklist_id uuid,
    inspector_id uuid NOT NULL,
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

-- Add comments for inspection columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_description d 
        JOIN pg_class c ON d.objoid = c.oid 
        JOIN pg_attribute a ON c.oid = a.attrelid AND d.objsubid = a.attnum
        WHERE c.relname = 'inspections' AND a.attname = 'primary_contact_name'
    ) THEN
        COMMENT ON COLUMN public.inspections.primary_contact_name IS 'Contact name - Guest name for STR, Client name for real estate';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_description d 
        JOIN pg_class c ON d.objoid = c.oid 
        JOIN pg_attribute a ON c.oid = a.attrelid AND d.objsubid = a.attnum
        WHERE c.relname = 'inspections' AND a.attname = 'primary_contact_signature_url'
    ) THEN
        COMMENT ON COLUMN public.inspections.primary_contact_signature_url IS 'Primary contact signature URL - Guest or client signature';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_description d 
        JOIN pg_class c ON d.objoid = c.oid 
        JOIN pg_attribute a ON c.oid = a.attrelid AND d.objsubid = a.attnum
        WHERE c.relname = 'inspections' AND a.attname = 'client_present_for_signature'
    ) THEN
        COMMENT ON COLUMN public.inspections.client_present_for_signature IS 'Whether client is present and signature is required (real estate only)';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.inspection_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id uuid NOT NULL,
    template_item_id uuid NOT NULL,
    value jsonb,
    notes text,
    photo_urls text[],
    order_index integer NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id uuid NOT NULL,
    report_url text NOT NULL,
    report_type text,
    generated_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stripe_customers (
    id bigint PRIMARY KEY NOT NULL,
    user_id uuid NOT NULL UNIQUE,
    customer_id text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.stripe_subscriptions (
    id bigint PRIMARY KEY NOT NULL,
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

CREATE TABLE IF NOT EXISTS public.stripe_orders (
    id bigint PRIMARY KEY NOT NULL,
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

-- Create views (using CREATE OR REPLACE)
CREATE OR REPLACE VIEW public.user_admin_status AS
SELECT 
    tm.profile_id,
    tm.admin_id,
    tm.role,
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

CREATE OR REPLACE VIEW public.stripe_user_subscriptions AS
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

CREATE OR REPLACE VIEW public.stripe_user_orders AS
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

-- Create indexes (using IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_admin_owner_id ON public.admin USING btree (owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_admin_id ON public.properties USING btree (admin_id);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_type ON public.properties USING btree (type);
CREATE INDEX IF NOT EXISTS idx_templates_admin_id ON public.templates USING btree (admin_id);
CREATE INDEX IF NOT EXISTS idx_templates_category_id ON public.templates USING btree (category_id);
CREATE INDEX IF NOT EXISTS idx_template_categories_admin_id ON public.template_categories USING btree (admin_id);
CREATE INDEX IF NOT EXISTS idx_template_items_template_id ON public.template_items USING btree (template_id);
CREATE INDEX IF NOT EXISTS idx_template_items_parent_id ON public.template_items USING btree (parent_id);
CREATE INDEX IF NOT EXISTS idx_template_items_type ON public.template_items USING btree (type);
CREATE INDEX IF NOT EXISTS idx_template_items_order ON public.template_items USING btree ("order");
CREATE INDEX IF NOT EXISTS idx_template_items_report_recipient_id ON public.template_items USING btree (report_recipient_id);
CREATE INDEX IF NOT EXISTS idx_template_items_hierarchy ON public.template_items USING btree (template_id, parent_id, "order");
CREATE INDEX IF NOT EXISTS idx_template_items_order_scoped ON public.template_items USING btree (template_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), "order");
CREATE INDEX IF NOT EXISTS idx_template_items_order_fallback ON public.template_items USING btree ("order") WHERE (parent_id IS NULL);
CREATE INDEX IF NOT EXISTS idx_report_service_teams_admin_id ON public.report_service_teams USING btree (admin_id);
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
CREATE INDEX IF NOT EXISTS idx_reports_inspection_id ON public.reports USING btree (inspection_id);
CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON public.reports USING btree (generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles USING btree (id);
CREATE INDEX IF NOT EXISTS idx_user_admin_status_admin_id ON public.team_members USING btree (admin_id);
CREATE INDEX IF NOT EXISTS idx_user_admin_status_profile_id ON public.team_members USING btree (profile_id);

-- Add foreign key constraints (conditionally)
DO $$
BEGIN
    -- admin table foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_owner_id_fkey') THEN
        ALTER TABLE public.admin ADD CONSTRAINT admin_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_billing_manager_id_fkey') THEN
        ALTER TABLE public.admin ADD CONSTRAINT admin_billing_manager_id_fkey FOREIGN KEY (billing_manager_id) REFERENCES public.profiles(id);
    END IF;
    
    -- profiles table foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);
    END IF;
    
    -- team_members table foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_members_admin_id_fkey') THEN
        ALTER TABLE public.team_members ADD CONSTRAINT team_members_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_members_profile_id_fkey') THEN
        ALTER TABLE public.team_members ADD CONSTRAINT team_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id);
    END IF;
    
    -- properties table foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'properties_admin_id_fkey') THEN
        ALTER TABLE public.properties ADD CONSTRAINT properties_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin(id) ON DELETE CASCADE;
    END IF;
    
    -- template_categories table foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'template_categories_admin_id_fkey') THEN
        ALTER TABLE public.template_categories ADD CONSTRAINT template_categories_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin(id);
    END IF;
    
    -- templates table foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'templates_admin_id_fkey') THEN
        ALTER TABLE public.templates ADD CONSTRAINT templates_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'templates_category_id_fkey') THEN
        ALTER TABLE public.templates ADD CONSTRAINT templates_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.template_categories(id);
    END IF;
    
    -- template_items table foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'template_items_template_id_fkey') THEN
        ALTER TABLE public.template_items ADD CONSTRAINT template_items_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'template_items_parent_id_fkey') THEN
        ALTER TABLE public.template_items ADD CONSTRAINT template_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.template_items(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'template_items_report_recipient_id_fkey') THEN
        ALTER TABLE public.template_items ADD CONSTRAINT template_items_report_recipient_id_fkey FOREIGN KEY (report_recipient_id) REFERENCES public.report_service_teams(id) ON DELETE SET NULL;
    END IF;
    
    -- report_service_teams table foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'report_service_teams_admin_id_fkey') THEN
        ALTER TABLE public.report_service_teams ADD CONSTRAINT report_service_teams_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin(id) ON DELETE CASCADE;
    END IF;
    
    -- property_checklists table foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_checklists_property_id_fkey') THEN
        ALTER TABLE public.property_checklists ADD CONSTRAINT property_checklists_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
    END IF;
    
    -- property_checklist_templates table foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_checklist_templates_property_checklist_id_fkey') THEN
        ALTER TABLE public.property_checklist_templates ADD CONSTRAINT property_checklist_templates_property_checklist_id_fkey FOREIGN KEY (property_checklist_id) REFERENCES public.property_checklists(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_checklist_templates_template_id_fkey') THEN
        ALTER TABLE public.property_checklist_templates ADD CONSTRAINT property_checklist_templates_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;
    END IF;
    
    -- inspections table foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inspections_property_id_fkey') THEN
        ALTER TABLE public.inspections ADD CONSTRAINT inspections_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inspections_inspector_id_fkey') THEN
        ALTER TABLE public.inspections ADD CONSTRAINT inspections_inspector_id_fkey FOREIGN KEY (inspector_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inspections_property_checklist_id_fkey') THEN
        ALTER TABLE public.inspections ADD CONSTRAINT inspections_property_checklist_id_fkey FOREIGN KEY (property_checklist_id) REFERENCES public.property_checklists(id);
    END IF;
    
    -- inspection_items table foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inspection_items_inspection_id_fkey') THEN
        ALTER TABLE public.inspection_items ADD CONSTRAINT inspection_items_inspection_id_fkey FOREIGN KEY (inspection_id) REFERENCES public.inspections(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inspection_items_template_item_id_fkey') THEN
        ALTER TABLE public.inspection_items ADD CONSTRAINT inspection_items_template_item_id_fkey FOREIGN KEY (template_item_id) REFERENCES public.template_items(id) ON DELETE CASCADE;
    END IF;
    
    -- reports table foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reports_inspection_id_fkey') THEN
        ALTER TABLE public.reports ADD CONSTRAINT reports_inspection_id_fkey FOREIGN KEY (inspection_id) REFERENCES public.inspections(id) ON DELETE CASCADE;
    END IF;
    
    -- stripe_customers table foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stripe_customers_user_id_fkey') THEN
        ALTER TABLE public.stripe_customers ADD CONSTRAINT stripe_customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
    END IF;
END $$;

-- Enable Row Level Security (conditionally)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'admin' AND rowsecurity = true) THEN
        ALTER TABLE public.admin ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles' AND rowsecurity = true) THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'team_members' AND rowsecurity = true) THEN
        ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'properties' AND rowsecurity = true) THEN
        ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'template_categories' AND rowsecurity = true) THEN
        ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'templates' AND rowsecurity = true) THEN
        ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'template_items' AND rowsecurity = true) THEN
        ALTER TABLE public.template_items ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'report_service_teams' AND rowsecurity = true) THEN
        ALTER TABLE public.report_service_teams ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'property_checklists' AND rowsecurity = true) THEN
        ALTER TABLE public.property_checklists ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'property_checklist_templates' AND rowsecurity = true) THEN
        ALTER TABLE public.property_checklist_templates ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'inspections' AND rowsecurity = true) THEN
        ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'inspection_items' AND rowsecurity = true) THEN
        ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'reports' AND rowsecurity = true) THEN
        ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'stripe_customers' AND rowsecurity = true) THEN
        ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'stripe_subscriptions' AND rowsecurity = true) THEN
        ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'stripe_orders' AND rowsecurity = true) THEN
        ALTER TABLE public.stripe_orders ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create RLS policies (conditionally)
DO $$
BEGIN
    -- Admin policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin' AND policyname = 'admin_owner_full_access') THEN
        CREATE POLICY admin_owner_full_access ON public.admin
            FOR ALL TO authenticated
            USING (owner_id = auth.uid())
            WITH CHECK (owner_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin' AND policyname = 'admin_postgres_access') THEN
        CREATE POLICY admin_postgres_access ON public.admin
            FOR ALL TO postgres
            USING (true)
            WITH CHECK (true);
    END IF;
    
    -- Profiles policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_insert_own') THEN
        CREATE POLICY profiles_insert_own ON public.profiles
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select_own') THEN
        CREATE POLICY profiles_select_own ON public.profiles
            FOR SELECT TO authenticated
            USING (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_update_own') THEN
        CREATE POLICY profiles_update_own ON public.profiles
            FOR UPDATE TO authenticated
            USING (auth.uid() = id)
            WITH CHECK (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_postgres_all') THEN
        CREATE POLICY profiles_postgres_all ON public.profiles
            FOR ALL TO postgres
            USING (true)
            WITH CHECK (true);
    END IF;
    
    -- Team members policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'team_members_admin_manage') THEN
        CREATE POLICY team_members_admin_manage ON public.team_members
            FOR ALL TO authenticated
            USING (admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid()))
            WITH CHECK (admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'team_members_own_record') THEN
        CREATE POLICY team_members_own_record ON public.team_members
            FOR ALL TO authenticated
            USING (profile_id = auth.uid())
            WITH CHECK (profile_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'team_members_postgres_access') THEN
        CREATE POLICY team_members_postgres_access ON public.team_members
            FOR ALL TO postgres
            USING (true)
            WITH CHECK (true);
    END IF;
    
    -- Properties policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'properties' AND policyname = 'properties_manage_admins') THEN
        CREATE POLICY properties_manage_admins ON public.properties
            FOR ALL TO authenticated
            USING (EXISTS (
                SELECT 1 FROM admin a
                WHERE a.id = properties.admin_id
                AND (a.owner_id = auth.uid() OR EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.admin_id = a.id
                    AND tm.profile_id = auth.uid()
                    AND tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role])
                ))
            ))
            WITH CHECK (EXISTS (
                SELECT 1 FROM admin a
                WHERE a.id = properties.admin_id
                AND (a.owner_id = auth.uid() OR EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.admin_id = a.id
                    AND tm.profile_id = auth.uid()
                    AND tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role])
                ))
            ));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'properties' AND policyname = 'properties_select_members') THEN
        CREATE POLICY properties_select_members ON public.properties
            FOR SELECT TO authenticated
            USING (EXISTS (
                SELECT 1 FROM admin a
                WHERE a.id = properties.admin_id
                AND EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.admin_id = a.id
                    AND tm.profile_id = auth.uid()
                )
            ));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'properties' AND policyname = 'properties_postgres_all') THEN
        CREATE POLICY properties_postgres_all ON public.properties
            FOR ALL TO postgres
            USING (true)
            WITH CHECK (true);
    END IF;
    
    -- Templates policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'templates_manage_admins') THEN
        CREATE POLICY templates_manage_admins ON public.templates
            FOR ALL TO authenticated
            USING (EXISTS (
                SELECT 1 FROM admin a
                WHERE a.id = templates.admin_id
                AND (a.owner_id = auth.uid() OR EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.admin_id = a.id
                    AND tm.profile_id = auth.uid()
                    AND tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role])
                ))
            ))
            WITH CHECK (EXISTS (
                SELECT 1 FROM admin a
                WHERE a.id = templates.admin_id
                AND (a.owner_id = auth.uid() OR EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.admin_id = a.id
                    AND tm.profile_id = auth.uid()
                    AND tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role])
                ))
            ));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'templates_select_members') THEN
        CREATE POLICY templates_select_members ON public.templates
            FOR SELECT TO authenticated
            USING (EXISTS (
                SELECT 1 FROM admin a
                WHERE a.id = templates.admin_id
                AND EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.admin_id = a.id
                    AND tm.profile_id = auth.uid()
                )
            ));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'templates_postgres_all') THEN
        CREATE POLICY templates_postgres_all ON public.templates
            FOR ALL TO postgres
            USING (true)
            WITH CHECK (true);
    END IF;
    
    -- Template items policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_items' AND policyname = 'template_items_manage_admins') THEN
        CREATE POLICY template_items_manage_admins ON public.template_items
            FOR ALL TO authenticated
            USING (EXISTS (
                SELECT 1 FROM templates t
                JOIN admin a ON t.admin_id = a.id
                WHERE t.id = template_items.template_id
                AND (a.owner_id = auth.uid() OR EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.admin_id = a.id
                    AND tm.profile_id = auth.uid()
                    AND tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role])
                ))
            ))
            WITH CHECK (EXISTS (
                SELECT 1 FROM templates t
                JOIN admin a ON t.admin_id = a.id
                WHERE t.id = template_items.template_id
                AND (a.owner_id = auth.uid() OR EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.admin_id = a.id
                    AND tm.profile_id = auth.uid()
                    AND tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role])
                ))
            ));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_items' AND policyname = 'template_items_select_members') THEN
        CREATE POLICY template_items_select_members ON public.template_items
            FOR SELECT TO authenticated
            USING (EXISTS (
                SELECT 1 FROM templates t
                JOIN admin a ON t.admin_id = a.id
                WHERE t.id = template_items.template_id
                AND EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.admin_id = a.id
                    AND tm.profile_id = auth.uid()
                )
            ));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_items' AND policyname = 'template_items_postgres_all') THEN
        CREATE POLICY template_items_postgres_all ON public.template_items
            FOR ALL TO postgres
            USING (true)
            WITH CHECK (true);
    END IF;
    
    -- Template categories policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_categories' AND policyname = 'template_categories_manage_admins') THEN
        CREATE POLICY template_categories_manage_admins ON public.template_categories
            FOR ALL TO authenticated
            USING (EXISTS (
                SELECT 1 FROM admin a
                WHERE a.id = template_categories.admin_id
                AND (a.owner_id = auth.uid() OR EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.admin_id = a.id
                    AND tm.profile_id = auth.uid()
                    AND tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role])
                ))
            ))
            WITH CHECK (EXISTS (
                SELECT 1 FROM admin a
                WHERE a.id = template_categories.admin_id
                AND (a.owner_id = auth.uid() OR EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.admin_id = a.id
                    AND tm.profile_id = auth.uid()
                    AND tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role])
                ))
            ));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_categories' AND policyname = 'template_categories_select_members') THEN
        CREATE POLICY template_categories_select_members ON public.template_categories
            FOR SELECT TO authenticated
            USING (EXISTS (
                SELECT 1 FROM admin a
                WHERE a.id = template_categories.admin_id
                AND EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.admin_id = a.id
                    AND tm.profile_id = auth.uid()
                )
            ));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_categories' AND policyname = 'template_categories_postgres_all') THEN
        CREATE POLICY template_categories_postgres_all ON public.template_categories
            FOR ALL TO postgres
            USING (true)
            WITH CHECK (true);
    END IF;
    
    -- Report service teams policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_service_teams' AND policyname = 'report_service_teams_manage_admins') THEN
        CREATE POLICY report_service_teams_manage_admins ON public.report_service_teams
            FOR ALL TO authenticated
            USING (EXISTS (
                SELECT 1 FROM admin a
                WHERE a.id = report_service_teams.admin_id
                AND (a.owner_id = auth.uid() OR EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.admin_id = a.id
                    AND tm.profile_id = auth.uid()
                    AND tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role])
                ))
            ))
            WITH CHECK (EXISTS (
                SELECT 1 FROM admin a
                WHERE a.id = report_service_teams.admin_id
                AND (a.owner_id = auth.uid() OR EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.admin_id = a.id
                    AND tm.profile_id = auth.uid()
                    AND tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role])
                ))
            ));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_service_teams' AND policyname = 'report_service_teams_select_members') THEN
        CREATE POLICY report_service_teams_select_members ON public.report_service_teams
            FOR SELECT TO authenticated
            USING (EXISTS (
                SELECT 1 FROM admin a
                WHERE a.id = report_service_teams.admin_id
                AND EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.admin_id = a.id
                    AND tm.profile_id = auth.uid()
                )
            ));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_service_teams' AND policyname = 'report_service_teams_postgres_all') THEN
        CREATE POLICY report_service_teams_postgres_all ON public.report_service_teams
            FOR ALL TO postgres
            USING (true)
            WITH CHECK (true);
    END IF;
    
    -- Property checklists policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_checklists' AND policyname = 'property_checklists_manage_admins') THEN
        CREATE POLICY property_checklists_manage_admins ON public.property_checklists
            FOR ALL TO authenticated
            USING (EXISTS (
                SELECT 1 FROM properties p
                JOIN admin a ON p.admin_id = a.id
                WHERE p.id = property_checklists.property_id
                AND (a.owner_id = auth.uid() OR EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.admin_id = a.id
                    AND tm.profile_id = auth.uid()
                    AND tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role])
                ))
            ))
            WITH CHECK (EXISTS (
                SELECT 1 FROM properties p
                JOIN admin a ON p.admin_id = a.id
                WHERE p.id = property_checklists.property_id
                AND (a.owner_id = auth.uid() OR EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.admin_id = a.id
                    AND tm.profile_id = auth.uid()
                    AND tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role])
                ))
            ));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_checklists' AND policyname = 'property_checklists_select_members') THEN
        CREATE POLICY property_checklists_select_members ON public.property_checklists
            FOR SELECT TO authenticated
            USING (EXISTS (
                SELECT 1 FROM properties p
                JOIN admin a ON p.admin_id = a.id
                WHERE p.id = property_checklists.property_id
                AND EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.admin_id = a.id
                    AND tm.profile_id = auth.uid()
                )
            ));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_checklists' AND policyname = 'property_checklists_postgres_all') THEN
        CREATE POLICY property_checklists_postgres_all ON public.property_checklists
            FOR ALL TO postgres
            USING (true)
            WITH CHECK (true);
    END IF;
    
    -- Property checklist templates policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_checklist_templates' AND policyname = 'property_checklist_templates_access_for_members') THEN
        CREATE POLICY property_checklist_templates_access_for_members ON public.property_checklist_templates
            FOR ALL TO authenticated
            USING (EXISTS (
                SELECT 1 FROM property_checklists pc
                JOIN properties p ON pc.property_id = p.id
                JOIN team_members tm ON tm.admin_id = p.admin_id
                WHERE pc.id = property_checklist_templates.property_checklist_id
                AND tm.profile_id = auth.uid()
            ))
            WITH CHECK (EXISTS (
                SELECT 1 FROM property_checklists pc
                JOIN properties p ON pc.property_id = p.id
                JOIN team_members tm ON tm.admin_id = p.admin_id
                WHERE pc.id = property_checklist_templates.property_checklist_id
                AND tm.profile_id = auth.uid()
            ));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_checklist_templates' AND policyname = 'property_checklist_templates_postgres_all') THEN
        CREATE POLICY property_checklist_templates_postgres_all ON public.property_checklist_templates
            FOR ALL TO postgres
            USING (true)
            WITH CHECK (true);
    END IF;
    
    -- Inspections policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspections' AND policyname = 'inspections_access_for_members') THEN
        CREATE POLICY inspections_access_for_members ON public.inspections
            FOR ALL TO authenticated
            USING (EXISTS (
                SELECT 1 FROM properties p
                JOIN admin a ON p.admin_id = a.id
                JOIN team_members tm ON tm.admin_id = a.id
                WHERE p.id = inspections.property_id
                AND tm.profile_id = auth.uid()
            ))
            WITH CHECK (EXISTS (
                SELECT 1 FROM properties p
                JOIN admin a ON p.admin_id = a.id
                JOIN team_members tm ON tm.admin_id = a.id
                WHERE p.id = inspections.property_id
                AND tm.profile_id = auth.uid()
            ));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspections' AND policyname = 'inspections_postgres_all') THEN
        CREATE POLICY inspections_postgres_all ON public.inspections
            FOR ALL TO postgres
            USING (true)
            WITH CHECK (true);
    END IF;
    
    -- Inspection items policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspection_items' AND policyname = 'inspection_items_access_for_members') THEN
        CREATE POLICY inspection_items_access_for_members ON public.inspection_items
            FOR ALL TO authenticated
            USING (EXISTS (
                SELECT 1 FROM inspections i
                JOIN properties p ON i.property_id = p.id
                JOIN admin a ON p.admin_id = a.id
                JOIN team_members tm ON tm.admin_id = a.id
                WHERE i.id = inspection_items.inspection_id
                AND tm.profile_id = auth.uid()
            ))
            WITH CHECK (EXISTS (
                SELECT 1 FROM inspections i
                JOIN properties p ON i.property_id = p.id
                JOIN admin a ON p.admin_id = a.id
                JOIN team_members tm ON tm.admin_id = a.id
                WHERE i.id = inspection_items.inspection_id
                AND tm.profile_id = auth.uid()
            ));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspection_items' AND policyname = 'inspection_items_postgres_all') THEN
        CREATE POLICY inspection_items_postgres_all ON public.inspection_items
            FOR ALL TO postgres
            USING (true)
            WITH CHECK (true);
    END IF;
    
    -- Reports policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reports' AND policyname = 'reports_manage_admins') THEN
        CREATE POLICY reports_manage_admins ON public.reports
            FOR ALL TO authenticated
            USING (EXISTS (
                SELECT 1 FROM inspections i
                JOIN properties p ON i.property_id = p.id
                WHERE i.id = reports.inspection_id
                AND EXISTS (
                    SELECT 1 FROM admin a
                    WHERE a.id = p.admin_id
                    AND (a.owner_id = auth.uid() OR EXISTS (
                        SELECT 1 FROM team_members tm
                        WHERE tm.admin_id = a.id
                        AND tm.profile_id = auth.uid()
                    ))
                )
            ))
            WITH CHECK (EXISTS (
                SELECT 1 FROM inspections i
                JOIN properties p ON i.property_id = p.id
                WHERE i.id = reports.inspection_id
                AND EXISTS (
                    SELECT 1 FROM admin a
                    WHERE a.id = p.admin_id
                    AND (a.owner_id = auth.uid() OR EXISTS (
                        SELECT 1 FROM team_members tm
                        WHERE tm.admin_id = a.id
                        AND tm.profile_id = auth.uid()
                    ))
                )
            ));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reports' AND policyname = 'reports_postgres_all') THEN
        CREATE POLICY reports_postgres_all ON public.reports
            FOR ALL TO postgres
            USING (true)
            WITH CHECK (true);
    END IF;
    
    -- Stripe tables policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stripe_customers' AND policyname = 'stripe_customers_postgres_all') THEN
        CREATE POLICY stripe_customers_postgres_all ON public.stripe_customers
            FOR ALL TO postgres
            USING (true)
            WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stripe_subscriptions' AND policyname = 'stripe_subscriptions_postgres_all') THEN
        CREATE POLICY stripe_subscriptions_postgres_all ON public.stripe_subscriptions
            FOR ALL TO postgres
            USING (true)
            WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stripe_orders' AND policyname = 'stripe_orders_postgres_all') THEN
        CREATE POLICY stripe_orders_postgres_all ON public.stripe_orders
            FOR ALL TO postgres
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- Create triggers (conditionally)
DO $$
BEGIN
    -- Update triggers
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_report_service_teams_updated_at') THEN
        CREATE TRIGGER update_report_service_teams_updated_at
            BEFORE UPDATE ON public.report_service_teams
            FOR EACH ROW
            EXECUTE FUNCTION public.update_report_service_teams_updated_at();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_template_items_updated_at') THEN
        CREATE TRIGGER update_template_items_updated_at
            BEFORE UPDATE ON public.template_items
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_properties_updated_at') THEN
        CREATE TRIGGER update_properties_updated_at
            BEFORE UPDATE ON public.properties
            FOR EACH ROW
            EXECUTE FUNCTION public.update_properties_updated_at();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_template_categories_updated_at') THEN
        CREATE TRIGGER update_template_categories_updated_at
            BEFORE UPDATE ON public.template_categories
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_templates_updated_at') THEN
        CREATE TRIGGER update_templates_updated_at
            BEFORE UPDATE ON public.templates
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_property_checklists_updated_at') THEN
        CREATE TRIGGER update_property_checklists_updated_at
            BEFORE UPDATE ON public.property_checklists
            FOR EACH ROW
            EXECUTE FUNCTION public.update_property_checklists_updated_at();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_property_checklist_templates_updated_at') THEN
        CREATE TRIGGER update_property_checklist_templates_updated_at
            BEFORE UPDATE ON public.property_checklist_templates
            FOR EACH ROW
            EXECUTE FUNCTION public.update_property_checklist_templates_updated_at();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_inspections_updated_at') THEN
        CREATE TRIGGER update_inspections_updated_at
            BEFORE UPDATE ON public.inspections
            FOR EACH ROW
            EXECUTE FUNCTION public.update_inspections_updated_at();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_inspection_items_updated_at') THEN
        CREATE TRIGGER update_inspection_items_updated_at
            BEFORE UPDATE ON public.inspection_items
            FOR EACH ROW
            EXECUTE FUNCTION public.update_inspection_items_updated_at();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_reports_updated_at') THEN
        CREATE TRIGGER update_reports_updated_at
            BEFORE UPDATE ON public.reports
            FOR EACH ROW
            EXECUTE FUNCTION public.update_reports_updated_at();
    END IF;
    
    -- Auth triggers (CRITICAL for user registration)
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_verified') THEN
        CREATE TRIGGER on_auth_user_verified
            AFTER UPDATE OF email_confirmed_at ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_email_verification();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_updated') THEN
        CREATE TRIGGER on_auth_user_updated
            AFTER UPDATE ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_auth_user_changes();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;