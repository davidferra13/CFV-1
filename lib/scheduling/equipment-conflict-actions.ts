'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { dateToDateString } from '@/lib/utils/format'

// ─── Types ───

export type EquipmentConflict = {
  itemName: string
  category: string
  events: { eventId: string; eventName: string; date: string }[]
  resolution: 'split' | 'borrow' | 'rent' | 'stagger'
  suggestion: string
}

export type DayConflictReport = {
  date: string
  events: { id: string; name: string; startTime: string | null; endTime: string | null }[]
  conflicts: EquipmentConflict[]
  noConflicts: boolean
}

const UNIQUE_EQUIPMENT = new Set([
  'immersion circulator',
  'stand mixer',
  'food processor',
  'blender',
  'instant pot',
  'pressure cooker',
  'meat grinder',
  'pasta machine',
  'deep fryer',
  'waffle iron',
  'ice cream maker',
  'smoker',
  'sous vide',
  'mandoline',
  'kitchen scale',
  'thermomix',
])

function isUniqueItem(name: string): boolean {
  const lower = name.toLowerCase().replace(/\s*\(x\d+\)\s*$/, '')
  return UNIQUE_EQUIPMENT.has(lower)
}

function eventsOverlap(
  a: { arrivalTime: string | null; serveTime: string | null },
  b: { arrivalTime: string | null; serveTime: string | null }
): boolean {
  const aStart = a.arrivalTime ?? a.serveTime
  const aEnd = a.serveTime ?? a.arrivalTime
  const bStart = b.arrivalTime ?? b.serveTime
  const bEnd = b.serveTime ?? b.arrivalTime
  if (!aStart || !aEnd || !bStart || !bEnd) return true
  return aStart <= bEnd && bStart <= aEnd
}

function buildSuggestion(
  itemName: string,
  resolution: EquipmentConflict['resolution'],
  eventNames: string[]
): string {
  switch (resolution) {
    case 'stagger':
      return `Use for ${eventNames[0]} first, then transport to ${eventNames[1]}`
    case 'split':
      return `Split ${itemName} quantity across ${eventNames.length} events`
    case 'rent':
      return `Rent a second ${itemName} for the overlapping event`
    case 'borrow':
      return `Borrow an extra ${itemName} or arrange a rental`
  }
}

// ─── Main Functions ───

