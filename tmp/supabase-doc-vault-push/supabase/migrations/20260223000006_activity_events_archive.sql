-- Activity events archive table for optional pre-delete retention.

CREATE TABLE IF NOT EXISTS activity_events_archive (
  id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id UUID,
  client_id UUID,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, archived_at)
);
CREATE INDEX IF NOT EXISTS idx_activity_archive_tenant_created
  ON activity_events_archive (tenant_id, created_at DESC);
ALTER TABLE activity_events_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chefs read own tenant archived activity"
  ON activity_events_archive
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY "Service role manages archived activity"
  ON activity_events_archive
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
