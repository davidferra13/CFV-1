-- Notification Delivery Log
-- Audits what was actually sent across each channel (email, push, SMS).
-- Used for: delivery debugging, settings UI "last sent" display, deduplication.
-- Rows are soft-immutable — only inserts, no updates.

CREATE TABLE notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'push', 'sms')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message TEXT,  -- populated when status = 'failed'
  sent_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE notification_delivery_log IS 'Immutable delivery audit log. One row per channel attempt per notification. Used for debugging and settings UI.';
COMMENT ON COLUMN notification_delivery_log.channel IS 'Delivery channel: email, push (browser), or sms.';
COMMENT ON COLUMN notification_delivery_log.status IS 'sent = delivered, failed = error, skipped = not attempted (channel disabled or rate-limited).';

-- Fast lookup per notification (to see which channels fired)
CREATE INDEX idx_delivery_log_notification ON notification_delivery_log(notification_id);

-- Tenant + channel + time index for settings UI "recent deliveries" query
CREATE INDEX idx_delivery_log_tenant_channel ON notification_delivery_log(tenant_id, channel, sent_at DESC);

ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- Chef can read their own tenant's delivery log (for transparency in settings)
CREATE POLICY delivery_log_chef_select ON notification_delivery_log
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Inserts go through service role (channel-router.ts uses admin client)
-- The insert policy here permits chef-scoped inserts if needed
CREATE POLICY delivery_log_service_insert ON notification_delivery_log
  FOR INSERT WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

-- No updates, no hard deletes
CREATE POLICY delivery_log_no_update ON notification_delivery_log
  FOR UPDATE USING (false);

CREATE POLICY delivery_log_no_delete ON notification_delivery_log
  FOR DELETE USING (false);
