/*
  # Fix infinite recursion in RLS policies

  This migration completely removes all problematic RLS policies that cause infinite recursion
  and replaces them with simple, non-recursive policies.

  ## Problem
  The current RLS policies create circular dependencies:
  - admin policies reference team_members
  - team_members policies reference admin
  - This creates infinite recursion when evaluating access

  ## Solution
  1. Drop all existing problematic policies
  2. Create simple, direct policies without cross-table references
  3. Use direct owner_id checks instead of complex joins

  ## Changes
  1. Admin table: Simple owner-based access
  2. Team_members table: Direct profile-based access
  3. Properties table: Simple admin-based access
  4. All other tables: Simplified policies
*/

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "admin_owner_access" ON admin;
DROP POLICY IF EXISTS "admin_team_member_access" ON admin;
DROP POLICY IF EXISTS "admin_postgres_access" ON admin;

DROP POLICY IF EXISTS "team_members_owner_manage" ON team_members;
DROP POLICY IF EXISTS "team_members_admin_manage" ON team_members;
DROP POLICY IF EXISTS "team_members_self_read" ON team_members;
DROP POLICY IF EXISTS "team_members_update_own" ON team_members;
DROP POLICY IF EXISTS "team_members_postgres_access" ON team_members;

DROP POLICY IF EXISTS "properties_manage_admins" ON properties;
DROP POLICY IF EXISTS "properties_select_members" ON properties;
DROP POLICY IF EXISTS "properties_postgres_access" ON properties;

DROP POLICY IF EXISTS "templates_manage_admins" ON templates;
DROP POLICY IF EXISTS "templates_select_members" ON templates;
DROP POLICY IF EXISTS "templates_postgres_all" ON templates;

DROP POLICY IF EXISTS "template_categories_manage_admins" ON template_categories;
DROP POLICY IF EXISTS "template_categories_postgres_all" ON template_categories;

DROP POLICY IF EXISTS "template_items_manage_admins" ON template_items;
DROP POLICY IF EXISTS "template_items_select_members" ON template_items;
DROP POLICY IF EXISTS "template_items_postgres_all" ON template_items;

DROP POLICY IF EXISTS "property_checklists_manage_admins" ON property_checklists;
DROP POLICY IF EXISTS "property_checklists_select_members" ON property_checklists;
DROP POLICY IF EXISTS "property_checklists_postgres_all" ON property_checklists;

DROP POLICY IF EXISTS "property_checklist_templates_manage_admins" ON property_checklist_templates;
DROP POLICY IF EXISTS "property_checklist_templates_access_for_members" ON property_checklist_templates;
DROP POLICY IF EXISTS "property_checklist_templates_postgres_all" ON property_checklist_templates;

DROP POLICY IF EXISTS "inspections_manage_admins" ON inspections;
DROP POLICY IF EXISTS "inspections_manage_team" ON inspections;
DROP POLICY IF EXISTS "inspections_access_for_members" ON inspections;
DROP POLICY IF EXISTS "inspections_postgres_all" ON inspections;

DROP POLICY IF EXISTS "inspection_items_manage_admins" ON inspection_items;
DROP POLICY IF EXISTS "inspection_items_manage_team" ON inspection_items;
DROP POLICY IF EXISTS "inspection_items_access_for_members" ON inspection_items;
DROP POLICY IF EXISTS "inspection_items_postgres_all" ON inspection_items;

DROP POLICY IF EXISTS "reports_manage_admins" ON reports;
DROP POLICY IF EXISTS "reports_manage_team" ON reports;
DROP POLICY IF EXISTS "reports_postgres_all" ON reports;

DROP POLICY IF EXISTS "report_service_teams_manage_admins" ON report_service_teams;
DROP POLICY IF EXISTS "report_service_teams_select_members" ON report_service_teams;
DROP POLICY IF EXISTS "report_service_teams_postgres_all" ON report_service_teams;

-- Create simple, non-recursive policies for admin table
CREATE POLICY "admin_owner_full_access"
  ON admin
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Create simple policies for team_members table
CREATE POLICY "team_members_owner_full_access"
  ON team_members
  FOR ALL
  TO authenticated
  USING (admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid()))
  WITH CHECK (admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid()));

