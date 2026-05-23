// Support Network Map - Type System
// Operational relationship graph types for clients and events.

/** Role of a node in the support network */
export type NetworkRole =
  | 'household_member'
  | 'referrer'
  | 'referred'
  | 'event_guest'
  | 'vendor'
  | 'partner'
  | 'staff'
  | 'planner'
  | 'venue'
  | 'connection'

/** How the relationship was established */
export type EdgeSource =
  | 'household'
  | 'referral'
  | 'event_assignment'
  | 'vendor_relationship'
  | 'client_connection'
  | 'touchpoint'
  | 'manual'

/** A node in the support network graph */
export interface NetworkNode {
  /** Unique ID for this node */
  id: string
  /** Display name */
  name: string
  /** Role in the network */
  role: NetworkRole
  /** Optional email */
  email: string | null
  /** Optional phone */
  phone: string | null
  /** Additional context about this person */
  context: string | null
  /** Last interaction date (ISO string) */
  lastInteraction: string | null
  /** Route to this entity if available */
  href: string | null
}

/** An edge connecting two nodes */
export interface NetworkEdge {
  /** Source node ID */
  fromId: string
  /** Target node ID */
  toId: string
  /** How this connection was established */
  source: EdgeSource
  /** Human-readable relationship label */
  label: string
}

/** Complete support network for a client or event */
export interface SupportNetwork {
  /** Central entity this network is about */
  centerId: string
  centerName: string
  centerType: 'client' | 'event'
  /** All nodes in the network */
  nodes: NetworkNode[]
  /** All edges connecting nodes */
  edges: NetworkEdge[]
  /** When this was computed */
  computedAt: string
}
