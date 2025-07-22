/*
  # Fix Property Checklist Templates RLS Policies

  1. Security
    - Drop existing complex RLS policies on property_checklist_templates table
    - Create simplified RLS policy for authenticated team members
    - Maintain proper access control without complex joins

  2. Changes
    - Remove property_checklist_templates_manage_admins policy
    - Remove property_checklist_templates_select_members policy
    - Add property_checklist_templates_access_for_members policy
    - Ensure authenticated users can access templates for their properties
*/

-- Drop existing policies on property_checklist_templates
DROP POLICY IF EXISTS "property_checklist_templates_manage_admins" ON public.property_checklist_templates;
DROP POLICY IF EXISTS "property_checklist_templates_select_members" ON public.property_checklist_templates;

-- Create new simplified policy for property_checklist_templates
CREATE POLICY "property_checklist_templates_access_for_members"
  ON public.property_checklist_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM property_checklists pc
      JOIN properties p ON pc.property_id = p.id
      JOIN team_members tm ON tm.admin_id = p.admin_id
      WHERE pc.id = property_checklist_templates.property_checklist_id
        AND tm.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM property_checklists pc
      JOIN properties p ON pc.property_id = p.id
      JOIN team_members tm ON tm.admin_id = p.admin_id
      WHERE pc.id = property_checklist_templates.property_checklist_id
        AND tm.profile_id = auth.uid()
    )
  );