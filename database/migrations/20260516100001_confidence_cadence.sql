-- Pre-Event Confidence Cadence
-- Stores scheduled cadence emails and chef settings for cadence customization.

-- Cadence schedule: one row per scheduled cadence email per event
CREATE TABLE IF NOT EXISTS cadence_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  cadence_point TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  skip_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, cadence_point)
);

CREATE INDEX IF NOT EXISTS idx_cadence_schedule_due
  ON cadence_schedule (scheduled_at)
  WHERE sent_at IS NULL AND skipped_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cadence_schedule_event
  ON cadence_schedule (event_id, tenant_id);

-- Chef cadence settings: per-chef customization of cadence messages and toggles
CREATE TABLE IF NOT EXISTS cadence_chef_settings (
  chef_id UUID PRIMARY KEY REFERENCES chefs(id) ON DELETE CASCADE,
  disabled_points JSONB NOT NULL DEFAULT '[]',
  custom_messages JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
