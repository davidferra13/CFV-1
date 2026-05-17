// Lifecycle Action Graph types
// Directed graph of actions between lifecycle stages with transition rules and preconditions

export type GraphNodeType = 'stage' | 'action' | 'decision' | 'terminal'
export type GraphEdgeType = 'transition' | 'fallback' | 'recovery'

export interface GraphNodePosition {
  x: number
  y: number
}

export interface GraphNode {
  id: string
  tenantId: string
  stageName: string
  label: string
  nodeType: GraphNodeType
  position: GraphNodePosition
  metadata: Record<string, unknown>
  createdAt: Date
}

export interface GraphEdge {
  id: string
  tenantId: string
  fromNodeId: string
  toNodeId: string
  label: string
  condition: Record<string, unknown> | null
  weight: number
  edgeType: GraphEdgeType
  createdAt: Date
}

export interface GraphSnapshot {
  id: string
  tenantId: string
  version: number
  nodes: GraphNode[]
  edges: GraphEdge[]
  description: string | null
  createdAt: Date
}

export interface GraphSummary {
  totalNodes: number
  totalEdges: number
  orphanedNodes: number
  terminalNodes: number
  latestVersion: number | null
}
