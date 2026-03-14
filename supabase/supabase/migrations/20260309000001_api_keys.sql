-- Public API keys for chef REST API access
CREATE TABLE IF NOT EXISTS chef_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of the key
  key_prefix TEXT NOT NULL, -- first 8 chars for display: "cf_live_..."
  scopes TEXT[] DEFAULT ARRAY['events:read', 'clients:read'],
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON chef_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON chef_api_keys(key_hash);

ALTER TABLE chef_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chef owns api keys" ON chef_api_keys
  FOR ALL USING (tenant_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
