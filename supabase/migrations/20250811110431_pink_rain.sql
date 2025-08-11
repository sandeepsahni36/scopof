/*
  # Remove sections and update template options structure

  1. Schema Changes
    - Add 'number' type to template_item_type enum
    - Remove parent_id and section_name columns from template_items
    - Update options column structure for rating buttons

  2. Data Migration
    - Reorder existing template items to ensure proper sequence
    - Convert existing string options to new object format with colors
    - Clean up any orphaned data

  3. Security
    - Maintain existing RLS policies
    - Ensure data integrity during migration
*/

-- Step 1: Add 'number' type to the enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'number' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'template_item_type')
  ) THEN
    ALTER TYPE template_item_type ADD VALUE 'number';
  END IF;
END $$;

-- Step 2: Reorder template items using a subquery approach (no window functions in UPDATE)
DO $$
DECLARE
    template_rec RECORD;
    item_rec RECORD;
    new_order INTEGER;
BEGIN
    -- For each template, reorder its items
    FOR template_rec IN 
        SELECT DISTINCT template_id FROM template_items ORDER BY template_id
    LOOP
        new_order := 1;
        
        -- Update each item in this template with sequential order
        FOR item_rec IN 
            SELECT id FROM template_items 
            WHERE template_id = template_rec.template_id 
            ORDER BY "order", created_at
        LOOP
            UPDATE template_items 
            SET "order" = new_order 
            WHERE id = item_rec.id;
            
            new_order := new_order + 1;
        END LOOP;
    END LOOP;
END $$;

-- Step 3: Convert existing string-based options to new object format
UPDATE template_items 
SET options = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'label', option_value,
      'color', CASE 
        WHEN option_value ILIKE '%good%' OR option_value ILIKE '%yes%' OR option_value ILIKE '%excellent%' THEN '#22C55E'
        WHEN option_value ILIKE '%poor%' OR option_value ILIKE '%no%' OR option_value ILIKE '%bad%' THEN '#EF4444'
        WHEN option_value ILIKE '%satisfactory%' OR option_value ILIKE '%ok%' OR option_value ILIKE '%average%' THEN '#F97316'
        ELSE '#3B82F6'
      END
    )
  )
  FROM jsonb_array_elements_text(options) AS option_value
)
WHERE type IN ('single_choice', 'multiple_choice') 
AND options IS NOT NULL 
AND jsonb_typeof(options) = 'array'
AND jsonb_array_length(options) > 0;

-- Step 4: Remove parent_id and section_name columns
ALTER TABLE template_items DROP COLUMN IF EXISTS parent_id;
ALTER TABLE template_items DROP COLUMN IF EXISTS section_name;

-- Step 5: Drop any constraints that might reference the removed columns
DO $$
BEGIN
    -- Drop the self-referencing check constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'template_items_check' 
        AND table_name = 'template_items'
    ) THEN
        ALTER TABLE template_items DROP CONSTRAINT template_items_check;
    END IF;
END $$;

-- Step 6: Update any indexes that might reference removed columns
DROP INDEX IF EXISTS idx_template_items_parent_id;
DROP INDEX IF EXISTS idx_template_items_hierarchy;

-- Step 7: Ensure proper indexing for the new flat structure
CREATE INDEX IF NOT EXISTS idx_template_items_template_order 
ON template_items (template_id, "order");