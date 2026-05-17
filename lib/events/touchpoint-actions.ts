'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { EventTouchpoint } from './touchpoint-types'

// ---- 1. Add touchpoint ----
export async function addTouchpoint(
  eventId: string,
  touchpoint: Partial<EventTouchpoint>
): Promise<{ success: boolean; error?: string; data?: EventTouchpoint }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Get next sort_order
  const { data: existing } = await db
    .from('event_touchpoints')
    .select('sort_order')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = existing?.[0]?.sort_order != null ? existing[0].sort_order + 1 : 0

  const { data, error } = await db
    .from('event_touchpoints')
    .insert({
      event_id: eventId,
      tenant_id: tenantId,
      type: touchpoint.type ?? 'custom',
      name: touchpoint.name ?? 'Untitled',
      description: touchpoint.description ?? null,
      timing_minutes: touchpoint.timing_minutes ?? null,
      duration_minutes: touchpoint.duration_minutes ?? null,
      notes: touchpoint.notes ?? null,
      sort_order: touchpoint.sort_order ?? nextOrder,
    })
    .select()
    .single()

  if (error) {
    console.error('[touchpoint] add failed', error)
    return { success: false, error: 'Failed to add touchpoint' }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true, data }
}

// ---- 2. Get touchpoints ----
export async function getTouchpoints(
  eventId: string
): Promise<EventTouchpoint[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_touchpoints')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[touchpoint] fetch failed', error)
    return []
  }

  return data ?? []
}

// ---- 3. Update touchpoint ----
export async function updateTouchpoint(
  touchpointId: string,
  updates: Partial<EventTouchpoint>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Strip immutable fields
  const { id: _id, event_id: _eid, tenant_id: _tid, created_at: _ca, ...safeUpdates } = updates as any

  const { error } = await db
    .from('event_touchpoints')
    .update(safeUpdates)
    .eq('id', touchpointId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[touchpoint] update failed', error)
    return { success: false, error: 'Failed to update touchpoint' }
  }

  // Revalidate (we don't know event_id here, so revalidate broadly)
  revalidatePath('/events')
  return { success: true }
}

// ---- 4. Remove touchpoint ----
export async function removeTouchpoint(
  touchpointId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('event_touchpoints')
    .delete()
    .eq('id', touchpointId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[touchpoint] remove failed', error)
    return { success: false, error: 'Failed to remove touchpoint' }
  }

  revalidatePath('/events')
  return { success: true }
}

// ---- 5. Reorder touchpoints ----
export async function reorderTouchpoints(
  eventId: string,
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await db
      .from('event_touchpoints')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('[touchpoint] reorder failed at index', i, error)
      return { success: false, error: 'Failed to reorder touchpoints' }
    }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

// ---- 6. Save as template ----
export async function saveTouchpointTemplate(
  eventId: string,
  templateName: string
): Promise<{ success: boolean; error?: string; templateId?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch current touchpoints for the event
  const { data: touchpoints, error: fetchErr } = await db
    .from('event_touchpoints')
    .select('type, name, description, timing_minutes, duration_minutes, notes, sort_order')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })

  if (fetchErr || !touchpoints?.length) {
    return { success: false, error: 'No touchpoints found to save as template' }
  }

  const { data, error } = await db
    .from('touchpoint_templates')
    .insert({
      tenant_id: tenantId,
      name: templateName,
      touchpoints,
      times_used: 0,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[touchpoint] save template failed', error)
    return { success: false, error: 'Failed to save template' }
  }

  return { success: true, templateId: data.id }
}

// ---- 7. Apply template ----
export async function applyTouchpointTemplate(
  templateId: string,
  eventId: string
): Promise<{ success: boolean; error?: string; count?: number }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch template
  const { data: template, error: fetchErr } = await db
    .from('touchpoint_templates')
    .select('touchpoints')
    .eq('id', templateId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchErr || !template) {
    return { success: false, error: 'Template not found' }
  }

  const items = template.touchpoints as any[]
  if (!items?.length) {
    return { success: false, error: 'Template has no touchpoints' }
  }

  // Insert each touchpoint for the event
  const rows = items.map((tp: any) => ({
    event_id: eventId,
    tenant_id: tenantId,
    type: tp.type ?? 'custom',
    name: tp.name ?? 'Untitled',
    description: tp.description ?? null,
    timing_minutes: tp.timing_minutes ?? null,
    duration_minutes: tp.duration_minutes ?? null,
    notes: tp.notes ?? null,
    sort_order: tp.sort_order ?? 0,
  }))

  const { error: insertErr } = await db
    .from('event_touchpoints')
    .insert(rows)

  if (insertErr) {
    console.error('[touchpoint] apply template failed', insertErr)
    return { success: false, error: 'Failed to apply template' }
  }

  // Increment times_used
  await db
    .from('touchpoint_templates')
    .update({ times_used: (template as any).times_used + 1 })
    .eq('id', templateId)
    .eq('tenant_id', tenantId)

  revalidatePath(`/events/${eventId}`)
  return { success: true, count: rows.length }
}
