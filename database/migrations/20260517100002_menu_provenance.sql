-- Menu Provenance System: track how each menu was created
-- ADDITIVE ONLY: two new nullable columns, no data loss risk

ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS origin_type TEXT NOT NULL DEFAULT 'chef_created';

ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS origin_metadata JSONB NOT NULL DEFAULT '{}';

-- Constrain origin_type to known values
ALTER TABLE menus
  ADD CONSTRAINT menus_origin_type_check
  CHECK (origin_type IN (
    'chef_created',
    'client_provided',
    'forked',
    'templated',
    'uploaded',
    'suggested',
    'collaborative'
  ));

-- Index for filtering by origin type (per tenant)
CREATE INDEX IF NOT EXISTS idx_menus_origin_type
  ON menus (tenant_id, origin_type)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN menus.origin_type IS 'How this menu was created: chef_created, forked, templated, uploaded, suggested, client_provided, collaborative';
COMMENT ON COLUMN menus.origin_metadata IS 'Origin-specific data (parent menu ID for forks, template ID for templated, filename for uploads, etc.)';
