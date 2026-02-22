'use server'

// Equipment Redundancy Checklist
//
// Stores equipment checklist per event in the event_safety_checklists table,
// using items with "EQ_" key prefix to distinguish from safety/cross-contamination items.
// No new migration required — reuses the existing items JSONB column.
//
// Each item serialized as:
//   { key: "EQ_<id>", label: "<name>", completed: <hasBackup>, completed_at: null,
//     _eq_id: "<uuid>", _eq_name: "<name>", _eq_has_backup: <bool>, _eq_notes: "<str>" }

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

export type EquipmentItem = {
  id: string
  name: string
  hasBackup: boolean
  notes: string
}

type StoredEqItem = {
  key: string
  label: string
  completed: boolean
  completed_at: string | null
  _eq_id: string
  _eq_name: string
  _eq_has_backup: boolean
  _eq_notes: string
}

function toStored(item: EquipmentItem): StoredEqItem {
  return {
    key: `EQ_${item.id}`,
    label: item.name,
    completed: item.hasBackup,
    completed_at: null,
    _eq_id: item.id,
    _eq_name: item.name,
    _eq_has_backup: item.hasBackup,
    _eq_notes: item.notes,
  }
}

function fromStored(stored: StoredEqItem): EquipmentItem {
  return {
    id: stored._eq_id,
    name: stored._eq_name,
    hasBackup: stored._eq_has_backup,
    notes: stored._eq_notes,
  }
}

export async function saveEquipmentChecklist(eventId: string, items: EquipmentItem[]) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = createServerClient()

  const eqItems: StoredEqItem[] = items.map(toStored)

  // Check if a checklist record exists for this event
  const { data: existing } = await supabase
    .from('event_safety_checklists')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (existing) {
    // Preserve non-EQ items (safety + XC), replace EQ items
    const currentItems = (existing.items as StoredEqItem[]) ?? []
    const nonEqItems = currentItems.filter((i) => !i.key.startsWith('EQ_'))
    const merged = [...nonEqItems, ...eqItems]

    const { error } = await supabase
      .from('event_safety_checklists')
      .update({ items: merged, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .eq('tenant_id', tenantId)

    if (error) {
      throw new Error('Failed to save equipment checklist')
    }
  } else {
    const { error } = await supabase.from('event_safety_checklists').insert({
      event_id: eventId,
      tenant_id: tenantId,
      items: eqItems,
    })

    if (error) {
      throw new Error('Failed to create equipment checklist')
    }
  }

  revalidatePath(`/events/${eventId}`)
}

export async function getEquipmentChecklist(eventId: string): Promise<EquipmentItem[]> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = createServerClient()

  const { data: checklist } = await supabase
    .from('event_safety_checklists')
    .select('items')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!checklist) return []

  const allItems = (checklist.items as StoredEqItem[]) ?? []
  const eqItems = allItems.filter((i) => i.key?.startsWith('EQ_'))

  return eqItems.map(fromStored)
}
