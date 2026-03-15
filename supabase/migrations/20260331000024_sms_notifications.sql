-- SMS Notifications (Feature U7)
-- Adds sms_messages table and Twilio config to chef_preferences

-- SMS message log
CREATE TABLE IF NOT EXISTS sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  to_phone text NOT NULL,
  message text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN (
    'order_ready', 'table_ready', 'delivery_eta',
    'reservation_confirm', 'reservation_remind',
    'feedback_request', 'custom'
  )),
  entity_type text CHECK (entity_type IN (
    'event', 'bakery_order', 'reservation', 'preorder', 'delivery'
  )),
  entity_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'delivered', 'failed'
  )),
  twilio_sid text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Indexes
CREATE INDEX idx_sms_messages_tenant ON sms_messages(tenant_id);
CREATE INDEX idx_sms_messages_status ON sms_messages(tenant_id, status);
CREATE INDEX idx_sms_messages_created ON sms_messages(tenant_id, created_at DESC);
CREATE INDEX idx_sms_messages_entity ON sms_messages(entity_type, entity_id) WHERE entity_id IS NOT NULL;
-- RLS
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chefs can manage their own SMS messages"
  ON sms_messages FOR ALL
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());
-- Add Twilio config columns to chef_preferences
ALTER TABLE chef_preferences ADD COLUMN IF NOT EXISTS sms_enabled boolean DEFAULT false;
ALTER TABLE chef_preferences ADD COLUMN IF NOT EXISTS twilio_account_sid text;
ALTER TABLE chef_preferences ADD COLUMN IF NOT EXISTS twilio_auth_token text;
ALTER TABLE chef_preferences ADD COLUMN IF NOT EXISTS twilio_phone_number text;
