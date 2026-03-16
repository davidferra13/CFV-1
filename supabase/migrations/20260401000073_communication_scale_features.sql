-- Communication Platform Phase 4: Scale Features
-- Scheduled messages + additive columns on existing automation_rules
-- NOTE: automation_rules already exists (with tenant_id), so we only add missing columns

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

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_chef ON scheduled_messages(chef_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_pending ON scheduled_messages(scheduled_for)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_context ON scheduled_messages(context_type, context_id)
  WHERE context_type IS NOT NULL;

-- Add missing columns to existing automation_rules table
ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]';
ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS execution_count INTEGER DEFAULT 0;
ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMPTZ;
