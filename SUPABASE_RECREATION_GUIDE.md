# Complete Supabase Database Recreation Guide

## Overview
This guide will help you recreate the scopoStay Supabase database schema and configuration in a new project. The system includes property inspection management with Stripe integration, user authentication, and comprehensive RLS policies.

## 1. Database Schema

### Core Tables

#### 1.1 Authentication & User Management

**profiles**
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**admin**
```sql
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
```

**team_members**
```sql
CREATE TYPE team_member_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id),
  profile_id uuid NOT NULL REFERENCES profiles(id),
  role team_member_role DEFAULT 'owner',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 1.2 Property Management

**properties**
```sql
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
```

#### 1.3 Template System

**template_categories**
```sql
CREATE TABLE template_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**templates**
```sql
CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id),
  category_id uuid REFERENCES template_categories(id),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**template_items**
```sql
CREATE TYPE template_item_type AS ENUM ('text', 'single_choice', 'multiple_choice', 'photo', 'section', 'divider');

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
```

**report_service_teams**
```sql
CREATE TABLE report_service_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
  designation text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 1.4 Property Checklists

**property_checklists**
```sql
CREATE TABLE property_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**property_checklist_templates**
```sql
CREATE TABLE property_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_checklist_id uuid NOT NULL REFERENCES property_checklists(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 1.5 Inspection System

**inspections**
```sql
CREATE TYPE inspection_type AS ENUM ('check_in', 'check_out', 'move_in', 'move_out');
CREATE TYPE inspection_status AS ENUM ('in_progress', 'completed', 'canceled');

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
```

**inspection_items**
```sql
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
```

#### 1.6 Reports

**reports**
```sql
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  report_url text NOT NULL,
  report_type text NOT NULL,
  generated_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 1.7 Stripe Integration

**stripe_customers**
```sql
CREATE TABLE stripe_customers (
  id bigint NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  customer_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
```

**stripe_subscriptions**
```sql
CREATE TYPE stripe_subscription_status AS ENUM ('active', 'canceled', 'incomplete', 'incomplete_expired', 'not_started', 'past_due', 'paused', 'trialing', 'unpaid');

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
```

**stripe_orders**
```sql
CREATE TYPE stripe_order_status AS ENUM ('canceled', 'completed', 'pending');

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
```

## 2. Indexes

```sql
-- Admin indexes
CREATE INDEX idx_admin_owner_id ON admin(owner_id);

-- Properties indexes
CREATE INDEX idx_properties_admin_id ON properties(admin_id);
CREATE INDEX idx_properties_type ON properties(type);
CREATE INDEX idx_properties_created_at ON properties(created_at DESC);

-- Template indexes
CREATE INDEX idx_template_categories_admin_id ON template_categories(admin_id);
CREATE INDEX idx_templates_admin_id ON templates(admin_id);
CREATE INDEX idx_templates_category_id ON templates(category_id);

-- Template items indexes
CREATE INDEX idx_template_items_template_id ON template_items(template_id);
CREATE INDEX idx_template_items_parent_id ON template_items(parent_id);
CREATE INDEX idx_template_items_type ON template_items(type);
CREATE INDEX idx_template_items_order ON template_items("order");
CREATE INDEX idx_template_items_report_recipient_id ON template_items(report_recipient_id);
CREATE INDEX idx_template_items_hierarchy ON template_items(template_id, parent_id, "order");
CREATE INDEX idx_template_items_order_scoped ON template_items(template_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), "order");

-- Report service teams indexes
CREATE INDEX idx_report_service_teams_admin_id ON report_service_teams(admin_id);

-- Property checklists indexes
CREATE INDEX idx_property_checklists_property_id ON property_checklists(property_id);
CREATE INDEX idx_property_checklists_active ON property_checklists(is_active);
CREATE INDEX idx_property_checklist_templates_checklist_id ON property_checklist_templates(property_checklist_id);
CREATE INDEX idx_property_checklist_templates_order ON property_checklist_templates(order_index);

-- Inspections indexes
CREATE INDEX idx_inspections_property_id ON inspections(property_id);
CREATE INDEX idx_inspections_inspector_id ON inspections(inspector_id);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_created_at ON inspections(created_at DESC);

-- Inspection items indexes
CREATE INDEX idx_inspection_items_inspection_id ON inspection_items(inspection_id);
CREATE INDEX idx_inspection_items_template_item_id ON inspection_items(template_item_id);
CREATE INDEX idx_inspection_items_order ON inspection_items(order_index);

-- Reports indexes
CREATE INDEX idx_reports_inspection_id ON reports(inspection_id);
CREATE INDEX idx_reports_generated_at ON reports(generated_at DESC);

-- Team members indexes
CREATE INDEX idx_user_admin_status_admin_id ON team_members(admin_id);
CREATE INDEX idx_user_admin_status_profile_id ON team_members(profile_id);

-- Profiles indexes
CREATE INDEX idx_profiles_id ON profiles(id);
```

## 3. Database Functions

### 3.1 Updated Timestamp Function
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

### 3.2 New User Handler
```sql
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
```

### 3.3 Email Verification Handler
```sql
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
```

## 4. Triggers

```sql
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

CREATE TRIGGER update_report_service_teams_updated_at
  BEFORE UPDATE ON report_service_teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_checklists_updated_at
  BEFORE UPDATE ON property_checklists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_checklist_templates_updated_at
  BEFORE UPDATE ON property_checklist_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspections_updated_at
  BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspection_items_updated_at
  BEFORE UPDATE ON inspection_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auth triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_email_verification();
```

## 5. Row Level Security (RLS) Policies

### 5.1 Enable RLS on all tables
```sql
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
```

### 5.2 Profiles Policies
```sql
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_postgres_all" ON profiles
  FOR ALL TO postgres
  USING (true)
  WITH CHECK (true);
```

### 5.3 Admin Policies
```sql
CREATE POLICY "admin_owner_full_access" ON admin
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "admin_postgres_access" ON admin
  FOR ALL TO postgres
  USING (true)
  WITH CHECK (true);
```

### 5.4 Team Members Policies
```sql
CREATE POLICY "team_members_own_record" ON team_members
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "team_members_admin_manage" ON team_members
  FOR ALL TO authenticated
  USING (admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid()))
  WITH CHECK (admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid()));

