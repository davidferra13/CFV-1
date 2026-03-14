-- Migration: Kitchen Profile Structured Fields on Clients
-- Adds granular kitchen walkthrough fields to the clients table.
-- Survey data: Every chef archetype does a kitchen walkthrough before service.
--   Most common checks: oven reliability, burner count, counter space,
--   refrigeration, plating surfaces, sink access.
-- Existing kitchen_constraints (freetext) + kitchen_size columns are kept.
-- New columns mirror exactly what chefs check during a kitchen walkthrough.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS kitchen_oven_notes          TEXT,
  ADD COLUMN IF NOT EXISTS kitchen_burner_notes        TEXT,
  ADD COLUMN IF NOT EXISTS kitchen_counter_notes       TEXT,
  ADD COLUMN IF NOT EXISTS kitchen_refrigeration_notes TEXT,
  ADD COLUMN IF NOT EXISTS kitchen_plating_notes       TEXT,
  ADD COLUMN IF NOT EXISTS kitchen_sink_notes          TEXT,
  ADD COLUMN IF NOT EXISTS kitchen_profile_updated_at  TIMESTAMPTZ;

COMMENT ON COLUMN clients.kitchen_oven_notes IS 'Oven reliability, quirks, temperature accuracy';
COMMENT ON COLUMN clients.kitchen_burner_notes IS 'Number of working burners, gas vs induction, BTU notes';
COMMENT ON COLUMN clients.kitchen_counter_notes IS 'Counter space availability, prep surface quality';
COMMENT ON COLUMN clients.kitchen_refrigeration_notes IS 'Fridge/freezer space, cooler availability';
COMMENT ON COLUMN clients.kitchen_plating_notes IS 'Surfaces available for plating and staging dishes';
COMMENT ON COLUMN clients.kitchen_sink_notes IS 'Sink access, hot water reliability, drainage notes';
COMMENT ON COLUMN clients.kitchen_profile_updated_at IS 'When kitchen notes were last updated — helps chef know if notes are stale';
