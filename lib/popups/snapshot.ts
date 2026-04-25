import { forecastPopUpMenuItem } from './forecast'
import type {
  PopUpConfig,
  PopUpDishSummarySnapshotSource,
  PopUpEventSnapshotSource,
  PopUpHistoricalDemandSource,
  PopUpOperatingSnapshot,
  PopUpTicketSnapshotSource,
  PopUpTicketTypeSnapshotSource,
} from './types'

type BuildPopUpOperatingSnapshotInput = {
  event: PopUpEventSnapshotSource
  config: PopUpConfig
  ticketTypes: PopUpTicketTypeSnapshotSource[]
  tickets: PopUpTicketSnapshotSource[]
  dishSummaries?: PopUpDishSummarySnapshotSource[]
  historicalDemand?: PopUpHistoricalDemandSource[]
  now?: Date
}

const ACTIVE_ORDER_STATUSES = new Set(['paid', 'pending'])

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 100)
}

function locationText(event: PopUpEventSnapshotSource): string | null {
  return (
    [event.location, event.location_address, event.location_city, event.location_state]
      .filter(Boolean)
      .join(', ') || null
  )
}

function sourceFromTicket(ticket: PopUpTicketSnapshotSource): string {
  const noteSource = ticket.notes?.match(/\[popup_source:([a-z_]+)\]/)?.[1]
  if (noteSource) return noteSource
  if (ticket.source === 'chefflow') return 'online'
  if (ticket.source === 'walkin') return 'walkup'
  return ticket.source ?? 'unknown'
}

function historicalByDishId(history: PopUpHistoricalDemandSource[]) {
  const map = new Map<string, number[]>()
  for (const row of history) {
    if (!row.dishIndexId) continue
    map.set(row.dishIndexId, [...(map.get(row.dishIndexId) ?? []), row.soldUnits])
  }
  return map
}

function buildNextActions(
  input: BuildPopUpOperatingSnapshotInput
): PopUpOperatingSnapshot['nextActions'] {
  const actions: PopUpOperatingSnapshot['nextActions'] = []
  const eventId = input.event.id

  if (!input.config.menuItems.length) {
    actions.push({
      id: 'add-menu-items',
      label: 'Add pop-up menu items',
      href: `/events/${eventId}?tab=popup`,
      severity: 'critical',
    })
  }
  if (!input.ticketTypes.length) {
    actions.push({
      id: 'sync-ticket-types',
      label: 'Sync menu items to ticket inventory',
      href: `/events/${eventId}?tab=tickets`,
      severity: 'warning',
    })
  }
  if (!input.config.productionLocksAt && input.config.stage !== 'concept') {
    actions.push({
      id: 'set-production-lock',
      label: 'Set production lock time',
      severity: 'warning',
    })
  }
  if (input.config.stage === 'closed' && !input.config.closeout?.itemResults.length) {
    actions.push({
      id: 'capture-closeout',
      label: 'Capture sell-through and waste',
      href: `/events/${eventId}?tab=wrap`,
      severity: 'critical',
    })
  }
  if (!actions.length) {
    actions.push({
      id: 'monitor-orders',
      label: 'Monitor orders and production status',
      href: `/events/${eventId}?tab=popup`,
      severity: 'info',
    })
  }

  return actions
}

