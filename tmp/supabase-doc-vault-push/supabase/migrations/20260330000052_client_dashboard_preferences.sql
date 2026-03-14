-- ============================================
-- Client Dashboard Preferences
-- Stores per-client dashboard widget visibility + order.
-- ============================================

CREATE TABLE IF NOT EXISTS client_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  dashboard_widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_preferences_client_id ON client_preferences(client_id);
CREATE INDEX IF NOT EXISTS idx_client_preferences_tenant_id ON client_preferences(tenant_id);
ALTER TABLE client_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS client_preferences_select_own ON client_preferences;
CREATE POLICY client_preferences_select_own ON client_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM clients c
      WHERE c.id = client_preferences.client_id
        AND c.auth_user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS client_preferences_insert_own ON client_preferences;
CREATE POLICY client_preferences_insert_own ON client_preferences
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM clients c
      WHERE c.id = client_preferences.client_id
        AND c.auth_user_id = auth.uid()
        AND c.tenant_id = client_preferences.tenant_id
    )
  );
DROP POLICY IF EXISTS client_preferences_update_own ON client_preferences;
CREATE POLICY client_preferences_update_own ON client_preferences
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM clients c
      WHERE c.id = client_preferences.client_id
        AND c.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM clients c
      WHERE c.id = client_preferences.client_id
        AND c.auth_user_id = auth.uid()
        AND c.tenant_id = client_preferences.tenant_id
    )
  );
DROP TRIGGER IF EXISTS set_client_preferences_updated_at ON client_preferences;
CREATE TRIGGER set_client_preferences_updated_at
  BEFORE UPDATE ON client_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
