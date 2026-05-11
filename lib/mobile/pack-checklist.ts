// Pack Checklist for Mobile
// Generates a checklist combining gear defaults, event-specific items,
// and learned items from after-action reviews.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { DEFAULT_GEAR_ITEMS, GEAR_CATEGORY_LABELS, GEAR_CATEGORY_ORDER, type GearCategory } from '@/lib/gear/defaults'

export type PackCategory = GearCategory | 'event_specific' | 'documents' | 'custom'

export type PackChecklistItem = {
  id: string
  label: string
  category: PackCategory
  checked: boolean
}

export type PackCategoryGroup = {
  category: PackCategory
  label: string
  items: PackChecklistItem[]
}

const PACK_CATEGORY_LABELS: Record<PackCategory, string> = {
  ...GEAR_CATEGORY_LABELS,
  event_specific: 'Event-Specific',
  documents: 'Documents',
  custom: 'Custom',
}

const PACK_CATEGORY_ORDER: PackCategory[] = [
  ...GEAR_CATEGORY_ORDER,
  'documents',
  'event_specific',
  'custom',
]

/**
 * Generate the full pack checklist for an event.
 * Combines: gear defaults + event-specific items + document needs.
 */
export async function getPackChecklist(eventId: string): Promise<PackCategoryGroup[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch event details for event-specific items
  const { data: event } = await db
    .from('events')
    .select(
      `service_style, special_requests, dietary_restrictions, allergies,
       clients(full_name)`
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  // Fetch chef gear defaults (or use built-in defaults)
  const { data: gearDefaults } = await db
    .from('chef_gear_defaults')
    .select('id, item_name, category, is_active')
    .eq('chef_id', tenantId)
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })

  // Fetch existing packing confirmations
  const { data: confirmations } = await db
    .from('packing_confirmations')
    .select('item_key')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)

  const confirmedKeys = new Set((confirmations ?? []).map((c: any) => c.item_key))

  // Build items map by category
  const itemsByCategory = new Map<PackCategory, PackChecklistItem[]>()

  // 1. Gear defaults
  const gearItems = gearDefaults && gearDefaults.length > 0
    ? gearDefaults.map((g: any) => ({
        id: `gear:${g.id}`,
        label: g.item_name,
        category: g.category as PackCategory,
        checked: confirmedKeys.has(`gear:${g.id}`),
      }))
    : DEFAULT_GEAR_ITEMS.map((g, i) => ({
        id: `gear:default:${i}`,
        label: g.item_name,
        category: g.category as PackCategory,
        checked: confirmedKeys.has(`gear:default:${i}`),
      }))

  for (const item of gearItems) {
    const list = itemsByCategory.get(item.category) ?? []
    list.push(item)
    itemsByCategory.set(item.category, list)
  }

  // 2. Documents
  const docItems: PackChecklistItem[] = [
    {
      id: 'doc:guest_list',
      label: 'Guest list / dietary sheet',
      category: 'documents',
      checked: confirmedKeys.has('doc:guest_list'),
    },
    {
      id: 'doc:menu_cards',
      label: 'Menu cards',
      category: 'documents',
      checked: confirmedKeys.has('doc:menu_cards'),
    },
  ]

  // Add contract copy if event has client
  if (event?.clients) {
    docItems.push({
      id: 'doc:contract',
      label: 'Contract copy',
      category: 'documents',
      checked: confirmedKeys.has('doc:contract'),
    })
  }

  // Add dietary sheet if restrictions exist
  const hasRestrictions =
    (event?.dietary_restrictions?.length > 0) || (event?.allergies?.length > 0)
  if (hasRestrictions) {
    docItems.push({
      id: 'doc:allergy_card',
      label: 'Allergy reference card',
      category: 'documents',
      checked: confirmedKeys.has('doc:allergy_card'),
    })
  }

  itemsByCategory.set('documents', docItems)

  // 3. Event-specific items
  const eventItems: PackChecklistItem[] = []
  if (event) {
    const style = event.service_style
    if (style === 'buffet') {
      eventItems.push(
        { id: 'evt:chafing', label: 'Chafing dishes', category: 'event_specific', checked: confirmedKeys.has('evt:chafing') },
        { id: 'evt:sterno', label: 'Sterno fuel', category: 'event_specific', checked: confirmedKeys.has('evt:sterno') }
      )
    }
    if (style === 'cocktail') {
      eventItems.push(
        { id: 'evt:cocktail_shaker', label: 'Cocktail shaker', category: 'event_specific', checked: confirmedKeys.has('evt:cocktail_shaker') },
        { id: 'evt:ice', label: 'Ice', category: 'event_specific', checked: confirmedKeys.has('evt:ice') }
      )
    }
    if (style === 'tasting_menu') {
      eventItems.push(
        { id: 'evt:tasting_spoons', label: 'Tasting spoons', category: 'event_specific', checked: confirmedKeys.has('evt:tasting_spoons') },
        { id: 'evt:small_plates', label: 'Small plates', category: 'event_specific', checked: confirmedKeys.has('evt:small_plates') }
      )
    }

    // Check special requests for keywords
    const requests = (event.special_requests ?? '').toLowerCase()
    if (requests.includes('grill') || requests.includes('bbq')) {
      eventItems.push(
        { id: 'evt:grill_tools', label: 'Grill tools', category: 'event_specific', checked: confirmedKeys.has('evt:grill_tools') },
        { id: 'evt:charcoal', label: 'Charcoal / propane', category: 'event_specific', checked: confirmedKeys.has('evt:charcoal') }
      )
    }
    if (requests.includes('sous vide')) {
      eventItems.push(
        { id: 'evt:immersion', label: 'Immersion circulator', category: 'event_specific', checked: confirmedKeys.has('evt:immersion') },
        { id: 'evt:vacuum_bags', label: 'Vacuum seal bags', category: 'event_specific', checked: confirmedKeys.has('evt:vacuum_bags') }
      )
    }
    if (requests.includes('torch') || requests.includes('brulee')) {
      eventItems.push({
        id: 'evt:torch_fuel',
        label: 'Extra torch fuel',
        category: 'event_specific',
        checked: confirmedKeys.has('evt:torch_fuel'),
      })
    }
  }

  if (eventItems.length > 0) {
    itemsByCategory.set('event_specific', eventItems)
  }

  // Build ordered groups
  const groups: PackCategoryGroup[] = []
  for (const cat of PACK_CATEGORY_ORDER) {
    const items = itemsByCategory.get(cat)
    if (items && items.length > 0) {
      groups.push({
        category: cat,
        label: PACK_CATEGORY_LABELS[cat] ?? cat,
        items,
      })
    }
  }

  return groups
}

