-- Communication Platform Phase 4: Scale Features
-- Scheduled messages and automation rules

-- Scheduled messages (send-later queue)
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  recipient_id UUID,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'app')),
  subject TEXT,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
  template_id UUID REFERENCES response_templates(id) ON DELETE SET NULL,
  context_type TEXT CHECK (context_type IN ('inquiry', 'event', 'client')),
  context_id UUID,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_scheduled_message_access" ON scheduled_messages
  FOR ALL USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

CREATE INDEX idx_scheduled_messages_chef ON scheduled_messages(chef_id);
CREATE INDEX idx_scheduled_messages_pending ON scheduled_messages(scheduled_for)
  WHERE status = 'scheduled';
CREATE INDEX idx_scheduled_messages_context ON scheduled_messages(context_type, context_id)
  WHERE context_type IS NOT NULL;

-- Automation rules (trigger-based workflow automation)
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL CHECK (trigger_event IN (
    'new_inquiry', 'event_confirmed', 'event_completed',
    'payment_received', 'guest_count_changed', 'menu_approved',
    'survey_completed', 'milestone_overdue'
  )),
  conditions JSONB DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_automation_rule_access" ON automation_rules
  FOR ALL USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

CREATE INDEX idx_automation_rules_chef ON automation_rules(chef_id);
CREATE INDEX idx_automation_rules_trigger ON automation_rules(chef_id, trigger_event)
  WHERE is_active = true;