export async function getEquipmentConflicts(date: string): Promise<DayConflictReport> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, serve_time, arrival_time, status, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .not('status', 'eq', 'cancelled')
    .gte('event_date', date)
    .lte('event_date', date)
    .order('serve_time', { ascending: true })

  const eventList: any[] = events ?? []

  if (eventList.length < 2) {
    return {
      date,
      events: eventList.map((e: any) => ({
        id: e.id,
        name: e.occasion ?? e.client?.full_name ?? 'Event',
        startTime: e.arrival_time ?? null,
        endTime: e.serve_time ?? null,
      })),
      conflicts: [],
      noConflicts: true,
    }
  }

  const eventMeta = eventList.map((e: any) => ({
    id: e.id as string,
    name: (e.occasion ?? e.client?.full_name ?? 'Event') as string,
    arrivalTime: (e.arrival_time ?? null) as string | null,
    serveTime: (e.serve_time ?? null) as string | null,
  }))

  // Gather packing items for each event from both packing systems
  const itemsByEvent = new Map<string, { name: string; category: string }[]>()

  for (const ev of eventMeta) {
    const items: { name: string; category: string }[] = []

    // Newer system: event_packing_lists
    const { data: packingList } = await db
      .from('event_packing_lists')
      .select('id')
      .eq('event_id', ev.id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (packingList) {
      const { data: packingItems } = await db
        .from('event_packing_items')
        .select('name, category')
        .eq('packing_list_id', packingList.id)

      for (const pi of packingItems ?? []) {
        items.push({ name: pi.name, category: pi.category ?? 'other' })
      }
    }

    // Older system: packing_checklists
    const { data: checklist } = await db
      .from('packing_checklists')
      .select('id')
      .eq('event_id', ev.id)
      .eq('chef_id', tenantId)
      .maybeSingle()

    if (checklist) {
      const { data: checklistItems } = await db
        .from('packing_checklist_items')
        .select('item_name, category')
        .eq('checklist_id', checklist.id)

      for (const ci of checklistItems ?? []) {
        const key = ci.item_name.toLowerCase()
        if (!items.some((i) => i.name.toLowerCase() === key)) {
          items.push({ name: ci.item_name, category: ci.category ?? 'other' })
        }
      }
    }

    itemsByEvent.set(ev.id, items)
  }

  // Find items appearing in 2+ events' packing lists
  const itemToEvents = new Map<string, { eventId: string; eventName: string; category: string }[]>()

  for (const [eventId, items] of itemsByEvent.entries()) {
    const evName = eventMeta.find((e) => e.id === eventId)?.name ?? 'Event'
    for (const item of items) {
      const key = item.name.toLowerCase().replace(/\s*\(x\d+\)\s*$/, '')
      if (!itemToEvents.has(key)) itemToEvents.set(key, [])
      itemToEvents.get(key)!.push({
        eventId,
        eventName: evName,
        category: item.category,
      })
    }
  }

  const conflicts: EquipmentConflict[] = []

  for (const [itemKey, eventRefs] of itemToEvents.entries()) {
    if (eventRefs.length < 2) continue

    const eventNames = eventRefs.map((er) => er.eventName)
    const eventIds = eventRefs.map((er) => er.eventId)

    const relevantEvents = eventMeta.filter((e) => eventIds.includes(e.id))
    let hasOverlap = false
    for (let i = 0; i < relevantEvents.length; i++) {
      for (let j = i + 1; j < relevantEvents.length; j++) {
        if (eventsOverlap(relevantEvents[i], relevantEvents[j])) {
          hasOverlap = true
          break
        }
      }
      if (hasOverlap) break
    }

    let resolution: EquipmentConflict['resolution']
    if (!hasOverlap) {
      resolution = 'stagger'
    } else if (isUniqueItem(itemKey)) {
      resolution = 'rent'
    } else {
      resolution = 'split'
    }

    const displayName = itemKey.charAt(0).toUpperCase() + itemKey.slice(1)

    conflicts.push({
      itemName: displayName,
      category: eventRefs[0].category,
      events: eventRefs.map((er) => ({
        eventId: er.eventId,
        eventName: er.eventName,
        date,
      })),
      resolution,
      suggestion: buildSuggestion(displayName, resolution, eventNames),
    })
  }

  return {
    date,
    events: eventMeta.map((e) => ({
      id: e.id,
      name: e.name,
      startTime: e.arrivalTime,
      endTime: e.serveTime,
    })),
    conflicts,
    noConflicts: conflicts.length === 0,
  }
}

export async function getUpcomingEquipmentConflicts(days = 14): Promise<DayConflictReport[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const future = new Date(today)
  future.setDate(future.getDate() + days)

  const { data: events } = await db
    .from('events')
    .select('id, event_date')
    .eq('tenant_id', tenantId)
    .not('status', 'eq', 'cancelled')
    .gte('event_date', today.toISOString())
    .lte('event_date', future.toISOString())
    .order('event_date', { ascending: true })

  if (!events || events.length < 2) return []

  const byDate = new Map<string, number>()
  for (const ev of events) {
    const key = dateToDateString(ev.event_date as Date | string)
    byDate.set(key, (byDate.get(key) ?? 0) + 1)
  }

  const multiEventDates = Array.from(byDate.entries())
    .filter(([, count]) => count >= 2)
    .map(([date]) => date)
    .sort()

  if (multiEventDates.length === 0) return []

  const reports: DayConflictReport[] = []
  for (const date of multiEventDates) {
    const report = await getEquipmentConflicts(date)
    if (!report.noConflicts) {
      reports.push(report)
    }
  }

  return reports
}
