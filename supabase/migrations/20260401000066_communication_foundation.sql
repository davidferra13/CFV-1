-- Communication Foundation: auto-response config, response templates, business hours, client onboarding extensions

-- Auto-response configuration per chef
CREATE TABLE IF NOT EXISTS auto_response_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  default_response_time TEXT DEFAULT 'within 24 hours',
  reply_to_email TEXT,
  personalize_with_ai BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id)
);

ALTER TABLE auto_response_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_auto_response_access" ON auto_response_config
  FOR ALL USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

-- Response templates (reusable across auto-response, follow-up, proposals, etc.)
CREATE TABLE IF NOT EXISTS response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'auto_response', 'follow_up', 'menu_proposal', 'booking_confirmation',
    'payment_reminder', 'post_event', 'pre_event', 'general',
    'onboarding', 're_engagement'
  )),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  channel_filter TEXT,
  occasion_filter TEXT,
  is_default BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE response_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_template_access" ON response_templates
  FOR ALL USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

CREATE INDEX idx_response_templates_chef_category ON response_templates(chef_id, category) WHERE deleted_at IS NULL;

-- Business hours configuration
CREATE TABLE IF NOT EXISTS business_hours_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  schedule JSONB NOT NULL DEFAULT '{
    "monday":    {"enabled": true,  "start": "09:00", "end": "17:00"},
    "tuesday":   {"enabled": true,  "start": "09:00", "end": "17:00"},
    "wednesday": {"enabled": true,  "start": "09:00", "end": "17:00"},
    "thursday":  {"enabled": true,  "start": "09:00", "end": "17:00"},
    "friday":    {"enabled": true,  "start": "09:00", "end": "17:00"},
    "saturday":  {"enabled": false, "start": "10:00", "end": "15:00"},
    "sunday":    {"enabled": false, "start": "10:00", "end": "15:00"}
  }'::jsonb,
  outside_hours_message TEXT DEFAULT 'Thanks for reaching out! I am currently outside business hours and will respond when I am back. If this is about an event happening today, I will get back to you right away.',
  emergency_enabled BOOLEAN DEFAULT true,
  emergency_window_hours INTEGER DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id)
);

ALTER TABLE business_hours_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_business_hours_access" ON business_hours_config
  FOR ALL USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

-- Extend inquiries table for auto-response tracking
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS auto_responded_at TIMESTAMPTZ;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS auto_response_template_id UUID REFERENCES response_templates(id);

-- Extend clients table for onboarding and communication preferences
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_token TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS communication_preference JSONB DEFAULT '{}';
