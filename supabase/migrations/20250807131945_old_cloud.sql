/*
  # Add report recipient to inspection items

  1. Schema Changes
    - Add `report_recipient_id` column to `inspection_items` table
    - Column is nullable UUID type
    - Foreign key reference to `report_service_teams.id`
    - Cascade delete when report service team is deleted

  2. Security
    - No RLS changes needed (inherits from existing policies)
*/

-- Add report_recipient_id column to inspection_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_items' AND column_name = 'report_recipient_id'
  ) THEN
    ALTER TABLE inspection_items 
    ADD COLUMN report_recipient_id uuid REFERENCES report_service_teams(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_inspection_items_report_recipient_id 
ON inspection_items(report_recipient_id);