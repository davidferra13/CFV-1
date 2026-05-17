-- Menu Fork Lineage: track parent-child relationships between menus
-- Additive only. No existing data modified.

-- 1. Add lineage columns to menus
ALTER TABLE menus ADD COLUMN IF NOT EXISTS forked_from_id UUID REFERENCES menus(id) ON DELETE SET NULL;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS fork_generation INTEGER NOT NULL DEFAULT 0;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS fork_reason TEXT;

COMMENT ON COLUMN menus.forked_from_id IS 'The menu this was forked/duplicated from. NULL = original.';
COMMENT ON COLUMN menus.fork_generation IS '0 = original, 1 = first fork, 2 = fork of a fork, etc.';
COMMENT ON COLUMN menus.fork_reason IS 'Why the fork was created: client_customization, chef_iteration, template_instantiation, proposal_variant, seasonal_refresh.';

-- 2. Index for lineage lookups (children of a parent)
CREATE INDEX IF NOT EXISTS idx_menus_forked_from
  ON menus(forked_from_id)
  WHERE forked_from_id IS NOT NULL;

-- 3. Index for fork-count aggregations (popular templates)
CREATE INDEX IF NOT EXISTS idx_menus_fork_generation
  ON menus(tenant_id, fork_generation);

-- 4. Constraint: fork_generation must be non-negative
ALTER TABLE menus ADD CONSTRAINT chk_menus_fork_generation_positive CHECK (fork_generation >= 0);

-- 5. Constraint: fork_reason must be a known value (or NULL for originals)
ALTER TABLE menus ADD CONSTRAINT chk_menus_fork_reason_valid
  CHECK (fork_reason IS NULL OR fork_reason IN (
    'client_customization',
    'chef_iteration',
    'template_instantiation',
    'proposal_variant',
    'seasonal_refresh'
  ));
