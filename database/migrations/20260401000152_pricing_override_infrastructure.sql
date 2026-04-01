-- Pricing Override Infrastructure
-- Adds baseline/override columns to quotes, events, event_series, and event_service_sessions.
-- Replaces key pricing-related DB functions so they include the new metadata.
-- All changes are additive (ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE FUNCTION).

-- ─── quotes ──────────────────────────────────────────────────────────────────

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS pricing_source_kind TEXT NOT NULL DEFAULT 'manual_only'
    CHECK (
      pricing_source_kind IN (
        'chef_config_calculated',
        'recurring_default',
        'booking_page',
        'recurring_service',
        'series_session',
        'manual_only',
        'legacy'
      )
    ),
  ADD COLUMN IF NOT EXISTS baseline_total_cents INTEGER
    CHECK (baseline_total_cents IS NULL OR baseline_total_cents >= 0),
  ADD COLUMN IF NOT EXISTS baseline_price_per_person_cents INTEGER
    CHECK (
      baseline_price_per_person_cents IS NULL
      OR baseline_price_per_person_cents > 0
    ),
  ADD COLUMN IF NOT EXISTS override_kind TEXT NOT NULL DEFAULT 'none'
    CHECK (override_kind IN ('none', 'per_person', 'custom_total')),
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS pricing_context JSONB;

-- ─── events ──────────────────────────────────────────────────────────────────

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS price_per_person_cents INTEGER
    CHECK (price_per_person_cents IS NULL OR price_per_person_cents > 0),
  ADD COLUMN IF NOT EXISTS pricing_source_kind TEXT NOT NULL DEFAULT 'manual_only'
    CHECK (
      pricing_source_kind IN (
        'chef_config_calculated',
        'recurring_default',
        'booking_page',
        'recurring_service',
        'series_session',
        'manual_only',
        'legacy'
      )
    ),
  ADD COLUMN IF NOT EXISTS baseline_total_cents INTEGER
    CHECK (baseline_total_cents IS NULL OR baseline_total_cents >= 0),
  ADD COLUMN IF NOT EXISTS baseline_price_per_person_cents INTEGER
    CHECK (
      baseline_price_per_person_cents IS NULL
      OR baseline_price_per_person_cents > 0
    ),
  ADD COLUMN IF NOT EXISTS override_kind TEXT NOT NULL DEFAULT 'none'
    CHECK (override_kind IN ('none', 'per_person', 'custom_total')),
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS pricing_context JSONB;

-- ─── event_series ─────────────────────────────────────────────────────────────

ALTER TABLE event_series
  ADD COLUMN IF NOT EXISTS price_per_person_cents INTEGER
    CHECK (price_per_person_cents IS NULL OR price_per_person_cents > 0),
  ADD COLUMN IF NOT EXISTS pricing_source_kind TEXT NOT NULL DEFAULT 'manual_only'
    CHECK (
      pricing_source_kind IN (
        'chef_config_calculated',
        'recurring_default',
        'booking_page',
        'recurring_service',
        'series_session',
        'manual_only',
        'legacy'
      )
    ),
  ADD COLUMN IF NOT EXISTS baseline_total_cents INTEGER
    CHECK (baseline_total_cents IS NULL OR baseline_total_cents >= 0),
  ADD COLUMN IF NOT EXISTS baseline_price_per_person_cents INTEGER
    CHECK (
      baseline_price_per_person_cents IS NULL
      OR baseline_price_per_person_cents > 0
    ),
  ADD COLUMN IF NOT EXISTS override_kind TEXT NOT NULL DEFAULT 'none'
    CHECK (override_kind IN ('none', 'per_person', 'custom_total')),
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS pricing_context JSONB;

-- ─── event_service_sessions ───────────────────────────────────────────────────

