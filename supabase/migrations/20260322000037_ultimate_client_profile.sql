-- Ultimate Client Profile
-- Adds comprehensive fields for the full client dossier.
-- All new columns are nullable — purely additive, zero risk.
-- Chef-only internal fields are marked with COMMENT.

-- === Social / Digital ===
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
  ADD COLUMN IF NOT EXISTS social_media_links JSONB DEFAULT '[]'::jsonb;
-- social_media_links: [{platform: "facebook", url: "..."}]

COMMENT ON COLUMN clients.instagram_handle IS 'Public Instagram handle for tagging/DMing';
COMMENT ON COLUMN clients.social_media_links IS 'Array of {platform, url} objects';
-- === Demographics ===
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS anniversary DATE;
COMMENT ON COLUMN clients.birthday IS 'Top-level DATE for birthday reminders (queryable)';
COMMENT ON COLUMN clients.anniversary IS 'Top-level DATE for anniversary reminders (queryable)';
-- === Pets (critical for in-home service) ===
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS pets JSONB DEFAULT '[]'::jsonb;
-- pets: [{name: "Max", type: "dog", notes: "jumps on guests"}]

COMMENT ON COLUMN clients.pets IS 'Array of {name, type, notes} — important for in-home cooking safety';
-- === Security / Access (chef-only) ===
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS gate_code TEXT,
  ADD COLUMN IF NOT EXISTS wifi_password TEXT,
  ADD COLUMN IF NOT EXISTS security_notes TEXT;
COMMENT ON COLUMN clients.gate_code IS 'Chef-only internal field. NEVER expose to client portal.';
COMMENT ON COLUMN clients.wifi_password IS 'Chef-only internal field. NEVER expose to client portal.';
COMMENT ON COLUMN clients.security_notes IS 'Chef-only internal field. Alarm system, doorman, etc.';
-- === Service Defaults ===
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS preferred_service_style TEXT,
  ADD COLUMN IF NOT EXISTS typical_guest_count TEXT,
  ADD COLUMN IF NOT EXISTS preferred_event_days TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS budget_range_min_cents INTEGER,
  ADD COLUMN IF NOT EXISTS budget_range_max_cents INTEGER,
  ADD COLUMN IF NOT EXISTS cleanup_expectations TEXT,
  ADD COLUMN IF NOT EXISTS leftovers_preference TEXT;
COMMENT ON COLUMN clients.preferred_service_style IS 'Free text: plated, family-style, buffet, tasting, etc.';
COMMENT ON COLUMN clients.typical_guest_count IS 'Free text: "4-6", "8-12", "20+"';
COMMENT ON COLUMN clients.cleanup_expectations IS 'Full kitchen reset, cooking mess only, etc.';
COMMENT ON COLUMN clients.leftovers_preference IS 'Package up, compost, donate, etc.';
-- === Kitchen Extended ===
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS has_dishwasher BOOLEAN,
  ADD COLUMN IF NOT EXISTS outdoor_cooking_notes TEXT,
  ADD COLUMN IF NOT EXISTS nearest_grocery_store TEXT,
  ADD COLUMN IF NOT EXISTS water_quality_notes TEXT,
  ADD COLUMN IF NOT EXISTS available_place_settings INTEGER;
COMMENT ON COLUMN clients.outdoor_cooking_notes IS 'Grill, smoker, pizza oven, fire pit, etc.';
COMMENT ON COLUMN clients.nearest_grocery_store IS 'Name and distance — for last-minute runs';
COMMENT ON COLUMN clients.water_quality_notes IS 'Well, city, filtered, etc.';
-- === Personality / Communication (chef-only assessment) ===
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS formality_level TEXT
    CHECK (formality_level IS NULL OR formality_level IN ('casual', 'semi_formal', 'formal')),
  ADD COLUMN IF NOT EXISTS communication_style_notes TEXT,
  ADD COLUMN IF NOT EXISTS complaint_handling_notes TEXT,
  ADD COLUMN IF NOT EXISTS wow_factors TEXT;
COMMENT ON COLUMN clients.formality_level IS 'Chef-only. Casual, semi-formal, or formal.';
COMMENT ON COLUMN clients.communication_style_notes IS 'Chef-only. How they prefer to communicate.';
COMMENT ON COLUMN clients.complaint_handling_notes IS 'Chef-only. How they handle issues. NEVER expose to client portal.';
COMMENT ON COLUMN clients.wow_factors IS 'Chef-only. What impresses them. "Loves tableside flambe"';
-- === Business Intelligence (chef-only) ===
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS referral_potential TEXT
    CHECK (referral_potential IS NULL OR referral_potential IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS red_flags TEXT,
  ADD COLUMN IF NOT EXISTS acquisition_cost_cents INTEGER;
COMMENT ON COLUMN clients.referral_potential IS 'Chef-only internal field. NEVER expose to client portal.';
COMMENT ON COLUMN clients.red_flags IS 'Chef-only internal field. NEVER expose to client portal.';
COMMENT ON COLUMN clients.acquisition_cost_cents IS 'Chef-only. Cost to acquire this client (marketing spend).';
-- === Indexes for queryable date fields ===
CREATE INDEX IF NOT EXISTS idx_clients_birthday ON clients(tenant_id, birthday)
  WHERE birthday IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_anniversary ON clients(tenant_id, anniversary)
  WHERE anniversary IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_referral_potential ON clients(tenant_id, referral_potential)
  WHERE referral_potential IS NOT NULL;
-- === client_photos table ===
CREATE TABLE IF NOT EXISTS client_photos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  storage_path      TEXT NOT NULL,
  filename_original TEXT NOT NULL DEFAULT '',
  content_type      TEXT NOT NULL,
  size_bytes        BIGINT NOT NULL DEFAULT 0,
  caption           TEXT,
  category          TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('kitchen', 'dining', 'outdoor', 'parking', 'house', 'portrait', 'other')),
  display_order     INTEGER NOT NULL DEFAULT 0,
  uploaded_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
COMMENT ON TABLE client_photos IS 'Site documentation photos (kitchen, dining, parking). Chef-only — clients cannot see these.';
CREATE INDEX IF NOT EXISTS idx_client_photos_client
  ON client_photos (client_id, display_order)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_client_photos_tenant
  ON client_photos (tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;
-- Auto-update updated_at
CREATE TRIGGER client_photos_updated_at
  BEFORE UPDATE ON client_photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- RLS
ALTER TABLE client_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_photos_chef_select ON client_photos
  FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY client_photos_chef_insert ON client_photos
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY client_photos_chef_update ON client_photos
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
-- Clients have NO access to client_photos. These are chef's internal site documentation.

-- === Storage bucket for client photos ===
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-photos', 'client-photos', false, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
-- Storage RLS: path = {tenant_id}/{client_id}/{photo_id}.{ext}
DO $$ BEGIN
  CREATE POLICY "client_photos_chef_upload" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'client-photos'
      AND get_current_user_role() = 'chef'
      AND split_part(name, '/', 1) = get_current_tenant_id()::text
    );
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "client_photos_chef_read" ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'client-photos'
      AND get_current_user_role() = 'chef'
      AND split_part(name, '/', 1) = get_current_tenant_id()::text
    );
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "client_photos_chef_remove" ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'client-photos'
      AND get_current_user_role() = 'chef'
      AND split_part(name, '/', 1) = get_current_tenant_id()::text
    );
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL;
END $$;
