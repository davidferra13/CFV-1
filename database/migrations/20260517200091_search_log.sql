CREATE TABLE IF NOT EXISTS search_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  query TEXT NOT NULL,
  result_count INTEGER NOT NULL DEFAULT 0,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_search_log_tenant ON search_log(tenant_id, searched_at DESC);
ALTER TABLE search_log ENABLE ROW LEVEL SECURITY;
