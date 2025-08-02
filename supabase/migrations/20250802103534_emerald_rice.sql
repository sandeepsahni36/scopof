/*
  # Populate Storage Quotas for Subscription Tiers

  1. Data Population
    - Insert storage quota limits for each subscription tier
    - Starter: 2 GB storage limit
    - Professional: 5 GB storage limit  
    - Enterprise: 50 GB storage limit

  2. Purpose
    - Enables tier-based storage enforcement in the storage-api Edge Function
    - Provides clear storage limits for each subscription plan
    - Supports usage tracking and quota enforcement
*/

-- Insert storage quotas for each tier
INSERT INTO storage_quotas (tier, quota_bytes) VALUES
  ('starter', 2147483648),      -- 2 GB in bytes
  ('professional', 5368709120), -- 5 GB in bytes
  ('enterprise', 53687091200)   -- 50 GB in bytes
ON CONFLICT (tier) DO UPDATE SET
  quota_bytes = EXCLUDED.quota_bytes;