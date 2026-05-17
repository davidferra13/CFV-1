CREATE TABLE IF NOT EXISTS confidence_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'unverified',
  source TEXT NOT NULL DEFAULT 'user_input',
  last_verified TIMESTAMPTZ,
  verified_by TEXT,
  stale_days INTEGER NOT NULL DEFAULT 90,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_confidence_entity_field ON confidence_labels(tenant_id, entity_type, entity_id, field);
CREATE INDEX idx_confidence_stale ON confidence_labels(tenant_id, confidence) WHERE confidence IN ('stale', 'unverified');

ALTER TABLE confidence_labels ENABLE ROW LEVEL SECURITY;
