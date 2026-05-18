import type {
  StatisticsClientLtv,
  StatisticsDishRank,
  StatisticsEventRow,
  StatisticsFinancialRow,
  StatisticsGrowthPoint,
  StatisticsGrowthTrajectory,
  StatisticsMonthRank,
  StatisticsRevenuePeriod,
  StatisticsRevenueSummary,
  StatisticsSnapshot,
  StatisticsSourceRows,
} from './stat-types'

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const COMPLETED_EVENT_STATUS = 'completed'

function toCents(value: number | null | undefined): number {
  return Number.isFinite(value) ? Math.round(value ?? 0) : 0
}

function toDateKey(value: string): string {
  return value.slice(0, 10)
}

function toMonthKey(value: string): string {
  return value.slice(0, 7)
}

function addMonths(date: Date, delta: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1))
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7)
}

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return `${MONTH_LABELS[monthNumber - 1]} ${year}`
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

function averageCents(totalCents: number, count: number): number {
  if (count <= 0) return 0
  return Math.round(totalCents / count)
}

function buildPeriod(
  startDate: string,
  endDate: string,
  events: EnrichedEvent[]
): StatisticsRevenuePeriod {
  const periodEvents = events.filter(
    (event) => event.eventDate >= startDate && event.eventDate <= endDate
  )
  const revenueCents = periodEvents.reduce((sum, event) => sum + event.revenueCents, 0)

  return {
    startDate,
    endDate,
    revenueCents,
    eventCount: periodEvents.length,
    averageTicketCents: averageCents(revenueCents, periodEvents.length),
  }
}

function getQuarterStart(asOf: Date): Date {
  const quarterStartMonth = Math.floor(asOf.getUTCMonth() / 3) * 3
  return new Date(Date.UTC(asOf.getUTCFullYear(), quarterStartMonth, 1))
}

function getRevenueFromFinancial(
  event: StatisticsEventRow,
  financial: StatisticsFinancialRow | undefined
): number {
  const netRevenue = toCents(financial?.net_revenue_cents)
  if (netRevenue > 0) return netRevenue

  const paidRevenue = toCents(financial?.total_paid_cents)
  if (paidRevenue > 0) return paidRevenue

  return toCents(event.quoted_price_cents)
}

type EnrichedEvent = {
  id: string
  clientId: string | null
  menuId: string | null
  eventDate: string
  month: string
  revenueCents: number
  expenseCents: number
  profitCents: number
}

function getCompletedEvents(rows: StatisticsSourceRows): EnrichedEvent[] {
  const financialByEvent = new Map(
    rows.financials.map((financial) => [financial.event_id, financial])
  )
  const expensesByEvent = new Map<string, number>()

  for (const expense of rows.expenses) {
    if (!expense.event_id) continue
    expensesByEvent.set(
      expense.event_id,
      (expensesByEvent.get(expense.event_id) ?? 0) + toCents(expense.amount_cents)
    )
  }

  return rows.events
    .filter((event) => event.status === COMPLETED_EVENT_STATUS)
    .map((event) => {
      const financial = financialByEvent.get(event.id)
      const revenueCents = getRevenueFromFinancial(event, financial)
      const expenseCents = Math.max(
        toCents(financial?.total_expenses_cents),
        expensesByEvent.get(event.id) ?? 0
      )
      const reportedProfitCents =
        financial?.profit_cents == null
          ? revenueCents - expenseCents
          : toCents(financial.profit_cents)

      return {
        id: event.id,
        clientId: event.client_id,
        menuId: event.menu_id,
        eventDate: toDateKey(event.event_date),
        month: toMonthKey(event.event_date),
        revenueCents,
        expenseCents,
        profitCents: reportedProfitCents,
      }
    })
}

function buildRevenueSummary(events: EnrichedEvent[], asOfDate: string): StatisticsRevenueSummary {
  const asOf = new Date(`${asOfDate}T00:00:00.000Z`)
  const monthStart = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1))
  const quarterStart = getQuarterStart(asOf)
  const yearStart = new Date(Date.UTC(asOf.getUTCFullYear(), 0, 1))

  return {
    mtd: buildPeriod(dateKey(monthStart), asOfDate, events),
    qtd: buildPeriod(dateKey(quarterStart), asOfDate, events),
    ytd: buildPeriod(dateKey(yearStart), asOfDate, events),
  }
}

