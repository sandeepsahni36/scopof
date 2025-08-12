/*
  # Add index for marked_for_report column

  1. Performance Optimization
    - Add B-tree index on `inspection_items.marked_for_report` column
    - This will significantly improve query performance for dashboard analytics
    - Resolves statement timeout errors when counting flagged items

  2. Index Details
    - Creates `idx_inspection_items_marked_for_report` index
    - Uses B-tree indexing for boolean column optimization
    - Improves WHERE clause performance on marked_for_report filtering
*/

CREATE INDEX IF NOT EXISTS idx_inspection_items_marked_for_report 
ON public.inspection_items (marked_for_report);