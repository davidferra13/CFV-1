'use server'

// Equipment Checklist Per Event (table-backed)
// Uses the event_equipment_checklist table for proper per-item packing/return tracking.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ───────────────────────────────────────────────────────

export type EquipmentCategory = 'cooking' | 'serving' | 'transport' | 'setup' | 'cleaning' | 'other'
export type EquipmentSource = 'owned' | 'rental' | 'venue_provided'

export type EquipmentChecklistItem = {
  id: string
  event_id: string
  chef_id: string
  equipment_name: string
  category: EquipmentCategory
  quantity: number
  source: EquipmentSource
  packed: boolean
  returned: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export type AddEquipmentInput = {
  equipment_name: string
  category: EquipmentCategory
  quantity?: number
  source?: EquipmentSource
  notes?: string
}

// ─── Actions ─────────────────────────────────────────────────────

export async function addEquipmentToChecklist(eventId: string, input: AddEquipmentInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_equipment_checklist')
    .insert({
      event_id: eventId,
      chef_id: user.tenantId!,
      equipment_name: input.equipment_name,
      category: input.category,
      quantity: input.quantity ?? 1,
      source: input.source ?? 'owned',
      notes: input.notes || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add equipment: ${error.message}`)

  revalidatePath(`/events/${eventId}`)
  return data
}

export async function removeEquipmentFromChecklist(eventId: string, itemId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('event_equipment_checklist')
    .delete()
    .eq('id', itemId)
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to remove equipment: ${error.message}`)

  revalidatePath(`/events/${eventId}`)
}

export async function getEventEquipmentChecklist(
  eventId: string
): Promise<Record<EquipmentCategory, EquipmentChecklistItem[]>> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_equipment_checklist')
    .select('*')
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)
    .order('category')
    .order('equipment_name')

  if (error) throw new Error(`Failed to fetch checklist: ${error.message}`)

  const items: EquipmentChecklistItem[] = data ?? []
  const grouped: Record<EquipmentCategory, EquipmentChecklistItem[]> = {
    cooking: [],
    serving: [],
    transport: [],
    setup: [],
    cleaning: [],
    other: [],
  }

  for (const item of items) {
    grouped[item.category as EquipmentCategory].push(item)
  }

  return grouped
}

export async function toggleEquipmentPacked(eventId: string, itemId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: current } = await supabase
    .from('event_equipment_checklist')
    .select('packed')
    .eq('id', itemId)
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!current) throw new Error('Item not found')

  const { error } = await supabase
    .from('event_equipment_checklist')
    .update({
      packed: !current.packed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to toggle packed: ${error.message}`)

  revalidatePath(`/events/${eventId}`)
}

export async function toggleEquipmentReturned(eventId: string, itemId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: current } = await supabase
    .from('event_equipment_checklist')
    .select('returned')
    .eq('id', itemId)
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!current) throw new Error('Item not found')

  const { error } = await supabase
    .from('event_equipment_checklist')
    .update({
      returned: !current.returned,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to toggle returned: ${error.message}`)

  revalidatePath(`/events/${eventId}`)
}

export async function getEquipmentPackingProgress(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_equipment_checklist')
    .select('packed, returned')
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)

  if (error) return { packed: 0, returned: 0, total: 0 }

  const items = data ?? []
  return {
    packed: items.filter((i: any) => i.packed).length,
    returned: items.filter((i: any) => i.returned).length,
    total: items.length,
  }
}

