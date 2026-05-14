-- Migration: 20260513002818_discovery_profile_persistence.sql
-- Purpose: Persistence spine for discovery outcome capture and profile signals.

CREATE TABLE IF NOT EXISTS culinary_profile_outcomes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  item_id        TEXT        NOT NULL,
  item_label     TEXT        NOT NULL,
  item_kind      TEXT,
  outcome        TEXT        NOT NULL CHECK (outcome IN (
                                'chose',
                                'skipped',
                                'liked',
                                'not_again',
                                'add_to_profile',
                                'hide_from_chef'
                              )),
  surface        TEXT        NOT NULL DEFAULT 'unknown',
  session_id     TEXT,
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT culinary_profile_outcomes_item_length_check
    CHECK (
      length(item_id) <= 160
      AND length(item_label) <= 160
      AND (session_id IS NULL OR length(session_id) <= 128)
    )
);

CREATE INDEX IF NOT EXISTS idx_culinary_profile_outcomes_owner_time
  ON culinary_profile_outcomes (owner_id, occurred_at DESC);

ALTER TABLE culinary_profile_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own culinary outcomes" ON culinary_profile_outcomes;
CREATE POLICY "Users manage own culinary outcomes"
  ON culinary_profile_outcomes
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access culinary outcomes" ON culinary_profile_outcomes;
CREATE POLICY "Service role full access culinary outcomes"
  ON culinary_profile_outcomes
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS culinary_profile_signals (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id        TEXT        NOT NULL,
  signal_payload   JSONB       NOT NULL,
  review_state     TEXT        NOT NULL,
  share_category   TEXT        NOT NULL,
  hidden_from_chef BOOLEAN     NOT NULL DEFAULT false,
  observed_at      TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT culinary_profile_signals_owner_signal_unique
    UNIQUE (owner_id, signal_id),
  CONSTRAINT culinary_profile_signals_payload_object_check
    CHECK (jsonb_typeof(signal_payload) = 'object' AND pg_column_size(signal_payload) <= 16384)
);

CREATE INDEX IF NOT EXISTS idx_culinary_profile_signals_owner_time
  ON culinary_profile_signals (owner_id, observed_at DESC);

ALTER TABLE culinary_profile_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own culinary signals" ON culinary_profile_signals;
CREATE POLICY "Users manage own culinary signals"
  ON culinary_profile_signals
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access culinary signals" ON culinary_profile_signals;
CREATE POLICY "Service role full access culinary signals"
  ON culinary_profile_signals
  FOR ALL
  USING (true)
  WITH CHECK (true);
