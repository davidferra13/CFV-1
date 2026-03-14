-- ============================================================
-- Chef Collaboration Network (CCN)
-- Trusted circles + structured handoffs + availability signals.
-- Additive to existing chef_social + chef_connections systems.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Trusted Circle
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chef_trusted_circle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  trusted_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  trust_level TEXT NOT NULL DEFAULT 'partner'
    CHECK (trust_level IN ('partner', 'preferred', 'inner_circle')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trusted_circle_unique_pair UNIQUE (chef_id, trusted_chef_id),
  CONSTRAINT trusted_circle_no_self CHECK (chef_id <> trusted_chef_id)
);

CREATE INDEX IF NOT EXISTS idx_trusted_circle_chef
  ON chef_trusted_circle(chef_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trusted_circle_member
  ON chef_trusted_circle(trusted_chef_id);

COMMENT ON TABLE chef_trusted_circle IS
  'Private list of high-trust chef relationships used for handoff prioritization.';

-- ------------------------------------------------------------
-- 2) Structured Handoffs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chef_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  handoff_type TEXT NOT NULL
    CHECK (handoff_type IN ('lead', 'event_backup', 'client_referral')),
  source_entity_type TEXT
    CHECK (source_entity_type IN ('inquiry', 'event', 'manual')),
  source_entity_id UUID,
  occasion TEXT,
  event_date DATE,
  guest_count INT CHECK (guest_count IS NULL OR guest_count BETWEEN 1 AND 2000),
  location_text TEXT,
  budget_cents INT CHECK (budget_cents IS NULL OR budget_cents >= 0),
  client_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  private_note TEXT,
  visibility_scope TEXT NOT NULL DEFAULT 'trusted_circle'
    CHECK (visibility_scope IN ('trusted_circle', 'selected_chefs', 'connections')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'partially_accepted', 'closed', 'cancelled', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handoffs_from_chef
  ON chef_handoffs(from_chef_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_handoffs_status
  ON chef_handoffs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_handoffs_event_date
  ON chef_handoffs(event_date);

COMMENT ON TABLE chef_handoffs IS
  'Structured collaboration handoffs (lead swaps, backup requests, referrals).';
COMMENT ON COLUMN chef_handoffs.client_context IS
  'Structured context without mandatory PII (budget notes, constraints, scope).';

-- ------------------------------------------------------------
-- 3) Handoff Recipients + State
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chef_handoff_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_id UUID NOT NULL REFERENCES chef_handoffs(id) ON DELETE CASCADE,
  recipient_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'viewed', 'accepted', 'rejected', 'withdrawn', 'converted')),
  response_note TEXT,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  converted_inquiry_id UUID,
  converted_event_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT handoff_recipient_unique UNIQUE (handoff_id, recipient_chef_id)
);

CREATE INDEX IF NOT EXISTS idx_handoff_recipients_recipient
  ON chef_handoff_recipients(recipient_chef_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_handoff_recipients_handoff
  ON chef_handoff_recipients(handoff_id, status);
CREATE INDEX IF NOT EXISTS idx_handoff_recipients_converted
  ON chef_handoff_recipients(converted_event_id, converted_inquiry_id);

COMMENT ON TABLE chef_handoff_recipients IS
  'Per-recipient response state for a handoff.';

-- ------------------------------------------------------------
-- 4) Handoff Event Timeline (audit)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chef_handoff_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_id UUID NOT NULL REFERENCES chef_handoffs(id) ON DELETE CASCADE,
  actor_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'created',
      'viewed',
      'accepted',
      'rejected',
      'withdrawn',
      'converted',
      'cancelled',
      'status_recomputed'
    )),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handoff_events_handoff
  ON chef_handoff_events(handoff_id, created_at DESC);

COMMENT ON TABLE chef_handoff_events IS
  'Append-only timeline for handoff lifecycle actions.';

-- ------------------------------------------------------------
-- 5) Availability Signals (collab-oriented)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chef_availability_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  date_start DATE NOT NULL,
  date_end DATE NOT NULL,
  region_text TEXT,
  cuisines TEXT[] NOT NULL DEFAULT '{}',
  max_guest_count INT CHECK (max_guest_count IS NULL OR max_guest_count BETWEEN 1 AND 5000),
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'limited', 'unavailable')),
  share_with_trusted_only BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT availability_date_range_valid CHECK (date_end >= date_start)
);

CREATE INDEX IF NOT EXISTS idx_availability_signals_chef_date
  ON chef_availability_signals(chef_id, date_start, date_end);
CREATE INDEX IF NOT EXISTS idx_availability_signals_status
  ON chef_availability_signals(status, date_start);

COMMENT ON TABLE chef_availability_signals IS
  'Chef-shared availability windows optimized for trusted-circle handoffs.';

-- ------------------------------------------------------------
-- Triggers for updated_at
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_chef_handoffs_updated_at ON chef_handoffs;
CREATE TRIGGER trg_chef_handoffs_updated_at
  BEFORE UPDATE ON chef_handoffs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_availability_signals_updated_at ON chef_availability_signals;
CREATE TRIGGER trg_availability_signals_updated_at
  BEFORE UPDATE ON chef_availability_signals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE chef_trusted_circle ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_handoff_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_handoff_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_availability_signals ENABLE ROW LEVEL SECURITY;

