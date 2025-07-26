-- Storage Buckets Creation Guide
-- 
-- NOTE: Storage buckets cannot be created via SQL migrations in Supabase.
-- They must be created through the Supabase Dashboard.
--
-- Please follow these steps in your Supabase Dashboard:
--
-- 1. Go to Storage in the left sidebar
-- 2. Click "Create a new bucket"
-- 3. Create the following buckets:
--
-- BUCKET 1: inspection-photos
-- - Name: inspection-photos
-- - Public bucket: Yes (for easy access in reports)
-- - File size limit: 5MB
-- - Allowed MIME types: image/jpeg, image/png, image/webp
--
-- BUCKET 2: inspection-reports  
-- - Name: inspection-reports
-- - Public bucket: No (private, authenticated access only)
-- - File size limit: 50MB
-- - Allowed MIME types: application/pdf
--
-- After creating the buckets, the RLS policies below will be automatically applied
-- by Supabase based on the bucket settings.

-- RLS Policies for inspection-photos bucket (if needed for custom access control)
-- These are optional since the bucket is public

-- Policy for inspection-reports bucket (private bucket)
-- Users can only access reports from their own organization
-- This policy will be applied automatically by Supabase for private buckets

SELECT 'Storage buckets must be created manually through Supabase Dashboard' as instruction;