'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type {
  CircleSummary,
  CircleCreateInput,
  CircleType,
  CircleOperationResult,
  CircleVisibility,
} from './types'

// ---------------------------------------------------------------------------
// Unified Circle API
// Single source of truth for all circle CRUD operations.
// Consolidates scattered operations from lib/hub/, lib/dinner-circles/,
// lib/recurring/, and lib/actions/ into one coherent interface.
// ---------------------------------------------------------------------------

/**
 * Resolve a hub_groups.group_type to our unified CircleType.
 */
function resolveCircleType(
  groupType: string | null,
  eventId: string | null,
  visibility: string | null
): CircleType {
  if (groupType === 'series') return 'series'
  if (groupType === 'bridge') return 'collab'
  if (groupType === 'community') return 'community'
  if (eventId) return 'event'
  if (visibility === 'secret') return 'elective'
  return 'client'
}

/**
 * Map our CircleType to hub_groups.group_type for DB storage.
 */
function circleTypeToGroupType(circleType: CircleType): string {
  switch (circleType) {
    case 'series':
      return 'series'
    case 'collab':
      return 'bridge'
    case 'community':
      return 'community'
    default:
      return 'circle'
  }
}

// ---------------------------------------------------------------------------
// READ
// ---------------------------------------------------------------------------

/**
 * List all circles for the authenticated chef.
 * Supports optional filtering by type.
 */
export async function listCircles(filter?: {
  type?: CircleType
  activeOnly?: boolean
}): Promise<CircleSummary[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  let query = db
    .from('hub_groups')
    .select(
      'id, name, description, emoji, group_token, group_type, event_id, visibility, is_active, message_count, last_message_at, created_at'
    )
    .eq('tenant_id', tenantId)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (filter?.activeOnly !== false) {
    query = query.eq('is_active', true)
  }

  const { data: groups } = await query

  if (!groups) return []

  // Get member counts in bulk
  const groupIds = groups.map((g: any) => g.id)
  const { data: memberRows } = await db
    .from('hub_group_members')
    .select('group_id')
    .in('group_id', groupIds)

  const countMap = new Map<string, number>()
  for (const row of memberRows ?? []) {
    countMap.set(row.group_id, (countMap.get(row.group_id) ?? 0) + 1)
  }

  const circles: CircleSummary[] = groups.map((g: any) => {
    const circleType = resolveCircleType(g.group_type, g.event_id, g.visibility)
    return {
      id: g.id,
      name: g.name,
      description: g.description ?? null,
      emoji: g.emoji ?? null,
      groupToken: g.group_token,
      circleType,
      visibility: (g.visibility ?? 'public') as CircleVisibility,
      memberCount: countMap.get(g.id) ?? 0,
      messageCount: g.message_count ?? 0,
      isActive: g.is_active,
      lastMessageAt: g.last_message_at ?? null,
      createdAt: g.created_at,
    }
  })

  if (filter?.type) {
    return circles.filter((c) => c.circleType === filter.type)
  }

  return circles
}

/**
 * Get a single circle by ID.
 * Auth-gated: only the owning chef can view.
 */
export async function getCircle(circleId: string): Promise<CircleSummary | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  const { data: g } = await db
    .from('hub_groups')
    .select(
      'id, name, description, emoji, group_token, group_type, event_id, visibility, is_active, message_count, last_message_at, created_at'
    )
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()

  if (!g) return null

  const { count } = await db
    .from('hub_group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', circleId)

  const circleType = resolveCircleType(g.group_type, g.event_id, g.visibility)

  return {
    id: g.id,
    name: g.name,
    description: g.description ?? null,
    emoji: g.emoji ?? null,
    groupToken: g.group_token,
    circleType,
    visibility: (g.visibility ?? 'public') as CircleVisibility,
    memberCount: count ?? 0,
    messageCount: g.message_count ?? 0,
    isActive: g.is_active,
    lastMessageAt: g.last_message_at ?? null,
    createdAt: g.created_at,
  }
}

/**
 * Find a circle for a given context (event or inquiry).
 * Delegates to the canonical lookup.
 */
export async function findCircleForContext(input: {
  eventId?: string | null
  inquiryId?: string | null
}): Promise<{ circleId: string; groupToken: string; tenantId: string } | null> {
  const { getCircleForContext } = await import('@/lib/hub/circle-lookup')
  const result = await getCircleForContext(input)
  if (!result) return null
  return { circleId: result.groupId, groupToken: result.groupToken, tenantId: result.tenantId }
}

/**
 * Find a circle for a client by their dinner_circle_group_id.
 */