export async function generateDefaultChecklist(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Load event to get guest count, service style, venue type
  const { data: event } = await supabase
    .from('events')
    .select('guest_count, service_style, venue_type, location')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  const guestCount = event.guest_count ?? 0
  const serviceStyle = (event.service_style ?? '').toLowerCase()
  const isOutdoor =
    (event.venue_type ?? '').toLowerCase().includes('outdoor') ||
    (event.location ?? '').toLowerCase().includes('outdoor') ||
    (event.location ?? '').toLowerCase().includes('backyard') ||
    (event.location ?? '').toLowerCase().includes('garden')

  // Base items for all events
  const items: AddEquipmentInput[] = [
    { equipment_name: 'Serving Utensils Set', category: 'serving', quantity: 1, source: 'owned' },
    { equipment_name: 'Tongs (multiple sizes)', category: 'cooking', quantity: 2, source: 'owned' },
    { equipment_name: 'Cutting Boards', category: 'cooking', quantity: 3, source: 'owned' },
    { equipment_name: 'Chef Knives', category: 'cooking', quantity: 1, source: 'owned' },
    { equipment_name: 'Kitchen Towels', category: 'cleaning', quantity: 6, source: 'owned' },
    { equipment_name: 'First Aid Kit', category: 'other', quantity: 1, source: 'owned' },
    { equipment_name: 'Sheet Pans', category: 'cooking', quantity: 4, source: 'owned' },
    { equipment_name: 'Disposable Gloves', category: 'cleaning', quantity: 1, source: 'owned' },
    { equipment_name: 'Trash Bags', category: 'cleaning', quantity: 1, source: 'owned' },
  ]

  // 50+ guests
  if (guestCount >= 50) {
    items.push(
      { equipment_name: 'Chafing Dishes', category: 'serving', quantity: 4, source: 'owned' },
      { equipment_name: 'Sterno Fuel', category: 'serving', quantity: 8, source: 'owned' },
      { equipment_name: 'Extra Sheet Pans', category: 'cooking', quantity: 6, source: 'owned' }
    )
  }

  // 100+ guests
  if (guestCount >= 100) {
    items.push(
      { equipment_name: 'Bus Tubs', category: 'cleaning', quantity: 4, source: 'owned' },
      {
        equipment_name: 'Extra Trash Bags (bulk)',
        category: 'cleaning',
        quantity: 2,
        source: 'owned',
      },
      { equipment_name: 'Hand Washing Station', category: 'setup', quantity: 1, source: 'rental' }
    )
  }

  // Outdoor events
  if (isOutdoor) {
    items.push(
      { equipment_name: 'Tent Weights', category: 'setup', quantity: 4, source: 'rental' },
      { equipment_name: 'Extension Cords', category: 'setup', quantity: 3, source: 'owned' },
      {
        equipment_name: 'Portable Hand Wash Station',
        category: 'setup',
        quantity: 1,
        source: 'rental',
      }
    )
  }

  // Plated service
  if (serviceStyle.includes('plated')) {
    items.push(
      {
        equipment_name: 'Plate Covers',
        category: 'serving',
        quantity: Math.max(10, guestCount),
        source: 'owned',
      },
      { equipment_name: 'Garnish Containers', category: 'serving', quantity: 4, source: 'owned' }
    )
  }

  // Buffet service
  if (serviceStyle.includes('buffet')) {
    items.push(
      { equipment_name: 'Chafing Dishes', category: 'serving', quantity: 6, source: 'owned' },
      {
        equipment_name: 'Serving Spoons (long handle)',
        category: 'serving',
        quantity: 8,
        source: 'owned',
      },
      { equipment_name: 'Sneeze Guards', category: 'serving', quantity: 2, source: 'rental' }
    )
  }

  // Deduplicate by equipment_name
  const seen = new Set<string>()
  const uniqueItems = items.filter((item) => {
    if (seen.has(item.equipment_name)) return false
    seen.add(item.equipment_name)
    return true
  })

  // Check for existing items to avoid unique constraint violations
  const { data: existing } = await supabase
    .from('event_equipment_checklist')
    .select('equipment_name')
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)

  const existingNames = new Set((existing ?? []).map((e: any) => e.equipment_name))
  const newItems = uniqueItems.filter((item) => !existingNames.has(item.equipment_name))

  if (newItems.length === 0) return { added: 0 }

  const rows = newItems.map((item) => ({
    event_id: eventId,
    chef_id: user.tenantId!,
    equipment_name: item.equipment_name,
    category: item.category,
    quantity: item.quantity ?? 1,
    source: item.source ?? 'owned',
    notes: null,
  }))

  const { error } = await supabase.from('event_equipment_checklist').insert(rows)

  if (error) throw new Error(`Failed to generate checklist: ${error.message}`)

  revalidatePath(`/events/${eventId}`)
  return { added: newItems.length }
}
