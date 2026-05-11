'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// Types

export interface EquipmentConflict {
  equipmentId: string
  equipmentName: string
  category: string
  date: string
  events: {
    eventId: string
    eventName: string
    serveTime: string | null
  }[]
  resolution: string
}

export interface EquipmentNeed {
  eventId: string
  eventName: string
  eventDate: string
  items: {
    equipmentId: string | null
    name: string
    category: string
    quantity: number
    owned: boolean
  }[]
}

export interface EquipmentAvailability {
  id: string
  name: string
  category: string
  quantity: number
  assignedCount: number
  availableCount: number
  eventsUsing: { eventId: string; eventName: string; date: string }[]
}

export interface EquipmentReport {
  conflicts: EquipmentConflict[]
  available: EquipmentAvailability[]
  needed: EquipmentNeed[]
  dateRange: { start: string; end: string }
  totalConflicts: number
  totalItemsNeeded: number
}

// Main Action

export async function checkEquipmentConflicts(
  startDate: string,
  endDate: string
): Promise<EquipmentReport | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch events in date range
  const { data: events, error: eventsError } = await db
    .from('events')
    .select('id, occasion, event_date, serve_time, status')
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'paid', 'accepted', 'in_progress'])
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true })

  if (eventsError || !events || events.length === 0) return null

  // Fetch owned equipment
  const { data: ownedEquipment, error: eqError } = await db
    .from('chef_equipment')
    .select('id, name, category, quantity')
    .eq('chef_id', tenantId)
    .order('category')
    .order('name')

  if (eqError) return null

  const eventIds = events.map((e: any) => e.id)

  // Fetch equipment checklists (from event_safety_checklists with EQ_ prefix items)
  const { data: checklists } = await db
    .from('event_safety_checklists')
    .select('event_id, items')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  // Fetch packing checklists (from packing_checklist_items linked to events)
  const { data: packingChecklists } = await db
    .from('packing_checklists')
    .select('id, event_id')
    .eq('chef_id', tenantId)
    .in('event_id', eventIds)

  const packingChecklistIds = (packingChecklists ?? []).map((pc: any) => pc.id)
  let packingItems: any[] = []
  if (packingChecklistIds.length > 0) {
    const { data } = await db
      .from('packing_checklist_items')
      .select('checklist_id, equipment_id, item_name, category')
      .in('checklist_id', packingChecklistIds)
    packingItems = data ?? []
  }

  // Build event-to-equipment mapping
  const eventEquipment = new Map<string, { equipmentId: string | null; name: string; category: string }[]>()

  // From safety checklists (EQ_ prefixed items)
  for (const cl of checklists ?? []) {
    const items = cl.items as any[]
    if (!items) continue
    const eqItems = items.filter((item: any) => item.key?.startsWith('EQ_'))
    if (eqItems.length > 0) {
      const existing = eventEquipment.get(cl.event_id) ?? []
      for (const item of eqItems) {
        existing.push({
          equipmentId: item._eq_id ?? null,
          name: item._eq_name ?? item.label ?? 'Unknown',
          category: 'other',
        })
      }
      eventEquipment.set(cl.event_id, existing)
    }
  }

  // From packing checklists
  const packingChecklistEventMap = new Map<string, string>()
  for (const pc of packingChecklists ?? []) {
    packingChecklistEventMap.set(pc.id, pc.event_id)
  }

  for (const item of packingItems) {
    const eventId = packingChecklistEventMap.get(item.checklist_id)
    if (!eventId) continue
    const existing = eventEquipment.get(eventId) ?? []
    existing.push({
      equipmentId: item.equipment_id ?? null,
      name: item.item_name ?? 'Unknown',
      category: item.category ?? 'other',
    })
    eventEquipment.set(eventId, existing)
  }

  const eventMap = new Map<string, any>()
  for (const e of events) {
    eventMap.set(e.id, e)
  }

  // Build equipment usage by name + date for conflict detection
  const equipmentUsage = new Map<string, { eventId: string; eventName: string; date: string; serveTime: string | null }[]>()

  for (const [eventId, items] of eventEquipment) {
    const event = eventMap.get(eventId)
    if (!event) continue

    for (const item of items) {
      const key = `${item.name.toLowerCase().trim()}_${event.event_date}`
      const existing = equipmentUsage.get(key) ?? []
      existing.push({
        eventId: event.id,
        eventName: event.occasion || 'Event',
        date: event.event_date,
        serveTime: event.serve_time,
      })
      equipmentUsage.set(key, existing)
    }
  }

  // Detect conflicts: same equipment needed by multiple events on same day
  const conflicts: EquipmentConflict[] = []
  const seenConflictKeys = new Set<string>()

  for (const [key, usages] of equipmentUsage) {
    if (usages.length < 2) continue

    const conflictKey = key
    if (seenConflictKeys.has(conflictKey)) continue
    seenConflictKeys.add(conflictKey)

    const namePart = key.split('_').slice(0, -1).join('_')
    const ownedItem = (ownedEquipment ?? []).find(
      (eq: any) => eq.name.toLowerCase().trim() === namePart
    )

    // If we own multiple, check quantity
    if (ownedItem && ownedItem.quantity >= usages.length) continue

    conflicts.push({
      equipmentId: ownedItem?.id ?? '',
      equipmentName: ownedItem?.name ?? namePart.replace(/_/g, ' '),
      category: ownedItem?.category ?? 'other',
      date: usages[0].date,
      events: usages.map((u) => ({
        eventId: u.eventId,
        eventName: u.eventName,
        serveTime: u.serveTime,
      })),
      resolution: ownedItem
        ? `You own ${ownedItem.quantity} but need ${usages.length}. Consider renting an extra or scheduling events at different times.`
        : 'This item is needed by multiple events. Confirm you have enough or consider renting.',
    })
  }

  // Build availability list
  const available: EquipmentAvailability[] = (ownedEquipment ?? []).map((eq: any) => {
    const eventsUsing: { eventId: string; eventName: string; date: string }[] = []
    let assignedCount = 0

    for (const [eventId, items] of eventEquipment) {
      const event = eventMap.get(eventId)
      if (!event) continue

      const matchingItems = items.filter(
        (item) =>
          item.equipmentId === eq.id ||
          item.name.toLowerCase().trim() === eq.name.toLowerCase().trim()
      )

      if (matchingItems.length > 0) {
        assignedCount++
        eventsUsing.push({
          eventId: event.id,
          eventName: event.occasion || 'Event',
          date: event.event_date,
        })
      }
    }

    return {
      id: eq.id,
      name: eq.name,
      category: eq.category,
      quantity: eq.quantity ?? 1,
      assignedCount,
      availableCount: Math.max(0, (eq.quantity ?? 1) - assignedCount),
      eventsUsing,
    }
  })

  // Build needs list per event
  const needed: EquipmentNeed[] = events
    .map((event: any) => {
      const items = eventEquipment.get(event.id) ?? []
      return {
        eventId: event.id,
        eventName: event.occasion || 'Event',
        eventDate: event.event_date,
        items: items.map((item) => {
          const isOwned = (ownedEquipment ?? []).some(
            (eq: any) =>
              eq.id === item.equipmentId ||
              eq.name.toLowerCase().trim() === item.name.toLowerCase().trim()
          )
          return {
            equipmentId: item.equipmentId,
            name: item.name,
            category: item.category,
            quantity: 1,
            owned: isOwned,
          }
        }),
      }
    })
    .filter((n: EquipmentNeed) => n.items.length > 0)

  const totalItemsNeeded = needed.reduce((sum, n) => sum + n.items.length, 0)

  return {
    conflicts,
    available,
    needed,
    dateRange: { start: startDate, end: endDate },
    totalConflicts: conflicts.length,
    totalItemsNeeded,
  }
}
