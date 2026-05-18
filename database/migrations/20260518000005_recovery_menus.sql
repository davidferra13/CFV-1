-- Recovery Menus & Confirmation Patterns
-- Lifecycle #16: Recovery menus for failed/cancelled state recovery
-- and confirmation dialogs for destructive lifecycle transitions.

-- ── recovery_attempts: audit trail for recovery transitions ───────────────

CREATE TABLE IF NOT EXISTS recovery_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  chef_id       uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  option_id     text NOT NULL,
  from_state    text NOT NULL,
  to_state      text NOT NULL,
  reason        text,
  outcome       text NOT NULL CHECK (outcome IN ('success', 'failed', 'cancelled')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recovery_attempts_event_id ON recovery_attempts(event_id);
CREATE INDEX idx_recovery_attempts_chef_id ON recovery_attempts(chef_id);
CREATE INDEX idx_recovery_attempts_created_at ON recovery_attempts(created_at DESC);

-- ── confirmation_patterns: chef-customizable confirmation rules ───────────

CREATE TABLE IF NOT EXISTS confirmation_patterns (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id           uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  transition_from   text NOT NULL,
  transition_to     text NOT NULL,
  severity          text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message           text NOT NULL,
  requires_reason   boolean NOT NULL DEFAULT false,
  cooldown_minutes  integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chef_id, transition_from, transition_to)
);

CREATE INDEX idx_confirmation_patterns_chef_id ON confirmation_patterns(chef_id);

-- ── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE recovery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmation_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY recovery_attempts_chef_policy ON recovery_attempts
  FOR ALL USING (chef_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY confirmation_patterns_chef_policy ON confirmation_patterns
  FOR ALL USING (chef_id = current_setting('app.current_tenant_id', true)::uuid);
