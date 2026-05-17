-- Event Detail Visual Before/After Proof Pass
-- Tables for tracking visual proof snapshots and comparisons on event details

CREATE TABLE IF NOT EXISTS proof_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL,
  route TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('before', 'after')),
  screenshot_url TEXT,
  metadata JSONB,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proof_snapshots_tenant_event ON proof_snapshots (tenant_id, event_id);

CREATE TABLE IF NOT EXISTS proof_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL,
  before_snapshot_id UUID NOT NULL REFERENCES proof_snapshots(id) ON DELETE CASCADE,
  after_snapshot_id UUID NOT NULL REFERENCES proof_snapshots(id) ON DELETE CASCADE,
  diff_score INTEGER NOT NULL DEFAULT 0,
  changed_fields JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proof_comparisons_tenant_event ON proof_comparisons (tenant_id, event_id);
