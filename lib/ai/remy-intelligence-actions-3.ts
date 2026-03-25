'use server'

// Remy Intelligence Actions - Batch 3
// Fills the remaining gaps: Circles, Rate Card, Tasks, Travel, Commerce,
// Daily Ops, Queue, Stations, Testimonials, Partners, Activity, AAR, Waitlist.
// PRIVACY: All queries are tenant-scoped via requireChef(). Financial data stays local.
// FORMULA > AI: Everything here is deterministic - no LLM calls.

import { requireChef } from '@/lib/auth/get-user'

// ─── Hub Circles Intelligence ────────────────────────────────────────────────

export async function executeCirclesList() {
  const { getChefCircles } = await import('@/lib/hub/chef-circle-actions')
  const circles = await getChefCircles()
  return {
    circles: circles.map((c) => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      memberCount: c.member_count,
      unreadCount: c.unread_count,
      lastActivity: c.last_message_at,
      groupType: c.group_type,
    })),
    totalCircles: circles.length,
    totalUnread: circles.reduce((sum, c) => sum + (c.unread_count ?? 0), 0),
  }
}

export async function executeCirclesUnread() {
  const { getCirclesUnreadCount } = await import('@/lib/hub/chef-circle-actions')
  const count = await getCirclesUnreadCount()
  return { unreadCount: count }
}

export async function executeCircleEvents(inputs: Record<string, unknown>) {
  const groupId = String(inputs.groupId ?? inputs.circleName ?? '')
  if (!groupId) return { error: 'Please specify a circle name or ID.' }
  const resolved = await resolveCircleId(groupId)
  if (!resolved) return { error: `Could not find circle "${groupId}".` }
  const { getCircleEvents } = await import('@/lib/hub/chef-circle-actions')
  const events = await getCircleEvents(resolved)
  return { events, count: events.length }
}

// ─── Rate Card Intelligence ──────────────────────────────────────────────────

export async function executeRateCard() {
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()

  // Pull chef pricing data + recent event pricing for rate analysis
  const [{ data: chef }, { data: recentEvents }] = await Promise.all([
    db
      .from('chefs')
      .select('business_name, default_rate_cents, service_types, pricing_notes')
      .eq('id', user.entityId)
      .single(),
    db
      .from('events')
      .select('id, occasion, guest_count, status, event_date')
      .eq('tenant_id', user.tenantId!)
      .not('status', 'eq', 'cancelled')
      .order('event_date', { ascending: false })
      .limit(20),
  ])

  // Get ledger totals for recent events to compute avg per-head
  const eventIds = (recentEvents ?? []).map((e: any) => e.id)
  let avgPerHeadCents = 0
  if (eventIds.length > 0) {
    const { data: ledger } = await db
      .from('ledger_entries')
      .select('event_id, amount_cents')
      .eq('tenant_id', user.tenantId!)
      .eq('entry_type', 'payment')
      .in('event_id', eventIds)

    const revenueByEvent = new Map<string, number>()
    for (const entry of ledger ?? []) {
      const eid = entry.event_id as string
      revenueByEvent.set(eid, (revenueByEvent.get(eid) ?? 0) + (entry.amount_cents as number))
    }

    let totalRevenue = 0
    let totalGuests = 0
    for (const evt of recentEvents ?? []) {
      const rev = revenueByEvent.get(evt.id as string) ?? 0
      const guests = (evt.guest_count as number) ?? 0
      if (rev > 0 && guests > 0) {
        totalRevenue += rev
        totalGuests += guests
      }
    }
    if (totalGuests > 0) avgPerHeadCents = Math.round(totalRevenue / totalGuests)
  }

  return {
    businessName: chef?.business_name ?? null,
    defaultRateCents: chef?.default_rate_cents ?? null,
    serviceTypes: chef?.service_types ?? [],
    pricingNotes: chef?.pricing_notes ?? null,
    avgPerHeadCents,
    recentEventCount: recentEvents?.length ?? 0,
  }
}

// ─── Tasks / Kanban Intelligence ─────────────────────────────────────────────

export async function executeTasksList(inputs: Record<string, unknown>) {
  const { listTasks } = await import('@/lib/tasks/actions')
  const status = inputs.status as 'pending' | 'in_progress' | 'done' | undefined
  const tasks = await listTasks(status ? { status } : undefined)
  return {
    tasks: (tasks ?? []).slice(0, 20).map((t: any) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.due_date,
      assignedTo: t.assigned_to,
      stationName: t.station_name,
    })),
    totalCount: (tasks ?? []).length,
  }
}

