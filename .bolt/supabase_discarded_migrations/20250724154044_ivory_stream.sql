/*
  # Fix missing status column in inspections table

  1. Schema Updates
    - Add `status` column to `inspections` table with proper enum type
    - Set default value to 'in_progress' for new inspections
    - Update existing records to have appropriate status values

  2. Data Migration
    - Set completed inspections (those with end_time) to 'completed' status
    - Set in-progress inspections (those without end_time) to 'in_progress' status

  3. Indexes
    - Add index on status column for efficient querying
*/

-- First, ensure the inspection_status enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_status') THEN
    CREATE TYPE inspection_status AS ENUM ('in_progress', 'completed', 'canceled');
  END IF;
END $$;

-- Add the status column to inspections table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'status'
  ) THEN
    ALTER TABLE inspections ADD COLUMN status inspection_status DEFAULT 'in_progress';
  END IF;
END $$;

-- Update existing records to have appropriate status values
UPDATE inspections 
SET status = CASE 
  WHEN end_time IS NOT NULL THEN 'completed'::inspection_status
  ELSE 'in_progress'::inspection_status
END
WHERE status IS NULL;

-- Add index on status column for efficient querying
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);

-- Add index combining status and created_at for dashboard queries
CREATE INDEX IF NOT EXISTS idx_inspections_status_created_at ON inspections(status, created_at DESC);