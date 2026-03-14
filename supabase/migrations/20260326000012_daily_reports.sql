-- Daily Reports — pre-computed daily business summaries
-- Stores a JSONB report per chef per date for the daily report email + app page.

CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_reports_tenant_date_unique UNIQUE (tenant_id, report_date)
);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- Chefs can read their own reports
CREATE POLICY "Chefs read own daily reports"
  ON daily_reports FOR SELECT
  USING (tenant_id = auth.uid());

-- Service role inserts (cron job)
CREATE POLICY "Service role inserts daily reports"
  ON daily_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role updates daily reports"
  ON daily_reports FOR UPDATE
  USING (true);

-- Indexes for fast lookup
CREATE INDEX idx_daily_reports_tenant_date ON daily_reports(tenant_id, report_date DESC);
