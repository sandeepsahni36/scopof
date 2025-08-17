-- Create invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL,
  invited_by uuid NOT NULL,
  admin_id uuid NOT NULL,
  role public.team_member_role DEFAULT 'member'::public.team_member_role,
  status text DEFAULT 'pending'::text,
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invitations_pkey PRIMARY KEY (id),
  CONSTRAINT invitations_token_key UNIQUE (token),
  CONSTRAINT invitations_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin(id) ON DELETE CASCADE,
  CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to allow recreation
DROP POLICY IF EXISTS "invitations_delete_by_admin" ON public.invitations;
DROP POLICY IF EXISTS "invitations_insert_by_admin" ON public.invitations;
DROP POLICY IF EXISTS "invitations_postgres_all" ON public.invitations;
DROP POLICY IF EXISTS "invitations_select_by_token_or_admin" ON public.invitations;
DROP POLICY IF EXISTS "invitations_update_by_admin_or_invitee" ON public.invitations;

-- Recreate policies
CREATE POLICY "invitations_select_by_token_or_admin" ON public.invitations
  FOR SELECT USING (
    ((status = 'pending'::text) AND (expires_at > now())) OR 
    ((auth.uid() IS NOT NULL) AND (EXISTS ( 
      SELECT 1
      FROM (admin a JOIN team_members tm ON ((a.id = tm.admin_id)))
      WHERE ((a.id = invitations.admin_id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role])))
    )))
  );

CREATE POLICY "invitations_insert_by_admin" ON public.invitations
  FOR INSERT WITH CHECK (
    EXISTS ( 
      SELECT 1
      FROM (admin a JOIN team_members tm ON ((a.id = tm.admin_id)))
      WHERE ((a.id = invitations.admin_id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role])))
    )
  );

CREATE POLICY "invitations_update_by_admin_or_invitee" ON public.invitations
  FOR UPDATE USING (
    (EXISTS ( 
      SELECT 1
      FROM (admin a JOIN team_members tm ON ((a.id = tm.admin_id)))
      WHERE ((a.id = invitations.admin_id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role])))
    )) OR 
    ((email = auth.email()) AND (status = 'pending'::text) AND (expires_at > now()))
  ) WITH CHECK (
    (EXISTS ( 
      SELECT 1
      FROM (admin a JOIN team_members tm ON ((a.id = tm.admin_id)))
      WHERE ((a.id = invitations.admin_id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role])))
    )) OR 
    ((email = auth.email()) AND (status = 'pending'::text) AND (expires_at > now()))
  );

CREATE POLICY "invitations_delete_by_admin" ON public.invitations
  FOR DELETE USING (
    EXISTS ( 
      SELECT 1
      FROM (admin a JOIN team_members tm ON ((a.id = tm.admin_id)))
      WHERE ((a.id = invitations.admin_id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role])))
    )
  );

CREATE POLICY "invitations_postgres_all" ON public.invitations
  FOR ALL USING (true) WITH CHECK (true);

-- Drop existing indexes if they exist to allow recreation
DROP INDEX IF EXISTS idx_invitations_admin_id;
DROP INDEX IF EXISTS idx_invitations_email;
DROP INDEX IF EXISTS idx_invitations_expires_at;
DROP INDEX IF EXISTS idx_invitations_status;
DROP INDEX IF EXISTS idx_invitations_token;

-- Recreate indexes
CREATE INDEX idx_invitations_admin_id ON public.invitations USING btree (admin_id);
CREATE INDEX idx_invitations_email ON public.invitations USING btree (email);
CREATE INDEX idx_invitations_expires_at ON public.invitations USING btree (expires_at);
CREATE INDEX idx_invitations_status ON public.invitations USING btree (status);
CREATE INDEX idx_invitations_token ON public.invitations USING btree (token);

-- Drop existing trigger if it exists to allow recreation
DROP TRIGGER IF EXISTS update_invitations_updated_at ON public.invitations;

-- Recreate trigger
CREATE TRIGGER update_invitations_updated_at 
  BEFORE UPDATE ON public.invitations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
