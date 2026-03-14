-- =============================================================================
-- Migration: Social Event Hub — Event Stubs
-- Layer: Hub Foundation
-- Purpose: Client-initiated events that exist before a chef is involved
-- =============================================================================

CREATE TABLE IF NOT EXISTS event_stubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,

  -- Event basics (all optional — minimal to start planning)
  title TEXT NOT NULL DEFAULT 'New Event',
  occasion TEXT,
  event_date DATE,
  serve_time TIME,
  guest_count INTEGER,
  location_text TEXT,
  notes TEXT,
  dietary_restrictions TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',

  -- Adoption by chef
  adopted_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  adopted_tenant_id UUID REFERENCES chefs(id) ON DELETE SET NULL,
  adopted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'seeking_chef', 'adopted', 'cancelled')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_stubs_creator
  ON event_stubs(created_by_profile_id);

CREATE INDEX IF NOT EXISTS idx_event_stubs_status
  ON event_stubs(status) WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_event_stubs_adopted_tenant
  ON event_stubs(adopted_tenant_id) WHERE adopted_tenant_id IS NOT NULL;

-- RLS
ALTER TABLE event_stubs ENABLE ROW LEVEL SECURITY;

-- Public can read stubs (link-based access via app layer)
CREATE POLICY "event_stubs_select_anon" ON event_stubs
  FOR SELECT USING (true);

-- Public can create stubs (client-initiated)
CREATE POLICY "event_stubs_insert_anon" ON event_stubs
  FOR INSERT WITH CHECK (true);

-- Service role manages
CREATE POLICY "event_stubs_manage_service" ON event_stubs
  FOR ALL USING (auth.role() = 'service_role');

-- Chefs can read stubs adopted by them
CREATE POLICY "event_stubs_chef_read" ON event_stubs
  FOR SELECT USING (
    adopted_tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
