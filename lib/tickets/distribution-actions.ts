// Event Distribution - Server Actions
// Manages event publishing/syndication across platforms.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { EventDistribution, DistributionPlatform, DistributionSyncStatus } from './types'

/**
 * Get all distribution records for an event.
 */
export async function getEventDistributions(eventId: string): Promise<EventDistribution[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_distribution')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .order('created_at', { ascending: true })

  if (error) throw new Error('Failed to load distributions')
  return data || []
}

/**
 * Create a new distribution record (mark event as "draft" on a platform).
 */
export async function createDistribution(input: {
  eventId: string
  platform: DistributionPlatform
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify event belongs to chef
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', input.eventId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!event) return { success: false, error: 'Event not found' }

  // Check not already added
  const { data: existing } = await db
    .from('event_distribution')
    .select('id')
    .eq('event_id', input.eventId)
    .eq('platform', input.platform)
    .eq('tenant_id', user.entityId)
    .maybeSingle()

  if (existing) return { success: false, error: 'Platform already added' }

  const { error } = await db.from('event_distribution').insert({
    event_id: input.eventId,
    tenant_id: user.entityId,
    platform: input.platform,
    sync_status: 'draft',
    auto_sync: false,
  })

  if (error) return { success: false, error: 'Failed to add platform' }

  revalidatePath(`/events/${input.eventId}`)
  return { success: true }
}

/**
 * Update a distribution's sync status (e.g. mark as published).
 */
export async function updateDistributionStatus(input: {
  distributionId: string
  eventId: string
  syncStatus: DistributionSyncStatus
  externalUrl?: string
  externalEventId?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const updateData: Record<string, any> = {
    sync_status: input.syncStatus,
    updated_at: new Date().toISOString(),
  }

  if (input.syncStatus === 'published' || input.syncStatus === 'synced') {
    updateData.last_synced_at = new Date().toISOString()
  }
  if (input.externalUrl) updateData.external_url = input.externalUrl
  if (input.externalEventId) updateData.external_event_id = input.externalEventId

  const { error } = await db
    .from('event_distribution')
    .update(updateData)
    .eq('id', input.distributionId)
    .eq('tenant_id', user.entityId)

  if (error) return { success: false, error: 'Failed to update distribution' }

  revalidatePath(`/events/${input.eventId}`)
  return { success: true }
}

/**
 * Remove a distribution record (unlink from platform).
 */
export async function removeDistribution(input: {
  distributionId: string
  eventId: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('event_distribution')
    .delete()
    .eq('id', input.distributionId)
    .eq('tenant_id', user.entityId)

  if (error) return { success: false, error: 'Failed to remove distribution' }

  revalidatePath(`/events/${input.eventId}`)
  return { success: true }
}
