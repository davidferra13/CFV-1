-- Lifecycle Action Graph: nodes, edges, snapshots

CREATE TABLE IF NOT EXISTS lifecycle_graph_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  stage_name TEXT NOT NULL,
  label TEXT NOT NULL,
  node_type TEXT NOT NULL DEFAULT 'stage',
  position JSONB NOT NULL DEFAULT '{"x":0,"y":0}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lgn_tenant_stage
  ON lifecycle_graph_nodes (tenant_id, stage_name);

CREATE TABLE IF NOT EXISTS lifecycle_graph_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  from_node_id UUID NOT NULL REFERENCES lifecycle_graph_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES lifecycle_graph_nodes(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  condition JSONB,
  weight INTEGER NOT NULL DEFAULT 1,
  edge_type TEXT NOT NULL DEFAULT 'transition',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lge_tenant_from
  ON lifecycle_graph_edges (tenant_id, from_node_id);

CREATE TABLE IF NOT EXISTS lifecycle_graph_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  version INTEGER NOT NULL,
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lgs_tenant_version
  ON lifecycle_graph_snapshots (tenant_id, version);
