-- Platform observability event stream
-- Unified event store for high-signal product, auth, conversion, and system activity.

CREATE TABLE IF NOT EXISTS platform_observability_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'important', 'critical')),
  source text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('public', 'private', 'system')),
  summary text NOT NULL,
  details text,
  actor_type text NOT NULL CHECK (actor_type IN ('anonymous', 'auth_user', 'chef', 'client', 'system')),
  actor_id text,
  auth_user_id uuid,
  tenant_id uuid REFERENCES chefs(id) ON DELETE SET NULL,
  subject_type text,
  subject_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  realtime_alert_enabled boolean NOT NULL DEFAULT false,
  daily_digest_enabled boolean NOT NULL DEFAULT true,
  alert_dedupe_key text,
  realtime_alert_sent_at timestamptz,
  realtime_alert_status text NOT NULL DEFAULT 'not_applicable'
    CHECK (realtime_alert_status IN ('not_applicable', 'sent', 'suppressed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_observability_events_occurred_at
  ON platform_observability_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_observability_events_event_key
  ON platform_observability_events (event_key, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_observability_events_source
  ON platform_observability_events (source, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_observability_events_alert_dedupe
  ON platform_observability_events (alert_dedupe_key, realtime_alert_sent_at DESC)
  WHERE alert_dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_observability_events_digest
  ON platform_observability_events (daily_digest_enabled, occurred_at DESC);

COMMENT ON TABLE platform_observability_events IS
  'Unified platform observability stream for product activity, conversions, auth signals, and system failures.';
