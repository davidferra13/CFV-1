-- Operation Audit Log: append-only record of every mutation
-- Enables: replay, audit trail, version timeline, entity history
-- Additive only. No existing tables modified.

CREATE TABLE IF NOT EXISTS operation_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  actor_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  operation TEXT NOT NULL,
  diff JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oplog_tenant ON operation_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_oplog_entity ON operation_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_oplog_created ON operation_log(created_at);
CREATE INDEX IF NOT EXISTS idx_oplog_actor ON operation_log(actor_id);

-- Entity Snapshots: periodic full-state captures for faster reconstruction
CREATE TABLE IF NOT EXISTS entity_snapshots (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  snapshot JSONB NOT NULL,
  operation_log_id BIGINT REFERENCES operation_log(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_entity ON entity_snapshots(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_tenant ON entity_snapshots(tenant_id);
