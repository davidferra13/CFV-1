-- Unified Interaction Engine event ledger.
-- Additive table: existing action-specific tables remain authoritative for their workflows.

CREATE TABLE IF NOT EXISTS interaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NULL,
  action_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  context_type TEXT NULL,
  context_id TEXT NULL,
  state TEXT NOT NULL DEFAULT 'completed',
  visibility TEXT NOT NULL DEFAULT 'private',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT interaction_events_target_type_check
    CHECK (target_type IN ('content', 'user', 'event', 'menu', 'system')),
  CONSTRAINT interaction_events_context_type_check
    CHECK (context_type IS NULL OR context_type IN ('event', 'menu', 'client', 'message')),
  CONSTRAINT interaction_events_state_check
    CHECK (state IN ('pending', 'active', 'completed', 'failed', 'cancelled', 'hidden')),
  CONSTRAINT interaction_events_visibility_check
    CHECK (visibility IN ('public', 'private', 'role', 'event', 'system'))
);

CREATE INDEX IF NOT EXISTS idx_interaction_events_actor_id
  ON interaction_events(actor_id);

CREATE INDEX IF NOT EXISTS idx_interaction_events_target_id
  ON interaction_events(target_id);

CREATE INDEX IF NOT EXISTS idx_interaction_events_context_id
  ON interaction_events(context_id);

CREATE INDEX IF NOT EXISTS idx_interaction_events_action_type
  ON interaction_events(action_type);

CREATE INDEX IF NOT EXISTS idx_interaction_events_tenant_id
  ON interaction_events(tenant_id);

CREATE INDEX IF NOT EXISTS idx_interaction_events_idempotency_key
  ON interaction_events(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interaction_events_target_action_actor_recent
  ON interaction_events(target_type, target_id, action_type, actor_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_interaction_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS interaction_events_set_updated_at ON interaction_events;
CREATE TRIGGER interaction_events_set_updated_at
BEFORE UPDATE ON interaction_events
FOR EACH ROW
EXECUTE FUNCTION set_interaction_events_updated_at();

ALTER TABLE interaction_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS interaction_events_public_select ON interaction_events;
CREATE POLICY interaction_events_public_select ON interaction_events
FOR SELECT
USING (visibility = 'public');

COMMENT ON TABLE interaction_events IS 'Unified normalized interaction ledger. Mirrors action-specific workflow writes without replacing existing systems.';
COMMENT ON COLUMN interaction_events.permissions IS 'Resolved permission snapshot at execution time.';
COMMENT ON COLUMN interaction_events.metadata IS 'Action-specific JSON payload for side effects, automation, and workflow correlation.';
