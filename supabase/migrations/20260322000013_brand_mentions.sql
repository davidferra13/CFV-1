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

ALTER TABLE chef_brand_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_mentions_own_tenant" ON chef_brand_mentions
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_brand_mentions_tenant ON chef_brand_mentions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_brand_mentions_reviewed ON chef_brand_mentions(tenant_id, is_reviewed);
CREATE INDEX IF NOT EXISTS idx_brand_mentions_sentiment ON chef_brand_mentions(tenant_id, sentiment);
