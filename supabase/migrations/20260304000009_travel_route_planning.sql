-- Travel Route Planning System
-- Allows chefs to plan full travel logistics for an event:
-- specialty sourcing trips (weeks before), grocery runs, service day travel, return home.
-- Supports multi-event consolidated shopping and ingredient-level sourcing links.

-- ============================================================
-- 1. event_travel_legs
-- ============================================================
CREATE TABLE event_travel_legs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  chef_id   UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,

  -- Primary event association (nullable for standalone "week legs")
  primary_event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  -- Multi-event linking (consolidated shopping runs)
  linked_event_ids UUID[] DEFAULT '{}',

  -- Leg classification
  leg_type TEXT NOT NULL CHECK (leg_type IN (
    'specialty_sourcing',     -- weeks before, specific ingredient sourcing
    'grocery_shopping',       -- main grocery run (day before or day of)
    'consolidated_shopping',  -- single run covering multiple events
    'service_travel',         -- travel to service venue
    'return_home',            -- travel from venue back home
    'other'
  )),

  -- Scheduling
  leg_date          DATE NOT NULL,
  departure_time    TIME,
  estimated_return_time TIME,

  -- Origin
  origin_type    TEXT CHECK (origin_type IN ('home', 'store', 'venue', 'other')) DEFAULT 'home',
  origin_address TEXT,
  origin_label   TEXT,

  -- Destination
  destination_type    TEXT CHECK (destination_type IN ('home', 'store', 'venue', 'other')),
  destination_address TEXT,
  destination_label   TEXT,

  -- Ordered stop list (JSONB array)
  -- Shape: [{ order, name, address, purpose, estimated_minutes, notes, lat, lng }]
  stops JSONB NOT NULL DEFAULT '[]',

  -- Computed totals (denormalized for fast display; recomputed on upsert)
  total_drive_minutes     INTEGER,
  total_stop_minutes      INTEGER,
  total_estimated_minutes INTEGER,

  -- Context
  purpose_notes TEXT,

  -- Status lifecycle
  status       TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')) DEFAULT 'planned',
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. travel_leg_ingredients
-- Specialty sourcing: link legs to specific recipe ingredients
-- ============================================================
CREATE TABLE travel_leg_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  leg_id        UUID NOT NULL REFERENCES event_travel_legs(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),

  -- Which event's recipe graph this ingredient is for (multi-event legs can have rows per event)
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Quantity to source
  quantity NUMERIC,
  unit     TEXT,

  -- Which stop in the leg to get this from (matches stops[].name)
  store_name TEXT,

  notes TEXT,

  -- Sourcing lifecycle
  status      TEXT NOT NULL CHECK (status IN ('to_source', 'sourced', 'unavailable')) DEFAULT 'to_source',
  sourced_at  TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. Add travel_route_ready readiness flag to events
-- ============================================================
ALTER TABLE events ADD COLUMN IF NOT EXISTS travel_route_ready BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 4. Indexes
-- ============================================================
CREATE INDEX idx_travel_legs_chef_id         ON event_travel_legs(chef_id);
CREATE INDEX idx_travel_legs_tenant_id        ON event_travel_legs(tenant_id);
CREATE INDEX idx_travel_legs_primary_event    ON event_travel_legs(primary_event_id);
CREATE INDEX idx_travel_legs_leg_date         ON event_travel_legs(leg_date);
CREATE INDEX idx_travel_legs_status           ON event_travel_legs(status);

CREATE INDEX idx_travel_leg_ingredients_leg_id ON travel_leg_ingredients(leg_id);
CREATE INDEX idx_travel_leg_ingredients_event  ON travel_leg_ingredients(event_id);

-- ============================================================
-- 5. updated_at trigger for travel_legs
-- ============================================================
CREATE OR REPLACE FUNCTION update_travel_leg_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER travel_leg_updated_at
  BEFORE UPDATE ON event_travel_legs
  FOR EACH ROW EXECUTE FUNCTION update_travel_leg_updated_at();

-- ============================================================
-- 6. Row-Level Security
-- ============================================================
ALTER TABLE event_travel_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_leg_ingredients ENABLE ROW LEVEL SECURITY;

-- Chefs can manage their own legs
-- Uses get_current_user_role() / get_current_tenant_id() helpers (established project pattern)
CREATE POLICY "chefs_manage_own_travel_legs"
  ON event_travel_legs
  FOR ALL
  USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id())
  WITH CHECK (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());

-- Chefs can manage travel_leg_ingredients via leg ownership (tenant-scoped join)
CREATE POLICY "chefs_manage_own_travel_leg_ingredients"
  ON travel_leg_ingredients
  FOR ALL
  USING (
    leg_id IN (
      SELECT id FROM event_travel_legs
      WHERE tenant_id = get_current_tenant_id()
        AND get_current_user_role() = 'chef'
    )
  )
  WITH CHECK (
    leg_id IN (
      SELECT id FROM event_travel_legs
      WHERE tenant_id = get_current_tenant_id()
        AND get_current_user_role() = 'chef'
    )
  );

-- Grant authenticated users access
GRANT ALL ON event_travel_legs TO authenticated;
GRANT ALL ON travel_leg_ingredients TO authenticated;
