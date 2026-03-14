-- Food Cost Tracker: add target % to chef_preferences
-- Customer Feedback: feedback_requests + feedback_responses tables

-- Food cost target (default 30%)
ALTER TABLE chef_preferences
ADD COLUMN IF NOT EXISTS food_cost_target_percent integer DEFAULT 30;
-- ========================================
-- Customer Feedback: feedback_requests
-- ========================================
CREATE TABLE IF NOT EXISTS feedback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  client_name text NOT NULL,
  client_email text,
  client_phone text,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'completed', 'expired')),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_token ON feedback_requests(token);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_tenant ON feedback_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_entity ON feedback_requests(entity_type, entity_id);
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Chefs can manage their feedback requests"
    ON feedback_requests FOR ALL
    USING (tenant_id = auth.uid())
    WITH CHECK (tenant_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- ========================================
-- Customer Feedback: feedback_responses
-- ========================================
CREATE TABLE IF NOT EXISTS feedback_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES feedback_requests(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  tags text[],
  would_recommend boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_tenant ON feedback_responses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_request ON feedback_responses(request_id);
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Chefs can view their feedback responses"
    ON feedback_responses FOR SELECT
    USING (tenant_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Public submission handled via service role in server actions (no RLS policy needed for insert from public);
