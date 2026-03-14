-- ============================================================
-- Migration: Dead Letter Queue + Job Retry Log tables
-- Items: #48 (Dead Letter Queue)
-- Date: 2026-02-20
-- Depends on: 20260320000001 (transition_event_atomic function)
-- ============================================================

CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES chefs(id) ON DELETE CASCADE,
  job_type        TEXT NOT NULL,
  job_id          TEXT,
  payload         JSONB NOT NULL DEFAULT '{}',
  error_message   TEXT,
  attempts        INTEGER NOT NULL DEFAULT 0,
  first_failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_failed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES auth.users(id),
  resolution_note TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dlq_tenant_id   ON dead_letter_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dlq_job_type    ON dead_letter_queue(job_type);
CREATE INDEX IF NOT EXISTS idx_dlq_unresolved  ON dead_letter_queue(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dlq_last_failed ON dead_letter_queue(last_failed_at DESC);

ALTER TABLE dead_letter_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chefs_read_own_dlq" ON dead_letter_queue
  FOR SELECT USING (
    tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "service_role_manage_dlq" ON dead_letter_queue
  FOR ALL USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS job_retry_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID REFERENCES chefs(id) ON DELETE CASCADE,
  job_type       TEXT NOT NULL,
  job_id         TEXT NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  next_retry_at  TIMESTAMPTZ,
  last_error     TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'retrying', 'succeeded', 'dead')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_type, job_id)
);

CREATE INDEX IF NOT EXISTS idx_job_retry_log_status     ON job_retry_log(status);
CREATE INDEX IF NOT EXISTS idx_job_retry_log_next_retry ON job_retry_log(next_retry_at) WHERE status IN ('pending', 'retrying');

ALTER TABLE job_retry_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_manage_retry_log" ON job_retry_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "chefs_read_own_retry_log" ON job_retry_log
  FOR SELECT USING (
    tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid())
  );
