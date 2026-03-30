-- Loyalty Phase 3: base_points_per_event for hybrid earn mode
-- Adds a flat bonus per event that stacks with per_guest/per_dollar/per_event earn modes.
-- When > 0, this creates a hybrid earning model (e.g., 50 base + 10 pts/guest).
-- Default 0 means no change to existing behavior.

ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS base_points_per_event integer DEFAULT 0;
