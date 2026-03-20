'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ───

export type EquipmentCategory =
  | 'cookware'
  | 'bakeware'
  | 'knives'
  | 'utensils'
  | 'appliances'
  | 'serving'
  | 'transport'
  | 'cleaning'
  | 'specialty'
  | 'other'

export interface Equipment {
  id: string
  chef_id: string
  name: string
  category: EquipmentCategory
  quantity: number
  notes: string | null
  created_at: string
}

export interface PackingChecklist {
  id: string
  chef_id: string
  event_id: string | null
  client_id: string | null
  name: string
  created_at: string
}

export interface PackingChecklistItem {
  id: string
  checklist_id: string
  equipment_id: string | null
  item_name: string
  category: string | null
  is_packed: boolean
  is_returned: boolean
  notes: string | null
  sort_order: number
}

const VALID_CATEGORIES: EquipmentCategory[] = [
  'cookware',
  'bakeware',
  'knives',
  'utensils',
  'appliances',
  'serving',
  'transport',
  'cleaning',
  'specialty',
  'other',
]

// ─── Chef Equipment CRUD ───

export async function getChefEquipment(): Promise<Equipment[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data, error } = await supabase
    .from('chef_equipment')
    .select('*')
    .eq('chef_id', tenantId)
    .order('category')
    .order('name')

  if (error) throw new Error(`Failed to load equipment: ${error.message}`)
  return (data ?? []) as Equipment[]
}

export async function addEquipment(input: {
  name: string
  category: EquipmentCategory
  quantity?: number
  notes?: string
}): Promise<Equipment> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  if (!input.name?.trim()) throw new Error('Equipment name is required')
  if (!VALID_CATEGORIES.includes(input.category)) throw new Error('Invalid category')

  const { data, error } = await supabase
    .from('chef_equipment')
    .insert({
      chef_id: tenantId,
      name: input.name.trim(),
      category: input.category,
      quantity: input.quantity ?? 1,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('You already have equipment with that name')
    throw new Error(`Failed to add equipment: ${error.message}`)
  }

  revalidatePath('/equipment')
  return data as Equipment
}

export async function updateEquipment(
  id: string,
  input: { name?: string; category?: EquipmentCategory; quantity?: number; notes?: string }
): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  if (input.category && !VALID_CATEGORIES.includes(input.category)) {
    throw new Error('Invalid category')
  }

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.category !== undefined) updates.category = input.category
  if (input.quantity !== undefined) updates.quantity = input.quantity
  if (input.notes !== undefined) updates.notes = input.notes?.trim() || null

  const { error } = await supabase
    .from('chef_equipment')
    .update(updates)
    .eq('id', id)
    .eq('chef_id', tenantId)

  if (error) {
    if (error.code === '23505') throw new Error('You already have equipment with that name')
    throw new Error(`Failed to update equipment: ${error.message}`)
  }

  revalidatePath('/equipment')
}

export async function deleteEquipment(id: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { error } = await supabase
    .from('chef_equipment')
    .delete()
    .eq('id', id)
    .eq('chef_id', tenantId)

  if (error) throw new Error(`Failed to delete equipment: ${error.message}`)
  revalidatePath('/equipment')
}

// ─── Kitchen Gap Analysis ───

export async function getClientKitchenGaps(clientId: string): Promise<Equipment[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Get all chef equipment
  const { data: chefEquipment, error: eqErr } = await supabase
    .from('chef_equipment')
    .select('*')
    .eq('chef_id', tenantId)

  if (eqErr) throw new Error(`Failed to load equipment: ${eqErr.message}`)

  // For now, since there's no client_kitchen_inventory table yet,
  // return all chef equipment as "needed" (the chef should bring everything).
  // When client kitchen inventory is added (feature 2.5), this will compare
  // chef equipment against what the client already has and return only the gaps.
  return (chefEquipment ?? []) as Equipment[]
}

// ─── Packing Checklist Generation ───

export async function generatePackingChecklist(
  eventId: string
): Promise<PackingChecklist & { items: PackingChecklistItem[] }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Check for existing checklist for this event
  const { data: existing } = await supabase
    .from('packing_checklists')
    .select('id')
    .eq('event_id', eventId)
    .eq('chef_id', tenantId)
    .maybeSingle()

  if (existing) {
    // Return existing checklist instead of creating a duplicate
    return getPackingChecklist(existing.id)
  }

  // Get event details
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, title, client_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventErr || !event) throw new Error('Event not found')

  // Get chef's equipment
  const { data: equipment } = await supabase
    .from('chef_equipment')
    .select('*')
    .eq('chef_id', tenantId)
    .order('category')
    .order('name')

  const allEquipment = (equipment ?? []) as Equipment[]

  // Create checklist
  const checklistName = `Packing list: ${event.title || 'Event'}`

  const { data: checklist, error: createErr } = await supabase
    .from('packing_checklists')
    .insert({
      chef_id: tenantId,
      event_id: eventId,
      client_id: event.client_id || null,
      name: checklistName,
    })
    .select()
    .single()

  if (createErr) throw new Error(`Failed to create checklist: ${createErr.message}`)

  // Build checklist items from equipment (gap analysis is pure logic)
  // For now, include all chef equipment. When client kitchen inventory exists,
  // this will filter to only items the client doesn't have.
  const categoryOrder: Record<string, number> = {
    knives: 0,
    cookware: 1,
    bakeware: 2,
    appliances: 3,
    utensils: 4,
    serving: 5,
    transport: 6,
    cleaning: 7,
    specialty: 8,
    other: 9,
  }

  const items = allEquipment.map((eq, idx) => ({
    checklist_id: checklist.id,
    equipment_id: eq.id,
    item_name: eq.quantity > 1 ? `${eq.name} (x${eq.quantity})` : eq.name,
    category: eq.category,
    is_packed: false,
    is_returned: false,
    notes: eq.notes,
    sort_order: (categoryOrder[eq.category] ?? 9) * 100 + idx,
  }))

  if (items.length > 0) {
    const { error: itemsErr } = await supabase.from('packing_checklist_items').insert(items)

    if (itemsErr) throw new Error(`Failed to create checklist items: ${itemsErr.message}`)
  }

  revalidatePath(`/events/${eventId}`)
  return getPackingChecklist(checklist.id)
}

