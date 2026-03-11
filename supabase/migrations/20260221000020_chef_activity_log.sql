-- Chef Activity Log
-- Permanent, append-only record of every meaningful chef action.
-- Used for "What did I do last?" / "Pick up where I left off" features.
-- Unlike activity_events (90-day TTL, client-facing), this is chef-centric and permanent.

-- ─── Table ──────────────────────────────────────────────────────────────────

CREATE TABLE chef_activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  actor_id    UUID NOT NULL,                    -- auth.users id of the chef
  action      TEXT NOT NULL,                    -- e.g. 'event_created', 'note_added', 'menu_updated'
  domain      TEXT NOT NULL,                    -- grouping: event, inquiry, quote, menu, recipe, client, financial, communication
  entity_type TEXT NOT NULL,                    -- e.g. 'event', 'inquiry', 'client', 'menu', 'recipe', 'ledger_entry'
  entity_id   UUID,                             -- ID of the entity acted on (nullable for bulk/general actions)
  summary     TEXT NOT NULL,                    -- Human-readable: "Created dinner for the Johnsons — 12 guests, March 15"
  context     JSONB NOT NULL DEFAULT '{}',      -- Structured context (client_name, event_date, guest_count, etc.)
  client_id   UUID REFERENCES clients(id) ON DELETE SET NULL,  -- If action relates to a client
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Check constraints for domain values
ALTER TABLE chef_activity_log ADD CONSTRAINT chk_activity_domain
  CHECK (domain IN ('event', 'inquiry', 'quote', 'menu', 'recipe', 'client', 'financial', 'communication', 'operational'));
COMMENT ON TABLE chef_activity_log IS 'Permanent chef activity log — every meaningful action the chef takes, for the activity feed and "pick up where you left off" features.';
-- ─── Indexes ────────────────────────────────────────────────────────────────

-- Primary query: "Show me my recent activity" (tenant + time)
CREATE INDEX idx_chef_activity_tenant_recent
  ON chef_activity_log (tenant_id, created_at DESC);
-- Client-scoped: "Show me everything related to this client"
CREATE INDEX idx_chef_activity_client
  ON chef_activity_log (tenant_id, client_id, created_at DESC)
  WHERE client_id IS NOT NULL;
-- Domain filter: "Show me just my event/menu/inquiry activity"
CREATE INDEX idx_chef_activity_domain
  ON chef_activity_log (tenant_id, domain, created_at DESC);
-- Entity lookup: "Last action on this entity" (for resume section)
CREATE INDEX idx_chef_activity_entity
  ON chef_activity_log (tenant_id, entity_type, entity_id, created_at DESC)
  WHERE entity_id IS NOT NULL;
-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE chef_activity_log ENABLE ROW LEVEL SECURITY;
-- Chef can read their own activity
CREATE POLICY chef_activity_log_select ON chef_activity_log
  FOR SELECT USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- Insert via admin client only (server actions use admin client)
CREATE POLICY chef_activity_log_insert ON chef_activity_log
  FOR INSERT WITH CHECK (true);
-- No updates or deletes — append-only
-- (No UPDATE or DELETE policies = no one can modify/remove entries via RLS);
