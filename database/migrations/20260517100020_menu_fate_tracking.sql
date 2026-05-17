-- Menu Fate Tracking
-- Tracks business outcomes for menus separate from operational status.
-- Fate = what happened business-wise: served, abandoned, proposed but not selected, etc.

-- Add fate columns to menus table (all nullable for existing rows)
ALTER TABLE menus ADD COLUMN IF NOT EXISTS fate TEXT
  CHECK (fate IN ('served', 'abandoned', 'proposed_not_selected', 'superseded', 'recycled', 'approved_unserved', 'client_rejected', 'template_frozen'));

ALTER TABLE menus ADD COLUMN IF NOT EXISTS fate_reason TEXT;

ALTER TABLE menus ADD COLUMN IF NOT EXISTS fate_set_at TIMESTAMPTZ;

ALTER TABLE menus ADD COLUMN IF NOT EXISTS fate_set_by TEXT DEFAULT 'auto'
  CHECK (fate_set_by IN ('auto', 'manual', 'scanner'));

-- Index for filtering by fate
CREATE INDEX IF NOT EXISTS idx_menus_fate ON menus(fate) WHERE fate IS NOT NULL;

-- Composite index for the abandoned-detection scanner
CREATE INDEX IF NOT EXISTS idx_menus_fate_scanner
  ON menus(tenant_id, status, updated_at)
  WHERE fate IS NULL AND is_template = false AND event_id IS NULL AND deleted_at IS NULL;

-- Composite index for tenant + fate queries
CREATE INDEX IF NOT EXISTS idx_menus_tenant_fate
  ON menus(tenant_id, fate) WHERE deleted_at IS NULL;

-- Menu fate transitions: immutable audit trail
CREATE TABLE IF NOT EXISTS menu_fate_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  from_fate TEXT,
  to_fate TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('auto', 'manual', 'scanner')),

  trigger_type TEXT NOT NULL,
  trigger_entity_id UUID,
  reason TEXT,

  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  transitioned_by UUID
);

CREATE INDEX IF NOT EXISTS idx_menu_fate_transitions_menu ON menu_fate_transitions(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_fate_transitions_tenant ON menu_fate_transitions(tenant_id);

-- Backfill: set fate for menus linked to completed events
UPDATE menus
SET fate = 'served',
    fate_set_at = now(),
    fate_set_by = 'auto'
WHERE fate IS NULL
  AND event_id IS NOT NULL
  AND deleted_at IS NULL
  AND event_id IN (SELECT id FROM events WHERE status = 'completed');

-- Backfill: set fate for menus linked to cancelled events
UPDATE menus
SET fate = 'abandoned',
    fate_set_at = now(),
    fate_set_by = 'auto'
WHERE fate IS NULL
  AND event_id IS NOT NULL
  AND deleted_at IS NULL
  AND event_id IN (SELECT id FROM events WHERE status = 'cancelled');

-- Backfill: set fate for template menus
UPDATE menus
SET fate = 'template_frozen',
    fate_set_at = now(),
    fate_set_by = 'auto'
WHERE fate IS NULL
  AND is_template = true
  AND deleted_at IS NULL;
