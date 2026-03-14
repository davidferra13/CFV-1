-- Event Prep Blocks
-- Persisted, concrete time blocks for all prep activities surrounding a dinner event.
-- For each event (fishmonger run, farmers market, grocery store, at-home prep session,
-- packing, mental prep, equipment check, post-event admin, etc.) the chef gets a real
-- calendar slot — not just a suggestion.
--
-- Unlike chef_availability_blocks (day-level blocking), these are specific activities
-- with a date, optional time window, and a type. They attach to an event or stand alone.
--
-- Purely additive — no existing tables are altered, no data dropped.
-- Back up your database before applying to production.

-- ============================================
-- ENUM: PREP BLOCK TYPE
-- ============================================

CREATE TYPE prep_block_type AS ENUM (
  'grocery_run',         -- Main grocery shopping (perishables, bulk staples)
  'specialty_sourcing',  -- Fishmonger, farmers market, butcher, wine shop, specialty store
  'prep_session',        -- At-home cooking prep (can be split across multiple sessions)
  'packing',             -- Loading coolers and car
  'travel_to_event',     -- Drive time to client location (auto-derived from timeline)
  'mental_prep',         -- Chef centering ritual (night before or morning-of)
  'equipment_prep',      -- Check, clean, and load equipment
  'admin',               -- Post-event receipts upload, AAR filing, client follow-up
  'cleanup',             -- Post-event kitchen reset / car unpack
  'custom'               -- Anything else the chef needs on the calendar
);
-- ============================================
-- TABLE: EVENT_PREP_BLOCKS
-- ============================================

CREATE TABLE event_prep_blocks (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant scoping (required on every chef-owned table)
  chef_id                    UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Optional event link. NULL = standalone admin block unrelated to a specific dinner.
  -- ON DELETE SET NULL preserves the block history even when an event is deleted.
  event_id                   UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Scheduling
  block_date                 DATE NOT NULL,
  start_time                 TIME,           -- NULL = date-only / not yet time-boxed
  end_time                   TIME,           -- NULL = use estimated_duration_minutes instead

  -- Classification
  block_type                 prep_block_type NOT NULL,
  title                      TEXT NOT NULL,
  notes                      TEXT,

  -- Store info (populated for grocery_run and specialty_sourcing types)
  store_name                 TEXT,
  store_address              TEXT,

  -- Duration tracking
  estimated_duration_minutes INTEGER,
  actual_duration_minutes    INTEGER,        -- filled in after completion

  -- Completion
  is_completed               BOOLEAN NOT NULL DEFAULT false,
  completed_at               TIMESTAMPTZ,

  -- Provenance: was this block created manually by the chef, or did the chef
  -- confirm an engine suggestion? Suggestions are never auto-saved — the chef
  -- must explicitly confirm them before they are persisted.
  is_system_generated        BOOLEAN NOT NULL DEFAULT false,

  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ============================================
-- INDEXES
-- ============================================

-- Primary lookup: all blocks for a chef across a date range (year/week views)
CREATE INDEX idx_prep_blocks_chef_date
  ON event_prep_blocks(chef_id, block_date);
-- Event-specific lookup: all blocks tied to one event
CREATE INDEX idx_prep_blocks_event
  ON event_prep_blocks(event_id)
  WHERE event_id IS NOT NULL;
-- Gap detection: upcoming incomplete blocks for a chef
CREATE INDEX idx_prep_blocks_incomplete
  ON event_prep_blocks(chef_id, block_date)
  WHERE is_completed = false;
-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER trg_prep_blocks_updated_at
  BEFORE UPDATE ON event_prep_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE event_prep_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY epb_chef_select ON event_prep_blocks
  FOR SELECT USING (
    get_current_user_role() = 'chef'
    AND chef_id = get_current_tenant_id()
  );
CREATE POLICY epb_chef_insert ON event_prep_blocks
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef'
    AND chef_id = get_current_tenant_id()
  );
CREATE POLICY epb_chef_update ON event_prep_blocks
  FOR UPDATE USING (
    get_current_user_role() = 'chef'
    AND chef_id = get_current_tenant_id()
  );
CREATE POLICY epb_chef_delete ON event_prep_blocks
  FOR DELETE USING (
    get_current_user_role() = 'chef'
    AND chef_id = get_current_tenant_id()
  );
-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE event_prep_blocks IS
  'Persisted prep activity time blocks. Each row is a concrete scheduled task '
  'surrounding a dinner event — grocery run, prep session, packing, etc. '
  'Engine suggestions are never auto-saved; chef must confirm them first.';
COMMENT ON COLUMN event_prep_blocks.event_id IS
  'Optional. NULL for standalone blocks not tied to a specific event. '
  'ON DELETE SET NULL preserves history when the event is deleted.';
COMMENT ON COLUMN event_prep_blocks.start_time IS
  'NULL means the block is date-only (not yet time-boxed). '
  'Use estimated_duration_minutes for scheduling when start_time is NULL.';
COMMENT ON COLUMN event_prep_blocks.is_system_generated IS
  'True when the chef confirmed an engine-generated suggestion. '
  'False when the chef created the block manually. '
  'Suggestions that are NOT confirmed are never persisted.';
