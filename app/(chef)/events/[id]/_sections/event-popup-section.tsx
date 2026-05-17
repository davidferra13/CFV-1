// Server component: pop-up operating panel
import { requireChef } from '@/lib/auth/get-user'
import { getEventTicketTypes, getEventTickets } from '@/lib/tickets/actions'
import { createServerClient } from '@/lib/db/server'
import { EventDetailSection } from '@/components/events/event-detail-mobile-nav'
import {
  PopUpOperatingPanel,
  type PopUpOperatingSnapshot,
} from '@/components/events/pop-up-operating-panel'
import {
  normalizePopUpConfig,
  type PopUpConfig,
  type PopUpMenuItemPlan,
  type PopUpProductLibraryItem,
} from '@/components/events/pop-up-model'

async function getRawCircleConfigForEvent(eventId: string): Promise<Record<string, unknown>> {
  const db: any = createServerClient({ admin: true })
  const { data } = await db
    .from('event_share_settings')
    .select('circle_config')
    .eq('event_id', eventId)
    .maybeSingle()
  return data?.circle_config && typeof data.circle_config === 'object'
    ? (data.circle_config as Record<string, unknown>)
    : {}
}

async function getPopUpProductLibrary(tenantId: string): Promise<PopUpProductLibraryItem[]> {
  const db: any = createServerClient()
  const { data } = await db
    .from('dish_index_summary')
    .select(
      'id, name, course, linked_recipe_id, recipe_name, season_affinity, tags, prep_complexity, times_served, avg_rating, per_portion_cost_cents'
    )
    .eq('tenant_id', tenantId)
    .eq('archived', false)
    .order('times_served', { ascending: false })
    .limit(30)

  const rows = (data ?? []) as any[]
  const ids = rows.map((row) => row.id).filter(Boolean)
  const equipmentById = new Map<string, string[]>()

  if (ids.length > 0) {
    const { data: dishRows } = await db
      .from('dish_index')
      .select('id, special_equipment')
      .eq('tenant_id', tenantId)
      .in('id', ids)

    for (const row of (dishRows ?? []) as any[]) {
      equipmentById.set(row.id, Array.isArray(row.special_equipment) ? row.special_equipment : [])
    }
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    course: row.course ?? null,
    recipeId: row.linked_recipe_id ?? null,
    recipeName: row.recipe_name ?? null,
    seasonTags: [...(row.season_affinity ?? []), ...(row.tags ?? [])].filter(Boolean),
    specialEquipment: equipmentById.get(row.id) ?? [],
    prepComplexity: row.prep_complexity ?? null,
    timesServed: Number(row.times_served ?? 0),
    avgRating: Number(row.avg_rating ?? 0),
    unitCostCents:
      row.per_portion_cost_cents === null || row.per_portion_cost_cents === undefined
        ? null
        : Number(row.per_portion_cost_cents),
  }))
}

function extractPopUpSource(ticket: any): string {
  const notes = String(ticket.notes ?? '')
  const match = notes.match(/Pop-Up source:\s*([^|]+)/i)
  if (match?.[1]) return match[1].trim()
  if (ticket.source === 'chefflow') return 'online'
  return ticket.source ?? 'online'
}

