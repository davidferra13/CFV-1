-- Hermes queue hardening: tenant isolation + archive table for sweep cron
-- ADDITIVE ONLY: no drops, no deletes, no type changes

-- Fix 3: Add tenant_id for multi-tenant safety
ALTER TABLE hermes_queue
  ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- Backfill tenant_id from JSONB payload where available
UPDATE hermes_queue
  SET tenant_id = payload->>'tenantId'
  WHERE tenant_id IS NULL
  AND payload->>'tenantId' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hermes_queue_tenant
  ON hermes_queue (tenant_id, status)
  WHERE status = 'pending';

-- Fix 2: Archive table for queue sweep cron
CREATE TABLE IF NOT EXISTS hermes_queue_archive (
  id INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  priority INTEGER DEFAULT 2,
  status TEXT,
  processed_at TIMESTAMPTZ,
  tenant_id TEXT,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hermes_queue_archive_timestamp
  ON hermes_queue_archive (archived_at DESC);

-- Fix 1 support: task state for idempotency (bonus Q9 fix)
CREATE TABLE IF NOT EXISTS hermes_task_state (
  task TEXT PRIMARY KEY,
  last_run TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result TEXT
);
