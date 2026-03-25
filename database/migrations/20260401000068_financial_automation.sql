-- Financial Automation: payment milestones, post-event surveys

-- Payment milestone templates (chef-configurable payment schedules)
CREATE TABLE IF NOT EXISTS payment_milestone_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  milestones JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE payment_milestone_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chef_milestone_template_access" ON payment_milestone_templates;
CREATE POLICY "chef_milestone_template_access" ON payment_milestone_templates
  FOR ALL USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

-- Per-event payment milestones (instantiated from templates)
CREATE TABLE IF NOT EXISTS event_payment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reminded', 'paid', 'overdue', 'waived')),
  ledger_entry_id UUID REFERENCES ledger_entries(id),
  reminder_sent_at TIMESTAMPTZ,
  overdue_notified_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  waived_at TIMESTAMPTZ,
  waived_reason TEXT,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE event_payment_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chef_event_milestone_access" ON event_payment_milestones;
CREATE POLICY "chef_event_milestone_access" ON event_payment_milestones
  FOR ALL USING (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "client_event_milestone_read" ON event_payment_milestones;
CREATE POLICY "client_event_milestone_read" ON event_payment_milestones
  FOR SELECT USING (event_id IN (
    SELECT e.id FROM events e
    JOIN clients c ON e.client_id = c.id
    JOIN user_roles ur ON c.auth_user_id = ur.auth_user_id
    WHERE ur.auth_user_id = auth.uid() AND ur.role = 'client'
  ));

CREATE INDEX IF NOT EXISTS idx_event_milestones_event ON event_payment_milestones(event_id);
CREATE INDEX IF NOT EXISTS idx_event_milestones_status ON event_payment_milestones(status) WHERE status IN ('pending', 'reminded', 'overdue');

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
  survey_token TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- Review gating
  review_request_eligible BOOLEAN DEFAULT false,
  review_request_sent_at TIMESTAMPTZ,
  referral_ask_sent_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id)
);

ALTER TABLE post_event_surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chef_survey_access" ON post_event_surveys;
CREATE POLICY "chef_survey_access" ON post_event_surveys
  FOR ALL USING (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

-- Survey token access (public, for unauthenticated survey submission)
DROP POLICY IF EXISTS "survey_token_access" ON post_event_surveys;
CREATE POLICY "survey_token_access" ON post_event_surveys
  FOR UPDATE USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_post_event_surveys_token ON post_event_surveys(survey_token);
CREATE INDEX IF NOT EXISTS idx_post_event_surveys_tenant ON post_event_surveys(tenant_id, completed_at);
