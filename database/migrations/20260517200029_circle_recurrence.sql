-- Circle Recurrence Configs (ADDITIVE ONLY)
-- Recurring event support for dinner circles

-- ---------------------------------------------------------------------------
-- circle_recurrence_configs: per-circle recurrence schedule
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS circle_recurrence_configs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id               uuid NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  tenant_id               uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  pattern                 text NOT NULL,
  day_of_week             integer,
  preferred_time          text,
  auto_create_days_ahead  integer NOT NULL DEFAULT 0,
  custom_interval_days    integer,
  last_occurrence_at      timestamptz,
  next_scheduled_at       timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT crc2_pattern_check CHECK (
    pattern = ANY (ARRAY[
      'weekly', 'biweekly', 'monthly', 'quarterly', 'custom'
    ])
  ),
  CONSTRAINT crc2_day_of_week_check CHECK (
    day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)
  ),
  CONSTRAINT crc2_auto_create_positive CHECK (auto_create_days_ahead >= 0),
  CONSTRAINT crc2_custom_interval_positive CHECK (
    custom_interval_days IS NULL OR custom_interval_days > 0
  ),
  CONSTRAINT crc2_unique_circle UNIQUE (circle_id)
);

CREATE INDEX idx_crc2_circle ON circle_recurrence_configs (circle_id);
CREATE INDEX idx_crc2_tenant ON circle_recurrence_configs (tenant_id);
CREATE INDEX idx_crc2_next_scheduled ON circle_recurrence_configs (next_scheduled_at)
  WHERE next_scheduled_at IS NOT NULL;

-- RLS
ALTER TABLE circle_recurrence_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY crc2_tenant_isolation ON circle_recurrence_configs
  FOR ALL TO public
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- ---------------------------------------------------------------------------
-- Add circle_id column to events for series tracking
-- (only if not already present; safe to re-run)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'circle_id'
  ) THEN
    ALTER TABLE events ADD COLUMN circle_id uuid REFERENCES hub_groups(id) ON DELETE SET NULL;
    CREATE INDEX idx_events_circle ON events (circle_id) WHERE circle_id IS NOT NULL;
  END IF;
END
$$;
