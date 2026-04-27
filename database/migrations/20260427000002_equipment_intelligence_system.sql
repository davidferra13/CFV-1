-- Equipment Intelligence System
-- Adds category taxonomy, alias matching, inference engine tables,
-- recipe-equipment links, gap detection, and status tracking.
-- All additive. No drops, deletes, or type rewrites.

-- ============================================
-- TABLE 1: EQUIPMENT CATEGORIES (system-managed, no tenant scope)
-- Two-level hierarchy: top-level + subcategories
-- ============================================

CREATE TABLE IF NOT EXISTS equipment_categories (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  parent_id   INTEGER REFERENCES equipment_categories(id),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  icon        TEXT
);

COMMENT ON TABLE equipment_categories IS 'System-managed equipment category taxonomy. Two levels max.';

-- ============================================
-- TABLE 2: EQUIPMENT ALIASES (system-managed, no tenant scope)
-- Maps common synonyms to canonical names
-- ============================================

CREATE TABLE IF NOT EXISTS equipment_aliases (
  id              SERIAL PRIMARY KEY,
  alias           TEXT UNIQUE NOT NULL,
  category_id     INTEGER NOT NULL REFERENCES equipment_categories(id),
  canonical_name  TEXT
);

COMMENT ON TABLE equipment_aliases IS 'Maps equipment synonyms to canonical names for fuzzy matching.';

-- ============================================
-- ALTER equipment_items: new columns for intelligence system
-- ============================================

-- Link to category taxonomy (nullable, existing items use enum)
ALTER TABLE equipment_items
  ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES equipment_categories(id);

-- Size dimensions
ALTER TABLE equipment_items
  ADD COLUMN IF NOT EXISTS material TEXT,
  ADD COLUMN IF NOT EXISTS size_label TEXT,
  ADD COLUMN IF NOT EXISTS size_value NUMERIC,
  ADD COLUMN IF NOT EXISTS size_unit TEXT;

-- Inference tracking
ALTER TABLE equipment_items
  ADD COLUMN IF NOT EXISTS item_source TEXT NOT NULL DEFAULT 'manual'
    CHECK (item_source IN ('manual', 'inferred', 'receipt_scan', 'import')),
  ADD COLUMN IF NOT EXISTS confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS inferred_from TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Lifecycle
ALTER TABLE equipment_items
  ADD COLUMN IF NOT EXISTS replacement_cost_cents INTEGER
    CHECK (replacement_cost_cents IS NULL OR replacement_cost_cents >= 0),
  ADD COLUMN IF NOT EXISTS expected_lifespan_months INTEGER,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_status_change_at TIMESTAMPTZ DEFAULT now();

-- Lending
ALTER TABLE equipment_items
  ADD COLUMN IF NOT EXISTS borrowed_from TEXT,
  ADD COLUMN IF NOT EXISTS lent_to TEXT;

-- Tags
ALTER TABLE equipment_items
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Expand status constraint: drop old CHECK, add new with full state machine
-- The old CHECK was: status IN ('owned', 'retired')
-- We need: active, stored, broken, needs_replacement, borrowed, lent_out, retired, missing
-- Also map 'owned' -> 'active' for existing data
ALTER TABLE equipment_items DROP CONSTRAINT IF EXISTS equipment_items_status_check;
UPDATE equipment_items SET status = 'active' WHERE status = 'owned';
ALTER TABLE equipment_items
  ADD CONSTRAINT equipment_items_status_check
  CHECK (status IN ('active', 'stored', 'broken', 'needs_replacement', 'borrowed', 'lent_out', 'retired', 'missing'));

-- New indexes
CREATE INDEX IF NOT EXISTS idx_equipment_items_category_id
  ON equipment_items(chef_id, category_id);

CREATE INDEX IF NOT EXISTS idx_equipment_items_inferred_unconfirmed
  ON equipment_items(chef_id, item_source)
  WHERE item_source = 'inferred' AND confirmed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_items_last_used
  ON equipment_items(chef_id, last_used_at);

-- ============================================
-- TABLE 3: RECIPE EQUIPMENT (links recipes to required equipment)
-- ============================================

