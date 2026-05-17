-- Event Handoffs: chef-to-chef/staff event delegation with full context packets
-- ADDITIVE ONLY

CREATE TYPE handoff_status AS ENUM ('pending', 'accepted', 'completed', 'cancelled');

CREATE TABLE event_handoffs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id     uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  from_user_id  uuid NOT NULL REFERENCES auth.users(id),
  to_user_id    uuid NOT NULL REFERENCES auth.users(id),
  notes         text,
  status        handoff_status NOT NULL DEFAULT 'pending',
  packet_json   jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  accepted_at   timestamptz,
  completed_at  timestamptz
);

CREATE INDEX idx_event_handoffs_event ON event_handoffs(event_id);
CREATE INDEX idx_event_handoffs_tenant ON event_handoffs(tenant_id);
CREATE INDEX idx_event_handoffs_to_user ON event_handoffs(to_user_id, status);
CREATE INDEX idx_event_handoffs_from_user ON event_handoffs(from_user_id, status);

-- RLS
ALTER TABLE event_handoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_handoffs_tenant_isolation ON event_handoffs
  FOR ALL TO public
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
