-- Persistent rate limiting for Remy
-- Survives server restarts. In-memory cache is the fast path; DB is the durable store.

CREATE TABLE IF NOT EXISTS remy_rate_limits (
  tenant_id TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_remy_rate_limits_tenant
  ON remy_rate_limits (tenant_id);

-- Cleanup old rows (called periodically from app code)
-- DELETE FROM remy_rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