export async function findCircleForClient(clientId: string): Promise<{ circleId: string } | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  const { data: client } = await db
    .from('clients')
    .select('dinner_circle_group_id')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!client?.dinner_circle_group_id) return null
  return { circleId: client.dinner_circle_group_id }
}

// ---------------------------------------------------------------------------
// CREATE
// ---------------------------------------------------------------------------

/**
 * Create a new circle with the authenticated chef as owner.
 * Handles profile creation, membership, and optional entity linking.
 */
export async function createCircle(input: CircleCreateInput): Promise<CircleOperationResult> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const db: any = createServerClient({ admin: true })

    // Validate name
    const name = input.name.trim()
    if (!name || name.length < 1) {
      return { success: false, error: 'Circle name is required' }
    }
    if (name.length > 100) {
      return { success: false, error: 'Circle name is too long' }
    }

    // Get chef hub profile
    const { getChefHubProfileId } = await import('@/lib/hub/circle-lookup')
    const chefProfileId = await getChefHubProfileId(tenantId)
    if (!chefProfileId) {
      return { success: false, error: 'Chef hub profile not found' }
    }

    // Create the group
    const groupType = circleTypeToGroupType(input.circleType)
    const { data: group, error: groupError } = await db
      .from('hub_groups')
      .insert({
        name,
        description: input.description?.trim() || null,
        emoji: input.emoji || null,
        group_type: groupType,
        tenant_id: tenantId,
        is_active: true,
        created_by_profile_id: chefProfileId,
        visibility: input.visibility ?? 'private',
        event_id: input.eventId ?? null,
        inquiry_id: input.inquiryId ?? null,
      })
      .select('id, group_token')
      .single()

    if (groupError || !group) {
      return { success: false, error: groupError?.message ?? 'Failed to create circle' }
    }

    // Add chef as owner/chef member
    await db.from('hub_group_members').insert({
      group_id: group.id,
      profile_id: chefProfileId,
      role: 'chef',
      can_post: true,
      can_invite: true,
      can_pin: true,
    })

    // Link to client if specified
    if (input.clientId) {
      await db
        .from('clients')
        .update({ dinner_circle_group_id: group.id })
        .eq('id', input.clientId)
        .eq('tenant_id', tenantId)
    }

    revalidatePath('/circles')
    return { success: true, circleId: group.id }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error creating circle',
    }
  }
}

// ---------------------------------------------------------------------------
// UPDATE
// ---------------------------------------------------------------------------

/**
 * Archive a circle (soft delete).
 */
export async function archiveCircle(circleId: string): Promise<CircleOperationResult> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const db: any = createServerClient({ admin: true })

    const { error } = await db
      .from('hub_groups')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', circleId)
      .eq('tenant_id', tenantId)

    if (error) return { success: false, error: 'Failed to archive circle' }

    revalidatePath('/circles')
    revalidatePath(`/circles/${circleId}`)
    return { success: true, circleId }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

// ---------------------------------------------------------------------------
// RE-EXPORTS: Delegate to existing, proven implementations.
// These ensure backward compatibility while presenting a unified surface.
// ---------------------------------------------------------------------------

// Circle detail (command center)
export { getCircleDetail, updateCircleSettings } from '@/lib/hub/circle-detail-actions'
export {
  addClientToCircle,
  removeCircleMember,
  updateCircleMemberRole,
} from '@/lib/hub/circle-detail-actions'
export { restoreCircle, getCircleSourcingData } from '@/lib/hub/circle-detail-actions'
export { linkEventToCircle, unlinkEventFromCircle } from '@/lib/hub/circle-detail-actions'
export { getEventsNotInCircle, getClientsNotInCircle } from '@/lib/hub/circle-detail-actions'

// Broadcasting
export { broadcastToCircle } from '@/lib/hub/circle-broadcast-actions'

// Engagement and stats
export { getCircleEngagement } from '@/lib/hub/circle-engagement-actions'
export { getCircleStats } from '@/lib/dinner-circles/circle-stats'

// Daily activity
export { getCircleActivityForDaily } from '@/lib/hub/circle-daily-actions'

// Lifecycle notifications
export { circleFirstNotify } from '@/lib/hub/circle-first-notify'

// Circle lookup utilities
export {
  getCircleForContext,
  getCircleForEvent,
  getChefHubProfileId,
} from '@/lib/hub/circle-lookup'

// Relationship layer
export {
  decideCircleAdoption,
  normalizeHubGroupToCircleKind,
} from '@/lib/hub/circle-relationship-layer'
export type { CircleKind, CircleAdoptionDecision } from '@/lib/hub/circle-relationship-layer'
