/*
  # Fix team_members schema and policies

  1. Schema Updates
    - Add missing `role` column to `team_members` table with proper enum type
    - Update existing records to have 'member' role by default
    - Set owner records to 'owner' role where applicable

  2. Policy Updates
    - Update all policies that reference tm.role to work with the new column
    - Ensure backward compatibility with existing data

  3. Data Migration
    - Safely migrate existing team_members records
    - Set appropriate roles based on admin ownership
*/

-- First, ensure the team_member_role enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_member_role') THEN
    CREATE TYPE team_member_role AS ENUM ('owner', 'admin', 'member');
  END IF;
END $$;

-- Add the role column to team_members table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_members' AND column_name = 'role'
  ) THEN
    ALTER TABLE team_members ADD COLUMN role team_member_role DEFAULT 'member';
  END IF;
END $$;

-- Update existing records to set proper roles
-- Set owners based on admin.owner_id matching team_members.profile_id
UPDATE team_members 
SET role = 'owner'
WHERE EXISTS (
  SELECT 1 FROM admin 
  WHERE admin.id = team_members.admin_id 
  AND admin.owner_id = team_members.profile_id
);

-- Now we can safely create/update the policies that reference tm.role
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "template_items_manage_admins" ON template_items;
DROP POLICY IF EXISTS "templates_manage_admins" ON templates;
DROP POLICY IF EXISTS "template_categories_manage_admins" ON template_categories;
DROP POLICY IF EXISTS "properties_manage_admins" ON properties;
DROP POLICY IF EXISTS "property_checklists_manage_admins" ON property_checklists;
DROP POLICY IF EXISTS "property_checklist_templates_manage_admins" ON property_checklist_templates;
DROP POLICY IF EXISTS "inspections_manage_admins" ON inspections;
DROP POLICY IF EXISTS "inspection_items_manage_admins" ON inspection_items;
DROP POLICY IF EXISTS "reports_manage_admins" ON reports;

-- Create updated policies with proper role checking
CREATE POLICY "template_items_manage_admins" ON template_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM templates t
      JOIN admin a ON t.admin_id = a.id
      WHERE t.id = template_items.template_id
      AND (
        a.owner_id = uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.admin_id = a.id
          AND tm.profile_id = uid()
          AND tm.role = ANY(ARRAY['owner'::team_member_role, 'admin'::team_member_role])
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM templates t
      JOIN admin a ON t.admin_id = a.id
      WHERE t.id = template_items.template_id
      AND (
        a.owner_id = uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.admin_id = a.id
          AND tm.profile_id = uid()
          AND tm.role = ANY(ARRAY['owner'::team_member_role, 'admin'::team_member_role])
        )
      )
    )
  );

CREATE POLICY "templates_manage_admins" ON templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a
      WHERE a.id = templates.admin_id
      AND (
        a.owner_id = uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.admin_id = a.id
          AND tm.profile_id = uid()
          AND tm.role = ANY(ARRAY['owner'::team_member_role, 'admin'::team_member_role])
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin a
      WHERE a.id = templates.admin_id
      AND (
        a.owner_id = uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.admin_id = a.id
          AND tm.profile_id = uid()
          AND tm.role = ANY(ARRAY['owner'::team_member_role, 'admin'::team_member_role])
        )
      )
    )
  );

CREATE POLICY "template_categories_manage_admins" ON template_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a
      WHERE a.id = template_categories.admin_id
      AND (
        a.owner_id = uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.admin_id = a.id
          AND tm.profile_id = uid()
          AND tm.role = ANY(ARRAY['owner'::team_member_role, 'admin'::team_member_role])
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin a
      WHERE a.id = template_categories.admin_id
      AND (
        a.owner_id = uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.admin_id = a.id
          AND tm.profile_id = uid()
          AND tm.role = ANY(ARRAY['owner'::team_member_role, 'admin'::team_member_role])
        )
      )
    )
  );

