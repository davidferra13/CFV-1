-- ============================================================
-- Migration: Post-Event Survey
-- Creates the event_surveys table for structured client
-- satisfaction surveys sent after event completion.
--
-- SAFE: Additive only. New table, no existing tables modified.
-- One survey per event (enforced by UNIQUE constraint).
-- Token is UUID v4 (122-bit entropy) — safe for public URLs.
-- ============================================================

CREATE TABLE IF NOT EXISTS event_surveys (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership / scoping
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  tenant_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Public access token (used in the email link, no auth required)
  token                 UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

  -- Star ratings (1–5), all optional until submitted
  overall_rating        SMALLINT CHECK (overall_rating BETWEEN 1 AND 5),
  food_quality_rating   SMALLINT CHECK (food_quality_rating BETWEEN 1 AND 5),
  communication_rating  SMALLINT CHECK (communication_rating BETWEEN 1 AND 5),
  value_rating          SMALLINT CHECK (value_rating BETWEEN 1 AND 5),

  -- Qualitative responses
  would_book_again      TEXT CHECK (would_book_again IN ('yes', 'no', 'maybe')),
  highlight_text        TEXT,
  suggestions_text      TEXT,
  testimonial_consent   BOOLEAN NOT NULL DEFAULT FALSE,

  -- Lifecycle timestamps
  submitted_at          TIMESTAMPTZ DEFAULT NULL, -- NULL = not yet submitted
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One survey per event
  CONSTRAINT event_surveys_one_per_event UNIQUE (event_id)
);

COMMENT ON TABLE event_surveys IS
  'Post-event client satisfaction surveys. Created when an event transitions '
  'to completed. One per event. submitted_at = NULL means not yet submitted.';

COMMENT ON COLUMN event_surveys.token IS
  'UUID used as the public survey URL token (/survey/[token]). '
  'Never expose the internal event_id publicly.';

COMMENT ON COLUMN event_surveys.submitted_at IS
  'NULL = survey not yet submitted. Set to now() when client submits the form. '
  'Once set, the form is no longer shown (idempotent).';

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_event_surveys_tenant_id ON event_surveys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_surveys_event_id  ON event_surveys(event_id);
CREATE INDEX IF NOT EXISTS idx_event_surveys_token     ON event_surveys(token);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE event_surveys ENABLE ROW LEVEL SECURITY;

-- Chefs can read surveys for their own tenant
CREATE POLICY event_surveys_chef_read ON event_surveys
  FOR SELECT TO authenticated
  USING (
    tenant_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
      LIMIT 1
    )
  );

-- Public survey submissions use the service role key in the server action.
-- No RLS policy needed for unauthenticated writes — the server action validates
-- the token and uses the admin client to perform the update.
