-- Universal Rail: impression tracking per user per item
CREATE TABLE IF NOT EXISTS rail_impressions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT,
  item_definition_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('public', 'guest', 'client', 'chef', 'staff', 'partner', 'admin')),
  impression_count INTEGER NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, item_definition_id)
);

-- Universal Rail: dismissal state per user per item
CREATE TABLE IF NOT EXISTS rail_dismissals (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT,
  item_definition_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('public', 'guest', 'client', 'chef', 'staff', 'partner', 'admin')),
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dismiss_type TEXT NOT NULL DEFAULT 'permanent' CHECK (dismiss_type IN ('permanent', 'snooze_1h', 'snooze_24h', 'until_resolved')),
  snooze_until TIMESTAMPTZ,
  UNIQUE (user_id, item_definition_id)
);

-- Universal Rail: saved/pinned items per user
CREATE TABLE IF NOT EXISTS rail_saved_items (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT,
  item_definition_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('public', 'guest', 'client', 'chef', 'staff', 'partner', 'admin')),
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (user_id, item_definition_id)
);

-- Universal Rail: audit log for rail interactions
CREATE TABLE IF NOT EXISTS rail_audit_events (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT,
  item_definition_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('public', 'guest', 'client', 'chef', 'staff', 'partner', 'admin')),
  event TEXT NOT NULL CHECK (event IN ('impression', 'click', 'dismiss', 'snooze', 'save', 'unsave', 'pin', 'unpin', 'expand', 'hover')),
  page_context TEXT,
  metadata JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Universal Rail: per-user rail preferences (weights, enabled categories)
CREATE TABLE IF NOT EXISTS rail_user_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT,
  role TEXT NOT NULL CHECK (role IN ('public', 'guest', 'client', 'chef', 'staff', 'partner', 'admin')),
  weight_overrides JSONB DEFAULT '{}',
  disabled_categories TEXT[] DEFAULT '{}',
  disabled_item_ids TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_rail_impressions_user_role ON rail_impressions (user_id, role);
CREATE INDEX IF NOT EXISTS idx_rail_impressions_item ON rail_impressions (item_definition_id);
CREATE INDEX IF NOT EXISTS idx_rail_dismissals_user ON rail_dismissals (user_id, role);
CREATE INDEX IF NOT EXISTS idx_rail_dismissals_snooze ON rail_dismissals (snooze_until) WHERE snooze_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rail_saved_user ON rail_saved_items (user_id, role);
CREATE INDEX IF NOT EXISTS idx_rail_audit_user ON rail_audit_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_rail_audit_item ON rail_audit_events (item_definition_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_rail_prefs_user ON rail_user_preferences (user_id);
