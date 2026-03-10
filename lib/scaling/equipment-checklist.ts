// Event Equipment Checklist
// Links chef's equipment inventory to specific events.
// Supports both owned items (from equipment_items) and custom items (disposables, rentals).
// Tracks packing status with check-off functionality.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export interface EquipmentAssignment {
  id: string
  eventId: string
  equipmentItemId: string | null
  equipmentName: string
  category: string
  quantity: number
  notes: string | null
  checkedOff: boolean
  checkedAt: string | null
  sortOrder: number
}

export interface EquipmentChecklist {
  eventId: string
  assignments: EquipmentAssignment[]
  totalItems: number
  checkedCount: number
  allChecked: boolean
  // Suggested items from inventory (not yet assigned)
  suggestedItems: {
    id: string
    name: string
    category: string
  }[]
}

// ============================================
// CORE: Get equipment checklist for an event
// ============================================

export async function getEventEquipmentChecklist(eventId: string): Promise<EquipmentChecklist> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const chefId = user.tenantId!

  // 1. Get current assignments
  const { data: assignments } = await supabase
    .from('event_equipment_assignments')
    .select(
      `
      id,
      event_id,
      equipment_item_id,
      custom_name,
      category,
      quantity,
      notes,
      checked_off,
      checked_at,
      sort_order
    `
    )
    .eq('event_id', eventId)
    .eq('chef_id', chefId)
    .order('sort_order', { ascending: true })

  // 2. Get equipment names for linked items
  const equipmentIds = (assignments || []).map((a: any) => a.equipment_item_id).filter(Boolean)

  const equipmentMap = new Map<string, any>()
  if (equipmentIds.length > 0) {
    const { data: items } = await supabase
      .from('equipment_items')
      .select('id, name, category')
      .in('id', equipmentIds)
      .eq('chef_id', chefId)

    for (const item of items || []) {
      equipmentMap.set(item.id, item)
    }
  }

  // 3. Map assignments
  const mapped: EquipmentAssignment[] = (assignments || []).map((a: any) => {
    const equipment = a.equipment_item_id ? equipmentMap.get(a.equipment_item_id) : null
    return {
      id: a.id,
      eventId: a.event_id,
      equipmentItemId: a.equipment_item_id,
      equipmentName: equipment?.name ?? a.custom_name ?? 'Unknown',
      category: equipment?.category ?? a.category ?? 'other',
      quantity: a.quantity,
      notes: a.notes,
      checkedOff: a.checked_off,
      checkedAt: a.checked_at,
      sortOrder: a.sort_order,
    }
  })

  const checkedCount = mapped.filter((a) => a.checkedOff).length

  // 4. Get unassigned inventory items as suggestions
  const assignedEquipmentIds = new Set(equipmentIds)
  const { data: allItems } = await supabase
    .from('equipment_items')
    .select('id, name, category')
    .eq('chef_id', chefId)
    .eq('status', 'owned')
    .order('category', { ascending: true })

  const suggestedItems = (allItems || [])
    .filter((item: any) => !assignedEquipmentIds.has(item.id))
    .map((item: any) => ({
      id: item.id,
      name: item.name,
      category: item.category,
    }))

  return {
    eventId,
    assignments: mapped,
    totalItems: mapped.length,
    checkedCount,
    allChecked: mapped.length > 0 && checkedCount === mapped.length,
    suggestedItems,
  }
}

// ============================================
// MUTATIONS
// ============================================

export async function addEquipmentToEvent(
  eventId: string,
  input: {
    equipmentItemId?: string
    customName?: string
    category?: string
    quantity?: number
    notes?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const chefId = user.tenantId!

  // Get max sort order
  const { data: existing } = await supabase
    .from('event_equipment_assignments')
    .select('sort_order')
    .eq('event_id', eventId)
    .eq('chef_id', chefId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextSort = existing?.[0]?.sort_order != null ? existing[0].sort_order + 1 : 0

  const { error } = await supabase.from('event_equipment_assignments').insert({
    chef_id: chefId,
    event_id: eventId,
    equipment_item_id: input.equipmentItemId || null,
    custom_name: input.customName || null,
    category: input.category || 'other',
    quantity: input.quantity ?? 1,
    notes: input.notes || null,
    sort_order: nextSort,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(`/culinary/menus`)
  return { success: true }
}

export async function removeEquipmentFromEvent(
  assignmentId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const chefId = user.tenantId!

  const { error } = await supabase
    .from('event_equipment_assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('chef_id', chefId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/culinary/menus`)
  return { success: true }
}

export async function toggleEquipmentChecked(
  assignmentId: string,
  checked: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const chefId = user.tenantId!

  const { error } = await supabase
    .from('event_equipment_assignments')
    .update({
      checked_off: checked,
      checked_at: checked ? new Date().toISOString() : null,
    })
    .eq('id', assignmentId)
    .eq('chef_id', chefId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/culinary/menus`)
  return { success: true }
}
