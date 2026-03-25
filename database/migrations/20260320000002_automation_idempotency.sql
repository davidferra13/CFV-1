-- ============================================================
-- Migration: Automation execution idempotency
-- Item: #18 (Idempotent operations)
-- Date: 2026-02-20
-- ============================================================
-- Prevents automation double-firing on webhook retries or
-- overlapping cron invocations by enforcing a unique constraint
-- on (tenant_id, idempotency_key).
--
-- The idempotency_key is computed by the caller as:
--   sha256(automation_id + trigger_type + entity_id + time_bucket)
-- where time_bucket is an hourly bucket (hour of trigger).
-- This means: same automation on same entity in same hour = duplicate.
-- ============================================================

-- Add idempotency_key column to automation_executions if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'automation_executions'
  ) THEN
    -- Add idempotency_key column
    ALTER TABLE automation_executions
      ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

    -- Add status column if not present
    ALTER TABLE automation_executions
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'
      CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'skipped_duplicate'));

    -- Add retry tracking columns
    ALTER TABLE automation_executions
      ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;

    ALTER TABLE automation_executions
      ADD COLUMN IF NOT EXISTS last_error TEXT;

    ALTER TABLE automation_executions
      ADD COLUMN IF NOT EXISTS dlq_id UUID; -- FK to dead_letter_queue added in 20260320000003
  END IF;
END;
$$;

-- Unique constraint: prevent duplicate automation executions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'automation_executions'
  ) THEN
    -- Only add constraint if idempotency_key column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'automation_executions'
        AND column_name = 'idempotency_key'
    ) THEN
      -- Partial unique index: only enforce on non-null keys
      CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_executions_idempotency
        ON automation_executions(tenant_id, idempotency_key)
        WHERE idempotency_key IS NOT NULL;
    END IF;
  END IF;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- Standalone automation_execution_log table
-- Fallback if automation_executions table doesn't exist.
-- Tracks every attempt with idempotency enforcement.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS automation_execution_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  automation_id    UUID,                -- May be NULL for non-DB-backed automations
  trigger_type     TEXT NOT NULL,
  entity_id        UUID,
  entity_type      TEXT,
  idempotency_key  TEXT NOT NULL,       -- sha256(automation_id || trigger || entity_id || hour_bucket)
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'skipped_duplicate')),
  attempt_number   INTEGER NOT NULL DEFAULT 1,
  last_error       TEXT,
  dlq_id           UUID, -- FK to dead_letter_queue added in 20260320000003
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique idempotency enforcement
CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_exec_log_idempotency
  ON automation_execution_log(tenant_id, idempotency_key);

-- Status query indexes
CREATE INDEX IF NOT EXISTS idx_automation_exec_log_status
  ON automation_execution_log(status);

CREATE INDEX IF NOT EXISTS idx_automation_exec_log_tenant
  ON automation_execution_log(tenant_id, created_at DESC);

-- RLS
ALTER TABLE automation_execution_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_manage_exec_log" ON automation_execution_log;
CREATE POLICY "service_role_manage_exec_log" ON automation_execution_log
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "chefs_read_own_exec_log" ON automation_execution_log;
CREATE POLICY "chefs_read_own_exec_log" ON automation_execution_log
  FOR SELECT USING (
    tenant_id = (
      SELECT id FROM chefs WHERE auth_user_id = auth.uid()
    )
  );
