/*
  # Create Storage Buckets for scopoStay

  1. Storage Buckets
    - `inspection-photos` - For storing inspection images uploaded during property inspections
    - `inspection-reports` - For storing generated PDF inspection reports

  2. Security
    - Enable RLS on storage buckets
    - Add policies for authenticated users to upload and access their organization's files

  3. Configuration
    - Set appropriate file size limits and allowed file types
    - Configure public access for photos and restricted access for reports
*/

-- Create inspection-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-photos',
  'inspection-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create inspection-reports bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-reports',
  'inspection-reports',
  false,
  52428800, -- 50MB limit for PDF reports
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for inspection photos - authenticated users can upload and view photos for their organization
CREATE POLICY "inspection_photos_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'inspection-photos' AND
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN properties p ON i.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      JOIN team_members tm ON tm.admin_id = a.id
      WHERE tm.profile_id = auth.uid()
      AND (storage.foldername(name))[1] = 'inspections'
      AND (storage.foldername(name))[2] = i.id::text
    )
  );

CREATE POLICY "inspection_photos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'inspection-photos' AND
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN properties p ON i.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      JOIN team_members tm ON tm.admin_id = a.id
      WHERE tm.profile_id = auth.uid()
      AND (storage.foldername(name))[1] = 'inspections'
      AND (storage.foldername(name))[2] = i.id::text
    )
  );

-- Policy for inspection reports - authenticated users can upload and view reports for their organization
CREATE POLICY "inspection_reports_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'inspection-reports' AND
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN properties p ON i.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      JOIN team_members tm ON tm.admin_id = a.id
      WHERE tm.profile_id = auth.uid()
      AND (storage.foldername(name))[1] = 'reports'
      AND (storage.foldername(name))[2] = i.id::text
    )
  );

CREATE POLICY "inspection_reports_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'inspection-reports' AND
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN properties p ON i.property_id = p.id
      JOIN admin a ON p.admin_id = a.id
      JOIN team_members tm ON tm.admin_id = a.id
      WHERE tm.profile_id = auth.uid()
      AND (storage.foldername(name))[1] = 'reports'
      AND (storage.foldername(name))[2] = i.id::text
    )
  );

-- Allow public access to inspection photos (for viewing in reports)
CREATE POLICY "inspection_photos_public_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'inspection-photos');