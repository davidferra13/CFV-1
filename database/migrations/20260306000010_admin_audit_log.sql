-- Admin Audit Log
-- Immutable append-only record of sensitive platform actions.
-- Protected by a no-delete rule and a trigger that also blocks UPDATEs.
-- Readable and writable only by service role (admin context).

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ts           TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_email  TEXT,
  actor_user_id UUID,
  action_type  TEXT        NOT NULL,
  target_id    TEXT,
  target_type  TEXT,
  details      JSONB,
  ip_address   TEXT
);

-- Index for time-based queries and filtering by actor
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_ts          ON admin_audit_log (ts DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor_email ON admin_audit_log (actor_email);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action_type ON admin_audit_log (action_type);

-- Block DELETEs via a rule (belt-and-suspenders alongside trigger)
CREATE OR REPLACE RULE no_delete_admin_audit AS
  ON DELETE TO admin_audit_log DO INSTEAD NOTHING;

-- Block UPDATEs via trigger for true immutability
CREATE OR REPLACE FUNCTION prevent_audit_log_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_log is immutable — updates are not allowed';
END;
$$;

CREATE TRIGGER trg_audit_log_no_update
  BEFORE UPDATE ON admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_update();

-- RLS: only service role (admin) can read/write; no anon or user-level access
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- No policies means only service role (which bypasses RLS) can access this table.
-- This is intentional: audit log is admin-only.
