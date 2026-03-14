-- Migration: Add transport_category to components
-- Determines which packing zone a prepped component goes into
-- Zones: cold (cooler/perishable), frozen (cooler/last in), room_temp, fragile, liquid
--
-- This is purely additive: new nullable column with a safe default.
-- Existing components default to 'room_temp' (safest assumption — no refrigeration
-- needed and no fragility risk) until the chef assigns the correct zone.
-- Chefs assign transport_category when building menus, or after the fact.

ALTER TABLE components
  ADD COLUMN IF NOT EXISTS transport_category TEXT
  CHECK (transport_category IN ('cold', 'frozen', 'room_temp', 'fragile', 'liquid'))
  DEFAULT 'room_temp';
COMMENT ON COLUMN components.transport_category IS
  'Packing transport zone for make-ahead components. '
  'cold = cooler/perishable, frozen = cooler/pack-last, '
  'room_temp = dry goods bag, fragile = own padded container, liquid = lidded upright in cooler. '
  'Only relevant for is_make_ahead = true components.';