/**
 * Toggle a pack checklist item. Uses packing_confirmations table.
 */
export async function togglePackItem(
  eventId: string,
  itemId: string,
  checked: boolean
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    if (checked) {
      await db
        .from('packing_confirmations')
        .upsert(
          { event_id: eventId, tenant_id: user.tenantId!, item_key: itemId },
          { onConflict: 'event_id,item_key' }
        )
    } else {
      await db
        .from('packing_confirmations')
        .delete()
        .eq('event_id', eventId)
        .eq('tenant_id', user.tenantId!)
        .eq('item_key', itemId)
    }
    return { success: true }
  } catch {
    return { success: false }
  }
}

/**
 * Get pack completion status (checked / total).
 */
export async function getPackStatus(eventId: string): Promise<{ checked: number; total: number }> {
  const groups = await getPackChecklist(eventId)
  let checked = 0
  let total = 0
  for (const group of groups) {
    for (const item of group.items) {
      total++
      if (item.checked) checked++
    }
  }
  return { checked, total }
}

/**
 * Mark all items as packed at once (for the "All Packed!" action).
 */
export async function markAllPacked(eventId: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const groups = await getPackChecklist(eventId)

  const uncheckedItems: string[] = []
  for (const group of groups) {
    for (const item of group.items) {
      if (!item.checked) uncheckedItems.push(item.id)
    }
  }

  try {
    if (uncheckedItems.length > 0) {
      const rows = uncheckedItems.map((key) => ({
        event_id: eventId,
        tenant_id: user.tenantId!,
        item_key: key,
      }))
      await db
        .from('packing_confirmations')
        .upsert(rows, { onConflict: 'event_id,item_key' })
    }

    // Also mark the event car_packed flag
    await db
      .from('events')
      .update({
        car_packed: true,
        car_packed_at: new Date().toISOString(),
        packing_list_ready: true,
      })
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)

    revalidatePath(`/events/${eventId}`)
    return { success: true }
  } catch {
    return { success: false }
  }
}