function buildClientLtv(
  rows: StatisticsSourceRows,
  events: EnrichedEvent[]
): StatisticsClientLtv[] {
  const clientsById = new Map(rows.clients.map((client) => [client.id, client]))
  const clientTotals = new Map<
    string,
    {
      revenueCents: number
      expenseCents: number
      completedEventCount: number
      firstEventDate: string | null
      lastEventDate: string | null
    }
  >()

  for (const event of events) {
    if (!event.clientId) continue
    const current = clientTotals.get(event.clientId) ?? {
      revenueCents: 0,
      expenseCents: 0,
      completedEventCount: 0,
      firstEventDate: null,
      lastEventDate: null,
    }

    current.revenueCents += event.revenueCents
    current.expenseCents += event.expenseCents
    current.completedEventCount += 1
    current.firstEventDate =
      current.firstEventDate == null || event.eventDate < current.firstEventDate
        ? event.eventDate
        : current.firstEventDate
    current.lastEventDate =
      current.lastEventDate == null || event.eventDate > current.lastEventDate
        ? event.eventDate
        : current.lastEventDate

    clientTotals.set(event.clientId, current)
  }

  return Array.from(clientTotals.entries())
    .map(([clientId, totals]) => {
      const client = clientsById.get(clientId)
      return {
        clientId,
        clientName: client?.full_name?.trim() || 'Unknown client',
        clientEmail: client?.email ?? null,
        totalRevenueCents: totals.revenueCents,
        totalExpenseCents: totals.expenseCents,
        lifetimeValueCents: totals.revenueCents - totals.expenseCents,
        completedEventCount: totals.completedEventCount,
        firstEventDate: totals.firstEventDate,
        lastEventDate: totals.lastEventDate,
      }
    })
    .sort((a, b) => b.lifetimeValueCents - a.lifetimeValueCents)
}

function buildDishRanks(rows: StatisticsSourceRows, events: EnrichedEvent[]): StatisticsDishRank[] {
  const eventsByMenu = new Map<string, EnrichedEvent[]>()
  for (const event of events) {
    if (!event.menuId) continue
    const menuEvents = eventsByMenu.get(event.menuId) ?? []
    menuEvents.push(event)
    eventsByMenu.set(event.menuId, menuEvents)
  }

  const dishesByMenu = new Map<string, typeof rows.dishes>()
  for (const dish of rows.dishes) {
    const menuDishes = dishesByMenu.get(dish.menu_id) ?? []
    menuDishes.push(dish)
    dishesByMenu.set(dish.menu_id, menuDishes)
  }

  const ranks = new Map<string, StatisticsDishRank>()

  for (const [menuId, menuEvents] of eventsByMenu.entries()) {
    const dishes = dishesByMenu.get(menuId) ?? []
    if (dishes.length === 0) continue

    for (const event of menuEvents) {
      const attributedRevenueCents = averageCents(event.revenueCents, dishes.length)
      const attributedProfitCents = averageCents(event.profitCents, dishes.length)

      for (const dish of dishes) {
        const current =
          ranks.get(dish.id) ??
          ({
            dishId: dish.id,
            dishName:
              dish.name?.trim() ||
              dish.course_name?.trim() ||
              dish.description?.trim() ||
              'Unnamed dish',
            menuId,
            requestedEventCount: 0,
            attributedRevenueCents: 0,
            attributedProfitCents: 0,
            lastRequestedDate: null,
            profitabilityMethod: 'event_profit_even_split',
          } satisfies StatisticsDishRank)

        current.requestedEventCount += 1
        current.attributedRevenueCents += attributedRevenueCents
        current.attributedProfitCents += attributedProfitCents
        current.lastRequestedDate =
          current.lastRequestedDate == null || event.eventDate > current.lastRequestedDate
            ? event.eventDate
            : current.lastRequestedDate

        ranks.set(dish.id, current)
      }
    }
  }

  return Array.from(ranks.values())
}

