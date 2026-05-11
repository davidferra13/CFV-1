-- Vendor Call Metrics
-- Tracks per-vendor call performance to optimize which vendors get called first.
-- Aggregated metrics from call outcomes: answer rate, quality, price competitiveness,
-- best time-of-day windows, and consecutive no-answer streaks.

CREATE TABLE IF NOT EXISTS vendor_call_metrics (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                   UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_phone              TEXT NOT NULL,
  vendor_name               TEXT NOT NULL,
  total_calls               INTEGER NOT NULL DEFAULT 0,
  answered_calls            INTEGER NOT NULL DEFAULT 0,
  voicemail_calls           INTEGER NOT NULL DEFAULT 0,
  failed_calls              INTEGER NOT NULL DEFAULT 0,
  avg_response_quality      REAL NOT NULL DEFAULT 0,
  avg_price_competitiveness REAL NOT NULL DEFAULT 0,
  last_answer_time          TEXT,
  best_call_window          TEXT,
  consecutive_no_answers    INTEGER NOT NULL DEFAULT 0,
  last_call_at              TIMESTAMPTZ,
  last_answered_at          TIMESTAMPTZ,
  price_points              JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chef_id, vendor_phone)
);

CREATE INDEX IF NOT EXISTS idx_vendor_call_metrics_chef_no_answers
  ON vendor_call_metrics (chef_id, consecutive_no_answers);

ALTER TABLE vendor_call_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs can manage their own vendor call metrics"
  ON vendor_call_metrics FOR ALL
  USING (chef_id = auth.uid())
  WITH CHECK (chef_id = auth.uid());