CREATE POLICY "properties_manage_admins" ON properties
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a
      WHERE a.id = properties.admin_id
      AND (
        a.owner_id = uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.admin_id = a.id
          AND tm.profile_id = uid()
          AND tm.role = ANY(ARRAY['owner'::team_member_role, 'admin'::team_member_role])
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin a
      WHERE a.id = properties.admin_id
      AND (
        a.owner_id = uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.admin_id = a.id
          AND tm.profile_id = uid()
          AND tm.role = ANY(ARRAY['owner'::team_member_role, 'admin'::team_member_role])
        )
      )
    )
  );

CREATE POLICY "property_checklists_manage_admins" ON property_checklists
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM properties p
      JOIN admin a ON p.admin_id = a.id
      WHERE p.id = property_checklists.property_id
      AND (
        a.owner_id = uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.admin_id = a.id
          AND tm.profile_id = uid()
          AND tm.role = ANY(ARRAY['owner'::team_member_role, 'admin'::team_member_role])
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM properties p
      JOIN admin a ON p.admin_id = a.id
      WHERE p.id = property_checklists.property_id
      AND (
        a.owner_id = uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.admin_id = a.id
          AND tm.profile_id = uid()
          AND tm.role = ANY(ARRAY['owner'::team_member_role, 'admin'::team_member_role])
        )
      )
    )
  );

CREATE POLICY "property_checklist_templates_manage_admins" ON property_checklist_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM property_checklists pc
      JOIN properties p ON pc.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      WHERE pc.id = property_checklist_templates.property_checklist_id
      AND (
        a.owner_id = uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.admin_id = a.id
          AND tm.profile_id = uid()
          AND tm.role = ANY(ARRAY['owner'::team_member_role, 'admin'::team_member_role])
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM property_checklists pc
      JOIN properties p ON pc.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      WHERE pc.id = property_checklist_templates.property_checklist_id
      AND (
        a.owner_id = uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.admin_id = a.id
          AND tm.profile_id = uid()
          AND tm.role = ANY(ARRAY['owner'::team_member_role, 'admin'::team_member_role])
        )
      )
    )
  );

CREATE POLICY "inspections_manage_admins" ON inspections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM properties p
      JOIN admin a ON p.admin_id = a.id
      WHERE p.id = inspections.property_id
      AND (
        a.owner_id = uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.admin_id = a.id
          AND tm.profile_id = uid()
          AND tm.role = ANY(ARRAY['owner'::team_member_role, 'admin'::team_member_role])
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM properties p
      JOIN admin a ON p.admin_id = a.id
      WHERE p.id = inspections.property_id
      AND (
        a.owner_id = uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.admin_id = a.id
          AND tm.profile_id = uid()
          AND tm.role = ANY(ARRAY['owner'::team_member_role, 'admin'::team_member_role])
        )
      )
    )
  );

CREATE POLICY "inspection_items_manage_admins" ON inspection_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM inspections i
      JOIN properties p ON i.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      WHERE i.id = inspection_items.inspection_id
      AND (
        a.owner_id = uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.admin_id = a.id
          AND tm.profile_id = uid()
          AND tm.role = ANY(ARRAY['owner'::team_member_role, 'admin'::team_member_role])
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM inspections i
      JOIN properties p ON i.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      WHERE i.id = inspection_items.inspection_id
      AND (
        a.owner_id = uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.admin_id = a.id
          AND tm.profile_id = uid()
          AND tm.role = ANY(ARRAY['owner'::team_member_role, 'admin'::team_member_role])
        )
      )
    )
  );

CREATE POLICY "reports_manage_admins" ON reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM inspections i
      JOIN properties p ON i.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      WHERE i.id = reports.inspection_id
      AND (
        a.owner_id = uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.admin_id = a.id
          AND tm.profile_id = uid()
          AND tm.role = ANY(ARRAY['owner'::team_member_role, 'admin'::team_member_role])
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM inspections i
      JOIN properties p ON i.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      WHERE i.id = reports.inspection_id
      AND (
        a.owner_id = uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.admin_id = a.id
          AND tm.profile_id = uid()
          AND tm.role = ANY(ARRAY['owner'::team_member_role, 'admin'::team_member_role])
        )
      )
    )
  );