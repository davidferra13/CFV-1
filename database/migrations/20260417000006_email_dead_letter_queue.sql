-- FC-G25: Email dead-letter queue for transient failures
-- Stores failed emails for retry by a cron job.
-- Only transient failures (5xx, network, circuit breaker) get queued.
-- Hard bounces are suppressed, not queued.

CREATE TABLE IF NOT EXISTS email_dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_addresses TEXT[] NOT NULL,
  subject TEXT NOT NULL,
  template_name TEXT NOT NULL DEFAULT 'unknown',
  from_address TEXT NOT NULL,
  reply_to TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'retrying', 'delivered', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_dlq_pending
  ON email_dead_letter_queue (next_retry_at)
  WHERE status = 'pending';

COMMENT ON TABLE email_dead_letter_queue IS 'Dead-letter queue for transient email failures. Cron retries pending items.';
