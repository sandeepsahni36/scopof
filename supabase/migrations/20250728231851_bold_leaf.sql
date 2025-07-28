/*
  # Database Schema Updates

  1. Table Ownership Updates
    - Update table ownership to ensure proper permissions
    - Align with Supabase's internal role management
  
  2. Security
    - Maintain existing RLS policies
    - Preserve all security configurations
  
  3. Notes
    - This migration addresses table ownership issues
    - Required for proper database permissions alignment
*/

-- Update table ownership to supabase_admin for core tables
ALTER TABLE IF EXISTS public.profiles OWNER TO supabase_admin;
ALTER TABLE IF EXISTS public.admin OWNER TO supabase_admin;
ALTER TABLE IF EXISTS public.team_members OWNER TO supabase_admin;
ALTER TABLE IF EXISTS public.template_categories OWNER TO supabase_admin;
ALTER TABLE IF EXISTS public.templates OWNER TO supabase_admin;
ALTER TABLE IF EXISTS public.template_items OWNER TO supabase_admin;
ALTER TABLE IF EXISTS public.report_service_teams OWNER TO supabase_admin;
ALTER TABLE IF EXISTS public.properties OWNER TO supabase_admin;
ALTER TABLE IF EXISTS public.property_checklists OWNER TO supabase_admin;
ALTER TABLE IF EXISTS public.property_checklist_templates OWNER TO supabase_admin;
ALTER TABLE IF EXISTS public.inspections OWNER TO supabase_admin;
ALTER TABLE IF EXISTS public.inspection_items OWNER TO supabase_admin;
ALTER TABLE IF EXISTS public.reports OWNER TO supabase_admin;
ALTER TABLE IF EXISTS public.stripe_customers OWNER TO supabase_admin;
ALTER TABLE IF EXISTS public.stripe_orders OWNER TO supabase_admin;
ALTER TABLE IF EXISTS public.stripe_subscriptions OWNER TO supabase_admin;
ALTER TABLE IF EXISTS public.storage_usage OWNER TO supabase_admin;
ALTER TABLE IF EXISTS public.file_metadata OWNER TO supabase_admin;
ALTER TABLE IF EXISTS public.storage_quotas OWNER TO supabase_admin;

-- Update view ownership to supabase_admin
ALTER VIEW IF EXISTS public.user_admin_status OWNER TO supabase_admin;
ALTER VIEW IF EXISTS public.stripe_user_subscriptions OWNER TO supabase_admin;
ALTER VIEW IF EXISTS public.stripe_user_orders OWNER TO supabase_admin;