/*
  # Remove sections and update template options structure

  1. Schema Changes
    - Remove parent_id and section_name columns from template_items
    - Add number type to template_item_type enum
    - Update options column structure for rating buttons

  2. Data Migration
    - Flatten any existing hierarchical template items
    - Update order values to be sequential
    - Preserve existing template functionality

  3. Security
    - Maintain existing RLS policies
    - No changes to authentication or permissions
*/

-- Add number type to template_item_type enum
ALTER TYPE template_item_type ADD VALUE IF NOT EXISTS 'number';

-- Create a temporary table to store the new order values
CREATE TEMP TABLE temp_item_orders AS
SELECT 
  id,
  row_number() OVER (PARTITION BY template_id ORDER BY "order", created_at) as new_order
FROM template_items;

-- Update the order values using the temporary table
UPDATE template_items 
SET "order" = temp_item_orders.new_order
FROM temp_item_orders
WHERE template_items.id = temp_item_orders.id;

-- Drop the temporary table
DROP TABLE temp_item_orders;

-- Remove the parent_id column (this will flatten any hierarchical structure)
ALTER TABLE template_items DROP COLUMN IF EXISTS parent_id;

-- Remove the section_name column
ALTER TABLE template_items DROP COLUMN IF EXISTS section_name;

-- Update any existing single_choice or multiple_choice options to new format
-- This converts simple string arrays to objects with label and color properties
UPDATE template_items 
SET options = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'label', option_value,
      'color', '#3B82F6'  -- Default to blue color
    )
  )
  FROM jsonb_array_elements_text(options) AS option_value
)
WHERE type IN ('single_choice', 'multiple_choice') 
  AND options IS NOT NULL 
  AND jsonb_typeof(options) = 'array'
  AND jsonb_array_length(options) > 0
  AND jsonb_typeof(options->0) = 'string';

-- Remove any constraints that might reference the dropped columns
DO $$
BEGIN
  -- Check if the constraint exists before trying to drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'template_items_check' 
    AND table_name = 'template_items'
  ) THEN
    ALTER TABLE template_items DROP CONSTRAINT template_items_check;
  END IF;
END $$;