import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

/**
 * Surfaces equipment conflicts on upcoming multi-event days.
 * Scans the next 14 days for days with 2+ events sharing packing list items.
 * Critical (unique item at overlapping events) = p1, splittable = p2.
 */
export async function resolveEquipmentConflicts(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let multiEventDates: { eventDate: string; eventCount: number }[]

  try {
    const result = await pgClient`
      SELECT
        e.event_date::date::text as "eventDate",
        COUNT(*)::int as "eventCount"
      FROM events e
      WHERE e.tenant_id = ${ctx.tenantId}
        AND e.status NOT IN ('completed', 'cancelled', 'archived')
        AND e.event_date IS NOT NULL
        AND e.event_date >= CURRENT_DATE
        AND e.event_date <= (CURRENT_DATE + INTERVAL '14 days')::date
      GROUP BY e.event_date::date
      HAVING COUNT(*) >= 2
      ORDER BY e.event_date::date ASC
    `
    multiEventDates = result as unknown as typeof multiEventDates
  } catch (err) {
    console.error('[equipment-conflict-resolver] Multi-event query failed:', err)
    return []
  }

  if (multiEventDates.length === 0) return []

  const items: GodModeResolvedItem[] = []

  for (const med of multiEventDates) {
    const dateStr = med.eventDate.slice(0, 10)

    let eventRows: {
      eventId: string
      occasion: string | null
      clientName: string | null
      arrivalTime: string | null
      serveTime: string | null
    }[]

    try {
      const evResult = await pgClient`
        SELECT
          e.id as "eventId",
          e.occasion,
          c.full_name as "clientName",
          e.arrival_time as "arrivalTime",
          e.serve_time as "serveTime"
        FROM events e
        LEFT JOIN clients c ON c.id = e.client_id
        WHERE e.tenant_id = ${ctx.tenantId}
          AND e.status NOT IN ('completed', 'cancelled', 'archived')
          AND e.event_date::date = ${dateStr}::date
        ORDER BY e.serve_time ASC NULLS LAST
      `
      eventRows = evResult as unknown as typeof eventRows
    } catch (err) {
      console.error('[equipment-conflict-resolver] Event query failed:', err)
      continue
    }

    if (eventRows.length < 2) continue

    // Collect packing items per event from both systems
    const itemsByEvent = new Map<string, Set<string>>()

    for (const ev of eventRows) {
      const itemNames = new Set<string>()

      try {
        // Newer packing system
        const packingResult = await pgClient`
          SELECT epi.name
          FROM event_packing_items epi
          JOIN event_packing_lists epl ON epl.id = epi.packing_list_id
          WHERE epl.event_id = ${ev.eventId}
            AND epl.tenant_id = ${ctx.tenantId}
        `
        for (const row of packingResult) {
          itemNames.add((row as any).name?.toLowerCase().replace(/\s*\(x\d+\)\s*$/, '') ?? '')
        }
      } catch {
        // Table may not exist yet
      }

      try {
        // Older packing system
        const checklistResult = await pgClient`
          SELECT pci.item_name
          FROM packing_checklist_items pci
          JOIN packing_checklists pc ON pc.id = pci.checklist_id
          WHERE pc.event_id = ${ev.eventId}
            AND pc.chef_id = ${ctx.tenantId}
        `
        for (const row of checklistResult) {
          itemNames.add((row as any).item_name?.toLowerCase().replace(/\s*\(x\d+\)\s*$/, '') ?? '')
        }
      } catch {
        // Table may not exist yet
      }

      itemsByEvent.set(ev.eventId, itemNames)
    }

    // Find shared items across events
    const allItems = new Map<string, string[]>()
    for (const [eventId, names] of itemsByEvent.entries()) {
      for (const name of names) {
        if (!name) continue
        if (!allItems.has(name)) allItems.set(name, [])
        allItems.get(name)!.push(eventId)
      }
    }

    const UNIQUE_ITEMS = new Set([
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

    for (const [itemName, eventIds] of allItems.entries()) {
      if (eventIds.length < 2) continue

      const eventNames = eventIds.map((eid) => {
        const ev = eventRows.find((e) => e.eventId === eid)
        return ev?.occasion ?? ev?.clientName ?? 'Event'
      })

      // Check time overlap between the events that share this item
      const relevantEvents = eventIds.map((eid) => eventRows.find((e) => e.eventId === eid)!)
      let hasOverlap = false
      for (let i = 0; i < relevantEvents.length && !hasOverlap; i++) {
        for (let j = i + 1; j < relevantEvents.length && !hasOverlap; j++) {
          const a = relevantEvents[i]
          const b = relevantEvents[j]
          const aStart = a.arrivalTime ?? a.serveTime
          const aEnd = a.serveTime ?? a.arrivalTime
          const bStart = b.arrivalTime ?? b.serveTime
          const bEnd = b.serveTime ?? b.arrivalTime
          if (!aStart || !aEnd || !bStart || !bEnd) {
            hasOverlap = true
          } else {
            hasOverlap = aStart <= bEnd && bStart <= aEnd
          }
        }
      }

      const isUnique = UNIQUE_ITEMS.has(itemName)
      const isCritical = hasOverlap && isUnique
      const tier: RailTier = isCritical ? 'p1' : 'p2'

      const displayName = itemName.charAt(0).toUpperCase() + itemName.slice(1)
      const label = `Equipment conflict: ${displayName} needed at ${eventIds.length} events on ${dateStr}`

      let context: string
      if (!hasOverlap) {
        context = `Use for ${eventNames[0]} first, then transport to ${eventNames[1]}`
      } else if (isUnique) {
        context = `Rent a second ${displayName} for the overlapping event`
      } else {
        context = `Split ${displayName} quantity across ${eventIds.length} events`
      }

      items.push({
        definitionId: `chef.equipment_conflict.${dateStr}.${itemName.replace(/\s+/g, '_')}`,
        tier,
        label,
        context,
        destination: `/chef/schedule?date=${dateStr}`,
        icon: 'alert-triangle',
        loopState: 'active',
        sourceKind: 'event',
        evidenceLabel: 'computed',
        confidence: isCritical ? 0.9 : 0.7,
        nextAction: isCritical ? 'Arrange backup equipment' : 'Review packing allocation',
        data: {
          date: dateStr,
          itemName,
          eventIds,
          resolution: !hasOverlap ? 'stagger' : isUnique ? 'rent' : 'split',
        },
      })
    }
  }

  return items
}
