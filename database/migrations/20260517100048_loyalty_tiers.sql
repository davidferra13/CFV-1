-- Loyalty Tier Configuration
-- Chef-configurable per-tier thresholds, discount percentages, and perks.
-- Complements existing loyalty_config (program-wide settings) with per-tier granularity.
-- ADDITIVE ONLY: no drops, no renames.

CREATE TABLE IF NOT EXISTS chef_loyalty_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
    tier loyalty_tier NOT NULL,
    min_events INTEGER NOT NULL DEFAULT 0,
    min_spend_cents INTEGER NOT NULL DEFAULT 0,
    discount_percent INTEGER NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    perks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, tier)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chef_loyalty_configs_tenant
    ON chef_loyalty_configs USING btree (tenant_id);

-- RLS policies
ALTER TABLE chef_loyalty_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select_chef_loyalty_configs
    ON chef_loyalty_configs FOR SELECT TO public
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_isolation_insert_chef_loyalty_configs
    ON chef_loyalty_configs FOR INSERT TO public
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_isolation_update_chef_loyalty_configs
    ON chef_loyalty_configs FOR UPDATE TO public
    USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());
