/*
  # Enhanced RLS Policies with Proper Role Handling

  1. Security Updates
    - Enhanced RLS policies to properly handle owner, admin, and member roles
    - Improved access control for all tables based on team membership
    - Added comprehensive policies for all database operations

  2. Role-Based Access Control
    - Owners: Full access to their organization's data
    - Admins: Full access to their organization's data (same as owners)
    - Members: Read access to organization data, full access to inspections

  3. Policy Structure
    - Separate policies for different operations (SELECT, INSERT, UPDATE, DELETE)
    - Clear distinction between management and viewing permissions
    - Proper handling of hierarchical relationships between tables
*/

-- First, let's ensure all tables have RLS enabled
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS report_service_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS property_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS property_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inspection_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with proper role handling
DO $$ 
BEGIN
    -- Profiles policies
    DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    DROP POLICY IF EXISTS "System can create user profiles" ON profiles;
    DROP POLICY IF EXISTS "postgres_can_manage_profiles" ON profiles;

    -- Admin policies
    DROP POLICY IF EXISTS "allow_admin_access" ON admin;
    DROP POLICY IF EXISTS "allow_admin_updates" ON admin;
    DROP POLICY IF EXISTS "enable_admin_registration" ON admin;
    DROP POLICY IF EXISTS "postgres_can_manage_admin" ON admin;

    -- Team members policies
    DROP POLICY IF EXISTS "enable_team_member_registration" ON team_members;
    DROP POLICY IF EXISTS "postgres_can_manage_team_members" ON team_members;

    -- Properties policies
    DROP POLICY IF EXISTS "Admins can manage their properties" ON properties;
    DROP POLICY IF EXISTS "Members can view admin properties" ON properties;
    DROP POLICY IF EXISTS "postgres_can_manage_properties" ON properties;

    -- Template categories policies
    DROP POLICY IF EXISTS "Admins can manage their template categories" ON template_categories;
    DROP POLICY IF EXISTS "Team members can view template categories" ON template_categories;
    DROP POLICY IF EXISTS "postgres_can_manage_template_categories" ON template_categories;

    -- Templates policies
    DROP POLICY IF EXISTS "Admins can manage their templates" ON templates;
    DROP POLICY IF EXISTS "Team members can view templates" ON templates;
    DROP POLICY IF EXISTS "postgres_can_manage_templates" ON templates;

    -- Template items policies
    DROP POLICY IF EXISTS "Admins can manage their template items" ON template_items;
    DROP POLICY IF EXISTS "Team members can view template items" ON template_items;
    DROP POLICY IF EXISTS "postgres_can_manage_template_items" ON template_items;

    -- Report service teams policies
    DROP POLICY IF EXISTS "Admins can manage their report service teams" ON report_service_teams;
    DROP POLICY IF EXISTS "Team members can view report service teams" ON report_service_teams;
    DROP POLICY IF EXISTS "postgres_can_manage_report_service_teams" ON report_service_teams;

    -- Property checklists policies
    DROP POLICY IF EXISTS "Property owners can manage their property checklists" ON property_checklists;
    DROP POLICY IF EXISTS "Team members can access property checklists" ON property_checklists;
    DROP POLICY IF EXISTS "postgres_can_manage_property_checklists" ON property_checklists;

    -- Property checklist templates policies
    DROP POLICY IF EXISTS "Property owners can manage checklist templates" ON property_checklist_templates;
    DROP POLICY IF EXISTS "Team members can access checklist templates" ON property_checklist_templates;
    DROP POLICY IF EXISTS "postgres_can_manage_property_checklist_templates" ON property_checklist_templates;

    -- Inspections policies
    DROP POLICY IF EXISTS "Admins can manage inspections for their properties" ON inspections;
    DROP POLICY IF EXISTS "Team members can access inspections for admin properties" ON inspections;
    DROP POLICY IF EXISTS "postgres_can_manage_inspections" ON inspections;

    -- Inspection items policies
    DROP POLICY IF EXISTS "Users can manage inspection items for their inspections" ON inspection_items;
    DROP POLICY IF EXISTS "postgres_can_manage_inspection_items" ON inspection_items;

    -- Stripe policies
    DROP POLICY IF EXISTS "postgres_can_manage_stripe_orders" ON stripe_orders;
    DROP POLICY IF EXISTS "postgres_can_manage_stripe_customers" ON stripe_customers;
    DROP POLICY IF EXISTS "postgres_can_manage_stripe_subscriptions" ON stripe_subscriptions;
END $$;

-- Create improved RLS policies with proper role handling

-- Profiles policies
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "System can create user profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Admin policies
CREATE POLICY "Owners and admins can access admin data" ON admin
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.admin_id = admin.id 
      AND tm.profile_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners can update admin data" ON admin
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "System can create admin records" ON admin
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Team members policies
CREATE POLICY "Team members can view team data" ON team_members
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = team_members.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm2 
          WHERE tm2.admin_id = a.id 
          AND tm2.profile_id = auth.uid() 
          AND tm2.role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "Owners and admins can manage team members" ON team_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = team_members.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = team_members.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

-- Properties policies
CREATE POLICY "Owners and admins can manage properties" ON properties
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = properties.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = properties.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "Members can view properties" ON properties
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = properties.admin_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  );

