-- Brand Mention Monitoring: track web/social mentions for reputation management
CREATE TABLE IF NOT EXISTS chef_brand_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  source TEXT CHECK (source IN ('google','yelp','web','social','news','other')),
  title TEXT,
  excerpt TEXT,
  source_url TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive','neutral','negative')),
  is_reviewed BOOLEAN DEFAULT FALSE,
  found_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add tenant_id if it doesn't exist (table may have been created with chef_id instead)
ALTER TABLE chef_brand_mentions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE;
-- Backfill tenant_id from chef_id if chef_id column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chef_brand_mentions' AND column_name = 'chef_id') THEN
    UPDATE chef_brand_mentions SET tenant_id = chef_id WHERE tenant_id IS NULL;
  END IF;
END $$;
-- Ensure all columns exist if table was pre-created with fewer columns
ALTER TABLE chef_brand_mentions ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE chef_brand_mentions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE chef_brand_mentions ADD COLUMN IF NOT EXISTS excerpt TEXT;
ALTER TABLE chef_brand_mentions ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE chef_brand_mentions ADD COLUMN IF NOT EXISTS sentiment TEXT;
ALTER TABLE chef_brand_mentions ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT FALSE;
ALTER TABLE chef_brand_mentions ADD COLUMN IF NOT EXISTS found_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE chef_brand_mentions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE chef_brand_mentions ENABLE ROW LEVEL SECURITY;
-- Drop existing policy if present, then recreate
DROP POLICY IF EXISTS "chef_mentions_own_tenant" ON chef_brand_mentions;
CREATE POLICY "chef_mentions_own_tenant" ON chef_brand_mentions
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );
CREATE INDEX IF NOT EXISTS idx_brand_mentions_tenant ON chef_brand_mentions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_brand_mentions_reviewed ON chef_brand_mentions(tenant_id, is_reviewed);
CREATE INDEX IF NOT EXISTS idx_brand_mentions_sentiment ON chef_brand_mentions(tenant_id, sentiment);
