/*
  # Add marked_for_report column to inspection_items

  1. Changes
    - Add `marked_for_report` boolean column to `inspection_items` table
    - Default value is FALSE
    - Allows inspectors to mark items for reporting during inspections

  2. Purpose
    - Enables dynamic reporting decisions during inspections
    - Replaces static template-level reporting configuration
    - Supports future ticketing and workflow features
*/

ALTER TABLE public.inspection_items
ADD COLUMN marked_for_report BOOLEAN DEFAULT FALSE;