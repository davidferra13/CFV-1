-- Progressive Disclosure: complexity level + dismissed suggestions + page visit tracking
-- Additive only. No existing data modified.

-- Add complexity_level to chef_preferences
ALTER TABLE chef_preferences
ADD COLUMN IF NOT EXISTS complexity_level TEXT NOT NULL DEFAULT 'pro';

ALTER TABLE chef_preferences
ADD CONSTRAINT chef_preferences_complexity_level_check
CHECK (complexity_level IN ('starter', 'standard', 'pro'));

COMMENT ON COLUMN chef_preferences.complexity_level IS
  'Controls progressive disclosure: starter (5 core pages), standard (11 pages), pro (everything)';

-- Add dismissed_suggestions jsonb column for tracking dismissed feature suggestions
ALTER TABLE chef_preferences
ADD COLUMN IF NOT EXISTS dismissed_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN chef_preferences.dismissed_suggestions IS
  'Array of feature suggestion IDs the chef has dismissed';

-- Page visit tracking table for usage analytics
CREATE TABLE IF NOT EXISTS page_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route TEXT NOT NULL,
  visit_count INTEGER NOT NULL DEFAULT 1,
  last_visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, route)
);

CREATE INDEX IF NOT EXISTS idx_page_visits_tenant ON page_visits (tenant_id);

COMMENT ON TABLE page_visits IS
  'Lightweight page visit tracking for progressive disclosure and feature suggestions';

-- RPC for atomic upsert of page visits
CREATE OR REPLACE FUNCTION upsert_page_visit(p_tenant_id UUID, p_route TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO page_visits (tenant_id, route, visit_count, last_visited_at)
  VALUES (p_tenant_id, p_route, 1, now())
  ON CONFLICT (tenant_id, route)
  DO UPDATE SET
    visit_count = page_visits.visit_count + 1,
    last_visited_at = now();
END;
$$ LANGUAGE plpgsql;
