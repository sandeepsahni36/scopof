/*
  # Add unique constraint to storage_usage.admin_id

  1. Database Changes
    - Add unique constraint to `storage_usage.admin_id` column
    - This ensures each admin has only one storage usage record
    - Enables proper ON CONFLICT handling in storage usage triggers

  2. Purpose
    - Fixes "there is no unique or exclusion constraint matching the ON CONFLICT specification" error
    - Allows storage usage tracking to work correctly when files are uploaded/deleted
    - Maintains data integrity for storage usage calculations

  3. Impact
    - Resolves file upload failures in storage-api Edge Function
    - Enables proper storage quota enforcement
    - No breaking changes to existing functionality
*/

-- Add unique constraint to admin_id column in storage_usage table
ALTER TABLE public.storage_usage 
ADD CONSTRAINT storage_usage_admin_id_unique UNIQUE (admin_id);