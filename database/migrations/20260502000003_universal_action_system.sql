-- Universal Action System
-- Adds activity_log, user_pins tables and is_template columns for recipes/quotes

-- ============================================
-- ACTIVITY LOG
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_tenant ON activity_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants see own activity" ON activity_log
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Tenants insert own activity" ON activity_log
  FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

-- ============================================
-- USER PINS (per-user favorites)
-- ============================================
CREATE TABLE IF NOT EXISTS user_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_user_pins_user ON user_pins(user_id, entity_type);

-- RLS
ALTER TABLE user_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own pins" ON user_pins
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users manage own pins" ON user_pins
  FOR ALL USING (user_id = auth.uid());

-- ============================================
-- ADD is_template TO RECIPES
-- ============================================
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false NOT NULL;

-- ============================================
-- ADD is_template TO QUOTES
-- ============================================
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false NOT NULL;