export async function executeTasksByDate(inputs: Record<string, unknown>) {
  const date = String(inputs.date ?? new Date().toISOString().split('T')[0])
  const { getTasksByDate } = await import('@/lib/tasks/actions')
  const result = await getTasksByDate(date)
  // getTasksByDate returns { grouped, unassigned } - flatten into a list
  const allTasks: any[] = []
  if (result?.unassigned) allTasks.push(...result.unassigned)
  if (result?.grouped) {
    for (const group of Object.values(result.grouped) as any[]) {
      allTasks.push(...(group.tasks ?? []))
    }
  }
  return {
    date,
    tasks: allTasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignedTo: t.assigned_to,
    })),
    totalCount: allTasks.length,
  }
}

export async function executeTasksOverdue() {
  const { listTasks } = await import('@/lib/tasks/actions')
  const allTasks = await listTasks({ status: 'pending' })
  const today = new Date().toISOString().split('T')[0]
  const overdue = (allTasks ?? []).filter((t: any) => t.due_date && t.due_date < today)
  return {
    overdueTasks: overdue.slice(0, 15).map((t: any) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.due_date,
      assignedTo: t.assigned_to,
    })),
    overdueCount: overdue.length,
  }
}

// ─── Travel Intelligence ─────────────────────────────────────────────────────

export async function executeTravelPlan(inputs: Record<string, unknown>) {
  const eventId = String(inputs.eventId ?? inputs.eventName ?? '')
  if (!eventId) return { error: 'Please specify an event name or ID.' }
  const resolved = await resolveEventId(eventId)
  if (!resolved) return { error: `Could not find event "${eventId}".` }
  const { getTravelPlan } = await import('@/lib/travel/actions')
  return await getTravelPlan(resolved)
}

export async function executeTravelUpcoming() {
  const { getAllTravelLegs } = await import('@/lib/travel/actions')
  const legs = await getAllTravelLegs({ fromDate: new Date().toISOString().split('T')[0] })
  return {
    upcomingLegs: (legs ?? []).slice(0, 15).map((l: any) => ({
      id: l.id,
      legDate: l.leg_date,
      legType: l.leg_type,
      departureTime: l.departure_time,
      arrivalTime: l.arrival_time,
      status: l.status,
      eventOccasion: l.event_occasion,
    })),
    totalCount: (legs ?? []).length,
  }
}

// ─── Commerce Intelligence ───────────────────────────────────────────────────

export async function executeCommerceProducts() {
  const { listProducts } = await import('@/lib/commerce/product-actions')
  const result = await listProducts({ activeOnly: true })
  const items = result?.products ?? []
  return {
    products: items.slice(0, 25).map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      priceCents: p.price_cents,
      costCents: p.cost_cents,
      inventoryCount: p.inventory_count,
      isActive: p.is_active,
      category: p.category,
    })),
    totalCount: result?.total ?? items.length,
  }
}

export async function executeCommerceRecentSales() {
  const { listSales } = await import('@/lib/commerce/sale-actions')
  const result = await listSales({ limit: 15 })
  const items = result?.sales ?? []
  return {
    sales: items.map((s: any) => ({
      id: s.id,
      totalCents: s.total_cents,
      subtotalCents: s.subtotal_cents,
      taxCents: s.tax_cents,
      status: s.status,
      createdAt: s.created_at,
      itemCount: s.item_count ?? s.items?.length ?? 0,
    })),
    totalCount: result?.total ?? items.length,
  }
}

export async function executeCommerceDailyReport() {
  const today = new Date().toISOString().split('T')[0]
  const { getDailySalesReport } = await import('@/lib/commerce/report-actions')
  const report = await getDailySalesReport(today, today)
  const day = report?.[0]
  return {
    date: today,
    totalSales: day?.salesCount ?? 0,
    totalRevenueCents: day?.revenueCents ?? 0,
    totalTaxCents: day?.taxCents ?? 0,
    averageSaleCents: day?.averageOrderCents ?? 0,
    netRevenueCents: day?.netRevenueCents ?? 0,
  }
}

