/*
  # Storage RLS Policies and Corrected Triggers

  1. New Tables
    - `storage_quotas` - Defines storage limits for each subscription tier
    - `storage_usage` - Tracks current storage usage per admin/company
    - `file_metadata` - Stores metadata for uploaded files (MinIO integration)

  2. Security
    - Enable RLS on all storage tables
    - Add policies for tier-based quota access
    - Add policies for admin/team member file access
    - Add policies for company-specific storage usage access

  3. Triggers
    - Corrected `update_storage_usage_trigger` function to properly handle file count updates
    - Automatic storage usage tracking when files are added/removed/modified

  4. Initial Data
    - Populate storage quotas for starter, professional, and enterprise tiers
*/

-- Create storage_quotas table
CREATE TABLE IF NOT EXISTS public.storage_quotas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tier text NOT NULL UNIQUE,
    quota_bytes bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for storage_quotas
ALTER TABLE public.storage_quotas ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to select their own tier's quota
CREATE POLICY "storage_quotas_select_own_tier" ON public.storage_quotas
FOR SELECT USING (
    tier = (
        SELECT a.subscription_tier
        FROM public.admin a
        WHERE a.owner_id = auth.uid()
        LIMIT 1
    )
);

-- Add initial data for storage quotas
INSERT INTO public.storage_quotas (tier, quota_bytes) VALUES
('starter', 2147483648),      -- 2 GB
('professional', 5368709120), -- 5 GB
('enterprise', 53687091200)   -- 50 GB (updated from 10 GB to match current system)
ON CONFLICT (tier) DO UPDATE SET
    quota_bytes = EXCLUDED.quota_bytes,
    updated_at = now();

-- Create storage_usage table
CREATE TABLE IF NOT EXISTS public.storage_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL UNIQUE REFERENCES public.admin(id) ON DELETE CASCADE,
    total_bytes bigint DEFAULT 0,
    photos_bytes bigint DEFAULT 0,
    reports_bytes bigint DEFAULT 0,
    file_count integer DEFAULT 0,
    last_calculated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_storage_usage_admin_id ON public.storage_usage (admin_id);

-- Enable RLS for storage_usage
ALTER TABLE public.storage_usage ENABLE ROW LEVEL SECURITY;

-- Policy for storage_usage (admin/owner access)
CREATE POLICY "storage_usage_admin_access" ON public.storage_usage
FOR ALL USING (
    admin_id IN (
        SELECT a.id
        FROM admin a
        WHERE (a.owner_id = auth.uid()) OR (EXISTS (
            SELECT 1
            FROM team_members tm
            WHERE (tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))
        ))
    )
) WITH CHECK (
    admin_id IN (
        SELECT a.id
        FROM admin a
        WHERE (a.owner_id = auth.uid()) OR (EXISTS (
            SELECT 1
            FROM team_members tm
            WHERE (tm.admin_id = a.id) AND (tm.profile_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))
        ))
    )
);