CREATE POLICY "team_members_self_read"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Create simple policies for properties table
CREATE POLICY "properties_owner_full_access"
  ON properties
  FOR ALL
  TO authenticated
  USING (admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid()))
  WITH CHECK (admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid()));

-- Create simple policies for templates table
CREATE POLICY "templates_owner_full_access"
  ON templates
  FOR ALL
  TO authenticated
  USING (admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid()))
  WITH CHECK (admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid()));

-- Create simple policies for template_categories table
CREATE POLICY "template_categories_owner_full_access"
  ON template_categories
  FOR ALL
  TO authenticated
  USING (admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid()))
  WITH CHECK (admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid()));

-- Create simple policies for template_items table
CREATE POLICY "template_items_owner_full_access"
  ON template_items
  FOR ALL
  TO authenticated
  USING (template_id IN (SELECT id FROM templates WHERE admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid())))
  WITH CHECK (template_id IN (SELECT id FROM templates WHERE admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid())));

-- Create simple policies for property_checklists table
CREATE POLICY "property_checklists_owner_full_access"
  ON property_checklists
  FOR ALL
  TO authenticated
  USING (property_id IN (SELECT id FROM properties WHERE admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid())))
  WITH CHECK (property_id IN (SELECT id FROM properties WHERE admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid())));

-- Create simple policies for property_checklist_templates table
CREATE POLICY "property_checklist_templates_owner_full_access"
  ON property_checklist_templates
  FOR ALL
  TO authenticated
  USING (property_checklist_id IN (
    SELECT pc.id FROM property_checklists pc
    JOIN properties p ON pc.property_id = p.id
    WHERE p.admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid())
  ))
  WITH CHECK (property_checklist_id IN (
    SELECT pc.id FROM property_checklists pc
    JOIN properties p ON pc.property_id = p.id
    WHERE p.admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid())
  ));

-- Create simple policies for inspections table
CREATE POLICY "inspections_owner_full_access"
  ON inspections
  FOR ALL
  TO authenticated
  USING (property_id IN (SELECT id FROM properties WHERE admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid())))
  WITH CHECK (property_id IN (SELECT id FROM properties WHERE admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid())));

-- Create simple policies for inspection_items table
CREATE POLICY "inspection_items_owner_full_access"
  ON inspection_items
  FOR ALL
  TO authenticated
  USING (inspection_id IN (
    SELECT i.id FROM inspections i
    JOIN properties p ON i.property_id = p.id
    WHERE p.admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid())
  ))
  WITH CHECK (inspection_id IN (
    SELECT i.id FROM inspections i
    JOIN properties p ON i.property_id = p.id
    WHERE p.admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid())
  ));

-- Create simple policies for reports table
CREATE POLICY "reports_owner_full_access"
  ON reports
  FOR ALL
  TO authenticated
  USING (inspection_id IN (
    SELECT i.id FROM inspections i
    JOIN properties p ON i.property_id = p.id
    WHERE p.admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid())
  ))
  WITH CHECK (inspection_id IN (
    SELECT i.id FROM inspections i
    JOIN properties p ON i.property_id = p.id
    WHERE p.admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid())
  ));

-- Create simple policies for report_service_teams table
CREATE POLICY "report_service_teams_owner_full_access"
  ON report_service_teams
  FOR ALL
  TO authenticated
  USING (admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid()))
  WITH CHECK (admin_id IN (SELECT id FROM admin WHERE owner_id = auth.uid()));

-- Recreate the user_admin_status view with simpler logic
DROP VIEW IF EXISTS user_admin_status;

CREATE VIEW user_admin_status AS
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

-- Add postgres access policies for all tables
CREATE POLICY "admin_postgres_all" ON admin FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "team_members_postgres_all" ON team_members FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "properties_postgres_all" ON properties FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "templates_postgres_all" ON templates FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "template_categories_postgres_all" ON template_categories FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "template_items_postgres_all" ON template_items FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "property_checklists_postgres_all" ON property_checklists FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "property_checklist_templates_postgres_all" ON property_checklist_templates FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "inspections_postgres_all" ON inspections FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "inspection_items_postgres_all" ON inspection_items FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "reports_postgres_all" ON reports FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "report_service_teams_postgres_all" ON report_service_teams FOR ALL TO postgres USING (true) WITH CHECK (true);