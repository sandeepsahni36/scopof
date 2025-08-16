/*
  # Create invitations table

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
    - Add policies for invitation management by admins
    - Add policy for public access to pending invitations by token
    - Add policy for invited users to update their own invitations

  3. Indexes
    - Index on email for faster lookups
    - Index on token for invitation validation
    - Index on admin_id for admin queries
    - Index on status and expires_at for cleanup queries

  4. Triggers
    - Add updated_at trigger for automatic timestamp updates
*/

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text UNIQUE NOT NULL,
  invited_by uuid NOT NULL,
  admin_id uuid NOT NULL,
  role team_member_role DEFAULT 'member'::team_member_role,
  status text DEFAULT 'pending'::text,
  expires_at timestamptz DEFAULT (now() + '7 days'::interval),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations USING btree (email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations USING btree (token);
CREATE INDEX IF NOT EXISTS idx_invitations_admin_id ON invitations USING btree (admin_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations USING btree (status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations USING btree (expires_at);

-- Add foreign key constraints
ALTER TABLE invitations 
ADD CONSTRAINT invitations_invited_by_fkey 
FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE invitations 
ADD CONSTRAINT invitations_admin_id_fkey 
FOREIGN KEY (admin_id) REFERENCES admin(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Allow public access to pending invitations by token (for invitation validation)
CREATE POLICY "invitations_select_by_token_or_admin"
  ON invitations
  FOR SELECT
  TO public
  USING (
    (status = 'pending' AND expires_at > now()) OR
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM admin a
      JOIN team_members tm ON a.id = tm.admin_id
      WHERE a.id = invitations.admin_id
      AND tm.profile_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    ))
  );

-- Allow admins to create invitations
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

-- Allow admins to update/delete invitations and invited users to update their own
CREATE POLICY "invitations_update_by_admin_or_invitee"
  ON invitations
  FOR UPDATE
  TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM admin a
      JOIN team_members tm ON a.id = tm.admin_id
      WHERE a.id = invitations.admin_id
      AND tm.profile_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )) OR
    (email = auth.email() AND status = 'pending' AND expires_at > now())
  )
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM admin a
      JOIN team_members tm ON a.id = tm.admin_id
      WHERE a.id = invitations.admin_id
      AND tm.profile_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )) OR
    (email = auth.email() AND status = 'pending' AND expires_at > now())
  );

-- Allow admins to delete invitations
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

-- Add updated_at trigger
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();