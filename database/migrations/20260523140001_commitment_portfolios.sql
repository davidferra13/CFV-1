-- Commitment Portfolios table
-- Tracks which portfolio preset a chef has activated and any custom overrides.

CREATE TABLE IF NOT EXISTS commitment_portfolios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  portfolio_type  TEXT NOT NULL,
  customizations  JSONB,
  activated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for tenant-scoped queries (find active portfolio)
CREATE INDEX IF NOT EXISTS idx_commitment_portfolios_tenant
  ON commitment_portfolios (tenant_id, activated_at DESC);
