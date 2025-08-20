/*
  # Add INSERT policy for team_members table

  1. New Policies
    - Allow authenticated users to insert their own owner record in team_members
    - This enables new users to create their initial company setup

  2. Security
    - Policy restricts INSERT to only the user's own profile_id
    - Policy restricts role to 'owner' only for this self-insert operation
    - Prevents unauthorized team member additions

  3. Purpose
    - Fixes "new row violates row-level security policy" error
    - Enables proper admin record creation flow in StartTrialPage
    - Maintains security while allowing initial user setup
*/

-- Add INSERT policy for team_members to allow users to create their own owner record
CREATE POLICY "team_members_insert_owner_self" 
  ON team_members 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    profile_id = auth.uid() 
    AND role = 'owner'
  );