function locationWarnings(input: BuildPopUpOperatingSnapshotInput): string[] {
  const warnings: string[] = []
  const profile = input.config.locationProfile
  const available = new Set((profile?.equipmentAvailable ?? []).map((item) => item.toLowerCase()))

  for (const item of input.config.menuItems) {
    for (const equipment of item.equipmentNeeded ?? []) {
      if (!available.has(equipment.toLowerCase())) {
        warnings.push(`${item.name} needs ${equipment}, but it is not listed at this location.`)
      }
    }
  }

  const coldStorage = profile?.coldStorage?.toLowerCase() ?? ''
  const limitedColdStorage =
    coldStorage.includes('limited') ||
    coldStorage.includes('small') ||
    (profile?.holdingConstraints ?? []).some((constraint) =>
      constraint.toLowerCase().includes('cold')
    )
  const coldHoldUnits = input.config.menuItems
    .filter((item) =>
      [...(item.constraints ?? []), ...(item.equipmentNeeded ?? [])].some((value) =>
        value.toLowerCase().includes('cold')
      )
    )
    .reduce((sum, item) => sum + item.plannedUnits, 0)

  if (limitedColdStorage && coldHoldUnits > 48) {
    warnings.push(`Limited cold storage flagged with ${coldHoldUnits} planned cold-hold units.`)
  }

  return [...new Set(warnings)]
}

