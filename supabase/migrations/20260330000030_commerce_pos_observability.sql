-- POS observability: alert events + daily metrics snapshots.

DO $$ BEGIN
  CREATE TYPE pos_alert_severity AS ENUM ('info', 'warning', 'error', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pos_alert_status AS ENUM ('open', 'acknowledged', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS pos_alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  occurrence_count INTEGER NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),

  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  severity pos_alert_severity NOT NULL,
  status pos_alert_status NOT NULL DEFAULT 'open',
  message TEXT NOT NULL,
  dedupe_key TEXT,
  context JSONB NOT NULL DEFAULT '{}'::JSONB,

  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pos_alert_events_tenant_status_created
  ON pos_alert_events (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pos_alert_events_tenant_severity_created
  ON pos_alert_events (tenant_id, severity, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_alert_events_open_dedupe
  ON pos_alert_events (tenant_id, dedupe_key)
  WHERE status = 'open' AND dedupe_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS pos_metric_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  total_sales_count INTEGER NOT NULL DEFAULT 0,
  gross_revenue_cents INTEGER NOT NULL DEFAULT 0,
  net_revenue_cents INTEGER NOT NULL DEFAULT 0,
  refunds_cents INTEGER NOT NULL DEFAULT 0,
  voided_sales_count INTEGER NOT NULL DEFAULT 0,
  cash_variance_cents INTEGER NOT NULL DEFAULT 0,
  open_alert_count INTEGER NOT NULL DEFAULT 0,
  error_alert_count INTEGER NOT NULL DEFAULT 0,
  warning_alert_count INTEGER NOT NULL DEFAULT 0,

  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  UNIQUE (tenant_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_pos_metric_snapshots_tenant_date
  ON pos_metric_snapshots (tenant_id, snapshot_date DESC);

DROP TRIGGER IF EXISTS update_pos_alert_events_updated_at ON pos_alert_events;
CREATE TRIGGER update_pos_alert_events_updated_at
  BEFORE UPDATE ON pos_alert_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE pos_alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_metric_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pos_alert_events_chef_all ON pos_alert_events;
CREATE POLICY pos_alert_events_chef_all ON pos_alert_events
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS pos_metric_snapshots_chef_all ON pos_metric_snapshots;
CREATE POLICY pos_metric_snapshots_chef_all ON pos_metric_snapshots
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS pos_alert_events_service_all ON pos_alert_events;
CREATE POLICY pos_alert_events_service_all ON pos_alert_events
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS pos_metric_snapshots_service_all ON pos_metric_snapshots;
CREATE POLICY pos_metric_snapshots_service_all ON pos_metric_snapshots
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE pos_alert_events IS 'POS operational alerts for incidents and anomalous states.';
COMMENT ON TABLE pos_metric_snapshots IS 'Daily POS KPI snapshots used for pilot observability and trend review.';

