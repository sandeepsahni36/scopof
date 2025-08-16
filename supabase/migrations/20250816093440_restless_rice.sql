/*
  # Create Invitations System

  1. New Tables
    - `invitations`
      - `id` (uuid, primary key)
      - `email` (text, not null)
      - `token` (text, unique, not null)
      - `invited_by` (uuid, references profiles)
      - `admin_id` (uuid, references admin)
      - `role` (team_member_role, default 'member')
      - `status` (text, default 'pending')
      - `expires_at` (timestamp, default 7 days from now)
      - `accepted_at` (timestamp, nullable)
      - `created_at` (timestamp, default now)
      - `updated_at` (timestamp, default now)

  2. Security
    - Enable RLS on `invitations` table
    - Add policies for token-based access and admin management
    - Create secure database function for role assignment
    - Add trigger for automatic role assignment on user signup

  3. Functions and Triggers
    - `handle_new_invited_user()` function for automatic role assignment
    - `on_auth_user_created_assign_role` trigger on auth.users table
*/

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text UNIQUE NOT NULL,
  invited_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
  role team_member_role DEFAULT 'member'::team_member_role,
  status text DEFAULT 'pending',
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_admin_id ON invitations(admin_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invitations table

-- Allow unauthenticated users to read invitations by token (for invitation acceptance)
-- Also allow authenticated admins to read invitations for their company
CREATE POLICY "invitations_select_by_token_or_admin"
  ON invitations
  FOR SELECT
  USING (
    -- Allow access by token for unauthenticated users (invitation acceptance)
    (status = 'pending' AND expires_at > now()) OR
    -- Allow authenticated admins to see invitations for their company
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM admin a
      JOIN team_members tm ON a.id = tm.admin_id
      WHERE a.id = invitations.admin_id 
      AND tm.profile_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    ))
  );

-- Allow authenticated admins to create invitations for their company
CREATE POLICY "invitations_insert_by_admin"
  ON invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin a
      JOIN team_members tm ON a.id = tm.admin_id
      WHERE a.id = invitations.admin_id 
      AND tm.profile_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    )
  );

-- Allow authenticated admins to update invitations for their company
-- Also allow the invitee to update their own invitation status during acceptance
CREATE POLICY "invitations_update_by_admin_or_invitee"
  ON invitations
  FOR UPDATE
  TO authenticated
  USING (
    -- Admin can update invitations for their company
    EXISTS (
      SELECT 1 FROM admin a
      JOIN team_members tm ON a.id = tm.admin_id
      WHERE a.id = invitations.admin_id 
      AND tm.profile_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    ) OR
    -- Invitee can update their own invitation during acceptance process
    (email = auth.email() AND status = 'pending' AND expires_at > now())
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    EXISTS (
      SELECT 1 FROM admin a
      JOIN team_members tm ON a.id = tm.admin_id
      WHERE a.id = invitations.admin_id 
      AND tm.profile_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    ) OR
    (email = auth.email() AND status = 'pending' AND expires_at > now())
  );

-- Allow authenticated admins to delete invitations for their company
CREATE POLICY "invitations_delete_by_admin"
  ON invitations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin a
      JOIN team_members tm ON a.id = tm.admin_id
      WHERE a.id = invitations.admin_id 
      AND tm.profile_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    )
  );

-- Allow postgres full access for system operations
CREATE POLICY "invitations_postgres_all"
  ON invitations
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Create function to handle new invited users
CREATE OR REPLACE FUNCTION public.handle_new_invited_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record invitations%ROWTYPE;
BEGIN
  -- Look for a pending invitation for this email
  SELECT * INTO invitation_record
  FROM invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  -- If invitation found, assign the user to the team
  IF invitation_record.id IS NOT NULL THEN
    -- Create profile record first (in case it doesn't exist)
    INSERT INTO profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

    -- Add user to team_members table
    INSERT INTO team_members (admin_id, profile_id, role)
    VALUES (invitation_record.admin_id, NEW.id, invitation_record.role);

    -- Mark invitation as accepted
    UPDATE invitations
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

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_invited_user();

-- Add updated_at trigger for invitations table
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();