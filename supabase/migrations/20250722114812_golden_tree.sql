/*
  # Add divider to template_item_type enum

  1. Enum Extension
    - Add 'divider' value to existing template_item_type enum
    - Allows template items to be visual separators between other items

  2. Notes
    - This extends the existing enum without affecting current data
    - Divider items will be used for visual organization in templates
*/

-- Add 'divider' to the template_item_type enum
ALTER TYPE template_item_type ADD VALUE 'divider';