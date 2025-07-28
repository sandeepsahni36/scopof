/*
  # Storage Tracking and Management Schema - Clean Migration

  1. Drop existing tables first
  2. Create new tables with proper structure
  3. Enable RLS and add policies
  4. Create functions and triggers
*/

-- Drop existing tables first (CASCADE removes dependent objects)
DROP TABLE IF EXISTS file_metadata CASCADE;
DROP TABLE IF EXISTS storage_usage CASCADE; 
DROP TABLE IF EXISTS storage_quotas CASCADE;

-- Storage quotas by tier
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
  file_key text NOT NULL, -- S3 object key
  file_name text NOT NULL,
  file_type text NOT NULL, -- 'photo' or 'report'
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  inspection_id uuid REFERENCES inspections(id) ON DELETE CASCADE,
  inspection_item_id uuid REFERENCES inspection_items(id) ON DELETE SET NULL,
  s3_bucket text NOT NULL,
  s3_region text NOT NULL,
  upload_status text DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default quotas
INSERT INTO storage_quotas (tier, quota_bytes) VALUES
  ('starter', 2147483648),    -- 2GB
  ('professional', 5368709120), -- 5GB
  ('enterprise', 10737418240)   -- 10GB
ON CONFLICT (tier) DO UPDATE SET quota_bytes = EXCLUDED.quota_bytes;

-- Indexes for performance
CREATE INDEX idx_storage_usage_admin_id ON storage_usage(admin_id);
CREATE INDEX idx_file_metadata_admin_id ON file_metadata(admin_id);
CREATE INDEX idx_file_metadata_inspection_id ON file_metadata(inspection_id);
CREATE INDEX idx_file_metadata_file_type ON file_metadata(file_type);
CREATE INDEX idx_file_metadata_upload_status ON file_metadata(upload_status);

-- Enable RLS
ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_quotas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for storage_usage
CREATE POLICY "storage_usage_admin_access" ON storage_usage
  FOR ALL TO authenticated
  USING (
    admin_id IN (
      SELECT a.id FROM admin a 
      WHERE a.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid() 
        AND tm.role IN ('owner', 'admin')
      )
    )
  )
  WITH CHECK (
    admin_id IN (
      SELECT a.id FROM admin a 
      WHERE a.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid() 
        AND tm.role IN ('owner', 'admin')
      )
    )
  );

-- RLS Policies for file_metadata
CREATE POLICY "file_metadata_admin_access" ON file_metadata
  FOR ALL TO authenticated
  USING (
    admin_id IN (
      SELECT a.id FROM admin a 
      WHERE a.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    admin_id IN (
      SELECT a.id FROM admin a 
      WHERE a.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.admin_id = a.id 
        AND tm.profile_id = auth.uid() 
        AND tm.role IN ('owner', 'admin')
      )
    )
  );

-- RLS Policies for storage_quotas (read-only for authenticated users)
CREATE POLICY "storage_quotas_read_access" ON storage_quotas
  FOR SELECT TO authenticated
  USING (true);

-- Function to calculate storage usage
CREATE OR REPLACE FUNCTION calculate_storage_usage(target_admin_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO storage_usage (admin_id, total_bytes, photos_bytes, reports_bytes, file_count, last_calculated_at)
  SELECT 
    target_admin_id,
    COALESCE(SUM(file_size), 0) as total_bytes,
    COALESCE(SUM(CASE WHEN file_type = 'photo' THEN file_size ELSE 0 END), 0) as photos_bytes,
    COALESCE(SUM(CASE WHEN file_type = 'report' THEN file_size ELSE 0 END), 0) as reports_bytes,
    COUNT(*) as file_count,
    now()
  FROM file_metadata 
  WHERE admin_id = target_admin_id 
  AND upload_status = 'completed'
  ON CONFLICT (admin_id) DO UPDATE SET
    total_bytes = EXCLUDED.total_bytes,
    photos_bytes = EXCLUDED.photos_bytes,
    reports_bytes = EXCLUDED.reports_bytes,
    file_count = EXCLUDED.file_count,
    last_calculated_at = EXCLUDED.last_calculated_at,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to check storage quota
CREATE OR REPLACE FUNCTION check_storage_quota(target_admin_id uuid, additional_bytes bigint DEFAULT 0)
RETURNS boolean AS $$
DECLARE
  current_usage bigint;
  tier_quota bigint;
  admin_tier text;
BEGIN
  -- Get admin tier
  SELECT subscription_tier INTO admin_tier
  FROM admin 
  WHERE id = target_admin_id;
  
  -- Get quota for tier
  SELECT quota_bytes INTO tier_quota
  FROM storage_quotas 
  WHERE tier = admin_tier;
  
  -- Get current usage
  SELECT COALESCE(total_bytes, 0) INTO current_usage
  FROM storage_usage 
  WHERE admin_id = target_admin_id;
  
  -- Check if adding additional bytes would exceed quota
  RETURN (current_usage + additional_bytes) <= tier_quota;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update storage usage when files are added/removed
CREATE OR REPLACE FUNCTION update_storage_usage_trigger()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.upload_status = 'completed' THEN
    PERFORM calculate_storage_usage(NEW.admin_id);
  ELSIF TG_OP = 'UPDATE' AND OLD.upload_status != 'completed' AND NEW.upload_status = 'completed' THEN
    PERFORM calculate_storage_usage(NEW.admin_id);
  ELSIF TG_OP = 'DELETE' AND OLD.upload_status = 'completed' THEN
    PERFORM calculate_storage_usage(OLD.admin_id);
  ELSIF TG_OP = 'UPDATE' AND OLD.upload_status = 'completed' AND NEW.upload_status != 'completed' THEN
    PERFORM calculate_storage_usage(NEW.admin_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER file_metadata_storage_trigger
  AFTER INSERT OR UPDATE OR DELETE ON file_metadata
  FOR EACH ROW EXECUTE FUNCTION update_storage_usage_trigger();

-- Updated timestamp triggers
CREATE TRIGGER update_storage_usage_updated_at
  BEFORE UPDATE ON storage_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_metadata_updated_at
  BEFORE UPDATE ON file_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_storage_quotas_updated_at
  BEFORE UPDATE ON storage_quotas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();