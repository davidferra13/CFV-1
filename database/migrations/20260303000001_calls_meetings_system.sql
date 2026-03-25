-- ================================================================
-- Calls & Meetings System
-- Introduces `scheduled_calls` as a first-class entity.
-- Chefs can schedule any type of call (client discovery, vendor,
-- partner, pre-event logistics, general) with prep agendas,
-- outcome logging, and reminder tracking.
-- ================================================================

CREATE TABLE scheduled_calls (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Participants
  -- client_id is nullable: not all calls involve a ChefFlow client
  client_id                 UUID REFERENCES clients(id) ON DELETE SET NULL,
  contact_name              TEXT,         -- for non-client calls (vendor, partner, etc.)
  contact_phone             TEXT,
  contact_company           TEXT,

  -- Classification
  call_type TEXT NOT NULL CHECK (call_type IN (
    'discovery',
    'follow_up',
    'proposal_walkthrough',
    'pre_event_logistics',
    'vendor_supplier',
    'partner',
    'general'
  )),

  -- Optional links to other entities
  inquiry_id                UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  event_id                  UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Scheduling
  scheduled_at              TIMESTAMPTZ NOT NULL,
  duration_minutes          INTEGER NOT NULL DEFAULT 30,
  timezone                  TEXT NOT NULL DEFAULT 'America/New_York',
  title                     TEXT,         -- optional label override

  -- Status FSM: scheduled → confirmed → completed | no_show | cancelled
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',
    'confirmed',
    'completed',
    'no_show',
    'cancelled'
  )),

  -- Prep agenda stored as JSONB array of:
  -- { id: string, item: string, completed: boolean, source: 'manual' | 'inquiry' | 'event' }
  agenda_items              JSONB NOT NULL DEFAULT '[]',
  prep_notes                TEXT,

  -- Outcome (filled in after call)
  outcome_summary           TEXT,
  call_notes                TEXT,
  next_action               TEXT,
  next_action_due_at        TIMESTAMPTZ,
  actual_duration_minutes   INTEGER,

  -- Client notification
  notify_client             BOOLEAN NOT NULL DEFAULT FALSE,
  client_notified_at        TIMESTAMPTZ,

  -- Reminder idempotency tracking
  reminder_24h_sent_at      TIMESTAMPTZ,
  reminder_1h_sent_at       TIMESTAMPTZ,

  -- Timestamps
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at              TIMESTAMPTZ,
  cancelled_at              TIMESTAMPTZ
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE scheduled_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chefs_own_calls" ON scheduled_calls;
CREATE POLICY "chefs_own_calls"
  ON scheduled_calls
  FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid()
        AND role = 'chef'
    )
  );

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX scheduled_calls_tenant_idx     ON scheduled_calls(tenant_id);
CREATE INDEX scheduled_calls_scheduled_idx  ON scheduled_calls(scheduled_at);
CREATE INDEX scheduled_calls_client_idx     ON scheduled_calls(client_id);
CREATE INDEX scheduled_calls_status_idx     ON scheduled_calls(status);
CREATE INDEX scheduled_calls_inquiry_idx    ON scheduled_calls(inquiry_id);
CREATE INDEX scheduled_calls_event_idx      ON scheduled_calls(event_id);

-- ─── Auto-updated_at trigger ─────────────────────────────────────────────────
-- Reuses the existing update_updated_at_column() function from Layer 1.

CREATE TRIGGER scheduled_calls_updated_at
  BEFORE UPDATE ON scheduled_calls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
