-- Client Tags
-- Free-form tagging on client records (e.g. "corporate", "repeat", "wine-lover").
-- Used for filtering the client list and as automation trigger conditions.

CREATE TABLE IF NOT EXISTS client_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  tag         TEXT NOT NULL CHECK (char_length(tag) BETWEEN 1 AND 50),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (client_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_client_tags_client  ON client_tags(client_id);
CREATE INDEX IF NOT EXISTS idx_client_tags_tenant  ON client_tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_tags_tag     ON client_tags(tenant_id, tag);

ALTER TABLE client_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chefs manage own client tags" ON client_tags;
CREATE POLICY "Chefs manage own client tags"
  ON client_tags
  FOR ALL
  TO authenticated
  USING  (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
