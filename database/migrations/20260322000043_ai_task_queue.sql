-- ============================================================
-- Migration: AI Task Queue
-- Purpose: Postgres-backed queue for all AI/Ollama tasks
-- Supports: priority routing, dual-LLM endpoints, scheduled
--           execution, retry with backoff, and DLQ integration
-- Date: 2026-02-22
-- ============================================================

-- 1. AI Task Queue table
CREATE TABLE IF NOT EXISTS ai_task_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Task identification
  task_type       TEXT NOT NULL,
  -- Examples: 'scheduled.daily_briefing', 'reactive.inquiry_scored',
  --           'draft.thank_you', 'ondemand.prep_timeline'

  -- Priority (higher = more urgent)
  -- 1000 = interactive (bypasses queue), 800 = on-demand,
  -- 600 = reactive, 400 = scheduled, 200 = batch
  priority        INTEGER NOT NULL DEFAULT 400
                  CHECK (priority >= 0 AND priority <= 1000),

  -- Approval tier (from AI_POLICY.md)
  -- auto: executes immediately, result delivered silently
  -- draft: executes, result held for chef review before any action
  -- hold: requires chef input before execution can proceed
  approval_tier   TEXT NOT NULL DEFAULT 'auto'
                  CHECK (approval_tier IN ('auto', 'draft', 'hold')),

  -- Lifecycle
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'completed',
                                    'awaiting_approval', 'approved', 'rejected',
                                    'failed', 'dead')),

  -- Input/output
  payload         JSONB NOT NULL DEFAULT '{}',
  result          JSONB,

  -- LLM routing
  target_endpoint TEXT NOT NULL DEFAULT 'auto'
                  CHECK (target_endpoint IN ('auto', 'pc', 'pi')),
  actual_endpoint TEXT,  -- which endpoint actually processed it
  model_tier      TEXT NOT NULL DEFAULT 'standard'
                  CHECK (model_tier IN ('fast', 'standard', 'complex')),

  -- Scheduling (enables cron-like behavior without cron)
  scheduled_for   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- For recurring tasks: interval to re-enqueue after completion
  recurrence      TEXT,  -- e.g., '1 day', '1 week', 'null' for one-shot

  -- Retry management
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 3,
  last_error      TEXT,
  next_retry_at   TIMESTAMPTZ,

  -- Context references (optional, for linking results to entities)
  related_event_id  UUID REFERENCES events(id),
  related_client_id UUID REFERENCES clients(id),
  related_inquiry_id UUID REFERENCES inquiries(id),

  -- Chef interaction
  approved_at     TIMESTAMPTZ,
  approved_by     UUID,
  rejection_reason TEXT,

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queue operations
-- Worker polls: pending tasks ordered by priority DESC, scheduled_for ASC
-- The query adds "AND scheduled_for <= NOW()" at runtime (NOW() is not immutable)
CREATE INDEX idx_ai_queue_worker_poll
  ON ai_task_queue (priority DESC, scheduled_for ASC)
  WHERE status = 'pending';

-- Tenant's task history
CREATE INDEX idx_ai_queue_tenant_status
  ON ai_task_queue (tenant_id, status, created_at DESC);

-- Find tasks by type (for deduplication and scheduling)
CREATE INDEX idx_ai_queue_type
  ON ai_task_queue (tenant_id, task_type, status);

-- Awaiting approval (chef needs to review)
CREATE INDEX idx_ai_queue_awaiting_approval
  ON ai_task_queue (tenant_id, status)
  WHERE status = 'awaiting_approval';

-- Recurring task lookup
CREATE INDEX idx_ai_queue_recurring
  ON ai_task_queue (tenant_id, task_type, recurrence)
  WHERE recurrence IS NOT NULL;

-- Failed tasks for monitoring
CREATE INDEX idx_ai_queue_failed
  ON ai_task_queue (status, created_at DESC)
  WHERE status IN ('failed', 'dead');

-- RLS
ALTER TABLE ai_task_queue ENABLE ROW LEVEL SECURITY;

-- Chefs can see their own tasks
DROP POLICY IF EXISTS ai_queue_chef_read ON ai_task_queue;
CREATE POLICY ai_queue_chef_read ON ai_task_queue
  FOR SELECT USING (
    tenant_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Chefs can approve/reject their own tasks
DROP POLICY IF EXISTS ai_queue_chef_update ON ai_task_queue;
CREATE POLICY ai_queue_chef_update ON ai_task_queue
  FOR UPDATE USING (
    tenant_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Service role can do everything (worker runs as service role)
DROP POLICY IF EXISTS ai_queue_service_role ON ai_task_queue;
CREATE POLICY ai_queue_service_role ON ai_task_queue
  FOR ALL USING (auth.role() = 'service_role');

-- Updated_at trigger
CREATE TRIGGER ai_task_queue_updated_at
  BEFORE UPDATE ON ai_task_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
