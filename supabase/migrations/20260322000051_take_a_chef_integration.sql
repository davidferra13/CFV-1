-- TakeAChef Gmail Integration — External platform tracking for deduplication & linking
-- Adds columns to inquiries for tracking external platform IDs and direct links,
-- plus platform_email_type to gmail_sync_log for TakeAChef email routing audit.

-- 1. External inquiry tracking on inquiries table
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS external_inquiry_id TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS external_platform TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS external_link TEXT;

-- Unique dedup index: one inquiry per external platform ID per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_inquiries_external_dedup
  ON inquiries(tenant_id, external_platform, external_inquiry_id)
  WHERE external_inquiry_id IS NOT NULL;

-- 2. Platform email type on gmail_sync_log for routing audit
ALTER TABLE gmail_sync_log ADD COLUMN IF NOT EXISTS platform_email_type TEXT;

-- 3. Index for efficient TakeAChef inquiry lookups (channel + date + name matching)
CREATE INDEX IF NOT EXISTS idx_inquiries_take_a_chef_lookup
  ON inquiries(tenant_id, channel)
  WHERE channel = 'take_a_chef';
