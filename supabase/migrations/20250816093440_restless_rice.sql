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

-- Create function to handle new invited users (idempotent)
CREATE OR REPLACE FUNCTION public.handle_new_invited_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record public.invitations%ROWTYPE;
BEGIN
  -- Look for a pending invitation for this email
  SELECT * INTO invitation_record
  FROM public.invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  -- If invitation found, assign the user to the team
  IF invitation_record.id IS NOT NULL THEN
    -- Create profile record first (in case it doesn't exist)
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

    -- Add user to team_members table
    INSERT INTO public.team_members (admin_id, profile_id, role)
    VALUES (invitation_record.admin_id, NEW.id, invitation_record.role);

    -- Mark invitation as accepted
    UPDATE public.invitations
    SET status = 'accepted',
        accepted_at = now(),
        updated_at = now()
    WHERE id = invitation_record.id;

    -- Log successful assignment
    RAISE NOTICE 'User % assigned to admin % with role %', NEW.email, invitation_record.admin_id, invitation_record.role;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger on auth.users if it exists to allow recreation
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_invited_user();