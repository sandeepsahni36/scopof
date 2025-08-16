/*
  # Create invitations table with proper constraint handling

  1. New Tables
    - `invitations`
      - `id` (uuid, primary key)
      - `email` (text, not null)
      - `token` (text, unique, not null)
      - `invited_by` (uuid, foreign key to profiles)
      - `admin_id` (uuid, foreign key to admin)
      - `role` (team_member_role, default 'member')
      - `status` (text, default 'pending')
      - `expires_at` (timestamptz, default now() + 7 days)
      - `accepted_at` (timestamptz, nullable)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `invitations` table
    - Add policies for invitation management and acceptance

  3. Indexes
    - Index on email for faster lookups
    - Index on token for invitation validation
    - Index on status and expires_at for cleanup queries

  4. Constraints
    - Uses IF NOT EXISTS to avoid conflicts with existing constraints
*/

-- Create the invitations table if it doesn't exist
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text UNIQUE NOT NULL,
  invited_by uuid NOT NULL,
  admin_id uuid NOT NULL,
  role team_member_role DEFAULT 'member',
  status text DEFAULT 'pending',
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'invitations_invited_by_fkey' 
    AND table_name = 'invitations'
  ) THEN
    ALTER TABLE invitations ADD CONSTRAINT invitations_invited_by_fkey 
    FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'invitations_admin_id_fkey' 
    AND table_name = 'invitations'
  ) THEN
    ALTER TABLE invitations ADD CONSTRAINT invitations_admin_id_fkey 
    FOREIGN KEY (admin_id) REFERENCES admin(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add unique constraint on token if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'invitations_token_key' 
    AND table_name = 'invitations'
  ) THEN
    ALTER TABLE invitations ADD CONSTRAINT invitations_token_key UNIQUE (token);
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_admin_id ON invitations(admin_id);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "invitations_select_by_token_or_admin"
  ON invitations
  FOR SELECT
  TO public
  USING (
    -- Allow access to pending, non-expired invitations by token (for unauthenticated users)
    (status = 'pending' AND expires_at > now())
    OR 
    -- Allow authenticated users to see invitations for their admin
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM admin a
      JOIN team_members tm ON a.id = tm.admin_id
      WHERE a.id = invitations.admin_id 
      AND tm.profile_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    ))
  );

CREATE POLICY IF NOT EXISTS "invitations_insert_by_admin"
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

CREATE POLICY IF NOT EXISTS "invitations_update_by_admin_or_invitee"
  ON invitations
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow admins to update invitations for their company
    (EXISTS (
      SELECT 1 FROM admin a
      JOIN team_members tm ON a.id = tm.admin_id
      WHERE a.id = invitations.admin_id 
      AND tm.profile_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    ))
    OR
    -- Allow invitees to update their own pending invitations (for acceptance)
    (email = auth.email() AND status = 'pending' AND expires_at > now())
  )
  WITH CHECK (
    -- Same conditions for updates
    (EXISTS (
      SELECT 1 FROM admin a
      JOIN team_members tm ON a.id = tm.admin_id
      WHERE a.id = invitations.admin_id 
      AND tm.profile_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    ))
    OR
    (email = auth.email() AND status = 'pending' AND expires_at > now())
  );

CREATE POLICY IF NOT EXISTS "invitations_delete_by_admin"
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

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_invitations_updated_at ON invitations;
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_invitations_updated_at();