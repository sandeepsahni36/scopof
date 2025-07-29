/*
  # Minimal Storage Migration - Tables Only
  
  Just create the basic tables first, no fancy stuff
*/

-- Drop existing tables first
DROP TABLE IF EXISTS file_metadata CASCADE;
DROP TABLE IF EXISTS storage_usage CASCADE; 
DROP TABLE IF EXISTS storage_quotas CASCADE;

-- Storage quotas by tier (create first due to foreign key)
CREATE TABLE storage_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL UNIQUE,
  quota_bytes bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Storage usage tracking table
CREATE TABLE storage_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
  total_bytes bigint DEFAULT 0,
  photos_bytes bigint DEFAULT 0,
  reports_bytes bigint DEFAULT 0,
  file_count integer DEFAULT 0,
  last_calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- File metadata tracking
CREATE TABLE file_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
  file_key text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  inspection_id uuid REFERENCES inspections(id) ON DELETE CASCADE,
  inspection_item_id uuid REFERENCES inspection_items(id) ON DELETE SET NULL,
  s3_bucket text NOT NULL,
  s3_region text NOT NULL,
  upload_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default quotas
INSERT INTO storage_quotas (tier, quota_bytes) VALUES
  ('starter', 2147483648),
  ('professional', 5368709120),
  ('enterprise', 10737418240)
ON CONFLICT (tier) DO UPDATE SET quota_bytes = EXCLUDED.quota_bytes;

-- Basic indexes
CREATE INDEX idx_storage_usage_admin_id ON storage_usage(admin_id);
CREATE INDEX idx_file_metadata_admin_id ON file_metadata(admin_id);
CREATE INDEX idx_file_metadata_inspection_id ON file_metadata(inspection_id);