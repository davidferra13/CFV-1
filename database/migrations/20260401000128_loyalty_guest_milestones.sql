-- Phase 2: Guest-count milestone configuration
-- Parallel to event-count milestone_bonuses, allows chefs to set cumulative guest milestones
-- Example: [{"guests": 10, "bonus": 200}, {"guests": 50, "bonus": 500}]

ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS guest_milestones jsonb DEFAULT '[]';