-- Template categories policies
CREATE POLICY "Owners and admins can manage template categories" ON template_categories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = template_categories.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = template_categories.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "Members can view template categories" ON template_categories
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = template_categories.admin_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  );

-- Templates policies
CREATE POLICY "Owners and admins can manage templates" ON templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = templates.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = templates.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "Members can view templates" ON templates
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

-- Template items policies
CREATE POLICY "Owners and admins can manage template items" ON template_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM templates t
      JOIN admin a ON t.admin_id = a.id
      WHERE t.id = template_items.template_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM templates t
      JOIN admin a ON t.admin_id = a.id
      WHERE t.id = template_items.template_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "Members can view template items" ON template_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM templates t
      JOIN admin a ON t.admin_id = a.id
      WHERE t.id = template_items.template_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  );

-- Report service teams policies
CREATE POLICY "Owners and admins can manage report service teams" ON report_service_teams
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = report_service_teams.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = report_service_teams.admin_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "Members can view report service teams" ON report_service_teams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a 
      WHERE a.id = report_service_teams.admin_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  );

-- Property checklists policies
CREATE POLICY "Owners and admins can manage property checklists" ON property_checklists
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN admin a ON p.admin_id = a.id
      WHERE p.id = property_checklists.property_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN admin a ON p.admin_id = a.id
      WHERE p.id = property_checklists.property_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "Members can view property checklists" ON property_checklists
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN admin a ON p.admin_id = a.id
      WHERE p.id = property_checklists.property_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  );

-- Property checklist templates policies
CREATE POLICY "Owners and admins can manage checklist templates" ON property_checklist_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_checklists pc
      JOIN properties p ON pc.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      WHERE pc.id = property_checklist_templates.property_checklist_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM property_checklists pc
      JOIN properties p ON pc.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      WHERE pc.id = property_checklist_templates.property_checklist_id 
      AND (
        a.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.admin_id = a.id 
          AND tm.profile_id = auth.uid() 
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "Members can view checklist templates" ON property_checklist_templates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_checklists pc
      JOIN properties p ON pc.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      WHERE pc.id = property_checklist_templates.property_checklist_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  );

-- Inspections policies
CREATE POLICY "All team members can manage inspections" ON inspections
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN admin a ON p.admin_id = a.id
      WHERE p.id = inspections.property_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN admin a ON p.admin_id = a.id
      WHERE p.id = inspections.property_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  );

-- Inspection items policies
CREATE POLICY "All team members can manage inspection items" ON inspection_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN properties p ON i.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      WHERE i.id = inspection_items.inspection_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN properties p ON i.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      WHERE i.id = inspection_items.inspection_id 
      AND EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  );

-- Add postgres policies for all tables (only if they don't exist)
DO $$ 
BEGIN
    -- Check and create postgres policies only if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'postgres_can_manage_profiles'
    ) THEN
        CREATE POLICY "postgres_can_manage_profiles" ON profiles FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin' AND policyname = 'postgres_can_manage_admin'
    ) THEN
        CREATE POLICY "postgres_can_manage_admin" ON admin FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'team_members' AND policyname = 'postgres_can_manage_team_members'
    ) THEN
        CREATE POLICY "postgres_can_manage_team_members" ON team_members FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'properties' AND policyname = 'postgres_can_manage_properties'
    ) THEN
        CREATE POLICY "postgres_can_manage_properties" ON properties FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'template_categories' AND policyname = 'postgres_can_manage_template_categories'
    ) THEN
        CREATE POLICY "postgres_can_manage_template_categories" ON template_categories FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'templates' AND policyname = 'postgres_can_manage_templates'
    ) THEN
        CREATE POLICY "postgres_can_manage_templates" ON templates FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'template_items' AND policyname = 'postgres_can_manage_template_items'
    ) THEN
        CREATE POLICY "postgres_can_manage_template_items" ON template_items FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'report_service_teams' AND policyname = 'postgres_can_manage_report_service_teams'
    ) THEN
        CREATE POLICY "postgres_can_manage_report_service_teams" ON report_service_teams FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'property_checklists' AND policyname = 'postgres_can_manage_property_checklists'
    ) THEN
        CREATE POLICY "postgres_can_manage_property_checklists" ON property_checklists FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'property_checklist_templates' AND policyname = 'postgres_can_manage_property_checklist_templates'
    ) THEN
        CREATE POLICY "postgres_can_manage_property_checklist_templates" ON property_checklist_templates FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'inspections' AND policyname = 'postgres_can_manage_inspections'
    ) THEN
        CREATE POLICY "postgres_can_manage_inspections" ON inspections FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'inspection_items' AND policyname = 'postgres_can_manage_inspection_items'
    ) THEN
        CREATE POLICY "postgres_can_manage_inspection_items" ON inspection_items FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'stripe_orders' AND policyname = 'postgres_can_manage_stripe_orders'
    ) THEN
        CREATE POLICY "postgres_can_manage_stripe_orders" ON stripe_orders FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'stripe_customers' AND policyname = 'postgres_can_manage_stripe_customers'
    ) THEN
        CREATE POLICY "postgres_can_manage_stripe_customers" ON stripe_customers FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'stripe_subscriptions' AND policyname = 'postgres_can_manage_stripe_subscriptions'
    ) THEN
        CREATE POLICY "postgres_can_manage_stripe_subscriptions" ON stripe_subscriptions FOR ALL TO postgres USING (true) WITH CHECK (true);
    END IF;
END $$;