-- Discovery location search columns for chef_marketplace_profiles.
-- Table chef_marketplace_profiles does not exist yet; wrap in DO block to skip safely.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chef_marketplace_profiles') THEN
    ALTER TABLE chef_marketplace_profiles
      ADD COLUMN IF NOT EXISTS service_area_zip TEXT,
      ADD COLUMN IF NOT EXISTS service_area_lat DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS service_area_lng DOUBLE PRECISION;

    CREATE INDEX IF NOT EXISTS idx_chef_marketplace_profiles_zip
      ON chef_marketplace_profiles(service_area_zip);

    CREATE INDEX IF NOT EXISTS idx_chef_marketplace_profiles_coords
      ON chef_marketplace_profiles(service_area_lat, service_area_lng)
      WHERE service_area_lat IS NOT NULL AND service_area_lng IS NOT NULL;
  END IF;
END $$;
