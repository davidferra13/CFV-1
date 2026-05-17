-- Event Total Recall: cached archive snapshots for instant recall
-- ADDITIVE ONLY. No drops, no deletes, no column modifications.

CREATE TABLE IF NOT EXISTS event_recall_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL,
  snapshot_json JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, tenant_id)
);

-- Fast lookup by event + tenant
CREATE INDEX IF NOT EXISTS idx_event_recall_snapshots_event_tenant
  ON event_recall_snapshots(event_id, tenant_id);

-- Fast lookup by tenant for listing
CREATE INDEX IF NOT EXISTS idx_event_recall_snapshots_tenant
  ON event_recall_snapshots(tenant_id);

COMMENT ON TABLE event_recall_snapshots IS 'Cached JSON snapshots of complete event archives for sub-second recall. Rebuilt on event mutation.';
COMMENT ON COLUMN event_recall_snapshots.snapshot_json IS 'Full EventRecall JSON blob, pre-assembled from all sub-tables.';
