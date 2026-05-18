CREATE TABLE IF NOT EXISTS rail_engagement_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  item_source TEXT NOT NULL,
  item_category TEXT NOT NULL,
  action_type TEXT NOT NULL,
  item_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rail_engagement_source ON rail_engagement_log(tenant_id, user_id, item_source);
CREATE INDEX IF NOT EXISTS idx_rail_engagement_time ON rail_engagement_log(created_at);
