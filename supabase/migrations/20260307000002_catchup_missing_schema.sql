-- ============================================================
-- Catch-up migration: apply SQL from 4 migrations that were
-- marked as "applied" via repair but whose SQL was never run.
--
-- Sources:
--   20260303000021_onboarding_and_stripe_connect.sql
--   20260303000022_event_surveys.sql
--   20260304000010_chef_logo.sql
--   20260305000009_dish_photos.sql
--
-- All statements use IF NOT EXISTS / ON CONFLICT guards so
-- this is safe to run even if partial changes exist.
-- ============================================================

-- ── From 20260303000021: Onboarding + Stripe Connect ─────────────────────────

ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ DEFAULT NULL;
-- Backfill: mark all existing chefs as having completed onboarding.
UPDATE chefs
  SET onboarding_completed_at = now()
  WHERE onboarding_completed_at IS NULL;
ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_chefs_stripe_account_id
  ON chefs(stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;
-- ── From 20260303000022: Event Surveys ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_surveys (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  tenant_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  token                 UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  overall_rating        SMALLINT CHECK (overall_rating BETWEEN 1 AND 5),
  food_quality_rating   SMALLINT CHECK (food_quality_rating BETWEEN 1 AND 5),
  communication_rating  SMALLINT CHECK (communication_rating BETWEEN 1 AND 5),
  value_rating          SMALLINT CHECK (value_rating BETWEEN 1 AND 5),
  would_book_again      TEXT CHECK (would_book_again IN ('yes', 'no', 'maybe')),
  highlight_text        TEXT,
  suggestions_text      TEXT,
  testimonial_consent   BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at          TIMESTAMPTZ DEFAULT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_surveys_one_per_event UNIQUE (event_id)
);
CREATE INDEX IF NOT EXISTS idx_event_surveys_tenant_id ON event_surveys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_surveys_event_id  ON event_surveys(event_id);
CREATE INDEX IF NOT EXISTS idx_event_surveys_token     ON event_surveys(token);
ALTER TABLE event_surveys ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY event_surveys_chef_read ON event_surveys
    FOR SELECT TO authenticated
    USING (
      tenant_id = (
        SELECT entity_id FROM user_roles
        WHERE auth_user_id = auth.uid() AND role = 'chef'
        LIMIT 1
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- ── From 20260304000010: Chef Logo ───────────────────────────────────────────

ALTER TABLE public.chefs
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chef-logos',
  'chef-logos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
-- ── From 20260305000009: Dish Photos ─────────────────────────────────────────

ALTER TABLE dishes
  ADD COLUMN IF NOT EXISTS photo_url TEXT;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dish-photos',
  'dish-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
DO $$ BEGIN
  CREATE POLICY "dish_photos_chef_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'dish-photos'
    AND get_current_user_role() = 'chef'
    AND split_part(name, '/', 1) = get_current_tenant_id()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "dish_photos_chef_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'dish-photos'
    AND get_current_user_role() = 'chef'
    AND split_part(name, '/', 1) = get_current_tenant_id()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "dish_photos_chef_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'dish-photos'
    AND get_current_user_role() = 'chef'
    AND split_part(name, '/', 1) = get_current_tenant_id()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "dish_photos_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'dish-photos');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
