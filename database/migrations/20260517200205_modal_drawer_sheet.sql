-- Modal / Drawer / Sheet interaction system
-- Overlay configs: when to use each overlay type, size presets, animation, stacking
-- Usage rules: which route+component maps to which overlay config

CREATE TABLE IF NOT EXISTS overlay_configs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name          text NOT NULL,
  overlay_type  text NOT NULL CHECK (overlay_type IN ('modal','drawer','sheet','popover','dialog')),
  size_preset   text NOT NULL CHECK (size_preset IN ('sm','md','lg','xl','full')),
  position      text NOT NULL CHECK (position IN ('center','left','right','bottom')),
  animation     text NOT NULL CHECK (animation IN ('fade','slide','scale','none')),
  close_on_backdrop boolean NOT NULL DEFAULT true,
  close_on_escape   boolean NOT NULL DEFAULT true,
  mobile_override   text CHECK (mobile_override IS NULL OR mobile_override IN ('modal','drawer','sheet','popover','dialog')),
  stackable     boolean NOT NULL DEFAULT false,
  max_stack_depth integer NOT NULL DEFAULT 1 CHECK (max_stack_depth >= 1),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX idx_overlay_configs_tenant ON overlay_configs (tenant_id);

CREATE TABLE IF NOT EXISTS overlay_usage_rules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  route             text NOT NULL,
  component         text NOT NULL,
  overlay_config_id uuid NOT NULL REFERENCES overlay_configs(id) ON DELETE CASCADE,
  purpose           text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, route, component)
);

CREATE INDEX idx_overlay_usage_rules_tenant_route ON overlay_usage_rules (tenant_id, route);

-- RLS
ALTER TABLE overlay_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE overlay_usage_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs manage own overlay configs"
  ON overlay_configs FOR ALL TO public
  USING (tenant_id IN (
    SELECT user_roles.entity_id FROM user_roles
    WHERE user_roles.auth_user_id = auth.uid() AND user_roles.role = 'chef'
  ))
  WITH CHECK (tenant_id IN (
    SELECT user_roles.entity_id FROM user_roles
    WHERE user_roles.auth_user_id = auth.uid() AND user_roles.role = 'chef'
  ));

CREATE POLICY "Service role manages overlay configs"
  ON overlay_configs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Chefs manage own overlay usage rules"
  ON overlay_usage_rules FOR ALL TO public
  USING (tenant_id IN (
    SELECT user_roles.entity_id FROM user_roles
    WHERE user_roles.auth_user_id = auth.uid() AND user_roles.role = 'chef'
  ))
  WITH CHECK (tenant_id IN (
    SELECT user_roles.entity_id FROM user_roles
    WHERE user_roles.auth_user_id = auth.uid() AND user_roles.role = 'chef'
  ));

CREATE POLICY "Service role manages overlay usage rules"
  ON overlay_usage_rules FOR ALL TO service_role
  USING (true) WITH CHECK (true);