-- Create file_metadata table (if not exists)
CREATE TABLE IF NOT EXISTS public.file_metadata (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL REFERENCES public.admin(id) ON DELETE CASCADE,
    file_key text NOT NULL,
    file_name text NOT NULL,
    file_type text NOT NULL,
    file_size bigint NOT NULL,
    mime_type text NOT NULL,
    inspection_id uuid REFERENCES public.inspections(id) ON DELETE CASCADE,
    inspection_item_id uuid REFERENCES public.inspection_items(id) ON DELETE SET NULL,
    s3_bucket text NOT NULL,
    s3_region text NOT NULL,
    upload_status text DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_file_metadata_admin_id ON public.file_metadata (admin_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_file_type ON public.file_metadata (file_type);
CREATE INDEX IF NOT EXISTS idx_file_metadata_inspection_id ON public.file_metadata (inspection_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_upload_status ON public.file_metadata (upload_status);

-- Enable RLS for file_metadata
ALTER TABLE public.file_metadata ENABLE ROW LEVEL SECURITY;

-- Policy for file_metadata (admin/team member access) with WITH CHECK clause
CREATE POLICY "file_metadata_admin_access" ON public.file_metadata
FOR ALL USING (
    admin_id IN (
        SELECT a.id
        FROM admin a
        WHERE (a.owner_id = auth.uid()) OR (EXISTS (
            SELECT 1
            FROM team_members tm
            WHERE (tm.admin_id = a.id) AND (tm.profile_id = auth.uid())
        ))
    )
) WITH CHECK (
    admin_id IN (
        SELECT a.id
        FROM admin a
        WHERE (a.owner_id = auth.uid()) OR (EXISTS (
            SELECT 1
            FROM team_members tm
            WHERE (tm.admin_id = a.id) AND (tm.profile_id = auth.uid())
        ))
    )
);

-- Corrected storage usage trigger function
CREATE OR REPLACE FUNCTION update_storage_usage_trigger()
RETURNS TRIGGER AS $$
DECLARE
    _admin_id uuid;
    _total_bytes_delta bigint := 0;
    _photos_bytes_delta bigint := 0;
    _reports_bytes_delta bigint := 0;
    _file_count_delta integer := 0;
BEGIN
    IF TG_OP = 'INSERT' THEN
        _admin_id := NEW.admin_id;
        _total_bytes_delta := NEW.file_size;
        _file_count_delta := 1;
        IF NEW.file_type = 'photo' THEN
            _photos_bytes_delta := NEW.file_size;
        ELSIF NEW.file_type = 'report' THEN
            _reports_bytes_delta := NEW.file_size;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        _admin_id := OLD.admin_id;
        _total_bytes_delta := -OLD.file_size;
        _file_count_delta := -1;
        IF OLD.file_type = 'photo' THEN
            _photos_bytes_delta := -OLD.file_size;
        ELSIF OLD.file_type = 'report' THEN
            _reports_bytes_delta := -OLD.file_size;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        _admin_id := NEW.admin_id;
        
        -- Calculate deltas for size and type changes
        _total_bytes_delta := NEW.file_size - OLD.file_size;

        -- Photos bytes delta
        IF NEW.file_type = 'photo' AND OLD.file_type != 'photo' THEN
            _photos_bytes_delta := NEW.file_size; -- New photo, add full size
        ELSIF NEW.file_type != 'photo' AND OLD.file_type = 'photo' THEN
            _photos_bytes_delta := -OLD.file_size; -- Old photo, remove full size
        ELSIF NEW.file_type = 'photo' AND OLD.file_type = 'photo' THEN
            _photos_bytes_delta := NEW.file_size - OLD.file_size; -- Photo to photo, update size
        END IF;

        -- Reports bytes delta
        IF NEW.file_type = 'report' AND OLD.file_type != 'report' THEN
            _reports_bytes_delta := NEW.file_size; -- New report, add full size
        ELSIF NEW.file_type != 'report' AND OLD.file_type = 'report' THEN
            _reports_bytes_delta := -OLD.file_size; -- Old report, remove full size
        ELSIF NEW.file_type = 'report' AND OLD.file_type = 'report' THEN
            _reports_bytes_delta := NEW.file_size - OLD.file_size; -- Report to report, update size
        END IF;

        -- file_count does not change on UPDATE of an existing file
        _file_count_delta := 0;

        -- If no actual change in relevant fields, return early
        IF _total_bytes_delta = 0 AND _photos_bytes_delta = 0 AND _reports_bytes_delta = 0 THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Perform the upsert operation with calculated deltas
    INSERT INTO public.storage_usage (admin_id, total_bytes, photos_bytes, reports_bytes, file_count, last_calculated_at)
    VALUES (_admin_id, _total_bytes_delta, _photos_bytes_delta, _reports_bytes_delta, _file_count_delta, now())
    ON CONFLICT (admin_id) DO UPDATE SET
        total_bytes = public.storage_usage.total_bytes + EXCLUDED.total_bytes,
        photos_bytes = public.storage_usage.photos_bytes + EXCLUDED.photos_bytes,
        reports_bytes = public.storage_usage.reports_bytes + EXCLUDED.reports_bytes,
        file_count = public.storage_usage.file_count + EXCLUDED.file_count,
        last_calculated_at = EXCLUDED.last_calculated_at;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for file_metadata table
DROP TRIGGER IF EXISTS update_storage_usage_trigger ON public.file_metadata;
CREATE TRIGGER update_storage_usage_trigger
AFTER INSERT OR DELETE OR UPDATE ON public.file_metadata
FOR EACH ROW EXECUTE FUNCTION update_storage_usage_trigger();

-- Add updated_at triggers for storage tables
CREATE TRIGGER update_storage_quotas_updated_at
BEFORE UPDATE ON public.storage_quotas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_storage_usage_updated_at
BEFORE UPDATE ON public.storage_usage
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_metadata_updated_at
BEFORE UPDATE ON public.file_metadata
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();