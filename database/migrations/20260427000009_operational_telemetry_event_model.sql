ALTER TABLE operational_telemetry_events
  ADD CONSTRAINT operational_telemetry_initial_event_type_check
  CHECK (
    event_name IN (
      'inquiry_received',
      'inquiry_responded',
      'booking_created',
      'booking_confirmed',
      'booking_cancelled',
      'session_active',
      'session_idle',
      'menu_submitted',
      'payment_completed'
    )
  ) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_operational_telemetry_event_type_recent
  ON operational_telemetry_events(tenant_id, event_name, occurred_at DESC);

CREATE OR REPLACE VIEW operational_telemetry_event_model AS
SELECT
  id,
  tenant_id,
  actor_entity_id AS actor_id,
  actor_role,
  target_entity_id AS target_id,
  target_role,
  event_name AS event_type,
  subject_id AS context_id,
  occurred_at AS timestamp,
  attributes AS metadata
FROM operational_telemetry_events;

COMMENT ON VIEW operational_telemetry_event_model IS
  'Canonical role-aware TelemetryEvent projection for the Operational Awareness layer.';