CREATE POLICY "team_members_postgres_access" ON team_members
  FOR ALL TO postgres
  USING (true)
  WITH CHECK (true);
```

### 5.5 Templates Policies
```sql
CREATE POLICY "templates_manage_admins" ON templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a
      WHERE a.id = templates.admin_id
      AND (
        a.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.admin_id = a.id
          AND tm.profile_id = auth.uid()
          AND tm.role = ANY (ARRAY['owner', 'admin'])
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin a
      WHERE a.id = templates.admin_id
      AND (
        a.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.admin_id = a.id
          AND tm.profile_id = auth.uid()
          AND tm.role = ANY (ARRAY['owner', 'admin'])
        )
      )
    )
  );

CREATE POLICY "templates_postgres_all" ON templates
  FOR ALL TO postgres
  USING (true)
  WITH CHECK (true);

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
```

### 5.6 Similar Policies for Other Tables
Apply similar patterns for:
- template_items
- properties
- property_checklists
- property_checklist_templates
- inspections
- inspection_items
- reports
- report_service_teams

### 5.7 Stripe Tables Policies
```sql
CREATE POLICY "stripe_customers_postgres_all" ON stripe_customers
  FOR ALL TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "stripe_subscriptions_postgres_all" ON stripe_subscriptions
  FOR ALL TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "stripe_orders_postgres_all" ON stripe_orders
  FOR ALL TO postgres
  USING (true)
  WITH CHECK (true);
```

## 6. Views

### 6.1 User Admin Status View
```sql
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
```

### 6.2 Stripe User Views
```sql
CREATE VIEW stripe_user_subscriptions AS
SELECT 
  sc.customer_id,
  ss.subscription_id,
  ss.subscription_status,
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
```

## 7. Edge Functions

### 7.1 Stripe Checkout Function
Create in Supabase Dashboard: `stripe-checkout`
- Handles subscription creation with 14-day trials
- Creates Stripe customers and checkout sessions
- Updates admin records with customer IDs

### 7.2 Stripe Webhook Function
Create in Supabase Dashboard: `stripe-webhook`
- Processes Stripe webhook events
- Handles subscription lifecycle events
- Updates database with payment status changes

### 7.3 Stripe Customer Portal Function
Create in Supabase Dashboard: `stripe-customer-portal`
- Creates billing portal sessions
- Allows customers to manage subscriptions

### 7.4 Trial Reminder Function
Create in Supabase Dashboard: `send-trial-reminder`
- Sends automated trial expiration emails
- Uses AWS SES for email delivery

## 8. Environment Variables

Set these in your new Supabase project:

```
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS SES (for trial reminders)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
FROM_EMAIL=noreply@scopostay.com

# Application
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 9. Storage Buckets

Create these storage buckets in Supabase:
- `inspection-photos` - For inspection images
- `inspection-reports` - For generated PDF reports

## 10. Authentication Settings

In Supabase Dashboard > Authentication > Settings:
- **Site URL**: `https://your-domain.com`
- **Redirect URLs**: 
  - `https://your-domain.com/auth/callback`
  - `http://localhost:5173/auth/callback`
- **Email confirmation**: Enabled
- **Email templates**: Customize confirmation email template

## 11. Additional Items for Complete Recreation

### 11.1 API Keys and Secrets
- Stripe publishable and secret keys
- AWS SES credentials for email sending
- Supabase anon and service role keys

### 11.2 Domain Configuration
- Custom domain setup if using one
- SSL certificate configuration
- DNS settings for email sending (SPF, DKIM records)

### 11.3 Webhook Endpoints
- Configure Stripe webhook endpoint URL
- Set up webhook signing secrets
- Test webhook delivery

### 11.4 Email Configuration
- Verify sender email in AWS SES
- Set up email templates
- Configure SMTP settings if needed

### 11.5 Monitoring and Logging
- Set up error tracking (Sentry, LogRocket, etc.)
- Configure database monitoring
- Set up uptime monitoring

### 11.6 Backup Strategy
- Database backup schedule
- File storage backup
- Configuration backup

### 11.7 Development Environment
- Local development database setup
- Environment variable management
- Testing data and fixtures

## 12. Migration Order

Execute in this order:
1. Create enums and types
2. Create tables (in dependency order)
3. Create indexes
4. Create functions
5. Create triggers
6. Enable RLS and create policies
7. Create views
8. Set up edge functions
9. Configure authentication
10. Set up storage buckets
11. Configure webhooks and external integrations

## 13. Testing Checklist

After recreation, test:
- [ ] User registration and email confirmation
- [ ] Admin account creation and team management
- [ ] Property CRUD operations
- [ ] Template creation and management
- [ ] Inspection workflow
- [ ] Report generation
- [ ] Stripe subscription flow
- [ ] Webhook processing
- [ ] Email notifications
- [ ] File uploads and storage
- [ ] RLS policy enforcement

This comprehensive guide should help you recreate your entire Supabase setup in a new project. Start with the database schema and work through each section systematically.