function buildPopUpOperatingSnapshot(input: {
  event: any
  config: PopUpConfig
  ticketTypes: any[]
  tickets: any[]
  productLibrary: PopUpProductLibraryItem[]
}): PopUpOperatingSnapshot {
  const ticketTypesById = new Map(
    input.ticketTypes.map((ticketType) => [ticketType.id, ticketType])
  )
  const productById = new Map(input.productLibrary.map((product) => [product.id, product]))
  const ticketSoldByType = new Map<string, number>()
  const ticketsByType = new Map<string, any[]>()
  const paidTickets = input.tickets.filter((ticket) => ticket.payment_status === 'paid')

  for (const ticket of paidTickets) {
    if (!ticket.ticket_type_id) continue
    ticketSoldByType.set(
      ticket.ticket_type_id,
      (ticketSoldByType.get(ticket.ticket_type_id) ?? 0) + Number(ticket.quantity ?? 0)
    )
    const list = ticketsByType.get(ticket.ticket_type_id) ?? []
    list.push(ticket)
    ticketsByType.set(ticket.ticket_type_id, list)
  }

  const plannedItems = input.config.menuItems
  const plannedTicketIds = new Set(plannedItems.map((item) => item.ticketTypeId).filter(Boolean))
  const ticketOnlyItems: PopUpMenuItemPlan[] = input.ticketTypes
    .filter((ticketType) => ticketType.is_active && !plannedTicketIds.has(ticketType.id))
    .map((ticketType) => ({
      ticketTypeId: ticketType.id,
      dishIndexId: null,
      recipeId: null,
      name: ticketType.name,
      plannedUnits: ticketType.capacity ?? Math.max(ticketType.sold_count ?? 0, 24),
      priceCents: ticketType.price_cents,
      unitCostCents: null,
      batchSize: null,
      equipmentNeeded: [],
      productionStatus: 'not_started' as const,
    }))

  const bufferPercent =
    input.config.dropType === 'cafe_collab'
      ? 10
      : input.config.dropType === 'private_dessert_event'
        ? 5
        : 15
  const now = new Date()
  const closeDate = input.config.preorderClosesAt ? new Date(input.config.preorderClosesAt) : null
  const daysUntilClose =
    closeDate && Number.isFinite(closeDate.getTime())
      ? Math.max(0, Math.ceil((closeDate.getTime() - now.getTime()) / 86400000))
      : 0

  const menuItems = [...plannedItems, ...ticketOnlyItems].map((item) => {
    const ticketType = item.ticketTypeId ? ticketTypesById.get(item.ticketTypeId) : null
    const itemTickets = item.ticketTypeId ? (ticketsByType.get(item.ticketTypeId) ?? []) : []
    const soldUnits = ticketType?.sold_count ?? ticketSoldByType.get(item.ticketTypeId ?? '') ?? 0
    const plannedUnits = item.plannedUnits ?? ticketType?.capacity ?? 24
    const remainingUnits =
      ticketType?.capacity === null || ticketType?.capacity === undefined
        ? Math.max(0, plannedUnits - soldUnits)
        : Math.max(0, Number(ticketType.capacity) - soldUnits)
    const firstTicketTime = itemTickets.length
      ? Math.min(...itemTickets.map((ticket) => new Date(ticket.created_at).getTime()))
      : now.getTime()
    const sellingDays = Math.max(1, Math.ceil((now.getTime() - firstTicketTime) / 86400000))
    const averageUnitsPerDay = soldUnits / sellingDays
    const velocityUnits = soldUnits + Math.max(0, Math.round(daysUntilClose * averageUnitsPerDay))
    const product = item.dishIndexId ? productById.get(item.dishIndexId) : null
    const baseUnits =
      product && product.timesServed > 0 ? input.event.guest_count || 24 : plannedUnits || 24
    const suggestedUnits = Math.max(
      1,
      Math.ceil(Math.max(baseUnits, velocityUnits) * (1 + bufferPercent / 100))
    )
    const priceCents = item.priceCents ?? ticketType?.price_cents ?? 0
    const unitCostCents = item.unitCostCents ?? product?.unitCostCents ?? null
    const marginPercent =
      unitCostCents === null || priceCents <= 0
        ? null
        : Math.round(((priceCents - unitCostCents) / priceCents) * 100)

    return {
      name: item.name,
      ticketTypeId: item.ticketTypeId ?? null,
      dishIndexId: item.dishIndexId ?? null,
      recipeId: item.recipeId ?? product?.recipeId ?? null,
      plannedUnits,
      producedUnits:
        input.config.closeout?.itemResults.find((result) => result.name === item.name)
          ?.producedUnits ?? 0,
      soldUnits,
      remainingUnits,
      suggestedUnits,
      priceCents,
      unitCostCents,
      marginPercent,
      sellThroughPercent: plannedUnits > 0 ? Math.round((soldUnits / plannedUnits) * 100) : 0,
      productionStatus: item.productionStatus ?? 'not_started',
      forecastReason:
        product && product.timesServed > 0
          ? `Based on ${product.timesServed} prior serves, ${soldUnits} sold, ${bufferPercent}% buffer.`
          : `Uses planned units, ${soldUnits} sold, preorder velocity, and ${bufferPercent}% buffer.`,
      batchSize: item.batchSize ?? null,
      equipmentNeeded: item.equipmentNeeded ?? product?.specialEquipment ?? [],
    }
  })

  const orderRows = paidTickets.map((ticket) => ({
    id: ticket.id,
    ticketTypeId: ticket.ticket_type_id ?? null,
    itemName: ticket.ticket_type?.name ?? ticket.event_ticket_types?.name ?? 'Unassigned',
    buyerName: ticket.buyer_name ?? 'Guest',
    quantity: Number(ticket.quantity ?? 0),
    totalCents: Number(ticket.total_cents ?? 0),
    source: extractPopUpSource(ticket),
    createdAt: ticket.created_at,
  }))
  const bySource = orderRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.source] = (acc[row.source] ?? 0) + row.quantity
    return acc
  }, {})
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
  const availableEquipment = new Set(
    (input.config.locationProfile?.equipmentAvailable ?? []).map((item: string) =>
      item.toLowerCase()
    )
  )
  const locationWarnings = menuItems.flatMap((item) =>
    item.equipmentNeeded
      .filter((eq: string) => !availableEquipment.has(eq.toLowerCase()))
      .map((eq: string) => `${item.name} needs ${eq}, not listed at location.`)
  )
  const coldHoldUnits = menuItems
    .filter((item) =>
      item.equipmentNeeded.some((eq: string) => /cold|freezer|fridge|refriger/i.test(eq))
    )
    .reduce((sum, item) => sum + item.plannedUnits, 0)
  if (
    input.config.locationProfile?.coldStorage?.toLowerCase().includes('limited') &&
    coldHoldUnits > 36
  ) {
    locationWarnings.push(`${coldHoldUnits} planned cold-hold units exceed limited storage.`)
  }

  const batchWarnings = menuItems.flatMap((item) => {
    const warnings: string[] = []
    if (item.unitCostCents === null) warnings.push(`${item.name} is missing unit cost.`)
    if (!item.recipeId) warnings.push(`${item.name} is missing a linked recipe.`)
    if (!item.batchSize) warnings.push(`${item.name} needs a batch size.`)
    return warnings
  })
  const closeoutItems = input.config.closeout?.itemResults ?? []
  const closeoutSold = closeoutItems.reduce((sum, item) => sum + item.soldUnits, 0)
  const closeoutProduced = closeoutItems.reduce((sum, item) => sum + item.producedUnits, 0)
  const wasteUnits = closeoutItems.reduce((sum, item) => sum + item.wastedUnits, 0)
  const topItem =
    closeoutItems.length > 0
      ? ([...closeoutItems].sort((a, b) => b.soldUnits - a.soldUnits)[0]?.name ?? null)
      : null

  return {
    event: {
      id: input.event.id,
      title: input.event.occasion || input.event.title || 'Untitled Event',
      date: input.event.event_date ?? null,
      status: input.event.status,
      location:
        input.event.location || input.event.location_name || input.event.location_address || null,
    },
    stage: input.config.stage,
    nextActions: [
      menuItems.length === 0
        ? {
            id: 'menu',
            label: 'Add products to the menu',
            href: '#popup-menu',
            severity: 'critical' as const,
          }
        : null,
      menuItems.some((item) => !item.ticketTypeId)
        ? {
            id: 'tickets',
            label: 'Sync menu items to ticket inventory',
            href: '#popup-menu',
            severity: 'warning' as const,
          }
        : null,
      locationWarnings.length > 0
        ? {
            id: 'location',
            label: 'Resolve location constraints',
            href: '#popup-location',
            severity: 'warning' as const,
          }
        : null,
      input.config.stage === 'closed'
        ? {
            id: 'closeout',
            label: 'Capture closeout results',
            href: '#popup-closeout',
            severity: 'info' as const,
          }
        : null,
    ].filter(Boolean) as PopUpOperatingSnapshot['nextActions'],
    menuItems,
    orderRows,
    orders: {
      totalOrders: paidTickets.length,
      totalUnits: orderRows.reduce((sum, row) => sum + row.quantity, 0),
      revenueCents: orderRows.reduce((sum, row) => sum + row.totalCents, 0),
      bySource,
      pickupWindows: (input.config.pickupWindows ?? []).map((label) => ({
        label,
        orderCount: 0,
        unitCount: 0,
      })),
    },
    production: {
      totalPlannedUnits,
      totalSoldUnits,
      totalRemainingUnits,
      estimatedIngredientCostCents,
      estimatedMarginCents: estimatedRevenueCents - estimatedIngredientCostCents,
      batchWarnings,
      locationWarnings,
    },
    closeout:
      closeoutItems.length > 0
        ? {
            sellThroughPercent:
              closeoutProduced > 0 ? Math.round((closeoutSold / closeoutProduced) * 100) : 0,
            wasteUnits,
            wasteCostCents: closeoutItems.reduce((sum, item) => sum + item.estimatedCostCents, 0),
            topItem,
            underperformers: closeoutItems
              .filter((item) => item.producedUnits > 0 && item.soldUnits / item.producedUnits < 0.6)
              .map((item) => item.name),
          }
        : undefined,
  }
}

type Props = {
  eventId: string
  tenantId: string
  event: any
  activeTab: string
}

export async function EventPopUpSection({ eventId, tenantId, event, activeTab }: Props) {
  const [rawCircleConfig, ticketTypes, ticketList, popUpProductLibrary] = await Promise.all([
    getRawCircleConfigForEvent(eventId).catch(() => ({})),
    getEventTicketTypes(eventId).catch(() => []),
    getEventTickets(eventId).catch(() => []),
    getPopUpProductLibrary(tenantId).catch(() => []),
  ])

  const popUpConfig = normalizePopUpConfig((rawCircleConfig as any).popUp ?? null)
  const popUpSnapshot = buildPopUpOperatingSnapshot({
    event,
    config: popUpConfig,
    ticketTypes: ticketTypes as any[],
    tickets: ticketList as any[],
    productLibrary: popUpProductLibrary,
  })

  return (
    <EventDetailSection tab="popup" activeTab={activeTab as any}>
      <PopUpOperatingPanel
        initialConfig={popUpConfig}
        snapshot={popUpSnapshot}
        productLibrary={popUpProductLibrary}
      />
    </EventDetailSection>
  )
}
