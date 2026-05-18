-- event_recaps: stores the generated Remotion recap video path per event.
-- One row per event (UNIQUE constraint). Rendered on event completion.

CREATE TABLE event_recaps (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id     UUID        NOT NULL REFERENCES chefs(id)  ON DELETE CASCADE,
  file_path     TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'rendering', 'done', 'failed')),
  error_message TEXT,
  rendered_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT event_recaps_event_id_unique UNIQUE (event_id)
);

COMMENT ON TABLE event_recaps IS
  'One row per completed event. file_path is the local FS path to the rendered .mp4 recap.';

ALTER TABLE event_recaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_recaps_tenant_select ON event_recaps
  FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY event_recaps_tenant_insert ON event_recaps
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY event_recaps_tenant_delete ON event_recaps
  FOR DELETE USING (tenant_id = get_current_tenant_id());

-- Index for the most common lookup: by event_id
CREATE INDEX event_recaps_event_id_idx ON event_recaps (event_id);
