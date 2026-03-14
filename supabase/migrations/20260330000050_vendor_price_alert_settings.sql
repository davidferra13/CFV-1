-- Vendor-specific price alert thresholds.
-- Allows each vendor profile to control the minimum percent change that triggers an alert.

CREATE TABLE IF NOT EXISTS vendor_price_alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  price_change_percent_threshold NUMERIC(8,2) NOT NULL DEFAULT 5.00
    CHECK (price_change_percent_threshold >= 0 AND price_change_percent_threshold <= 1000),
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_price_alert_settings_chef_vendor
  ON vendor_price_alert_settings (chef_id, vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_price_alert_settings_vendor
  ON vendor_price_alert_settings (vendor_id);

DROP TRIGGER IF EXISTS update_vendor_price_alert_settings_updated_at ON vendor_price_alert_settings;
CREATE TRIGGER update_vendor_price_alert_settings_updated_at
  BEFORE UPDATE ON vendor_price_alert_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE vendor_price_alert_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vendor_price_alert_settings_chef_all ON vendor_price_alert_settings;
CREATE POLICY vendor_price_alert_settings_chef_all ON vendor_price_alert_settings
  FOR ALL USING (
    chef_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS vendor_price_alert_settings_service_all ON vendor_price_alert_settings;
CREATE POLICY vendor_price_alert_settings_service_all ON vendor_price_alert_settings
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE vendor_price_alert_settings IS
  'Per-vendor threshold used to filter price change alerts.';
