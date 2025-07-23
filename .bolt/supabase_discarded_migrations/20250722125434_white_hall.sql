```sql
-- Drop existing policies
DROP POLICY IF EXISTS inspections_manage_members ON public.inspections;
DROP POLICY IF EXISTS inspection_items_manage_members ON public.inspection_items;

-- Create new simplified policy for inspections table
CREATE POLICY inspections_access_for_members
ON public.inspections
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.properties p
    JOIN public.team_members tm ON p.admin_id = tm.admin_id
    WHERE p.id = inspections.property_id
      AND tm.profile_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.properties p
    JOIN public.team_members tm ON p.admin_id = tm.admin_id
    WHERE p.id = inspections.property_id
      AND tm.profile_id = auth.uid()
  )
);

-- Create new simplified policy for inspection_items table
CREATE POLICY inspection_items_access_for_members
ON public.inspection_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.inspections i
    JOIN public.properties p ON i.property_id = p.id
    JOIN public.team_members tm ON p.admin_id = tm.admin_id
    WHERE i.id = inspection_items.inspection_id
      AND tm.profile_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.inspections i
    JOIN public.properties p ON i.property_id = p.id
    JOIN public.team_members tm ON p.admin_id = tm.admin_id
    WHERE i.id = inspection_items.inspection_id
      AND tm.profile_id = auth.uid()
  )
);
```