-- Availability & Waitlist Management
-- Enables chefs to block dates manually or via event confirmations,
-- view a monthly availability calendar, and manage a waitlist for fully-booked dates.

-- ============================================
-- TABLE 1: AVAILABILITY BLOCKS
-- ============================================

CREATE TABLE chef_availability_blocks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  block_date    DATE NOT NULL,
  block_type    TEXT NOT NULL DEFAULT 'full_day'
                CHECK (block_type IN ('full_day', 'partial')),
  start_time    TIME,   -- only relevant for partial blocks
  end_time      TIME,   -- only relevant for partial blocks
  reason        TEXT,

  -- Auto-created blocks from confirmed events
  is_event_auto BOOLEAN NOT NULL DEFAULT false,
  event_id      UUID REFERENCES events(id) ON DELETE CASCADE,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_avail_blocks_chef_date ON chef_availability_blocks(chef_id, block_date);
CREATE INDEX idx_avail_blocks_event     ON chef_availability_blocks(event_id);
COMMENT ON TABLE chef_availability_blocks IS 'Dates the chef is unavailable. Auto-created when an event is confirmed; also supports manual blocks.';
COMMENT ON COLUMN chef_availability_blocks.is_event_auto IS 'If true, this block was created automatically when an event was confirmed and will be removed if the event is cancelled.';
-- ============================================
-- TABLE 2: WAITLIST ENTRIES
-- ============================================

CREATE TABLE waitlist_entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id             UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- What they want
  requested_date        DATE NOT NULL,
  requested_date_end    DATE,  -- optional: "sometime between X and Y"
  occasion              TEXT,
  guest_count_estimate  INTEGER,
  notes                 TEXT,

  -- Lifecycle
  status                TEXT NOT NULL DEFAULT 'waiting'
                        CHECK (status IN ('waiting', 'contacted', 'converted', 'expired')),
  contacted_at          TIMESTAMPTZ,
  converted_event_id    UUID REFERENCES events(id) ON DELETE SET NULL,
  expires_at            TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_waitlist_chef_date   ON waitlist_entries(chef_id, requested_date);
CREATE INDEX idx_waitlist_chef_status ON waitlist_entries(chef_id, status);
COMMENT ON TABLE waitlist_entries IS 'Clients on the waitlist for a specific date or date range. Chef manages and converts to events when availability opens.';
CREATE TRIGGER trg_waitlist_updated_at
  BEFORE UPDATE ON waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE chef_availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries         ENABLE ROW LEVEL SECURITY;
-- ---- availability blocks: chef-only ----

CREATE POLICY avail_chef_select ON chef_availability_blocks
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );
CREATE POLICY avail_chef_insert ON chef_availability_blocks
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );
CREATE POLICY avail_chef_update ON chef_availability_blocks
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );
CREATE POLICY avail_chef_delete ON chef_availability_blocks
  FOR DELETE USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );
-- ---- waitlist: chef-only ----

CREATE POLICY wl_chef_select ON waitlist_entries
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );
CREATE POLICY wl_chef_insert ON waitlist_entries
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );
CREATE POLICY wl_chef_update ON waitlist_entries
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );
CREATE POLICY wl_chef_delete ON waitlist_entries
  FOR DELETE USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );
