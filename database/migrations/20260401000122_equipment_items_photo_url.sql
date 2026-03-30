-- Fix: Add photo_url to equipment_items (the correct table)
-- The previous migration (000121) targeted equipment_inventory which does not exist.
-- equipment_items is the actual equipment tracking table.
ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS photo_url TEXT;
