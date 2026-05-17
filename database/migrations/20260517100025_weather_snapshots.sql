-- Weather Snapshots: capture weather conditions on event completion for future reference
-- Additive migration only. No drops, no deletes.

CREATE TABLE IF NOT EXISTS event_weather_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  forecast_high_f REAL,
  forecast_low_f REAL,
  condition TEXT,
  precip_probability REAL,
  wind_speed_mph REAL,
  actual_notes TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_weather_snapshots_event_unique UNIQUE (event_id)
);

CREATE INDEX idx_event_weather_snapshots_tenant ON event_weather_snapshots USING btree (tenant_id);
CREATE INDEX idx_event_weather_snapshots_event ON event_weather_snapshots USING btree (event_id);
CREATE INDEX idx_event_weather_snapshots_captured ON event_weather_snapshots USING btree (captured_at DESC);
