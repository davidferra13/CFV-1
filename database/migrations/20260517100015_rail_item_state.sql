-- Rail Item State Table
-- Persistence layer for rail item states: seen, snoozed, dismissed, resolved.
-- Without this, every rail item reappears fresh on every page load.
-- This adds memory to the rail system.

CREATE TABLE IF NOT EXISTS rail_item_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  item_key TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'surfaced'
    CHECK (state IN ('surfaced', 'seen', 'acted', 'snoozed', 'dismissed', 'resolved', 'expired', 'archived')),
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id, item_key)
);

-- Primary lookup: filter by user + tenant + active states
CREATE INDEX idx_rail_item_states_user_state
  ON rail_item_states(tenant_id, user_id, state);

-- Snooze expiry: find items whose snooze has lapsed
CREATE INDEX idx_rail_item_states_snooze
  ON rail_item_states(snoozed_until)
  WHERE state = 'snoozed' AND snoozed_until IS NOT NULL;

-- Cleanup: resolved/expired items for periodic archival
CREATE INDEX idx_rail_item_states_cleanup
  ON rail_item_states(state, updated_at)
  WHERE state IN ('resolved', 'expired', 'archived');