export async function executeCommerceProductReport() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]
  const { getProductReport } = await import('@/lib/commerce/report-actions')
  const report = await getProductReport(thirtyDaysAgo, today)
  return {
    period: '30 days',
    products: (report ?? []).slice(0, 20).map((p: any) => ({
      name: p.name,
      unitsSold: p.unitsSold,
      revenueCents: p.revenueCents,
      costCents: p.costCents,
      marginPercent: p.marginPercent,
    })),
  }
}

export async function executeCommerceInventoryLow() {
  const { listProducts } = await import('@/lib/commerce/product-actions')
  const result = await listProducts({ activeOnly: true })
  const lowStock = (result?.products ?? []).filter(
    (p: any) => p.inventory_count !== null && p.inventory_count <= (p.reorder_point ?? 5)
  )
  return {
    lowStockItems: lowStock.map((p: any) => ({
      name: p.name,
      sku: p.sku,
      currentStock: p.inventory_count,
      reorderPoint: p.reorder_point,
    })),
    lowStockCount: lowStock.length,
  }
}

// ─── Daily Ops Intelligence ──────────────────────────────────────────────────

export async function executeDailyPlan() {
  const { getDailyPlan } = await import('@/lib/daily-ops/actions')
  return await getDailyPlan()
}

export async function executeDailyPlanStats() {
  const { getDailyPlanStats } = await import('@/lib/daily-ops/actions')
  return await getDailyPlanStats()
}

// ─── Priority Queue Intelligence ─────────────────────────────────────────────

export async function executePriorityQueue() {
  const { getPriorityQueue } = await import('@/lib/queue/actions')
  const queue = await getPriorityQueue()
  return {
    items: (queue?.items ?? []).slice(0, 20).map((item: any) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      priority: item.priority,
      score: item.score,
      dueDate: item.dueDate,
      entity: item.entity,
    })),
    totalCount: queue?.items?.length ?? 0,
    summary: {
      urgent: (queue?.items ?? []).filter((i: any) => i.priority === 'urgent').length,
      high: (queue?.items ?? []).filter((i: any) => i.priority === 'high').length,
      normal: (queue?.items ?? []).filter((i: any) => i.priority === 'normal').length,
    },
  }
}

// ─── Station Intelligence ────────────────────────────────────────────────────

export async function executeStationsList() {
  const { listStations } = await import('@/lib/stations/actions')
  const stations = await listStations()
  return {
    stations: (stations ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      displayOrder: s.display_order,
      menuItemCount: s.menu_items?.length ?? 0,
      componentCount: s.components?.length ?? 0,
    })),
    totalCount: (stations ?? []).length,
  }
}

export async function executeStationDetail(inputs: Record<string, unknown>) {
  const stationId = String(inputs.stationId ?? inputs.stationName ?? '')
  if (!stationId) return { error: 'Please specify a station name or ID.' }
  const resolved = await resolveStationId(stationId)
  if (!resolved) return { error: `Could not find station "${stationId}".` }
  const { getStation } = await import('@/lib/stations/actions')
  return await getStation(resolved)
}

export async function executeOpsLog(inputs: Record<string, unknown>) {
  const { getOpsLog } = await import('@/lib/stations/ops-log-actions')
  const stationId = inputs.stationId as string | undefined
  const log = await getOpsLog(
    stationId ? { station_id: stationId, page: 1, per_page: 20 } : { page: 1, per_page: 20 }
  )
  const entries = log?.entries ?? []
  return {
    entries: entries.slice(0, 20).map((entry: any) => ({
      id: entry.id,
      actionType: entry.action_type,
      description: entry.description,
      stationName: entry.station_name,
      createdAt: entry.created_at,
      createdBy: entry.created_by_name,
    })),
    totalCount: log?.total ?? entries.length,
  }
}

export async function executeWasteLog() {
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  const { getWasteSummary } = await import('@/lib/stations/waste-actions')
  const summary = await getWasteSummary(
    thirtyDaysAgo.toISOString().split('T')[0],
    today.toISOString().split('T')[0]
  )
  return {
    period: '30 days',
    ...summary,
  }
}

// ─── Testimonial Intelligence ────────────────────────────────────────────────