ALTER TABLE event_service_sessions
  ADD COLUMN IF NOT EXISTS price_per_person_cents INTEGER
    CHECK (price_per_person_cents IS NULL OR price_per_person_cents > 0),
  ADD COLUMN IF NOT EXISTS pricing_source_kind TEXT NOT NULL DEFAULT 'manual_only'
    CHECK (
      pricing_source_kind IN (
        'chef_config_calculated',
        'recurring_default',
        'booking_page',
        'recurring_service',
        'series_session',
        'manual_only',
        'legacy'
      )
    ),
  ADD COLUMN IF NOT EXISTS baseline_total_cents INTEGER
    CHECK (baseline_total_cents IS NULL OR baseline_total_cents >= 0),
  ADD COLUMN IF NOT EXISTS baseline_price_per_person_cents INTEGER
    CHECK (
      baseline_price_per_person_cents IS NULL
      OR baseline_price_per_person_cents > 0
    ),
  ADD COLUMN IF NOT EXISTS override_kind TEXT NOT NULL DEFAULT 'none'
    CHECK (override_kind IN ('none', 'per_person', 'custom_total')),
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS pricing_context JSONB;

-- ─── Updated DB functions: include override metadata in snapshots ─────────────

-- freeze_event_pricing_snapshot: also capture baseline and override metadata
CREATE OR REPLACE FUNCTION freeze_event_pricing_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pricing_snapshot IS NULL AND NEW.quoted_price_cents IS NOT NULL THEN
    NEW.pricing_snapshot = jsonb_build_object(
      'quoted_price_cents',               NEW.quoted_price_cents,
      'pricing_model',                    NEW.pricing_model::text,
      'deposit_amount_cents',             NEW.deposit_amount_cents,
      'pricing_source_kind',              COALESCE(NEW.pricing_source_kind, 'manual_only'),
      'baseline_total_cents',             NEW.baseline_total_cents,
      'baseline_price_per_person_cents',  NEW.baseline_price_per_person_cents,
      'override_kind',                    COALESCE(NEW.override_kind, 'none'),
      'override_reason',                  NEW.override_reason,
      'frozen_at',                        now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- freeze_quote_snapshot_on_acceptance: include override metadata in frozen snapshot
CREATE OR REPLACE FUNCTION freeze_quote_snapshot_on_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    NEW.pricing_snapshot = jsonb_build_object(
      'total_quoted_cents',               NEW.total_quoted_cents,
      'pricing_model',                    NEW.pricing_model::text,
      'price_per_person_cents',           NEW.price_per_person_cents,
      'guest_count_estimated',            NEW.guest_count_estimated,
      'deposit_amount_cents',             NEW.deposit_amount_cents,
      'pricing_source_kind',              COALESCE(NEW.pricing_source_kind, 'manual_only'),
      'baseline_total_cents',             NEW.baseline_total_cents,
      'baseline_price_per_person_cents',  NEW.baseline_price_per_person_cents,
      'override_kind',                    COALESCE(NEW.override_kind, 'none'),
      'override_reason',                  NEW.override_reason,
      'frozen_at',                        now()
    );
    NEW.snapshot_frozen = true;
    NEW.accepted_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- prevent_quote_mutation_after_acceptance: also guard the new override/baseline columns
CREATE OR REPLACE FUNCTION prevent_quote_mutation_after_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.snapshot_frozen = true AND OLD.status = NEW.status THEN
    IF (OLD.total_quoted_cents IS DISTINCT FROM NEW.total_quoted_cents
        OR OLD.pricing_model IS DISTINCT FROM NEW.pricing_model
        OR OLD.price_per_person_cents IS DISTINCT FROM NEW.price_per_person_cents
        OR OLD.deposit_amount_cents IS DISTINCT FROM NEW.deposit_amount_cents
        OR OLD.baseline_total_cents IS DISTINCT FROM NEW.baseline_total_cents
        OR OLD.override_kind IS DISTINCT FROM NEW.override_kind) THEN
      RAISE EXCEPTION 'Cannot modify frozen quote after acceptance';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Indexes for override filtering (optional but useful for analytics)
CREATE INDEX IF NOT EXISTS idx_quotes_override_kind
  ON quotes(override_kind) WHERE override_kind != 'none';

CREATE INDEX IF NOT EXISTS idx_events_override_kind
  ON events(override_kind) WHERE override_kind != 'none';
