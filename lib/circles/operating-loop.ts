import { createServerClient } from '@/lib/db/server'
import { getChefHubProfileId } from '@/lib/hub/circle-lookup'
import type { CircleOperationResult, OperationalCircleTrigger } from './types'

// Circles Operating Loop: Auto-Creation Building Blocks
// Operational circles create themselves; users never manually create them.
// Internal-only (no 'use server'). Non-blocking by design.

export async function ensureCircleForEvent(
  tenantId: string,
  eventId: string,
  eventTitle: string,
  clientName?: string | null
): Promise<CircleOperationResult> {
  try {
    const db: any = createServerClient({ admin: true })
    const { data: existingGroup } = await db
      .from('hub_groups')
      .select('id')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .maybeSingle()
    if (existingGroup) return { success: true, circleId: existingGroup.id }
    const { data: existingLink } = await db
      .from('hub_group_events')
      .select('group_id')
      .eq('event_id', eventId)
      .maybeSingle()
    if (existingLink) return { success: true, circleId: existingLink.group_id }
    const chefProfileId = await getChefHubProfileId(tenantId)
    if (!chefProfileId) return { success: false, error: 'Chef hub profile not found' }
    const circleName = clientName ? `${clientName} - ${eventTitle}` : eventTitle || 'Event Circle'
    const { data: group, error: groupError } = await db
      .from('hub_groups')
      .insert({
        name: circleName,
        group_type: 'circle',
        tenant_id: tenantId,
        event_id: eventId,
        is_active: true,
        created_by_profile_id: chefProfileId,
        visibility: 'private',
      })
      .select('id, group_token')
      .single()
    if (groupError || !group) return { success: false, error: groupError?.message ?? 'Failed' }
    await db.from('hub_group_members').insert({
      group_id: group.id,
      profile_id: chefProfileId,
      role: 'chef',
      can_post: true,
      can_invite: true,
      can_pin: true,
    })
    await db.from('hub_group_events').insert({ group_id: group.id, event_id: eventId })
    return { success: true, circleId: group.id }
  } catch (err) {
    console.error('[operating-loop] ensureCircleForEvent failed:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function ensureCircleForClient(
  tenantId: string,
  clientId: string,
  clientName?: string | null
): Promise<CircleOperationResult> {
  try {
    const db: any = createServerClient({ admin: true })
    const { data: client } = await db
      .from('clients')
      .select('id, dinner_circle_group_id, full_name, email')
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .single()
    if (!client) return { success: false, error: 'Client not found' }
    if (client.dinner_circle_group_id)
      return { success: true, circleId: client.dinner_circle_group_id }
    if (!client.email) return { success: false, error: 'Client has no email' }
    const chefProfileId = await getChefHubProfileId(tenantId)
    if (!chefProfileId) return { success: false, error: 'Chef hub profile not found' }
    const name = client.full_name || clientName || 'Client'
    const { data: group, error: groupError } = await db
      .from('hub_groups')
      .insert({
        name: `${name} Circle`,
        group_type: 'circle',
        tenant_id: tenantId,
        is_active: true,
        created_by_profile_id: chefProfileId,
        visibility: 'private',
      })
      .select('id, group_token')
      .single()
    if (groupError || !group) return { success: false, error: groupError?.message ?? 'Failed' }
    await db.from('hub_group_members').insert({
      group_id: group.id,
      profile_id: chefProfileId,
      role: 'chef',
      can_post: true,
      can_invite: true,
      can_pin: true,
    })
    const { findOrCreateClientHubProfile } = await import('@/lib/hub/email-to-circle')
    await findOrCreateClientHubProfile({
      email: client.email,
      name: client.full_name || '',
      circleGroupId: group.id,
    })
    await db
      .from('clients')
      .update({ dinner_circle_group_id: group.id })
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
    return { success: true, circleId: group.id }
  } catch (err) {
    console.error('[operating-loop] ensureCircleForClient failed:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function ensureCircleForVendor(
  tenantId: string,
  vendorId: string,
  vendorName: string
): Promise<CircleOperationResult> {
  try {
    const db: any = createServerClient({ admin: true })
    const { data: existing } = await db
      .from('hub_groups')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('group_type', 'circle')
      .eq('is_active', true)
      .ilike('name', `%${vendorName}%`)
      .limit(1)
    if (existing?.length) return { success: true, circleId: existing[0].id }
    const chefProfileId = await getChefHubProfileId(tenantId)
    if (!chefProfileId) return { success: false, error: 'Chef hub profile not found' }
    const { data: group, error: groupError } = await db
      .from('hub_groups')
      .insert({
        name: `${vendorName} (Vendor)`,
        group_type: 'circle',
        tenant_id: tenantId,
        is_active: true,
        created_by_profile_id: chefProfileId,
        visibility: 'secret',
      })
      .select('id, group_token')
      .single()
    if (groupError || !group) return { success: false, error: groupError?.message ?? 'Failed' }
    await db.from('hub_group_members').insert({
      group_id: group.id,
      profile_id: chefProfileId,
      role: 'chef',
      can_post: true,
      can_invite: true,
      can_pin: true,
    })
    return { success: true, circleId: group.id }
  } catch (err) {
    console.error('[operating-loop] ensureCircleForVendor failed:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function handleOperationalCircleTrigger(
  trigger: OperationalCircleTrigger
): Promise<CircleOperationResult> {
  switch (trigger.source) {
    case 'event_created':
      return ensureCircleForEvent(
        trigger.tenantId,
        trigger.entityId,
        trigger.entityName ?? 'Event',
        trigger.metadata?.clientName as string | undefined
      )
    case 'client_created':
      return ensureCircleForClient(trigger.tenantId, trigger.entityId, trigger.entityName)
    case 'vendor_linked':
      return ensureCircleForVendor(
        trigger.tenantId,
        trigger.entityId,
        trigger.entityName ?? 'Vendor'
      )
    case 'inquiry_received':
      return ensureCircleForEvent(
        trigger.tenantId,
        trigger.entityId,
        trigger.entityName ?? 'Inquiry',
        trigger.metadata?.clientName as string | undefined
      )
    default:
      return { success: false, error: 'Unknown trigger source' }
  }
}

export async function batchEnsureCircles(
  triggers: OperationalCircleTrigger[]
): Promise<{ total: number; succeeded: number; failed: number }> {
  let succeeded = 0
  let failed = 0
  for (const trigger of triggers) {
    const r = await handleOperationalCircleTrigger(trigger)
    if (r.success) {
      succeeded++
    } else {
      failed++
    }
  }
  return { total: triggers.length, succeeded, failed }
}
