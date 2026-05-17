'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type {
  PackingList,
  PackingItem,
  PackingItemSource,
  PackingSection,
  EquipmentRegistryItem,
} from './packing-list-types'
import {
  TECHNIQUE_EQUIPMENT_MAP,
  GUEST_SCALE_EQUIPMENT,
  UNIVERSAL_EQUIPMENT,
  detectTechniques,
} from './technique-equipment-map'

// ─── Equipment Registry ───

export async function getChefEquipmentRegistry(): Promise<EquipmentRegistryItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { data, error } = await db
    .from('chef_equipment_registry')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('category')
    .order('name')

  if (error) throw new Error(`Failed to load equipment registry: ${error.message}`)
  return (data ?? []) as EquipmentRegistryItem[]
}

export async function updateEquipmentRegistry(
  items: {
    id?: string
    name: string
    category: string
    quantity: number
    notes?: string | null
    portable?: boolean
  }[]
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  for (const item of items) {
    if (!item.name?.trim()) continue

    const row = {
      tenant_id: tenantId,
      name: item.name.trim(),
      category: item.category || 'misc',
      quantity: item.quantity ?? 1,
      notes: item.notes?.trim() || null,
      portable: item.portable ?? true,
    }

    if (item.id) {
      // Update existing
      const { error } = await db
        .from('chef_equipment_registry')
        .update(row)
        .eq('id', item.id)
        .eq('tenant_id', tenantId)

      if (error) throw new Error(`Failed to update registry item: ${error.message}`)
    } else {
      // Insert new
      const { error } = await db.from('chef_equipment_registry').insert(row)

      if (error) throw new Error(`Failed to add registry item: ${error.message}`)
    }
  }

  revalidatePath('/settings/equipment')
}

// ─── Packing List Generation ───

/**
 * Auto-generate a packing list for an event based on:
 * 1. Menu dishes/recipes (technique detection)
 * 2. Guest count (scaling rules)
 * 3. Venue/kitchen notes (gap analysis from event notes)
 * 4. Chef's equipment registry (portable items)
 * 5. Universal always-bring items
 *
 * If a list already exists for this event, returns the existing one.
 */
