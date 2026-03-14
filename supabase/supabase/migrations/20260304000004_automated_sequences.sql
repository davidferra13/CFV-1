-- Automated Email Sequences
-- Set-and-forget drip campaigns. Chef defines trigger + steps; system enrolls and fires.
-- Supports: birthday, dormant re-engagement, post-event follow-up, seasonal.

-- ============================================
-- TABLE 1: AUTOMATED SEQUENCES
-- ============================================
-- One sequence = one trigger type + N steps.

CREATE TABLE automated_sequences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  name          TEXT NOT NULL,
  trigger_type  TEXT NOT NULL
                CHECK (trigger_type IN (
                  'birthday',        -- fires N days before client birthday
                  'dormant_90',      -- fires when client crosses 90-day no-event mark
                  'post_event',      -- fires N days after event completes
                  'seasonal'         -- fires on a recurring calendar date
                )),

  is_active     BOOLEAN NOT NULL DEFAULT true,

  -- For 'birthday': days_before_trigger = how many days before birthday to send step 1
  -- For 'dormant_90': automatically triggers at 90-day mark
  -- For 'post_event': delay_days on first step = days after event completion
  -- For 'seasonal': not yet implemented (requires calendar logic)
  days_before_trigger INTEGER DEFAULT 7,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sequences_chef ON automated_sequences(chef_id, is_active);

CREATE TRIGGER trg_sequences_updated_at
  BEFORE UPDATE ON automated_sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE automated_sequences IS 'Chef-defined drip sequences. Each has a trigger type and one or more email steps.';

-- ============================================
-- TABLE 2: SEQUENCE STEPS
-- ============================================
-- Each step is one email. Steps fire in order based on delay_days after previous step.

CREATE TABLE sequence_steps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id   UUID NOT NULL REFERENCES automated_sequences(id) ON DELETE CASCADE,

  step_number   INTEGER NOT NULL,    -- 1-based ordering
  delay_days    INTEGER NOT NULL DEFAULT 0,  -- days after trigger (step 1) or previous step (step N)

  subject       TEXT NOT NULL,
  body_html     TEXT NOT NULL,       -- supports {{first_name}}, {{chef_name}}, etc.

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (sequence_id, step_number)
);

CREATE INDEX idx_sequence_steps_seq ON sequence_steps(sequence_id, step_number);

COMMENT ON TABLE sequence_steps IS 'Individual email steps within a sequence. delay_days is relative to trigger (step 1) or prior step.';

-- ============================================
-- TABLE 3: SEQUENCE ENROLLMENTS
-- ============================================
-- One row per (sequence, client) pair. Tracks where the client is in the sequence.

CREATE TABLE sequence_enrollments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id   UUID NOT NULL REFERENCES automated_sequences(id) ON DELETE CASCADE,
  chef_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  enrolled_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_step  INTEGER NOT NULL DEFAULT 1,
  next_send_at  TIMESTAMPTZ NOT NULL,

  -- Terminal states
  completed_at  TIMESTAMPTZ,  -- all steps sent
  cancelled_at  TIMESTAMPTZ,  -- manually cancelled or client unsubscribed

  UNIQUE (sequence_id, client_id)  -- prevent duplicate enrollment
);

CREATE INDEX idx_enrollments_pending ON sequence_enrollments(next_send_at)
  WHERE completed_at IS NULL AND cancelled_at IS NULL;

CREATE INDEX idx_enrollments_chef ON sequence_enrollments(chef_id, sequence_id);

COMMENT ON TABLE sequence_enrollments IS 'Tracks each client progress through a sequence. UNIQUE(sequence_id, client_id) prevents double-enrollment.';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE automated_sequences   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_enrollments  ENABLE ROW LEVEL SECURITY;

-- Automated sequences
CREATE POLICY as_chef_select ON automated_sequences FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY as_chef_insert ON automated_sequences FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY as_chef_update ON automated_sequences FOR UPDATE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY as_chef_delete ON automated_sequences FOR DELETE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- Sequence steps (owned by chef via parent sequence)
CREATE POLICY ss_chef_select ON sequence_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM automated_sequences s
      WHERE s.id = sequence_id AND s.chef_id = get_current_tenant_id()
        AND get_current_user_role() = 'chef'
    )
  );
CREATE POLICY ss_chef_insert ON sequence_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM automated_sequences s
      WHERE s.id = sequence_id AND s.chef_id = get_current_tenant_id()
        AND get_current_user_role() = 'chef'
    )
  );
CREATE POLICY ss_chef_update ON sequence_steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM automated_sequences s
      WHERE s.id = sequence_id AND s.chef_id = get_current_tenant_id()
        AND get_current_user_role() = 'chef'
    )
  );
CREATE POLICY ss_chef_delete ON sequence_steps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM automated_sequences s
      WHERE s.id = sequence_id AND s.chef_id = get_current_tenant_id()
        AND get_current_user_role() = 'chef'
    )
  );

-- Sequence enrollments
CREATE POLICY se_chef_select ON sequence_enrollments FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY se_chef_insert ON sequence_enrollments FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY se_chef_update ON sequence_enrollments FOR UPDATE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
