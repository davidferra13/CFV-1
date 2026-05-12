-- Migration: 20260512000003_discovery_anonymous_algorithm.sql
-- Purpose: Capture anonymous homepage discovery interactions, tag ranking
--          algorithm versions, and allow authenticated users to claim prior
--          anonymous browsing history.

ALTER TABLE discovery_interactions
  ALTER COLUMN auth_user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS anonymous_id TEXT,
  ADD COLUMN IF NOT EXISTS algorithm_version TEXT;

COMMENT ON COLUMN discovery_interactions.anonymous_id IS
  'Stable browser-local anonymous discovery id. Claimed into auth_user_id on sign-in.';

COMMENT ON COLUMN discovery_interactions.algorithm_version IS
  'Discovery ranking/ordering algorithm version active when the event was emitted.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'discovery_interactions'::regclass
      AND conname = 'discovery_interactions_actor_check'
  ) THEN
    ALTER TABLE discovery_interactions
      ADD CONSTRAINT discovery_interactions_actor_check
      CHECK (auth_user_id IS NOT NULL OR anonymous_id IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'discovery_interactions'::regclass
      AND conname = 'discovery_interactions_text_length_check'
  ) THEN
    ALTER TABLE discovery_interactions
      DROP CONSTRAINT discovery_interactions_text_length_check;
  END IF;

  ALTER TABLE discovery_interactions
    ADD CONSTRAINT discovery_interactions_text_length_check
    CHECK (
      length(item_value) <= 100
      AND (item_label IS NULL OR length(item_label) <= 100)
      AND (href IS NULL OR length(href) <= 500)
      AND (session_id IS NULL OR length(session_id) <= 128)
      AND (anonymous_id IS NULL OR length(anonymous_id) <= 128)
      AND (algorithm_version IS NULL OR length(algorithm_version) <= 80)
      AND (base_href IS NULL OR length(base_href) <= 500)
      AND (destination_path IS NULL OR length(destination_path) <= 120)
    );
END $$;

CREATE INDEX IF NOT EXISTS idx_discovery_interactions_anonymous
  ON discovery_interactions (anonymous_id, created_at DESC)
  WHERE anonymous_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_discovery_interactions_algorithm
  ON discovery_interactions (algorithm_version, created_at DESC)
  WHERE algorithm_version IS NOT NULL;
