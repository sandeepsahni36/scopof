```sql
-- Drop existing policies on property_checklist_templates
DROP POLICY IF EXISTS property_checklist_templates_manage_admins ON public.property_checklist_templates;
DROP POLICY IF EXISTS property_checklist_templates_select_members ON public.property_checklist_templates;

-- Create a new, simplified RLS policy for property_checklist_templates
CREATE POLICY property_checklist_templates_access_for_members
  ON public.property_checklist_templates
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.property_checklists pc
    JOIN public.properties p ON pc.property_id = p.id
    JOIN public.admin a ON p.admin_id = a.id
    JOIN public.team_members tm ON tm.admin_id = a.id
    WHERE
      pc.id = property_checklist_templates.property_checklist_id AND
      tm.profile_id = auth.uid()
  ));
```