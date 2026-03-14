-- Wave 4: Outreach Pipeline & Advanced Lead Generation
-- Adds: pipeline_stage tracking, follow-up email sequences, outreach log, geographic clustering

-- 1. Pipeline stage column — richer than existing status, tracks the sales funnel
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS pipeline_stage TEXT NOT NULL DEFAULT 'new'
  CHECK (pipeline_stage IN ('new', 'researched', 'contacted', 'responded', 'meeting_set', 'converted', 'lost'));
-- 2. Follow-up email sequences — stores the 3-email cadence drafted by AI
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS follow_up_sequence JSONB;
-- Format: { "emails": [{ "sequence": 1, "subject": "...", "body": "...", "send_after_days": 0 }, ...] }

-- 3. AI-generated call script per prospect (personalized, not the generic category scripts)
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS ai_call_script TEXT;
-- 4. Latitude/longitude for geographic clustering
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
-- 5. Outreach activity log — tracks every email sent, call made, response received
CREATE TABLE IF NOT EXISTS prospect_outreach_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES chefs(id),
  outreach_type TEXT NOT NULL CHECK (outreach_type IN ('email', 'call', 'follow_up_email', 'response_received', 'meeting_scheduled', 'note')),
  sequence_number INTEGER, -- which email in the sequence (1, 2, 3)
  subject TEXT,
  body TEXT,
  outcome TEXT, -- for calls: 'no_answer', 'spoke', etc.
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Index for querying outreach history by prospect
CREATE INDEX IF NOT EXISTS idx_outreach_log_prospect ON prospect_outreach_log(prospect_id);
CREATE INDEX IF NOT EXISTS idx_outreach_log_chef ON prospect_outreach_log(chef_id);
-- 6. Pipeline stage index for Kanban queries
CREATE INDEX IF NOT EXISTS idx_prospects_pipeline_stage ON prospects(pipeline_stage);
-- 7. Geographic index for clustering queries
CREATE INDEX IF NOT EXISTS idx_prospects_geo ON prospects(latitude, longitude) WHERE latitude IS NOT NULL;
-- 8. RLS for outreach log
ALTER TABLE prospect_outreach_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chef can manage own outreach log"
  ON prospect_outreach_log
  FOR ALL
  USING (chef_id = auth.uid())
  WITH CHECK (chef_id = auth.uid());
