-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS admin_owner_access ON public.admin;
DROP POLICY IF EXISTS admin_postgres_access ON public.admin;
DROP POLICY IF EXISTS admin_team_member_access ON public.admin;

DROP POLICY IF EXISTS team_members_admin_manage ON public.team_members;
DROP POLICY IF EXISTS team_members_owner_manage ON public.team_members;
DROP POLICY IF EXISTS team_members_postgres_access ON public.team_members;
DROP POLICY IF EXISTS team_members_self_read ON public.team_members;
DROP POLICY IF EXISTS team_members_update_own ON public.team_members;

DROP POLICY IF EXISTS properties_manage_admins ON public.properties;
DROP POLICY IF EXISTS properties_postgres_all ON public.properties;
DROP POLICY IF EXISTS properties_select_members ON public.properties;

DROP POLICY IF EXISTS file_metadata_admin_access ON public.file_metadata;

-- Enable RLS on tables if not already enabled
ALTER TABLE public.admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_metadata ENABLE ROW LEVEL SECURITY;

-- Admin Table Policies
CREATE POLICY admin_owner_access ON public.admin
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY admin_postgres_access ON public.admin
  FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY admin_team_member_access ON public.admin
  FOR SELECT USING (
    id IN (
      SELECT tm.admin_id
      FROM team_members tm
      WHERE tm.profile_id = auth.uid()
    )
  );

-- Team Members Table Policies
CREATE POLICY team_members_admin_manage ON public.team_members
  FOR ALL USING (
    admin_id IN (
      SELECT tm.admin_id
      FROM team_members tm
      WHERE tm.profile_id = auth.uid() AND tm.role IN ('owner', 'admin')
    )
  ) WITH CHECK (
    admin_id IN (
      SELECT tm.admin_id
      FROM team_members tm
      WHERE tm.profile_id = auth.uid() AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY team_members_owner_manage ON public.team_members
  FOR ALL USING (
    admin_id IN (
      SELECT a.id
      FROM admin a
      WHERE a.owner_id = auth.uid()
    )
  ) WITH CHECK (
    admin_id IN (
      SELECT a.id
      FROM admin a
      WHERE a.owner_id = auth.uid()
    )
  );

CREATE POLICY team_members_postgres_access ON public.team_members
  FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY team_members_self_read ON public.team_members
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY team_members_update_own ON public.team_members
  FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- Properties Table Policies
CREATE POLICY properties_manage_admins ON public.properties
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM admin a
      JOIN team_members tm ON a.id = tm.admin_id
      WHERE properties.admin_id = a.id
        AND tm.profile_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM admin a
      JOIN team_members tm ON a.id = tm.admin_id
      WHERE properties.admin_id = a.id
        AND tm.profile_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY properties_postgres_all ON public.properties
  FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY properties_select_members ON public.properties
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM admin a
      JOIN team_members tm ON a.id = tm.admin_id
      WHERE properties.admin_id = a.id
        AND tm.profile_id = auth.uid()
    )
  );

-- File Metadata Table Policies
CREATE POLICY file_metadata_admin_access ON public.file_metadata
  FOR ALL USING (
    admin_id IN (
      SELECT a.id
      FROM admin a
      WHERE a.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM team_members tm
          WHERE tm.admin_id = a.id AND tm.profile_id = auth.uid()
        )
    )
  ) WITH CHECK (
    admin_id IN (
      SELECT a.id
      FROM admin a
      WHERE a.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM team_members tm
          WHERE tm.admin_id = a.id AND tm.profile_id = auth.uid()
        )
    )
  );

-- Recreate user_admin_status view
CREATE OR REPLACE VIEW public.user_admin_status AS
 SELECT p.id AS profile_id,
    a.id AS admin_id,
    tm.role,
    (a.owner_id = p.id) AS is_owner,
    a.trial_started_at,
    a.subscription_status,
    a.customer_id,
    (EXISTS ( SELECT 1
           FROM stripe_subscriptions ss
          WHERE ((ss.customer_id = a.customer_id) AND (ss.status = ANY (ARRAY['active'::stripe_subscription_status, 'trialing'::stripe_subscription_status]))))) AS has_active_subscription
   FROM profiles p
     JOIN team_members tm ON ((p.id = tm.profile_id))
     JOIN admin a ON ((tm.admin_id = a.id));