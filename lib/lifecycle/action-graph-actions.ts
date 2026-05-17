'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  GraphNode,
  GraphNodeType,
  GraphNodePosition,
  GraphEdge,
  GraphEdgeType,
  GraphSnapshot,
  GraphSummary,
} from './action-graph-types'

// ---- Nodes ----

export async function getGraphNodes(nodeType?: GraphNodeType): Promise<GraphNode[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let query = 'SELECT * FROM lifecycle_graph_nodes WHERE tenant_id = $1'
  if (nodeType) {
    query += ' AND node_type = $2'
    params.push(nodeType)
  }
  query += ' ORDER BY stage_name'
  const rows = await db.query(query, params)
  return rows.map(mapNode)
}

export async function upsertGraphNode(params: {
  id?: string
  stageName: string
  label: string
  nodeType: GraphNodeType
  position: GraphNodePosition
  metadata?: Record<string, unknown>
}): Promise<GraphNode> {
  const user = await requireChef()
  const db: any = createServerClient()
  const meta = params.metadata ? JSON.stringify(params.metadata) : '{}'
  const pos = JSON.stringify(params.position)

  if (params.id) {
    const rows = await db.query(
      `UPDATE lifecycle_graph_nodes
       SET stage_name = $2, label = $3, node_type = $4, position = $5, metadata = $6
       WHERE id = $1 AND tenant_id = $7
       RETURNING *`,
      [params.id, params.stageName, params.label, params.nodeType, pos, meta, user.tenantId]
    )
    if (!rows.length) throw new Error('Node not found')
    return mapNode(rows[0])
  }

  const rows = await db.query(
    `INSERT INTO lifecycle_graph_nodes (tenant_id, stage_name, label, node_type, position, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tenant_id, stage_name)
     DO UPDATE SET label = $3, node_type = $4, position = $5, metadata = $6
     RETURNING *`,
    [user.tenantId, params.stageName, params.label, params.nodeType, pos, meta]
  )
  return mapNode(rows[0])
}

export async function deleteGraphNode(id: string): Promise<{ deleted: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()
  // Remove edges referencing this node first
  await db.query(
    'DELETE FROM lifecycle_graph_edges WHERE tenant_id = $1 AND (from_node_id = $2 OR to_node_id = $2)',
    [user.tenantId, id]
  )
  const rows = await db.query(
    'DELETE FROM lifecycle_graph_nodes WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [id, user.tenantId]
  )
  return { deleted: rows.length > 0 }
}

// ---- Edges ----

export async function getGraphEdges(edgeType?: GraphEdgeType): Promise<GraphEdge[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let query = 'SELECT * FROM lifecycle_graph_edges WHERE tenant_id = $1'
  if (edgeType) {
    query += ' AND edge_type = $2'
    params.push(edgeType)
  }
  query += ' ORDER BY created_at'
  const rows = await db.query(query, params)
  return rows.map(mapEdge)
}

