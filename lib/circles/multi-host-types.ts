// Multi-Host Collaboration Types
// Defines roles, permissions, and shapes for circle-level co-hosting.
// Extends the base collaborator model with granular permission controls.

/**
 * Co-host role within a dinner circle.
 * - co-host: full partner, manages events and guests alongside the owner
 * - collaborator: active participant, permissions scoped by CoHostPermissions
 * - viewer: read-only access to circle activity
 */
export type CoHostRole = 'co-host' | 'collaborator' | 'viewer'

/**
 * Granular permission flags for a co-host.
 * Stored as JSONB on the circle_co_hosts row.
 */
export type CoHostPermissions = {
  canEditEvents: boolean
  canManageGuests: boolean
  canPostBroadcasts: boolean
  canManageIngredients: boolean
}

/**
 * Default permission sets per role.
 */
export const DEFAULT_PERMISSIONS: Record<CoHostRole, CoHostPermissions> = {
  'co-host': {
    canEditEvents: true,
    canManageGuests: true,
    canPostBroadcasts: true,
    canManageIngredients: true,
  },
  collaborator: {
    canEditEvents: false,
    canManageGuests: false,
    canPostBroadcasts: true,
    canManageIngredients: true,
  },
  viewer: {
    canEditEvents: false,
    canManageGuests: false,
    canPostBroadcasts: false,
    canManageIngredients: false,
  },
}

/**
 * A co-host record, mirroring the circle_co_hosts DB row
 * plus optional joined profile fields.
 */
export interface CircleCoHost {
  id: string
  circleId: string
  userId: string
  role: CoHostRole
  permissions: CoHostPermissions
  invitedBy: string
  invitedAt: string
  acceptedAt: string | null
  tenantId: string
  // Joined profile fields (populated by queries)
  displayName?: string | null
  email?: string | null
  profileImageUrl?: string | null
}

/**
 * Pending co-host invitation, enriched with circle context.
 */
export interface CoHostInvite {
  id: string
  circleId: string
  circleName: string
  role: CoHostRole
  permissions: CoHostPermissions
  invitedBy: string
  invitedByName: string | null
  invitedAt: string
}

/**
 * Shared ingredient list entry for multi-host coordination.
 */
export interface SharedIngredientItem {
  ingredient: string
  quantity: string | null
  assignedToUserId: string | null
  assignedToName: string | null
  status: 'needed' | 'claimed' | 'acquired'
  notes: string | null
}