function buildBusiestMonths(events: EnrichedEvent[]): StatisticsMonthRank[] {
  const months = new Map<string, StatisticsMonthRank>()

  for (const event of events) {
    const current = months.get(event.month) ?? {
      month: event.month,
      label: monthLabel(event.month),
      eventCount: 0,
      revenueCents: 0,
    }

    current.eventCount += 1
    current.revenueCents += event.revenueCents
    months.set(event.month, current)
  }

  return Array.from(months.values()).sort((a, b) => {
    if (b.eventCount !== a.eventCount) return b.eventCount - a.eventCount
    return b.revenueCents - a.revenueCents
  })
}

function buildGrowthTrajectory(
  events: EnrichedEvent[],
  asOfDate: string
): StatisticsGrowthTrajectory {
  const asOf = new Date(`${asOfDate}T00:00:00.000Z`)
  const revenueByMonth = new Map<string, { revenueCents: number; eventCount: number }>()

  for (const event of events) {
    const current = revenueByMonth.get(event.month) ?? { revenueCents: 0, eventCount: 0 }
    current.revenueCents += event.revenueCents
    current.eventCount += 1
    revenueByMonth.set(event.month, current)
  }

  const points: StatisticsGrowthPoint[] = []
  for (let offset = -11; offset <= 0; offset += 1) {
    const month = monthKey(addMonths(asOf, offset))
    const current = revenueByMonth.get(month) ?? { revenueCents: 0, eventCount: 0 }
    const previous = points.at(-1)

    points.push({
      month,
      label: monthLabel(month),
      revenueCents: current.revenueCents,
      eventCount: current.eventCount,
      previousRevenueCents: previous?.revenueCents ?? null,
      revenueGrowthPercent: previous
        ? percentChange(current.revenueCents, previous.revenueCents)
        : null,
    })
  }

  const currentMonthRevenueCents = points.at(-1)?.revenueCents ?? 0
  const previousMonthRevenueCents = points.at(-2)?.revenueCents ?? 0
  const threeMonthAverageRevenueCents = averageCents(
    points.slice(-3).reduce((sum, point) => sum + point.revenueCents, 0),
    3
  )
  const twelveMonthAverageRevenueCents = averageCents(
    points.reduce((sum, point) => sum + point.revenueCents, 0),
    points.length
  )
  const monthsWithRevenue = points.filter((point) => point.revenueCents > 0).length
  const revenueGrowthPercent = percentChange(currentMonthRevenueCents, previousMonthRevenueCents)
  const direction =
    monthsWithRevenue < 2
      ? 'insufficient_data'
      : revenueGrowthPercent == null || Math.abs(revenueGrowthPercent) < 2
        ? 'flat'
        : revenueGrowthPercent > 0
          ? 'up'
          : 'down'

  return {
    points,
    currentMonthRevenueCents,
    previousMonthRevenueCents,
    revenueGrowthPercent,
    threeMonthAverageRevenueCents,
    twelveMonthAverageRevenueCents,
    direction,
  }
}

export function collectStatisticsSnapshot(rows: StatisticsSourceRows): StatisticsSnapshot {
  const asOfDate = rows.asOfDate ?? dateKey(new Date())
  const completedEvents = getCompletedEvents(rows)
  const totalRevenueCents = completedEvents.reduce((sum, event) => sum + event.revenueCents, 0)
  const dishRanks = buildDishRanks(rows, completedEvents)

  return {
    tenantId: rows.tenantId,
    generatedAt: new Date().toISOString(),
    asOfDate,
    revenue: buildRevenueSummary(completedEvents, asOfDate),
    eventCount: rows.events.length,
    completedEventCount: completedEvents.length,
    averageTicketCents: averageCents(totalRevenueCents, completedEvents.length),
    clientLtv: buildClientLtv(rows, completedEvents),
    mostRequestedDishes: [...dishRanks]
      .sort(
        (a, b) =>
          b.requestedEventCount - a.requestedEventCount ||
          b.attributedRevenueCents - a.attributedRevenueCents
      )
      .slice(0, 10),
    mostProfitableDishes: [...dishRanks]
      .sort(
        (a, b) =>
          b.attributedProfitCents - a.attributedProfitCents ||
          b.requestedEventCount - a.requestedEventCount
      )
      .slice(0, 10),
    busiestMonths: buildBusiestMonths(completedEvents).slice(0, 12),
    growthTrajectory: buildGrowthTrajectory(completedEvents, asOfDate),
  }
}