export async function generatePackingList(eventId: string): Promise<PackingList> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Check for existing list
  const { data: existing } = await db
    .from('event_packing_lists')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (existing) {
    return getPackingList(eventId)
  }

  // Load event
  const { data: event, error: eventErr } = await db
    .from('events')
    .select('id, guest_count, service_style, kitchen_notes, site_notes, location_notes')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventErr || !event) throw new Error('Event not found or access denied')

  // Load menus for this event
  const { data: menus } = await db
    .from('menus')
    .select('id, service_style')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)

  const menuIds = (menus ?? []).map((m: any) => m.id)

  // Load dishes from those menus
  let dishes: any[] = []
  if (menuIds.length > 0) {
    const { data: dishData } = await db
      .from('dishes')
      .select('id, course_name, description, chef_notes')
      .in('menu_id', menuIds)

    dishes = dishData ?? []
  }

  // Load recipes linked to menu items
  let recipeTexts: string[] = []
  let recipeEquipmentArrays: string[] = []
  if (menuIds.length > 0) {
    const { data: menuItemData } = await db
      .from('menu_items')
      .select('recipe_id')
      .in('menu_id', menuIds)
      .not('recipe_id', 'is', null)

    const recipeIds = (menuItemData ?? []).map((mi: any) => mi.recipe_id).filter(Boolean)

    if (recipeIds.length > 0) {
      const { data: recipeData } = await db
        .from('recipes')
        .select('method, method_detailed, equipment, name')
        .in('id', recipeIds)

      for (const r of recipeData ?? []) {
        if (r.method) recipeTexts.push(r.method)
        if (r.method_detailed) recipeTexts.push(r.method_detailed)
        if (r.name) recipeTexts.push(r.name)
        if (Array.isArray(r.equipment)) {
          recipeEquipmentArrays.push(...r.equipment.filter((e: string) => e && e.trim()))
        }
      }
    }
  }

  // Load chef's equipment registry (portable items only)
  const { data: registryData } = await db
    .from('chef_equipment_registry')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('portable', true)

  const registry = (registryData ?? []) as EquipmentRegistryItem[]

  // ─── Build packing items ───

  const itemsToInsert: {
    name: string
    category: string
    quantity: number
    source: PackingItemSource
    section: PackingSection
    notes: string | null
  }[] = []

  const seen = new Set<string>() // deduplicate by lowercase name

  function addItem(
    name: string,
    category: string,
    quantity: number,
    source: PackingItemSource,
    section: PackingSection,
    notes: string | null
  ) {
    const key = name.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    itemsToInsert.push({ name, category, quantity, source, section, notes })
  }

  // 1. Technique-based equipment (must_bring)
  const allTexts = [
    ...recipeTexts,
    ...recipeEquipmentArrays,
    ...dishes.map((d: any) =>
      [d.description, d.chef_notes, d.course_name].filter(Boolean).join(' ')
    ),
    event.service_style || '',
  ]

  // Also check service style from menus
  for (const m of menus ?? []) {
    if (m.service_style) allTexts.push(m.service_style)
  }

  const detectedTechniques = detectTechniques(allTexts)

  for (const techKey of detectedTechniques) {
    const tech = TECHNIQUE_EQUIPMENT_MAP[techKey]
    if (!tech) continue
    for (const item of tech.items) {
      addItem(item.name, item.category, 1, 'menu_technique', 'must_bring', item.note ?? null)
    }
  }

  // 2. Guest-count-scaled equipment (recommended)
  const guestCount = event.guest_count ?? 0
  for (const rule of GUEST_SCALE_EQUIPMENT) {
    if (guestCount >= rule.minGuests) {
      for (const item of rule.items) {
        addItem(item.name, item.category, 1, 'guest_scale', 'recommended', item.note)
      }
    }
  }

  // 3. Universal always-bring items (recommended)
  for (const item of UNIVERSAL_EQUIPMENT) {
    addItem(item.name, item.category, 1, 'registry', 'recommended', item.note)
  }

  // 4. Registry items not already added (recommended)
  for (const reg of registry) {
    addItem(
      reg.quantity > 1 ? `${reg.name} (x${reg.quantity})` : reg.name,
      reg.category,
      reg.quantity,
      'registry',
      'recommended',
      reg.notes
    )
  }

  // ─── Persist ───

  const { data: list, error: listErr } = await db
    .from('event_packing_lists')
    .insert({
      event_id: eventId,
      tenant_id: tenantId,
      generated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (listErr) throw new Error(`Failed to create packing list: ${listErr.message}`)

  if (itemsToInsert.length > 0) {
    const rows = itemsToInsert.map((item) => ({
      packing_list_id: list.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      source: item.source,
      section: item.section,
      checked: false,
      notes: item.notes,
    }))

    const { error: itemsErr } = await db.from('event_packing_items').insert(rows)

    if (itemsErr) throw new Error(`Failed to insert packing items: ${itemsErr.message}`)
  }

  revalidatePath(`/events/${eventId}`)
  return getPackingList(eventId)
}

// ─── Read ───

export async function getPackingList(eventId: string): Promise<PackingList> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: list, error: listErr } = await db
    .from('event_packing_lists')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (listErr) throw new Error(`Failed to load packing list: ${listErr.message}`)
  if (!list) throw new Error('No packing list found for this event')

  const { data: items, error: itemsErr } = await db
    .from('event_packing_items')
    .select('*')
    .eq('packing_list_id', list.id)
    .order('section')
    .order('category')
    .order('name')

  if (itemsErr) throw new Error(`Failed to load packing items: ${itemsErr.message}`)

  return {
    id: list.id,
    eventId: list.event_id,
    tenantId: list.tenant_id,
    generatedAt: list.generated_at,
    finalizedAt: list.finalized_at,
    items: ((items ?? []) as any[]).map(mapPackingItem),
  }
}

// ─── Item Operations ───

export async function togglePackingItem(itemId: string, checked: boolean): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Verify ownership through packing list
  const { data: item } = await db
    .from('event_packing_items')
    .select('id, packing_list_id')
    .eq('id', itemId)
    .single()

  if (!item) throw new Error('Packing item not found')

  const { data: list } = await db
    .from('event_packing_lists')
    .select('id')
    .eq('id', item.packing_list_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!list) throw new Error('Unauthorized')

  const { error } = await db
    .from('event_packing_items')
    .update({
      checked,
      checked_at: checked ? new Date().toISOString() : null,
    })
    .eq('id', itemId)

  if (error) throw new Error(`Failed to toggle item: ${error.message}`)
}

export async function addCustomPackingItem(
  eventId: string,
  item: { name: string; category?: string; quantity?: number; section?: string; notes?: string }
): Promise<PackingItem> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  if (!item.name?.trim()) throw new Error('Item name is required')

  // Get the packing list for this event
  const { data: list } = await db
    .from('event_packing_lists')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!list) throw new Error('No packing list found. Generate one first.')

  const { data, error } = await db
    .from('event_packing_items')
    .insert({
      packing_list_id: list.id,
      name: item.name.trim(),
      category: item.category || 'misc',
      quantity: item.quantity ?? 1,
      source: 'custom' as PackingItemSource,
      section: (item.section as PackingSection) || 'must_bring',
      checked: false,
      notes: item.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add custom item: ${error.message}`)

  revalidatePath(`/events/${eventId}`)
  return mapPackingItem(data)
}

// ─── Helpers ───

function mapPackingItem(row: any): PackingItem {
  return {
    id: row.id,
    packingListId: row.packing_list_id,
    name: row.name,
    category: row.category,
    quantity: row.quantity ?? 1,
    source: row.source,
    section: row.section,
    checked: row.checked,
    checkedAt: row.checked_at,
    notes: row.notes,
  }
}
