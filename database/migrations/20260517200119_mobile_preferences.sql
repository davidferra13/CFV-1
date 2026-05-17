CREATE TABLE IF NOT EXISTS mobile_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  default_view TEXT NOT NULL DEFAULT 'today',
  quick_actions JSONB NOT NULL DEFAULT '["respond", "confirm", "prep"]',
  show_revenue BOOLEAN NOT NULL DEFAULT true,
  compact_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_mobile_prefs_tenant ON mobile_preferences(tenant_id);
ALTER TABLE mobile_preferences ENABLE ROW LEVEL SECURITY;