export function buildPopUpOperatingSnapshot(
  input: BuildPopUpOperatingSnapshotInput
): PopUpOperatingSnapshot {
  const ticketTypesById = new Map(
    input.ticketTypes.map((ticketType) => [ticketType.id, ticketType])
  )
  const activeTickets = input.tickets.filter((ticket) =>
    ACTIVE_ORDER_STATUSES.has(ticket.payment_status)
  )
  const paidTickets = input.tickets.filter((ticket) => ticket.payment_status === 'paid')
  const dishById = new Map((input.dishSummaries ?? []).map((dish) => [dish.id, dish]))
  const history = historicalByDishId(input.historicalDemand ?? [])
  const locationWarningList = locationWarnings(input)

  const menuItems = input.config.menuItems.map((item) => {
    const ticketType = item.ticketTypeId ? ticketTypesById.get(item.ticketTypeId) : null
    const matchingTicketType =
      ticketType ?? input.ticketTypes.find((candidate) => candidate.name === item.name) ?? null
    const dishSummary = item.dishIndexId ? dishById.get(item.dishIndexId) : null
    const itemTickets = activeTickets.filter(
      (ticket) => ticket.ticket_type_id && ticket.ticket_type_id === matchingTicketType?.id
    )
    const currentSoldUnits =
      matchingTicketType?.sold_count ??
      itemTickets.reduce((sum, ticket) => sum + Math.max(0, ticket.quantity), 0)
    const plannedUnits = matchingTicketType?.capacity ?? item.plannedUnits
    const priceCents = item.priceCents ?? matchingTicketType?.price_cents ?? 0
    const unitCostCents = item.unitCostCents ?? dishSummary?.per_portion_cost_cents ?? null
    const forecast = forecastPopUpMenuItem({
      item: { ...item, plannedUnits },
      dropType: input.config.dropType,
      eventGuestCount: input.event.guest_count ?? null,
      preorderOpensAt: input.config.preorderOpensAt,
      preorderClosesAt: input.config.preorderClosesAt,
      now: input.now,
      currentSoldUnits,
      historicalSoldUnits: item.dishIndexId ? history.get(item.dishIndexId) : [],
      dishTimesServed: dishSummary?.times_served ?? null,
    })
    const closeoutItem = input.config.closeout?.itemResults.find(
      (result) => result.name === item.name
    )
    const producedUnits = closeoutItem?.producedUnits ?? 0
    const remainingUnits = Math.max(0, plannedUnits - currentSoldUnits)
    const marginPercent =
      priceCents > 0 && unitCostCents !== null
        ? Math.round(((priceCents - unitCostCents) / priceCents) * 100)
        : null

    return {
      name: item.name,
      ticketTypeId: matchingTicketType?.id ?? item.ticketTypeId ?? null,
      dishIndexId: item.dishIndexId ?? null,
      plannedUnits,
      producedUnits,
      soldUnits: currentSoldUnits,
      remainingUnits,
      suggestedUnits: forecast.suggestedUnits,
      priceCents,
      unitCostCents,
      marginPercent,
      sellThroughPercent: pct(currentSoldUnits, plannedUnits),
      productionStatus: item.productionStatus ?? 'not_started',
      forecastReason: forecast.reason,
    }
  })

  const bySource: Record<string, number> = {}
  for (const ticket of activeTickets) {
    const source = sourceFromTicket(ticket)
    bySource[source] = (bySource[source] ?? 0) + Math.max(0, ticket.quantity)
  }

  const pickupWindows = (input.config.pickupWindows ?? []).map((label) => {
    const windowTickets = activeTickets.filter((ticket) =>
      ticket.notes?.includes(`[pickup:${label}]`)
    )
    return {
      label,
      orderCount: windowTickets.length,
      unitCount: windowTickets.reduce((sum, ticket) => sum + Math.max(0, ticket.quantity), 0),
    }
  })

  const totalPlannedUnits = menuItems.reduce((sum, item) => sum + item.plannedUnits, 0)
  const totalSoldUnits = menuItems.reduce((sum, item) => sum + item.soldUnits, 0)
  const totalRemainingUnits = menuItems.reduce((sum, item) => sum + item.remainingUnits, 0)
  const estimatedIngredientCostCents = menuItems.reduce(
    (sum, item) => sum + (item.unitCostCents ?? 0) * item.plannedUnits,
    0
  )
  const estimatedRevenueCents = menuItems.reduce(
    (sum, item) => sum + item.priceCents * item.plannedUnits,
    0
  )
  const batchWarnings = menuItems.flatMap((item) => {
    const sourceItem = input.config.menuItems.find((candidate) => candidate.name === item.name)
    const warnings: string[] = []
    if (item.unitCostCents === null) warnings.push(`${item.name} is missing unit cost.`)
    if (!sourceItem?.recipeId) warnings.push(`${item.name} is missing a linked recipe.`)
    if (sourceItem?.batchSize && item.plannedUnits % sourceItem.batchSize !== 0) {
      warnings.push(
        `${item.name} does not divide cleanly into ${sourceItem.batchSize}-unit batches.`
      )
    }
    return warnings
  })

  const closeoutItems = input.config.closeout?.itemResults ?? []
  const closeout = closeoutItems.length
    ? {
        sellThroughPercent: pct(
          closeoutItems.reduce((sum, item) => sum + item.soldUnits, 0),
          closeoutItems.reduce((sum, item) => sum + item.producedUnits, 0)
        ),
        wasteUnits: closeoutItems.reduce((sum, item) => sum + item.wastedUnits, 0),
        wasteCostCents: closeoutItems.reduce((sum, item) => {
          if (item.producedUnits <= 0) return sum
          return sum + Math.round((item.estimatedCostCents / item.producedUnits) * item.wastedUnits)
        }, 0),
        topItem:
          [...closeoutItems].sort(
            (a, b) => b.soldUnits - a.soldUnits || b.revenueCents - a.revenueCents
          )[0]?.name ?? null,
        underperformers: closeoutItems
          .filter((item) => item.producedUnits > 0 && pct(item.soldUnits, item.producedUnits) < 70)
          .map((item) => item.name),
      }
    : undefined

  return {
    event: {
      id: input.event.id,
      title: input.event.title ?? input.event.occasion ?? 'Pop-up',
      date: input.event.event_date ?? null,
      status: input.event.status ?? 'draft',
      location: locationText(input.event),
    },
    stage: input.config.stage,
    nextActions: buildNextActions(input),
    menuItems,
    orders: {
      totalOrders: activeTickets.length,
      totalUnits: activeTickets.reduce((sum, ticket) => sum + Math.max(0, ticket.quantity), 0),
      revenueCents: paidTickets.reduce((sum, ticket) => sum + Math.max(0, ticket.total_cents), 0),
      bySource,
      pickupWindows,
    },
    production: {
      totalPlannedUnits,
      totalSoldUnits,
      totalRemainingUnits,
      estimatedIngredientCostCents,
      estimatedMarginCents: Math.max(0, estimatedRevenueCents - estimatedIngredientCostCents),
      batchWarnings,
      locationWarnings: locationWarningList,
    },
    closeout,
  }
}
