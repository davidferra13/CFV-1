'use server'

// Cross-Contamination Protocol Checklist
//
// Stores per-event cross-contamination checklists in the existing
// event_safety_checklists table. Uses items with "XC_" key prefix
// to distinguish from standard pre-service safety items - no new
// migration needed.
//
// Each allergen generates 4 protocol items:
//   XC_<ALLERGEN>_BOARD   - dedicated cutting board
//   XC_<ALLERGEN>_UTENSIL - utensils washed and sanitized
//   XC_<ALLERGEN>_STAFF   - staff briefed on severity
//   XC_<ALLERGEN>_PLATE   - service plates visually marked

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

type CrossContamItem = {
  key: string
  label: string
  completed: boolean
  completed_at: string | null
}

function buildItemsForAllergens(allergens: string[]): CrossContamItem[] {
  const items: CrossContamItem[] = []
  for (const allergen of allergens) {
    const slug = allergen
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
    items.push(
      {
        key: `XC_${slug}_BOARD`,
        label: `Dedicated cutting board for ${allergen}-free prep`,
        completed: false,
        completed_at: null,
      },
      {
        key: `XC_${slug}_UTENSIL`,
        label: `Utensils washed and sanitized before ${allergen}-free dishes`,
        completed: false,
        completed_at: null,
      },
      {
        key: `XC_${slug}_STAFF`,
        label: `Staff briefed on ${allergen} severity`,
        completed: false,
        completed_at: null,
      },
      {
        key: `XC_${slug}_PLATE`,
        label: `Service plates visually marked for ${allergen}-free portions`,
        completed: false,
        completed_at: null,
      }
    )
  }
  return items
}

// Suffix used to find the cross-contamination record distinct from the safety record.
// The UNIQUE(event_id) constraint on event_safety_checklists means we can only store
// one record per event. To work around this, the cross-contamination checklist is
// identified by checking whether items array starts with XC_ keys.
//
// LIMITATION: Because of UNIQUE(event_id), we store both safety items and XC items
// in the same record by checking if this event already has a safety checklist.
// If it does, we embed XC items inside the same items JSONB array.
// If it doesn't, we create a new record dedicated to cross-contamination.
//
// For a cleaner solution in the future, add a checklist_type column to the table.

export async function getOrCreateCrossContaminationChecklist(eventId: string, allergens: string[]) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  if (!allergens || allergens.length === 0) {
    return null
  }

  const xcKeys = allergens.map((a) => {
    const slug = a
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
    return `XC_${slug}_BOARD`
  })

  // Check if a safety checklist exists for this event
  const { data: existing } = await db
    .from('event_safety_checklists')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (existing) {
    const currentItems = (existing.items as CrossContamItem[]) ?? []
    const hasXcItems = currentItems.some((i) => i.key.startsWith('XC_'))

    if (hasXcItems) {
      // Return only the XC items as a virtual checklist
      return {
        id: existing.id,
        items: currentItems.filter((i) => i.key.startsWith('XC_')),
        completed_at: existing.completed_at,
        _embedded: true,
      }
    }

    // Append XC items to the existing safety checklist
    const newXcItems = buildItemsForAllergens(allergens)
    const merged = [...currentItems, ...newXcItems]

    await db
      .from('event_safety_checklists')
      .update({ items: merged, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .eq('tenant_id', tenantId)

    revalidatePath(`/events/${eventId}`)
    return {
      id: existing.id,
      items: newXcItems,
      completed_at: null,
      _embedded: true,
    }
  }

  // No safety checklist exists - create one with only XC items
  const xcItems = buildItemsForAllergens(allergens)
  const { data: created, error } = await db
    .from('event_safety_checklists')
    .insert({
      event_id: eventId,
      tenant_id: tenantId,
      items: xcItems,
    })
    .select()
    .single()

  if (error || !created) {
    throw new Error('Failed to create cross-contamination checklist')
  }

  revalidatePath(`/events/${eventId}`)
  return {
    id: created.id,
    items: xcItems,
    completed_at: null,
    _embedded: false,
  }
}

export async function toggleCrossContaminationItem(checklistId: string, itemKey: string) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  const { data: checklist, error: fetchError } = await db
    .from('event_safety_checklists')
    .select('*')
    .eq('id', checklistId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !checklist) {
    throw new Error('Checklist not found')
  }

  const items = (checklist.items as CrossContamItem[]).map((item) => {
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

  const { error: updateError } = await db
    .from('event_safety_checklists')
    .update({ items, updated_at: new Date().toISOString() })
    .eq('id', checklistId)
    .eq('tenant_id', tenantId)

  if (updateError) {
    throw new Error('Failed to update cross-contamination item')
  }

  revalidatePath(`/events/${checklist.event_id}`)
}
