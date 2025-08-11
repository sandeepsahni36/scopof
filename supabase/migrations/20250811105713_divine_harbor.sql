/*
  # Remove Sections and Update Template Items Structure

  1. Schema Changes
    - Remove `parent_id` and `section_name` columns from `template_items` table
    - Update `options` column to support JSONB for color-enabled rating buttons
    - Add new `number` type to `template_item_type` enum

  2. Data Migration
    - Clean up existing template items to remove section dependencies
    - Flatten any hierarchical structures to linear order

  3. Security
    - Maintain existing RLS policies on `template_items` table
*/

-- Add new template item type for number fields
ALTER TYPE template_item_type ADD VALUE IF NOT EXISTS 'number';

-- Remove section-related columns from template_items
DO $$
BEGIN
  -- Remove parent_id column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'template_items' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE template_items DROP COLUMN parent_id;
  END IF;

  -- Remove section_name column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'template_items' AND column_name = 'section_name'
  ) THEN
    ALTER TABLE template_items DROP COLUMN section_name;
  END IF;
END $$;

-- Update options column to support JSONB for rating buttons with colors
-- This allows storing both simple string arrays and complex objects with colors
DO $$
BEGIN
  -- Check if options column exists and update its type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'template_items' AND column_name = 'options'
  ) THEN
    -- The column already exists as JSONB, so no change needed
    -- Just ensure it can handle both string arrays and object arrays
    ALTER TABLE template_items ALTER COLUMN options TYPE jsonb USING options::jsonb;
  END IF;
END $$;

-- Clean up any existing section-type items since sections are no longer supported
DELETE FROM template_items WHERE type = 'section';

-- Update any remaining items to ensure they have proper order values
UPDATE template_items 
SET "order" = row_number() OVER (PARTITION BY template_id ORDER BY "order", created_at)
WHERE "order" IS NULL OR "order" = 0;