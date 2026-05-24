-- Search analytics: append-only query log for search quality observability
-- Tracks what users search for, how many results they get, and which entity types they query.

CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  result_count INTEGER NOT NULL DEFAULT 0,
  entity_types TEXT[] NOT NULL DEFAULT '{}',
  searched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for tenant-scoped analytics queries
CREATE INDEX IF NOT EXISTS idx_search_queries_tenant_searched
  ON search_queries (tenant_id, searched_at DESC);

-- Index for zero-result query analysis
CREATE INDEX IF NOT EXISTS idx_search_queries_zero_results
  ON search_queries (tenant_id, result_count)
  WHERE result_count = 0;
