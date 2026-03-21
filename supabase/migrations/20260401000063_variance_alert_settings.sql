-- Cost Variance Alert Settings
-- Per-chef threshold configuration for when actual food cost
-- exceeds estimated cost by a configurable percentage.

CREATE TABLE IF NOT EXISTS variance_alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  threshold_pct INTEGER NOT NULL DEFAULT 15 CHECK (threshold_pct > 0 AND threshold_pct <= 100),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  notify_on_event_complete BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id)
);

ALTER TABLE variance_alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY vas_chef_select ON variance_alert_settings
  FOR SELECT USING (chef_id = auth.uid() OR chef_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY vas_chef_insert ON variance_alert_settings
  FOR INSERT WITH CHECK (chef_id = auth.uid() OR chef_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY vas_chef_update ON variance_alert_settings
  FOR UPDATE USING (chef_id = auth.uid() OR chef_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

-- Auto-set updated_at on update
DROP TRIGGER IF EXISTS trg_vas_updated_at ON variance_alert_settings;
CREATE TRIGGER trg_vas_updated_at BEFORE UPDATE ON variance_alert_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
