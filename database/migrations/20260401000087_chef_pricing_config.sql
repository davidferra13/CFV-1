-- Chef Pricing Config
-- Allows each chef to customize their own pricing rates instead of using system defaults.
-- All monetary values in cents (minor units).

CREATE TABLE IF NOT EXISTS chef_pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Couples rates (1-2 guests, per person)
  couples_rate_3_course INTEGER NOT NULL DEFAULT 20000,
  couples_rate_4_course INTEGER NOT NULL DEFAULT 25000,
  couples_rate_5_course INTEGER NOT NULL DEFAULT 30000,

  -- Group rates (3+ guests, per person)
  group_rate_3_course INTEGER NOT NULL DEFAULT 15500,
  group_rate_4_course INTEGER NOT NULL DEFAULT 18500,
  group_rate_5_course INTEGER NOT NULL DEFAULT 21500,

  -- Weekly / ongoing rates
  weekly_standard_min INTEGER NOT NULL DEFAULT 40000,
  weekly_standard_max INTEGER NOT NULL DEFAULT 50000,
  weekly_commit_min INTEGER NOT NULL DEFAULT 30000,
  weekly_commit_max INTEGER NOT NULL DEFAULT 35000,
  cook_and_leave_rate INTEGER NOT NULL DEFAULT 15000,
  pizza_rate INTEGER NOT NULL DEFAULT 15000,

  -- Multi-night packages (JSONB: key -> total cents)
  multi_night_packages JSONB NOT NULL DEFAULT '{}',

  -- Deposit and booking policies
  deposit_percentage INTEGER NOT NULL DEFAULT 50,
  minimum_booking_cents INTEGER NOT NULL DEFAULT 30000,
  balance_due_hours INTEGER NOT NULL DEFAULT 24,

  -- Mileage
  mileage_rate_cents INTEGER NOT NULL DEFAULT 70,

  -- Weekend premium
  weekend_premium_pct INTEGER NOT NULL DEFAULT 10,
  weekend_premium_on BOOLEAN NOT NULL DEFAULT false,

  -- Holiday premiums (stored as whole-number percentages, e.g. 45 = 45%)
  holiday_tier1_pct INTEGER NOT NULL DEFAULT 45,
  holiday_tier2_pct INTEGER NOT NULL DEFAULT 30,
  holiday_tier3_pct INTEGER NOT NULL DEFAULT 20,
  holiday_proximity_days INTEGER NOT NULL DEFAULT 2,

  -- Large group thresholds
  large_group_min INTEGER NOT NULL DEFAULT 8,
  large_group_max INTEGER NOT NULL DEFAULT 14,

  -- Add-on catalog (JSONB array of add-on definitions)
  add_on_catalog JSONB NOT NULL DEFAULT '[
    {"key":"wine_pairing","label":"Wine Pairing","type":"per_person","perPersonCents":3500},
    {"key":"charcuterie_board","label":"Charcuterie Board Setup","type":"flat","flatCents":15000},
    {"key":"extra_appetizer_course","label":"Additional Appetizer Course","type":"per_person","perPersonCents":2500},
    {"key":"birthday_dessert","label":"Custom Birthday Dessert","type":"flat","flatCents":7500}
  ]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chef_pricing_config_chef_id_unique UNIQUE (chef_id)
);

-- RLS
ALTER TABLE chef_pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs can view own pricing config"
  ON chef_pricing_config FOR SELECT
  USING (chef_id = auth.uid() OR chef_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

CREATE POLICY "Chefs can insert own pricing config"
  ON chef_pricing_config FOR INSERT
  WITH CHECK (chef_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

CREATE POLICY "Chefs can update own pricing config"
  ON chef_pricing_config FOR UPDATE
  USING (chef_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_chef_pricing_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chef_pricing_config_updated_at ON chef_pricing_config;
CREATE TRIGGER trg_chef_pricing_config_updated_at
  BEFORE UPDATE ON chef_pricing_config
  FOR EACH ROW
  EXECUTE FUNCTION update_chef_pricing_config_updated_at();

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_chef_pricing_config_chef_id ON chef_pricing_config(chef_id);