export async function upsertGraphEdge(params: {
  id?: string
  fromNodeId: string
  toNodeId: string
  label: string
  condition?: Record<string, unknown> | null
  weight?: number
  edgeType: GraphEdgeType
}): Promise<GraphEdge> {
  const user = await requireChef()
  const db: any = createServerClient()
  const cond = params.condition ? JSON.stringify(params.condition) : null
  const weight = params.weight ?? 1

  if (params.id) {
    const rows = await db.query(
      `UPDATE lifecycle_graph_edges
       SET from_node_id = $2, to_node_id = $3, label = $4, condition = $5, weight = $6, edge_type = $7
       WHERE id = $1 AND tenant_id = $8
       RETURNING *`,
      [
        params.id,
        params.fromNodeId,
        params.toNodeId,
        params.label,
        cond,
        weight,
        params.edgeType,
        user.tenantId,
      ]
    )
    if (!rows.length) throw new Error('Edge not found')
    return mapEdge(rows[0])
  }

  const rows = await db.query(
    `INSERT INTO lifecycle_graph_edges (tenant_id, from_node_id, to_node_id, label, condition, weight, edge_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [user.tenantId, params.fromNodeId, params.toNodeId, params.label, cond, weight, params.edgeType]
  )
  return mapEdge(rows[0])
}

// ---- Snapshots ----

export async function createGraphSnapshot(description?: string): Promise<GraphSnapshot> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get current max version
  const vRows = await db.query(
    'SELECT COALESCE(MAX(version), 0)::int AS max_v FROM lifecycle_graph_snapshots WHERE tenant_id = $1',
    [user.tenantId]
  )
  const nextVersion = (vRows[0]?.max_v ?? 0) + 1

  // Fetch current graph state
  const nodes = await db.query(
    'SELECT * FROM lifecycle_graph_nodes WHERE tenant_id = $1 ORDER BY stage_name',
    [user.tenantId]
  )
  const edges = await db.query(
    'SELECT * FROM lifecycle_graph_edges WHERE tenant_id = $1 ORDER BY created_at',
    [user.tenantId]
  )

  const rows = await db.query(
    `INSERT INTO lifecycle_graph_snapshots (tenant_id, version, nodes, edges, description)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [user.tenantId, nextVersion, JSON.stringify(nodes), JSON.stringify(edges), description ?? null]
  )
  const r = rows[0]
  return {
    id: r.id,
    tenantId: r.tenant_id,
    version: r.version,
    nodes: parseJson(r.nodes, []),
    edges: parseJson(r.edges, []),
    description: r.description,
    createdAt: new Date(r.created_at),
  }
}

// ---- Summary ----

export async function getGraphSummary(): Promise<GraphSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const nodeCount = await db.query(
    'SELECT COUNT(*)::int AS cnt FROM lifecycle_graph_nodes WHERE tenant_id = $1',
    [user.tenantId]
  )
  const edgeCount = await db.query(
    'SELECT COUNT(*)::int AS cnt FROM lifecycle_graph_edges WHERE tenant_id = $1',
    [user.tenantId]
  )
  const terminalCount = await db.query(
    `SELECT COUNT(*)::int AS cnt FROM lifecycle_graph_nodes WHERE tenant_id = $1 AND node_type = 'terminal'`,
    [user.tenantId]
  )
  // Orphaned = nodes with no inbound or outbound edges
  const orphanCount = await db.query(
    `SELECT COUNT(*)::int AS cnt FROM lifecycle_graph_nodes n
     WHERE n.tenant_id = $1
       AND NOT EXISTS (SELECT 1 FROM lifecycle_graph_edges e WHERE e.tenant_id = $1 AND (e.from_node_id = n.id OR e.to_node_id = n.id))`,
    [user.tenantId]
  )
  const latestVersion = await db.query(
    'SELECT MAX(version)::int AS v FROM lifecycle_graph_snapshots WHERE tenant_id = $1',
    [user.tenantId]
  )

  return {
    totalNodes: nodeCount[0]?.cnt ?? 0,
    totalEdges: edgeCount[0]?.cnt ?? 0,
    orphanedNodes: orphanCount[0]?.cnt ?? 0,
    terminalNodes: terminalCount[0]?.cnt ?? 0,
    latestVersion: latestVersion[0]?.v ?? null,
  }
}

// ---- Helpers ----

function mapNode(r: any): GraphNode {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    stageName: r.stage_name,
    label: r.label,
    nodeType: r.node_type as GraphNode['nodeType'],
    position: parseJson(r.position, { x: 0, y: 0 }),
    metadata: parseJson(r.metadata, {}),
    createdAt: new Date(r.created_at),
  }
}

function mapEdge(r: any): GraphEdge {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    fromNodeId: r.from_node_id,
    toNodeId: r.to_node_id,
    label: r.label,
    condition: r.condition ? parseJson(r.condition, null) : null,
    weight: r.weight ?? 1,
    edgeType: r.edge_type as GraphEdge['edgeType'],
    createdAt: new Date(r.created_at),
  }
}

function parseJson<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback
  if (typeof val === 'object') return val as T
  try {
    return JSON.parse(val as string)
  } catch {
    return fallback
  }
}
