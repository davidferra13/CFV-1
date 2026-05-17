-- Lifecycle Mobile Visual Ergonomics (UI SYSTEM #14)
-- Touch targets, thumb zones, swipe gestures, mobile layout overrides

CREATE TABLE IF NOT EXISTS mobile_ergonomics_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route TEXT NOT NULL,
  component TEXT,
  min_touch_target INTEGER NOT NULL DEFAULT 44,
  thumb_zone TEXT NOT NULL DEFAULT 'easy',
  swipe_enabled BOOLEAN NOT NULL DEFAULT false,
  swipe_action TEXT,
  mobile_override JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mobile_ergonomics_rules_thumb_zone_check CHECK (thumb_zone IN ('easy', 'stretch', 'hard'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mobile_ergo_rules_tenant_route_component
  ON mobile_ergonomics_rules (tenant_id, route, COALESCE(component, ''));

CREATE INDEX IF NOT EXISTS idx_mobile_ergo_rules_tenant_route
  ON mobile_ergonomics_rules (tenant_id, route);

CREATE TABLE IF NOT EXISTS mobile_ergonomics_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route TEXT NOT NULL,
  total_components INTEGER NOT NULL DEFAULT 0,
  passing_components INTEGER NOT NULL DEFAULT 0,
  failing_targets INTEGER NOT NULL DEFAULT 0,
  thumb_zone_distribution JSONB NOT NULL DEFAULT '{"easy":0,"stretch":0,"hard":0}',
  score INTEGER NOT NULL DEFAULT 0,
  audited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mobile_ergo_audits_tenant_route
  ON mobile_ergonomics_audits (tenant_id, route);
