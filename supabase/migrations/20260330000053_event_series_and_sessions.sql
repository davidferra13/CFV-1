-- =============================================================================
-- Migration: Event Series + Service Sessions (Multi-Day Booking Foundation)
-- Purpose:
-- 1) Introduce master booking records spanning date ranges (event_series)
-- 2) Introduce per-service blocks (event_service_sessions)
-- 3) Add explicit service_mode tracking on inquiries/events
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  CREATE TYPE booking_service_mode AS ENUM ('one_off', 'recurring', 'multi_day');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  CREATE TYPE event_session_meal_slot AS ENUM (
    'breakfast',
    'lunch',
    'dinner',
    'late_snack',
    'dropoff',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  CREATE TYPE event_session_execution_type AS ENUM (
    'on_site',
    'drop_off',
    'prep_only',
    'hybrid'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
-- -----------------------------------------------------------------------------
-- MASTER SERIES TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS event_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,

  service_mode booking_service_mode NOT NULL DEFAULT 'multi_day',
  status event_status NOT NULL DEFAULT 'draft',
  title TEXT,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  base_guest_count INTEGER,

  location_address TEXT,
  location_city TEXT,
  location_state TEXT,
  location_zip TEXT,

  pricing_model pricing_model,
  quoted_total_cents INTEGER,
  deposit_total_cents INTEGER,
  pricing_notes TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  CONSTRAINT event_series_end_after_start CHECK (end_date >= start_date),
  CONSTRAINT event_series_guest_positive CHECK (base_guest_count IS NULL OR base_guest_count > 0),
  CONSTRAINT event_series_quote_non_negative CHECK (
    quoted_total_cents IS NULL OR quoted_total_cents >= 0
  ),
  CONSTRAINT event_series_deposit_non_negative CHECK (
    deposit_total_cents IS NULL OR deposit_total_cents >= 0
  ),
  CONSTRAINT event_series_deposit_lte_quote CHECK (
    deposit_total_cents IS NULL
    OR quoted_total_cents IS NULL
    OR deposit_total_cents <= quoted_total_cents
  )
);
COMMENT ON TABLE event_series IS 'Master booking record for multi-day, recurring, or bundled service plans.';
-- -----------------------------------------------------------------------------
-- SERVICE SESSION TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS event_service_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES event_series(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,

  session_date DATE NOT NULL,
  meal_slot event_session_meal_slot NOT NULL DEFAULT 'dinner',
  execution_type event_session_execution_type NOT NULL DEFAULT 'on_site',
  start_time TIME,
  end_time TIME,
  guest_count INTEGER,
  service_style event_service_style NOT NULL DEFAULT 'plated',

  location_address TEXT,
  location_city TEXT,
  location_state TEXT,
  location_zip TEXT,

  quoted_price_cents INTEGER,
  deposit_amount_cents INTEGER,
  status event_status NOT NULL DEFAULT 'draft',
  sort_order INTEGER NOT NULL DEFAULT 0,
  menu_locked BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  CONSTRAINT event_service_sessions_time_window_valid CHECK (
    start_time IS NULL OR end_time IS NULL OR end_time > start_time
  ),
  CONSTRAINT event_service_sessions_guest_positive CHECK (
    guest_count IS NULL OR guest_count > 0
  ),
  CONSTRAINT event_service_sessions_quote_non_negative CHECK (
    quoted_price_cents IS NULL OR quoted_price_cents >= 0
  ),
  CONSTRAINT event_service_sessions_deposit_non_negative CHECK (
    deposit_amount_cents IS NULL OR deposit_amount_cents >= 0
  ),
  CONSTRAINT event_service_sessions_deposit_lte_quote CHECK (
    deposit_amount_cents IS NULL
    OR quoted_price_cents IS NULL
    OR deposit_amount_cents <= quoted_price_cents
  )
);
COMMENT ON TABLE event_service_sessions IS 'Per-day/per-meal service blocks belonging to an event series.';
-- -----------------------------------------------------------------------------
-- EXISTING TABLE EXTENSIONS
-- -----------------------------------------------------------------------------

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS service_mode booking_service_mode,
  ADD COLUMN IF NOT EXISTS schedule_request_jsonb JSONB;
UPDATE inquiries
SET service_mode = CASE
  WHEN unknown_fields->>'service_mode' IN ('one_off', 'recurring', 'multi_day')
    THEN (unknown_fields->>'service_mode')::booking_service_mode
  ELSE service_mode
END
WHERE service_mode IS NULL;
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS service_mode booking_service_mode NOT NULL DEFAULT 'one_off',
  ADD COLUMN IF NOT EXISTS event_series_id UUID,
  ADD COLUMN IF NOT EXISTS source_session_id UUID;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'events_event_series_id_fkey'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_event_series_id_fkey
      FOREIGN KEY (event_series_id) REFERENCES event_series(id) ON DELETE SET NULL;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'events_source_session_id_fkey'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_source_session_id_fkey
      FOREIGN KEY (source_session_id) REFERENCES event_service_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;
-- Expand booking_source constraint to include series-created events.
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'events'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%booking_source%'
  LOOP
    EXECUTE format('ALTER TABLE events DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE events
  ADD CONSTRAINT events_booking_source_check
  CHECK (booking_source IS NULL OR booking_source IN ('inquiry', 'instant_book', 'series'));
-- -----------------------------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_event_series_tenant_dates
  ON event_series(tenant_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_event_series_client
  ON event_series(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_event_series_status
  ON event_series(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_event_service_sessions_series_date
  ON event_service_sessions(series_id, session_date, sort_order);
CREATE INDEX IF NOT EXISTS idx_event_service_sessions_tenant_date
  ON event_service_sessions(tenant_id, session_date);
CREATE INDEX IF NOT EXISTS idx_event_service_sessions_tenant_status_date
  ON event_service_sessions(tenant_id, status, session_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_service_sessions_dedupe
  ON event_service_sessions (
    series_id,
    session_date,
    meal_slot,
    COALESCE(start_time, '00:00:00'::time)
  );
CREATE INDEX IF NOT EXISTS idx_events_event_series_id
  ON events(event_series_id);
CREATE INDEX IF NOT EXISTS idx_events_source_session_id
  ON events(source_session_id);
-- -----------------------------------------------------------------------------
-- UPDATED_AT TRIGGERS
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS set_updated_at_event_series ON event_series;
CREATE TRIGGER set_updated_at_event_series
  BEFORE UPDATE ON event_series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at_event_service_sessions ON event_service_sessions;
CREATE TRIGGER set_updated_at_event_service_sessions
  BEFORE UPDATE ON event_service_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

ALTER TABLE event_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_service_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_series_chef_select" ON event_series;
CREATE POLICY "event_series_chef_select"
  ON event_series
  FOR SELECT
  USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "event_series_chef_insert" ON event_series;
CREATE POLICY "event_series_chef_insert"
  ON event_series
  FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "event_series_chef_update" ON event_series;
CREATE POLICY "event_series_chef_update"
  ON event_series
  FOR UPDATE
  USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "event_series_chef_delete" ON event_series;
CREATE POLICY "event_series_chef_delete"
  ON event_series
  FOR DELETE
  USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "event_service_sessions_chef_select" ON event_service_sessions;
CREATE POLICY "event_service_sessions_chef_select"
  ON event_service_sessions
  FOR SELECT
  USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "event_service_sessions_chef_insert" ON event_service_sessions;
CREATE POLICY "event_service_sessions_chef_insert"
  ON event_service_sessions
  FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "event_service_sessions_chef_update" ON event_service_sessions;
CREATE POLICY "event_service_sessions_chef_update"
  ON event_service_sessions
  FOR UPDATE
  USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS "event_service_sessions_chef_delete" ON event_service_sessions;
CREATE POLICY "event_service_sessions_chef_delete"
  ON event_service_sessions
  FOR DELETE
  USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
