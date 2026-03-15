-- Inbox UX improvements: unread state tracking
-- Additive only — no drops, no renames, no destructive changes.
-- push_subscriptions table already exists (20260302000004_notification_channels.sql)

-- Track which threads the chef has read.
-- Using a separate "read receipts" table rather than a column on conversation_threads,
-- because a thread can have multiple events and we want to track the last-read timestamp.
CREATE TABLE IF NOT EXISTS conversation_thread_reads (
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, thread_id)
);

ALTER TABLE conversation_thread_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chefs manage own thread reads" ON conversation_thread_reads;
CREATE POLICY "Chefs manage own thread reads"
  ON conversation_thread_reads FOR ALL
  USING (tenant_id IN (SELECT id FROM chefs WHERE id = tenant_id));

-- Index for fast "unread count" query: threads with last_activity_at > last_read_at
CREATE INDEX IF NOT EXISTS idx_thread_reads_tenant
  ON conversation_thread_reads(tenant_id);
