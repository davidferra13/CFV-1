-- ============================================================
-- Migration: Menu cost snapshot columns on events
-- Fixes: A3 - cost not snapshotted at quote send time
-- ============================================================
-- When a chef transitions an event from draft -> proposed (sends the quote),
-- we stamp the current menu food cost so price drift from later ingredient
-- updates doesn't silently change what was quoted.
--
-- Separate from events.estimated_food_cost_cents, which is written by the
-- grocery pricing engine and serves a different calculation path.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS menu_cost_snapshot_cents INTEGER,
  ADD COLUMN IF NOT EXISTS menu_cost_snapshot_at    TIMESTAMPTZ;

COMMENT ON COLUMN events.menu_cost_snapshot_cents IS
  'Food cost (cents) computed from the linked menu at the moment the event was proposed. '
  'Set once on draft->proposed transition. NULL if no menu was linked at proposal time.';

COMMENT ON COLUMN events.menu_cost_snapshot_at IS
  'Timestamp of the last menu_cost_snapshot_cents computation. '
  'If menus.updated_at > this value, the snapshot is stale relative to the current menu.';
