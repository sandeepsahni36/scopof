/*
  # Simplify Inspection RLS Policies

  1. Security Changes
    - Drop existing complex RLS policies for inspections and inspection_items tables
    - Create simplified RLS policies that avoid complex joins and subqueries
    - Ensure authenticated users can access inspection data for properties they have access to

  2. Policy Changes
    - Replace inspections_manage_members with inspections_access_for_members
    - Replace inspection_items_manage_members with inspection_items_access_for_members
    - Maintain security while improving query performance and reliability
*/

-- Drop existing complex RLS policies for inspections table
DROP POLICY IF EXISTS "inspections_manage_members" ON inspections;

-- Create simplified RLS policy for inspections table
CREATE POLICY "inspections_access_for_members"
  ON inspections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM properties p
      JOIN admin a ON p.admin_id = a.id
      JOIN team_members tm ON tm.admin_id = a.id
      WHERE p.id = inspections.property_id 
        AND tm.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM properties p
      JOIN admin a ON p.admin_id = a.id
      JOIN team_members tm ON tm.admin_id = a.id
      WHERE p.id = inspections.property_id 
        AND tm.profile_id = auth.uid()
    )
  );

-- Drop existing complex RLS policies for inspection_items table
DROP POLICY IF EXISTS "inspection_items_manage_members" ON inspection_items;

-- Create simplified RLS policy for inspection_items table
CREATE POLICY "inspection_items_access_for_members"
  ON inspection_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM inspections i
      JOIN properties p ON i.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      JOIN team_members tm ON tm.admin_id = a.id
      WHERE i.id = inspection_items.inspection_id 
        AND tm.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM inspections i
      JOIN properties p ON i.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      JOIN team_members tm ON tm.admin_id = a.id
      WHERE i.id = inspection_items.inspection_id 
        AND tm.profile_id = auth.uid()
    )
  );