-- Circle Event Hub: updates feed table + settings columns on hub_groups
-- ADDITIVE ONLY. No drops, no deletes.

-- circle_updates: real-time update feed for dinner circles
CREATE TABLE IF NOT EXISTS circle_updates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id     uuid NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  tenant_id     uuid REFERENCES chefs(id) ON DELETE SET NULL,
  author_type   text NOT NULL CHECK (author_type IN ('chef', 'host', 'system')),
  author_name   text NOT NULL DEFAULT 'System',
  content       text NOT NULL,
  pinned        boolean NOT NULL DEFAULT false,
  reveal_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_circle_updates_circle ON circle_updates (circle_id, created_at DESC);
CREATE INDEX idx_circle_updates_tenant ON circle_updates (tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_circle_updates_pinned ON circle_updates (circle_id) WHERE pinned = true;

-- RLS: allow public reads and service-role writes
ALTER TABLE circle_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY circle_updates_select_anon ON circle_updates
  FOR SELECT TO public USING (true);

CREATE POLICY circle_updates_insert_service ON circle_updates
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY circle_updates_manage_service ON circle_updates
  FOR ALL TO public USING (true);
