-- Outbound Webhook Enhancements
-- Adds failure tracking, auto-disable, duration logging, and delivery success flag
-- to the existing webhook_endpoints + webhook_deliveries tables.
-- Purely additive: no existing columns modified or dropped.

-- ── failure_count + last_triggered_at on webhook_endpoints ──
ALTER TABLE webhook_endpoints
  ADD COLUMN IF NOT EXISTS failure_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMPTZ;

COMMENT ON COLUMN webhook_endpoints.failure_count IS
  'Consecutive delivery failures. Auto-disables endpoint at 10.';

COMMENT ON COLUMN webhook_endpoints.last_triggered_at IS
  'Last time a webhook was dispatched to this endpoint.';

-- ── duration_ms + success on webhook_deliveries ──
ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS success BOOLEAN;

COMMENT ON COLUMN webhook_deliveries.duration_ms IS
  'Round-trip delivery time in milliseconds.';

COMMENT ON COLUMN webhook_deliveries.success IS
  'Whether the delivery got a 2xx response.';

-- ── Index for cleanup: old deliveries ──
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created
  ON webhook_deliveries(created_at DESC);

-- ── Index for failure monitoring ──
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_failure
  ON webhook_endpoints(failure_count DESC)
  WHERE is_active = true;

-- ── Auto-update updated_at trigger for webhook_endpoints ──
CREATE OR REPLACE FUNCTION update_webhook_endpoints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_webhook_endpoints_updated_at ON webhook_endpoints;
CREATE TRIGGER trg_webhook_endpoints_updated_at
  BEFORE UPDATE ON webhook_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_endpoints_updated_at();