export async function executeTestimonialsList() {
  const { getTestimonials } = await import('@/lib/testimonials/actions')
  const testimonials = await getTestimonials()
  const approved = (testimonials ?? []).filter((t: any) => t.approved)
  const pending = (testimonials ?? []).filter((t: any) => !t.approved)
  const featured = (testimonials ?? []).filter((t: any) => t.featured)

  return {
    testimonials: (testimonials ?? []).slice(0, 15).map((t: any) => ({
      id: t.id,
      guestName: t.guest_name,
      testimonial: t.testimonial?.substring(0, 200),
      foodRating: t.foodRating ?? t.food_rating,
      chefRating: t.chefRating ?? t.chef_rating,
      wouldRecommend: t.wouldRecommend ?? t.would_recommend,
      approved: t.approved,
      featured: t.featured,
      createdAt: t.created_at,
    })),
    totalCount: (testimonials ?? []).length,
    approvedCount: approved.length,
    pendingCount: pending.length,
    featuredCount: featured.length,
    averageFoodRating:
      approved.length > 0
        ? +(
            approved.reduce((s: number, t: any) => s + ((t.foodRating ?? t.food_rating) || 0), 0) /
            approved.length
          ).toFixed(1)
        : null,
    averageChefRating:
      approved.length > 0
        ? +(
            approved.reduce((s: number, t: any) => s + ((t.chefRating ?? t.chef_rating) || 0), 0) /
            approved.length
          ).toFixed(1)
        : null,
  }
}

export async function executeTestimonialsPending() {
  const { getTestimonials } = await import('@/lib/testimonials/actions')
  const testimonials = await getTestimonials({ approved: false })
  return {
    pendingTestimonials: (testimonials ?? []).map((t: any) => ({
      id: t.id,
      guestName: t.guest_name,
      testimonial: t.testimonial?.substring(0, 200),
      foodRating: t.foodRating ?? t.food_rating,
      createdAt: t.created_at,
    })),
    pendingCount: (testimonials ?? []).length,
  }
}

// ─── Partner / Referral Intelligence ─────────────────────────────────────────

export async function executePartnersList() {
  const { getPartners } = await import('@/lib/partners/actions')
  const partners = await getPartners()
  return {
    partners: (partners ?? []).slice(0, 20).map((p: any) => ({
      id: p.id,
      name: p.name,
      partnerType: p.partner_type,
      status: p.status,
      contactName: p.contact_name,
      email: p.email,
      commissionNotes: p.commission_notes,
    })),
    totalCount: (partners ?? []).length,
    activeCount: (partners ?? []).filter((p: any) => p.status === 'active').length,
  }
}

export async function executePartnerEvents(inputs: Record<string, unknown>) {
  const partnerId = String(inputs.partnerId ?? inputs.partnerName ?? '')
  if (!partnerId) return { error: 'Please specify a partner name or ID.' }
  const resolved = await resolvePartnerId(partnerId)
  if (!resolved) return { error: `Could not find partner "${partnerId}".` }
  const { getPartnerEvents } = await import('@/lib/partners/actions')
  const events = await getPartnerEvents(resolved)
  return {
    events: (events ?? []).slice(0, 15).map((e: any) => ({
      id: e.id,
      occasion: e.occasion,
      eventDate: e.event_date,
      status: e.status,
      clientName: e.client_name,
    })),
    totalCount: (events ?? []).length,
  }
}

export async function executePartnerPerformance() {
  const { getPartners } = await import('@/lib/partners/actions')
  const partners = await getPartners({ status: 'active' })
  // Get event counts per partner
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()

  const partnerIds = (partners ?? []).map((p: any) => p.id)
  let eventCounts: any[] = []
  if (partnerIds.length > 0) {
    const { data } = await db
      .from('events')
      .select('referral_partner_id')
      .eq('tenant_id', user.tenantId!)
      .in('referral_partner_id', partnerIds)
    eventCounts = data ?? []
  }

  const countMap = new Map<string, number>()
  for (const row of eventCounts) {
    const pid = row.referral_partner_id as string
    countMap.set(pid, (countMap.get(pid) ?? 0) + 1)
  }

  return {
    partners: (partners ?? [])
      .map((p: any) => ({
        name: p.name,
        partnerType: p.partner_type,
        eventsGenerated: countMap.get(p.id) ?? 0,
      }))
      .sort((a: any, b: any) => b.eventsGenerated - a.eventsGenerated),
  }
}

// ─── Activity Feed Intelligence ──────────────────────────────────────────────

