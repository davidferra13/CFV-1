-- Rail Engagement Log: tracks user interactions with rail items
-- Used by the affinity computer to weight future rail assemblies

CREATE TABLE IF NOT EXISTS rail_engagement_log (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  item_source TEXT NOT NULL,
  action_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rail_engagement_log_lookup
  ON rail_engagement_log (tenant_id, user_id, item_source, created_at);
