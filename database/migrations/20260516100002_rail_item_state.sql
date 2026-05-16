CREATE TABLE IF NOT EXISTS rail_item_state (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'surfaced',
  snoozed_until TIMESTAMPTZ,
  seen_at TIMESTAMPTZ,
  acted_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, item_key)
);

CREATE INDEX idx_rail_item_state_lookup ON rail_item_state(tenant_id, user_id, item_key);
CREATE INDEX idx_rail_item_state_cleanup ON rail_item_state(state, resolved_at) WHERE state IN ('resolved', 'expired');
