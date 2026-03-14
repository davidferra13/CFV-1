-- Migration: dop_task_completions
-- New table for manually marking DOP (Day-Of Protocol) tasks as complete.
-- The DOP view auto-detects system state, but some tasks (e.g. "kitchen clean")
-- can only be confirmed by the chef manually. This table stores those manual completions.
-- Additive only — no drops, no type changes.

CREATE TABLE IF NOT EXISTS dop_task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,           -- e.g. 'kitchen_clean', 'receipt_uploaded'
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,                       -- optional chef note on completion
  UNIQUE (event_id, task_key)       -- one completion record per task per event
);
-- RLS
ALTER TABLE dop_task_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chefs manage their own DOP completions"
  ON dop_task_completions
  FOR ALL
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());
CREATE INDEX idx_dop_task_completions_event
  ON dop_task_completions(event_id);
COMMENT ON TABLE dop_task_completions IS 'Manual chef confirmations for Day-Of Protocol tasks that cannot be auto-detected';
COMMENT ON COLUMN dop_task_completions.task_key IS 'Identifier matching the task key in lib/scheduling/dop.ts';
