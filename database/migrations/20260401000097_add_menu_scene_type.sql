-- Add scene_type to menus table
-- Captures the occasion/setting context for a menu (e.g. Wedding, Corporate Event, Intimate Dinner)
-- Fully additive, no data loss risk

ALTER TABLE menus ADD COLUMN IF NOT EXISTS scene_type TEXT;
