-- Communication Platform Phase 3: Financial Automation
-- Follow-up sequences and post-event surveys

-- Follow-up sequences (automated multi-step outreach)
CREATE TABLE IF NOT EXISTS follow_up_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('post_event', 'dormant_client', 'milestone')),
  trigger_config JSONB DEFAULT '{}',
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE follow_up_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_sequence_access" ON follow_up_sequences
  FOR ALL USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

CREATE INDEX idx_follow_up_sequences_chef ON follow_up_sequences(chef_id);
CREATE INDEX idx_follow_up_sequences_active ON follow_up_sequences(chef_id, is_active) WHERE is_active = true;

-- Post-event surveys (structured feedback collection)
CREATE TABLE IF NOT EXISTS post_event_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),
  -- Ratings (1-5)
  food_quality INTEGER CHECK (food_quality BETWEEN 1 AND 5),
  portion_size INTEGER CHECK (portion_size BETWEEN 1 AND 5),
  punctuality INTEGER CHECK (punctuality BETWEEN 1 AND 5),
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  presentation INTEGER CHECK (presentation BETWEEN 1 AND 5),
  cleanup INTEGER CHECK (cleanup BETWEEN 1 AND 5),
  overall INTEGER CHECK (overall BETWEEN 1 AND 5),
  -- Open text
  what_they_loved TEXT,
  what_could_improve TEXT,
  would_book_again BOOLEAN,
  additional_comments TEXT,
  -- Dish-level feedback
  dish_feedback JSONB DEFAULT '[]',
  -- Survey delivery
  survey_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- Review gating
  review_request_eligible BOOLEAN DEFAULT false,
  review_request_sent_at TIMESTAMPTZ,
  referral_ask_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id)
);

ALTER TABLE post_event_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_survey_access" ON post_event_surveys
  FOR ALL USING (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

CREATE INDEX idx_post_event_surveys_token ON post_event_surveys(survey_token);
CREATE INDEX idx_post_event_surveys_tenant ON post_event_surveys(tenant_id, completed_at);
