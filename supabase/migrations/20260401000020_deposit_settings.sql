-- Deposit Settings - per-chef deposit configuration
-- Additive only. No DROP, no DELETE.
-- Feature 3.3: Deposit Management

CREATE TABLE IF NOT EXISTS chef_deposit_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  deposit_percentage INT NOT NULL DEFAULT 50,
  balance_due_days_before INT NOT NULL DEFAULT 7,
  deposit_required BOOLEAN NOT NULL DEFAULT true,
  auto_reminder BOOLEAN NOT NULL DEFAULT true,
  reminder_days_before INT[] NOT NULL DEFAULT '{14,7,3}',
  payment_terms_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chef_deposit_settings_chef_unique UNIQUE (chef_id),
  CONSTRAINT deposit_pct_range CHECK (deposit_percentage >= 0 AND deposit_percentage <= 100),
  CONSTRAINT balance_due_days_positive CHECK (balance_due_days_before >= 0)
);

-- Index for FK lookup
CREATE INDEX IF NOT EXISTS idx_chef_deposit_settings_chef ON chef_deposit_settings(chef_id);

-- RLS
ALTER TABLE chef_deposit_settings ENABLE ROW LEVEL SECURITY;

-- Chef can read own settings
CREATE POLICY chef_deposit_settings_select ON chef_deposit_settings
  FOR SELECT USING (chef_id = get_current_tenant_id());

-- Chef can insert own settings
CREATE POLICY chef_deposit_settings_insert ON chef_deposit_settings
  FOR INSERT WITH CHECK (chef_id = get_current_tenant_id());

-- Chef can update own settings
CREATE POLICY chef_deposit_settings_update ON chef_deposit_settings
  FOR UPDATE USING (chef_id = get_current_tenant_id());

-- Updated_at trigger
CREATE TRIGGER set_updated_at_chef_deposit_settings
  BEFORE UPDATE ON chef_deposit_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