export async function executeActivityFeed() {
  const { getRecentActivity } = await import('@/lib/activity/actions')
  const activity = await getRecentActivity(20)
  return {
    events: (activity ?? []).map((a: any) => ({
      id: a.id,
      eventType: a.event_type,
      entityType: a.entity_type,
      actorType: a.actor_type,
      metadata: a.metadata,
      createdAt: a.created_at,
    })),
    totalCount: (activity ?? []).length,
  }
}

export async function executeEngagementStats() {
  const { getEngagementStats } = await import('@/lib/activity/actions')
  return await getEngagementStats()
}

// ─── AAR (After-Action Review) Intelligence ──────────────────────────────────

export async function executeAARList() {
  const { getRecentAARs } = await import('@/lib/aar/actions')
  const aars = await getRecentAARs(10)
  return {
    recentAARs: (aars ?? []).map((a: any) => ({
      id: a.id,
      eventId: a.event_id,
      eventOccasion: a.event_occasion ?? a.occasion,
      calmRating: a.calm_rating,
      prepRating: a.preparation_rating,
      executionRating: a.execution_rating,
      createdAt: a.created_at,
    })),
    totalCount: (aars ?? []).length,
  }
}

export async function executeAARStats() {
  const { getAARStats } = await import('@/lib/aar/actions')
  return await getAARStats()
}

export async function executeEventsWithoutAAR() {
  const { getEventsWithoutAAR } = await import('@/lib/aar/actions')
  const events = await getEventsWithoutAAR()
  return {
    eventsNeedingAAR: (events ?? []).slice(0, 10).map((e: any) => ({
      id: e.id,
      occasion: e.occasion,
      eventDate: e.event_date,
      clientName: e.client_name,
    })),
    count: (events ?? []).length,
  }
}

export async function executeAARForgottenItems() {
  const { getForgottenItemsFrequency } = await import('@/lib/aar/actions')
  return await getForgottenItemsFrequency()
}

// ─── Waitlist Intelligence ───────────────────────────────────────────────────

export async function executeWaitlistStatus() {
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()

  // Waitlisted clients have a status or flag indicating they're on the waitlist
  const { data: waitlisted } = await db
    .from('clients')
    .select('id, full_name, email, created_at, notes')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'waitlisted')
    .order('created_at', { ascending: false })
    .limit(20)

  return {
    waitlistedClients: (waitlisted ?? []).map((c: any) => ({
      id: c.id,
      name: c.full_name,
      email: c.email,
      addedAt: c.created_at,
    })),
    totalCount: (waitlisted ?? []).length,
  }
}

// ─── Resolution Helpers ──────────────────────────────────────────────────────

async function resolveEventId(nameOrId: string): Promise<string | null> {
  if (!nameOrId) return null
  if (/^[0-9a-f]{8}-/.test(nameOrId)) return nameOrId
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data: events } = await db
    .from('events')
    .select('id, occasion')
    .eq('tenant_id', user.tenantId!)
    .ilike('occasion', `%${nameOrId}%`)
    .limit(1)
  return events?.[0]?.id ?? null
}

async function resolveCircleId(nameOrId: string): Promise<string | null> {
  if (!nameOrId) return null
  if (/^[0-9a-f]{8}-/.test(nameOrId)) return nameOrId
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data: groups } = await db
    .from('hub_groups')
    .select('id, name')
    .eq('created_by', user.entityId)
    .ilike('name', `%${nameOrId}%`)
    .limit(1)
  return groups?.[0]?.id ?? null
}

async function resolveStationId(nameOrId: string): Promise<string | null> {
  if (!nameOrId) return null
  if (/^[0-9a-f]{8}-/.test(nameOrId)) return nameOrId
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data: stations } = await db
    .from('stations')
    .select('id, name')
    .eq('tenant_id', user.tenantId!)
    .ilike('name', `%${nameOrId}%`)
    .limit(1)
  return stations?.[0]?.id ?? null
}

async function resolvePartnerId(nameOrId: string): Promise<string | null> {
  if (!nameOrId) return null
  if (/^[0-9a-f]{8}-/.test(nameOrId)) return nameOrId
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data: partners } = await db
    .from('referral_partners')
    .select('id, name')
    .eq('tenant_id', user.tenantId!)
    .ilike('name', `%${nameOrId}%`)
    .limit(1)
  return partners?.[0]?.id ?? null
}
