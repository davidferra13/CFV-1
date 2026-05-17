-- High Contrast & Service Environment Readability Mode
-- UI SYSTEM #38

CREATE TABLE IF NOT EXISTS readability_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  mode TEXT NOT NULL,
  label TEXT NOT NULL,
  bg_color TEXT NOT NULL DEFAULT '#ffffff',
  text_color TEXT NOT NULL DEFAULT '#000000',
  accent_color TEXT NOT NULL DEFAULT '#3b82f6',
  contrast_ratio REAL NOT NULL DEFAULT 4.5,
  font_size TEXT NOT NULL DEFAULT '16px',
  font_weight TEXT NOT NULL DEFAULT '400',
  reduced_motion BOOLEAN NOT NULL DEFAULT false,
  increased_spacing BOOLEAN NOT NULL DEFAULT false,
  auto_activate_condition JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_readability_profiles_tenant_mode
  ON readability_profiles (tenant_id, mode);

CREATE TABLE IF NOT EXISTS readability_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  active_mode TEXT NOT NULL DEFAULT 'standard',
  auto_switch BOOLEAN NOT NULL DEFAULT false,
  scheduled_modes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_readability_preferences_tenant
  ON readability_preferences (tenant_id);
