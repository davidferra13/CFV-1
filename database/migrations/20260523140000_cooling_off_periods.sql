-- Cooling-Off Periods table
-- High-stakes actions must wait through a mandatory delay before execution.
-- 4h for pricing changes, 24h for client drops, 48h for commitment removal.

CREATE TABLE IF NOT EXISTS cooling_off_periods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  action_type   TEXT NOT NULL,
  action_data   JSONB NOT NULL DEFAULT '{}',
  initiated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  executes_at   TIMESTAMPTZ NOT NULL,
  cancelled_at  TIMESTAMPTZ,
  executed_at   TIMESTAMPTZ
);

-- Index for tenant-scoped queries (list all periods for a chef)
CREATE INDEX IF NOT EXISTS idx_cooling_off_periods_tenant
  ON cooling_off_periods (tenant_id, initiated_at DESC);

-- Index for finding pending periods ready to execute
CREATE INDEX IF NOT EXISTS idx_cooling_off_periods_pending
  ON cooling_off_periods (executes_at)
  WHERE cancelled_at IS NULL AND executed_at IS NULL;
