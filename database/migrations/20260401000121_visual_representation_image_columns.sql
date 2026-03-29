-- Visual Representation Strategy (Phase 1 + Phase 2)
-- Adds image_url columns to entities that need visual representation
-- All columns are nullable TEXT (URLs), purely additive, no data loss risk

-- Phase 1A: Ingredient images (bridged from OpenClaw catalog or chef-uploaded)
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Phase 2A: Client avatars
ALTER TABLE clients ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Phase 2B: Staff member photos
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Phase 2C: Vendor logos
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Phase 2D: Equipment photos (table may not exist yet; wrapped in DO block)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_inventory') THEN
    ALTER TABLE equipment_inventory ADD COLUMN IF NOT EXISTS photo_url TEXT;
  END IF;
END $$;
