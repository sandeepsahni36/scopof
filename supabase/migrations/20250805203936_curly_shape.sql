/*
  # Add file_key column to reports table

  1. Schema Changes
    - Add `file_key` column to `reports` table
    - This column will store the MinIO object key for generating pre-signed URLs

  2. Purpose
    - Enable secure access to private report files through pre-signed URLs
    - Fix AccessDenied errors when viewing/downloading reports
    - Maintain security by not exposing direct file URLs

  3. Notes
    - Existing reports without file_key will need to be handled gracefully
    - New reports will include the file_key from the upload process
*/

ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS file_key text;

-- Add index for performance when querying by file_key
CREATE INDEX IF NOT EXISTS idx_reports_file_key ON public.reports (file_key);