// ─── Checklist Read ───

export async function getPackingChecklist(
  checklistId: string
): Promise<PackingChecklist & { items: PackingChecklistItem[] }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: checklist, error: clErr } = await supabase
    .from('packing_checklists')
    .select('*')
    .eq('id', checklistId)
    .eq('chef_id', tenantId)
    .single()

  if (clErr || !checklist) throw new Error('Checklist not found')

  const { data: items, error: itemsErr } = await supabase
    .from('packing_checklist_items')
    .select('*')
    .eq('checklist_id', checklistId)
    .order('sort_order')

  if (itemsErr) throw new Error(`Failed to load checklist items: ${itemsErr.message}`)

  return {
    ...(checklist as PackingChecklist),
    items: (items ?? []) as PackingChecklistItem[],
  }
}

export async function getEventChecklist(
  eventId: string
): Promise<(PackingChecklist & { items: PackingChecklistItem[] }) | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: checklist } = await supabase
    .from('packing_checklists')
    .select('*')
    .eq('event_id', eventId)
    .eq('chef_id', tenantId)
    .maybeSingle()

  if (!checklist) return null

  const { data: items } = await supabase
    .from('packing_checklist_items')
    .select('*')
    .eq('checklist_id', checklist.id)
    .order('sort_order')

  return {
    ...(checklist as PackingChecklist),
    items: (items ?? []) as PackingChecklistItem[],
  }
}

// ─── Checklist Item Operations ───

export async function toggleItemPacked(itemId: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Verify ownership through checklist
  const { data: item } = await supabase
    .from('packing_checklist_items')
    .select('id, is_packed, checklist_id')
    .eq('id', itemId)
    .single()

  if (!item) throw new Error('Item not found')

  // Verify checklist belongs to this chef
  const { data: checklist } = await supabase
    .from('packing_checklists')
    .select('id')
    .eq('id', item.checklist_id)
    .eq('chef_id', tenantId)
    .single()

  if (!checklist) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('packing_checklist_items')
    .update({ is_packed: !item.is_packed })
    .eq('id', itemId)

  if (error) throw new Error(`Failed to toggle packed: ${error.message}`)
}

export async function toggleItemReturned(itemId: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: item } = await supabase
    .from('packing_checklist_items')
    .select('id, is_returned, checklist_id')
    .eq('id', itemId)
    .single()

  if (!item) throw new Error('Item not found')

  const { data: checklist } = await supabase
    .from('packing_checklists')
    .select('id')
    .eq('id', item.checklist_id)
    .eq('chef_id', tenantId)
    .single()

  if (!checklist) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('packing_checklist_items')
    .update({ is_returned: !item.is_returned })
    .eq('id', itemId)

  if (error) throw new Error(`Failed to toggle returned: ${error.message}`)
}

export async function addChecklistItem(
  checklistId: string,
  input: { item_name: string; category?: string; notes?: string }
): Promise<PackingChecklistItem> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  if (!input.item_name?.trim()) throw new Error('Item name is required')

  // Verify checklist ownership
  const { data: checklist } = await supabase
    .from('packing_checklists')
    .select('id')
    .eq('id', checklistId)
    .eq('chef_id', tenantId)
    .single()

  if (!checklist) throw new Error('Checklist not found')

  // Get max sort_order for this checklist
  const { data: maxItem } = await supabase
    .from('packing_checklist_items')
    .select('sort_order')
    .eq('checklist_id', checklistId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (maxItem?.sort_order ?? 0) + 1

  const { data, error } = await supabase
    .from('packing_checklist_items')
    .insert({
      checklist_id: checklistId,
      item_name: input.item_name.trim(),
      category: input.category || 'other',
      notes: input.notes?.trim() || null,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add item: ${error.message}`)
  return data as PackingChecklistItem
}

export async function removeChecklistItem(itemId: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Verify ownership
  const { data: item } = await supabase
    .from('packing_checklist_items')
    .select('checklist_id')
    .eq('id', itemId)
    .single()

  if (!item) throw new Error('Item not found')

  const { data: checklist } = await supabase
    .from('packing_checklists')
    .select('id')
    .eq('id', item.checklist_id)
    .eq('chef_id', tenantId)
    .single()

  if (!checklist) throw new Error('Unauthorized')

  const { error } = await supabase.from('packing_checklist_items').delete().eq('id', itemId)

  if (error) throw new Error(`Failed to remove item: ${error.message}`)
}

// ─── History ───

export async function getPackingHistory(): Promise<
  (PackingChecklist & { item_count: number; packed_count: number })[]
> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: checklists, error } = await supabase
    .from('packing_checklists')
    .select('*')
    .eq('chef_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load history: ${error.message}`)

  // Get item counts for each checklist
  const results = await Promise.all(
    (checklists ?? []).map(async (cl: any) => {
      const { data: items } = await supabase
        .from('packing_checklist_items')
        .select('is_packed')
        .eq('checklist_id', cl.id)

      const allItems = items ?? []
      return {
        ...(cl as PackingChecklist),
        item_count: allItems.length,
        packed_count: allItems.filter((i: any) => i.is_packed).length,
      }
    })
  )

  return results
}