CREATE TABLE IF NOT EXISTS recipe_equipment (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  recipe_id        TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  category_id      INTEGER REFERENCES equipment_categories(id),
  name             TEXT NOT NULL,
  size_constraint  TEXT,
  quantity_needed  INTEGER NOT NULL DEFAULT 1,
  is_essential     BOOLEAN NOT NULL DEFAULT true,
  notes            TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_recipe_equipment_recipe
  ON recipe_equipment(recipe_id);

COMMENT ON TABLE recipe_equipment IS 'Equipment requirements per recipe. Feeds loadout generator.';

-- ============================================
-- TABLE 4: EQUIPMENT STATUS LOG (append-only audit trail)
-- ============================================

CREATE TABLE IF NOT EXISTS equipment_status_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id  UUID NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
  chef_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  old_status    TEXT NOT NULL,
  new_status    TEXT NOT NULL,
  trigger       TEXT NOT NULL CHECK (trigger IN ('manual', 'event_usage', 'staleness_check', 'age_threshold')),
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equip_status_log_item
  ON equipment_status_log(equipment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_equip_status_log_chef
  ON equipment_status_log(chef_id);

COMMENT ON TABLE equipment_status_log IS 'Append-only audit trail of equipment status changes.';

-- RLS
ALTER TABLE equipment_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY esl_chef_select ON equipment_status_log
  FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY esl_chef_insert ON equipment_status_log
  FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- ============================================
-- TABLE 5: EQUIPMENT INFERENCES (CIL inference queue)
-- ============================================

CREATE TABLE IF NOT EXISTS equipment_inferences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  equipment_name        TEXT NOT NULL,
  category              TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'inferred'
                        CHECK (status IN ('inferred', 'confirmed', 'dismissed')),
  confidence_score      NUMERIC(3,2) NOT NULL,
  primary_rule_id       TEXT NOT NULL,
  supporting_signals    JSONB NOT NULL DEFAULT '[]',
  first_inferred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_boosted_at       TIMESTAMPTZ,
  confirmed_at          TIMESTAMPTZ,
  dismissed_at          TIMESTAMPTZ,
  dismiss_suppress_until TIMESTAMPTZ,

  UNIQUE(chef_id, equipment_name)
);

CREATE INDEX IF NOT EXISTS idx_equip_inferences_chef_status
  ON equipment_inferences(chef_id, status);

COMMENT ON TABLE equipment_inferences IS 'Deterministic equipment inferences from recipe/event data. No AI.';

-- RLS
ALTER TABLE equipment_inferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY ei_chef_select ON equipment_inferences
  FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY ei_chef_insert ON equipment_inferences
  FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY ei_chef_update ON equipment_inferences
  FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- ============================================
-- TABLE 6: EVENT EQUIPMENT GAPS (persisted gap records)
-- ============================================

CREATE TABLE IF NOT EXISTS event_equipment_gaps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  chef_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  equipment_name      TEXT NOT NULL,
  equipment_category  TEXT,
  gap_type            TEXT NOT NULL
                      CHECK (gap_type IN ('missing', 'insufficient_qty', 'wrong_size', 'broken', 'borrowed_unavailable', 'double_booked')),
  severity            TEXT NOT NULL
                      CHECK (severity IN ('critical', 'important', 'nice_to_have')),
  quantity_needed     INTEGER NOT NULL,
  quantity_available  INTEGER NOT NULL DEFAULT 0,
  used_for            TEXT,
  status              TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'pending_procurement', 'pending_repair', 'resolved_purchased', 'resolved_borrowed', 'resolved_venue', 'resolved_substitute', 'resolved_workaround', 'dismissed')),
  resolution_note     TEXT,
  detected_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_equip_gaps_event
  ON event_equipment_gaps(event_id);

CREATE INDEX IF NOT EXISTS idx_equip_gaps_chef_status
  ON event_equipment_gaps(chef_id, status)
  WHERE status NOT IN ('resolved_purchased', 'resolved_borrowed', 'resolved_venue', 'resolved_substitute', 'resolved_workaround', 'dismissed');

COMMENT ON TABLE event_equipment_gaps IS 'Persisted equipment gap records for events. Tracks resolution status.';

-- RLS
ALTER TABLE event_equipment_gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY eeg_chef_select ON event_equipment_gaps
  FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY eeg_chef_insert ON event_equipment_gaps
  FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY eeg_chef_update ON event_equipment_gaps
  FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- ============================================
-- ADD venue_type TO events
-- ============================================

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS venue_type TEXT
  CHECK (venue_type IS NULL OR venue_type IN ('client_home', 'commercial_kitchen', 'outdoor', 'event_venue', 'office'));

COMMENT ON COLUMN events.venue_type IS 'Venue type for equipment loadout modifiers.';
