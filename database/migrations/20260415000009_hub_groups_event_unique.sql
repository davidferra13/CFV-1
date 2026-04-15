-- Prevent duplicate circles per event.
-- ensureCircleForEvent has a TOCTOU check-then-create window; without a constraint,
-- two concurrent payment confirmations could insert two circles for the same event.
-- A partial unique index on event_id (where not null) is the correct DB-level guard.

CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_groups_event_unique
  ON hub_groups(event_id)
  WHERE event_id IS NOT NULL;
