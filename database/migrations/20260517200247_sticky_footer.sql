-- Sticky Footer Configs: per-stage action bar items for mobile lifecycle footer
CREATE TABLE IF NOT EXISTS sticky_footer_configs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  lifecycle_stage text NOT NULL,
  action_label  text NOT NULL,
  action_type   text NOT NULL DEFAULT 'primary'
    CHECK (action_type IN ('primary','secondary','danger','info')),
  icon          text,
  target_route  text,
  sort_order    integer NOT NULL DEFAULT 0,
  show_badge    boolean NOT NULL DEFAULT false,
  badge_count   integer,
  visible       boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sticky_footer_configs_tenant_stage
  ON sticky_footer_configs (tenant_id, lifecycle_stage);

-- Sticky Footer Overrides: per-event overrides on top of stage configs
CREATE TABLE IF NOT EXISTS sticky_footer_overrides (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  lifecycle_stage text NOT NULL,
  config_id       uuid NOT NULL REFERENCES sticky_footer_configs(id) ON DELETE CASCADE,
  override_label  text,
  override_action text,
  visible         boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sticky_footer_overrides_tenant_event
  ON sticky_footer_overrides (tenant_id, event_id);

-- RLS policies
ALTER TABLE sticky_footer_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sticky_footer_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY sfc_chef_select ON sticky_footer_configs
  FOR SELECT USING (true);
CREATE POLICY sfc_chef_insert ON sticky_footer_configs
  FOR INSERT WITH CHECK (true);
CREATE POLICY sfc_chef_update ON sticky_footer_configs
  FOR UPDATE USING ((get_current_user_role() = 'chef'::user_role) AND (tenant_id = get_current_tenant_id()));
CREATE POLICY sfc_chef_delete ON sticky_footer_configs
  FOR DELETE USING ((get_current_user_role() = 'chef'::user_role) AND (tenant_id = get_current_tenant_id()));

CREATE POLICY sfo_chef_select ON sticky_footer_overrides
  FOR SELECT USING (true);
CREATE POLICY sfo_chef_insert ON sticky_footer_overrides
  FOR INSERT WITH CHECK (true);
CREATE POLICY sfo_chef_update ON sticky_footer_overrides
  FOR UPDATE USING ((get_current_user_role() = 'chef'::user_role) AND (tenant_id = get_current_tenant_id()));
CREATE POLICY sfo_chef_delete ON sticky_footer_overrides
  FOR DELETE USING ((get_current_user_role() = 'chef'::user_role) AND (tenant_id = get_current_tenant_id()));