-- Trusted circle policies
DROP POLICY IF EXISTS trusted_circle_select ON chef_trusted_circle;
CREATE POLICY trusted_circle_select ON chef_trusted_circle
  FOR SELECT TO authenticated
  USING (
    chef_id = get_current_tenant_id()
    OR trusted_chef_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS trusted_circle_insert ON chef_trusted_circle;
CREATE POLICY trusted_circle_insert ON chef_trusted_circle
  FOR INSERT TO authenticated
  WITH CHECK (chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS trusted_circle_update ON chef_trusted_circle;
CREATE POLICY trusted_circle_update ON chef_trusted_circle
  FOR UPDATE TO authenticated
  USING (chef_id = get_current_tenant_id())
  WITH CHECK (chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS trusted_circle_delete ON chef_trusted_circle;
CREATE POLICY trusted_circle_delete ON chef_trusted_circle
  FOR DELETE TO authenticated
  USING (chef_id = get_current_tenant_id());

-- Handoffs policies
DROP POLICY IF EXISTS handoffs_select ON chef_handoffs;
CREATE POLICY handoffs_select ON chef_handoffs
  FOR SELECT TO authenticated
  USING (
    from_chef_id = get_current_tenant_id()
    OR id IN (
      SELECT handoff_id
      FROM chef_handoff_recipients
      WHERE recipient_chef_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS handoffs_insert ON chef_handoffs;
CREATE POLICY handoffs_insert ON chef_handoffs
  FOR INSERT TO authenticated
  WITH CHECK (from_chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS handoffs_update ON chef_handoffs;
CREATE POLICY handoffs_update ON chef_handoffs
  FOR UPDATE TO authenticated
  USING (from_chef_id = get_current_tenant_id())
  WITH CHECK (from_chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS handoffs_delete ON chef_handoffs;
CREATE POLICY handoffs_delete ON chef_handoffs
  FOR DELETE TO authenticated
  USING (from_chef_id = get_current_tenant_id());

-- Handoff recipients policies
DROP POLICY IF EXISTS handoff_recipients_select ON chef_handoff_recipients;
CREATE POLICY handoff_recipients_select ON chef_handoff_recipients
  FOR SELECT TO authenticated
  USING (
    recipient_chef_id = get_current_tenant_id()
    OR handoff_id IN (
      SELECT id FROM chef_handoffs WHERE from_chef_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS handoff_recipients_insert ON chef_handoff_recipients;
CREATE POLICY handoff_recipients_insert ON chef_handoff_recipients
  FOR INSERT TO authenticated
  WITH CHECK (
    handoff_id IN (
      SELECT id FROM chef_handoffs WHERE from_chef_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS handoff_recipients_update ON chef_handoff_recipients;
CREATE POLICY handoff_recipients_update ON chef_handoff_recipients
  FOR UPDATE TO authenticated
  USING (
    recipient_chef_id = get_current_tenant_id()
    OR handoff_id IN (
      SELECT id FROM chef_handoffs WHERE from_chef_id = get_current_tenant_id()
    )
  )
  WITH CHECK (
    recipient_chef_id = get_current_tenant_id()
    OR handoff_id IN (
      SELECT id FROM chef_handoffs WHERE from_chef_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS handoff_recipients_delete ON chef_handoff_recipients;
CREATE POLICY handoff_recipients_delete ON chef_handoff_recipients
  FOR DELETE TO authenticated
  USING (
    handoff_id IN (
      SELECT id FROM chef_handoffs WHERE from_chef_id = get_current_tenant_id()
    )
  );

-- Handoff events policies
DROP POLICY IF EXISTS handoff_events_select ON chef_handoff_events;
CREATE POLICY handoff_events_select ON chef_handoff_events
  FOR SELECT TO authenticated
  USING (
    handoff_id IN (
      SELECT id FROM chef_handoffs WHERE from_chef_id = get_current_tenant_id()
    )
    OR handoff_id IN (
      SELECT handoff_id FROM chef_handoff_recipients
      WHERE recipient_chef_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS handoff_events_insert ON chef_handoff_events;
CREATE POLICY handoff_events_insert ON chef_handoff_events
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_chef_id = get_current_tenant_id()
    AND (
      handoff_id IN (
        SELECT id FROM chef_handoffs WHERE from_chef_id = get_current_tenant_id()
      )
      OR handoff_id IN (
        SELECT handoff_id FROM chef_handoff_recipients
        WHERE recipient_chef_id = get_current_tenant_id()
      )
    )
  );

-- Availability policies
DROP POLICY IF EXISTS availability_signals_select ON chef_availability_signals;
CREATE POLICY availability_signals_select ON chef_availability_signals
  FOR SELECT TO authenticated
  USING (
    chef_id = get_current_tenant_id()
    OR (
      share_with_trusted_only = FALSE
      AND chef_id IN (
        SELECT requester_id FROM chef_connections
        WHERE status = 'accepted' AND addressee_id = get_current_tenant_id()
        UNION
        SELECT addressee_id FROM chef_connections
        WHERE status = 'accepted' AND requester_id = get_current_tenant_id()
      )
    )
    OR (
      share_with_trusted_only = TRUE
      AND chef_id IN (
        SELECT chef_id FROM chef_trusted_circle
        WHERE trusted_chef_id = get_current_tenant_id()
      )
    )
  );

DROP POLICY IF EXISTS availability_signals_insert ON chef_availability_signals;
CREATE POLICY availability_signals_insert ON chef_availability_signals
  FOR INSERT TO authenticated
  WITH CHECK (chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS availability_signals_update ON chef_availability_signals;
CREATE POLICY availability_signals_update ON chef_availability_signals
  FOR UPDATE TO authenticated
  USING (chef_id = get_current_tenant_id())
  WITH CHECK (chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS availability_signals_delete ON chef_availability_signals;
CREATE POLICY availability_signals_delete ON chef_availability_signals
  FOR DELETE TO authenticated
  USING (chef_id = get_current_tenant_id());

-- ------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON chef_trusted_circle TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chef_handoffs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chef_handoff_recipients TO authenticated;
GRANT SELECT, INSERT ON chef_handoff_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chef_availability_signals TO authenticated;
