'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const DEFAULT_SAFETY_ITEMS = [
  { key: 'HAND_WASHING_STATION', label: 'Hand washing station set up with soap and paper towels' },
  { key: 'SANITIZER_PREPARED', label: 'Sanitizer solution prepared and tested (200ppm)' },
  {
    key: 'CUTTING_BOARDS_DESIGNATED',
    label: 'Color-coded cutting boards designated by protein type',
  },
  { key: 'ALLERGEN_LIST_POSTED', label: 'Allergen list reviewed and posted at workstation' },
  { key: 'TEMPS_VERIFIED', label: 'All proteins checked — confirmed at or below 41°F' },
  { key: 'HOT_HOLDING_READY', label: 'Hot holding equipment at 135°F+' },
  { key: 'GLOVES_AVAILABLE', label: 'Gloves available for ready-to-eat food handling' },
  { key: 'FIRE_EXTINGUISHER_LOCATED', label: 'Fire extinguisher location confirmed' },
  { key: 'FIRST_AID_LOCATED', label: 'First aid kit location confirmed' },
  { key: 'EMERGENCY_EXITS_CLEAR', label: 'Emergency exits identified and clear' },
]

export async function getOrCreateSafetyChecklist(eventId: string) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = createServerClient()

  // Try to fetch existing checklist
  const { data: existing, error: fetchError } = await (supabase as any)
    .from('event_safety_checklists')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (fetchError) {
    throw new Error('Failed to fetch safety checklist')
  }

  if (existing) {
    return existing
  }

  // Create a new checklist with default items
  const items = DEFAULT_SAFETY_ITEMS.map((item) => ({
    ...item,
    completed: false,
    completed_at: null,
  }))

  const { data: created, error: createError } = await (supabase as any)
    .from('event_safety_checklists')
    .insert({
      event_id: eventId,
      tenant_id: tenantId,
      items,
    })
    .select()
    .single()

  if (createError || !created) {
    throw new Error('Failed to create safety checklist')
  }

  revalidatePath(`/events/${eventId}`)
  return created
}

export async function toggleSafetyItem(checklistId: string, itemKey: string) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = createServerClient()

  const { data: checklist, error: fetchError } = await (supabase as any)
    .from('event_safety_checklists')
    .select('*')
    .eq('id', checklistId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !checklist) {
    throw new Error('Safety checklist not found')
  }

  const items = (
    checklist.items as Array<{
      key: string
      label: string
      completed: boolean
      completed_at: string | null
    }>
  ).map((item) => {
    if (item.key === itemKey) {
      const nowCompleted = !item.completed
      return {
        ...item,
        completed: nowCompleted,
        completed_at: nowCompleted ? new Date().toISOString() : null,
      }
    }
    return item
  })

  const { error: updateError } = await (supabase as any)
    .from('event_safety_checklists')
    .update({ items, updated_at: new Date().toISOString() })
    .eq('id', checklistId)
    .eq('tenant_id', tenantId)

  if (updateError) {
    throw new Error('Failed to update safety item')
  }

  revalidatePath(`/events/${checklist.event_id}`)
}

export async function completeSafetyChecklist(checklistId: string) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = createServerClient()

  const { data: checklist, error: fetchError } = await (supabase as any)
    .from('event_safety_checklists')
    .select('event_id')
    .eq('id', checklistId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !checklist) {
    throw new Error('Safety checklist not found')
  }

  const { error: updateError } = await (supabase as any)
    .from('event_safety_checklists')
    .update({
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', checklistId)
    .eq('tenant_id', tenantId)

  if (updateError) {
    throw new Error('Failed to complete safety checklist')
  }

  // Mark event-level safety checklist complete flag (non-blocking)
  try {
    await (supabase as any)
      .from('events')
      .update({ safety_checklist_complete: true })
      .eq('id', checklist.event_id)
      .eq('tenant_id', tenantId)
  } catch (err) {
    console.warn('[non-blocking] Failed to update event safety_checklist_complete', err)
  }

  revalidatePath(`/events/${checklist.event_id}`)
}
