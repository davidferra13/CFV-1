// ---------------------------------------------------------------------------
// Dinner Circles: Unified Type Definitions
// Single source of truth for all circle-related types across the app.
// ---------------------------------------------------------------------------

export type CircleType =
  | 'operational' // Auto-created for events, clients, vendors
  | 'elective' // Manually created by chef
  | 'event' // Scoped to a single event
  | 'client' // Durable chef-client relationship
  | 'vendor' // Chef-vendor sourcing
  | 'collab' // Multi-chef collaboration
  | 'community' // Public/semi-public community
  | 'series' // Persistent multi-host series

export type CircleMemberRole =
  | 'owner'
  | 'admin'
  | 'chef'
  | 'co_host'
  | 'host'
  | 'member'
  | 'viewer'
  | 'delegate'

export type CollaboratorRole = 'co_host' | 'sous_chef' | 'server' | 'observer'
export type CollaboratorStatus = 'pending' | 'active' | 'removed'

export type CircleVisibility = 'public' | 'private' | 'secret'

export interface CircleSummary {
  id: string
  name: string
  description: string | null
  emoji: string | null
  groupToken: string
  circleType: CircleType
  visibility: CircleVisibility
  memberCount: number
  messageCount: number
  isActive: boolean
  lastMessageAt: string | null
  createdAt: string
}

export interface CircleCreateInput {
  name: string
  description?: string | null
  emoji?: string | null
  circleType: CircleType
  visibility?: CircleVisibility
  eventId?: string | null
  inquiryId?: string | null
  clientId?: string | null
}

export interface CircleCollaborator {
  id: string
  circleId: string
  userId: string
  role: CollaboratorRole
  status: CollaboratorStatus
  invitedBy: string
  invitedAt: string
  acceptedAt: string | null
  displayName?: string
  email?: string | null
}

export interface CircleBroadcast {
  circleId: string
  message: string
  includeEmail?: boolean
  includeCoHosts?: boolean
}

export interface SharedIngredientItem {
  ingredientId: string
  ingredientName: string
  unit: string
  totalQty: number
  assignedTo: string | null
  eventId: string
  eventTitle: string
}

export interface OperationalCircleTrigger {
  source: 'event_created' | 'client_created' | 'vendor_linked' | 'inquiry_received'
  entityId: string
  tenantId: string
  entityName?: string
  metadata?: Record<string, unknown>
}

export interface CircleOperationResult {
  success: boolean
  circleId?: string
  error?: string
}
