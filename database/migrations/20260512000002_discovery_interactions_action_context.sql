-- Migration: 20260512000002_discovery_interactions_action_context.sql
-- Purpose: Expand discovery interaction taxonomy beyond clicks and store bounded
--          event context for authenticated discovery behavior analysis.

ALTER TABLE discovery_interactions
  ADD COLUMN IF NOT EXISTS event_context JSONB;

COMMENT ON COLUMN discovery_interactions.action IS
  'Discovery interaction action taxonomy emitted by public discovery surfaces.';

COMMENT ON COLUMN discovery_interactions.event_context IS
  'Bounded sanitized JSON context for discovery events, such as source surface, dwell timing, search, viewport, and inquiry context.';

DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'discovery_interactions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%action%'
  LOOP
    EXECUTE format('ALTER TABLE discovery_interactions DROP CONSTRAINT %I', constraint_record.conname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'discovery_interactions'::regclass
      AND conname = 'discovery_interactions_action_check'
  ) THEN
    ALTER TABLE discovery_interactions
      ADD CONSTRAINT discovery_interactions_action_check
      CHECK (action IN (
        'impression',
        'ignore',
        'click',
        'love',
        'hate',
        'hide',
        'save',
        'long_dwell',
        'quick_back',
        'search_submit',
        'inquiry_started',
        'inquiry_submitted'
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'discovery_interactions'::regclass
      AND conname = 'discovery_interactions_event_context_check'
  ) THEN
    ALTER TABLE discovery_interactions
      ADD CONSTRAINT discovery_interactions_event_context_check
      CHECK (
        event_context IS NULL
        OR (
          jsonb_typeof(event_context) = 'object'
          AND pg_column_size(event_context) <= 8192
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'discovery_interactions'::regclass
      AND conname = 'discovery_interactions_text_length_check'
  ) THEN
    ALTER TABLE discovery_interactions
      ADD CONSTRAINT discovery_interactions_text_length_check
      CHECK (
        length(item_value) <= 100
        AND (item_label IS NULL OR length(item_label) <= 100)
        AND (href IS NULL OR length(href) <= 500)
        AND (session_id IS NULL OR length(session_id) <= 128)
        AND (base_href IS NULL OR length(base_href) <= 500)
        AND (destination_path IS NULL OR length(destination_path) <= 120)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_discovery_interactions_user_action
  ON discovery_interactions (auth_user_id, action, created_at DESC);
