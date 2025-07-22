/*
  # Add type column to template_items table

  1. Schema Changes
    - Add `type` column to `template_items` table using `template_item_type` enum
    - Set default value to 'text' for existing records
    - Add NOT NULL constraint after setting default values

  2. Data Migration
    - Update existing records to have appropriate type values
    - Ensure all records have valid type values before adding NOT NULL constraint

  3. Index Optimization
    - Add index on type column for efficient filtering by item type
*/

-- Add the type column with a default value
ALTER TABLE template_items 
ADD COLUMN type template_item_type DEFAULT 'text';

-- Update existing records to have appropriate type values
-- This is a safe operation since we're setting a default
UPDATE template_items 
SET type = 'text' 
WHERE type IS NULL;

-- Now make the column NOT NULL since all records have values
ALTER TABLE template_items 
ALTER COLUMN type SET NOT NULL;

-- Remove the default since we want explicit type specification for new records
ALTER TABLE template_items 
ALTER COLUMN type DROP DEFAULT;

-- Add index for efficient querying by type
CREATE INDEX IF NOT EXISTS idx_template_items_type ON template_items(type);

-- Add comment for documentation
COMMENT ON COLUMN template_items.type IS 'Type of template item: text, single_choice, multiple_choice, photo, section, or divider';