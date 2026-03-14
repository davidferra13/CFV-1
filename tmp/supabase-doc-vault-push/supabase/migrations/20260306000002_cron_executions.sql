-- ============================================================
-- Migration: Cron Execution Tracking Table
-- Created:   2026-03-06
-- Purpose:   Provide operational visibility into whether
--            scheduled cron jobs are running successfully.
--
--            Without this table, a cron that silently fails
--            (DB timeout, exception swallowed, Vercel timeout)
--            is indistinguishable from one that is healthy.
--
--            The /api/scheduled/monitor route reads this table
--            and flags any cron whose last heartbeat is older
--            than 2x its expected schedule interval.
-- ============================================================

CREATE TABLE cron_executions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_name    TEXT        NOT NULL,
  executed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  status       TEXT        NOT NULL DEFAULT 'success'
               CHECK (status IN ('success', 'error')),
  duration_ms  INTEGER,    -- optional: how long the cron took
  result       JSONB,      -- optional: summary of what the cron did
  error_text   TEXT        -- only set when status = 'error'
);
COMMENT ON TABLE cron_executions IS
  'Heartbeat log for all scheduled cron jobs. '
  'Each successful cron run inserts one row. '
  'Read by /api/scheduled/monitor to detect stale or failing jobs.';
COMMENT ON COLUMN cron_executions.cron_name IS
  'Identifier matching the cron path in vercel.json, '
  'e.g. ''lifecycle'', ''follow-ups'', ''loyalty-expiry''.';
COMMENT ON COLUMN cron_executions.duration_ms IS
  'Optional: elapsed milliseconds from start to heartbeat call. '
  'Useful for detecting slow crons approaching Vercel''s 25s limit.';
-- Fast lookup: what was the last run of a given cron?
CREATE INDEX idx_cron_executions_name_executed
  ON cron_executions (cron_name, executed_at DESC);
-- Fast lookup: all recent executions sorted by time
CREATE INDEX idx_cron_executions_executed
  ON cron_executions (executed_at DESC);
-- RLS: This is a system/operational table.
-- Only accessible via service_role (admin: true) from server code.
-- No user-facing policies — chefs and clients cannot read this table.
ALTER TABLE cron_executions ENABLE ROW LEVEL SECURITY;
-- Auto-cleanup: Keep only the last 30 days of execution records.
-- Older records are noise; the monitor only cares about recent runs.
-- This prevents unbounded table growth without a separate cleanup cron.
-- Implemented as a trigger on INSERT rather than a scheduled job.

CREATE OR REPLACE FUNCTION purge_old_cron_executions()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete records older than 30 days on every insert.
  -- Runs synchronously but is a single-index DELETE — fast.
  DELETE FROM cron_executions
  WHERE executed_at < now() - INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION purge_old_cron_executions IS
  'Auto-purges cron_executions rows older than 30 days on each INSERT. '
  'Keeps the table lean without requiring a separate cleanup cron.';
CREATE TRIGGER auto_purge_cron_executions
  AFTER INSERT ON cron_executions
  FOR EACH STATEMENT
  EXECUTE FUNCTION purge_old_cron_executions();
