export type StatisticsPeriodKey = 'mtd' | 'qtd' | 'ytd'

export type StatisticsDateRange = {
  startDate: string
  endDate: string
}

export type StatisticsRevenuePeriod = StatisticsDateRange & {
  revenueCents: number
  eventCount: number
  averageTicketCents: number
}

export type StatisticsRevenueSummary = Record<StatisticsPeriodKey, StatisticsRevenuePeriod>

export type StatisticsClientLtv = {
  clientId: string
  clientName: string
  clientEmail: string | null
  totalRevenueCents: number
  totalExpenseCents: number
  lifetimeValueCents: number
  completedEventCount: number
  firstEventDate: string | null
  lastEventDate: string | null
}

export type StatisticsDishRank = {
  dishId: string
  dishName: string
  menuId: string
  requestedEventCount: number
  attributedRevenueCents: number
  attributedProfitCents: number
  lastRequestedDate: string | null
  profitabilityMethod: 'event_profit_even_split'
}

export type StatisticsMonthRank = {
  month: string
  label: string
  eventCount: number
  revenueCents: number
}

export type StatisticsGrowthPoint = {
  month: string
  label: string
  revenueCents: number
  eventCount: number
  previousRevenueCents: number | null
  revenueGrowthPercent: number | null
}

export type StatisticsGrowthTrajectory = {
  points: StatisticsGrowthPoint[]
  currentMonthRevenueCents: number
  previousMonthRevenueCents: number
  revenueGrowthPercent: number | null
  threeMonthAverageRevenueCents: number
  twelveMonthAverageRevenueCents: number
  direction: 'up' | 'down' | 'flat' | 'insufficient_data'
}

export type StatisticsSnapshot = {
  tenantId: string
  generatedAt: string
  asOfDate: string
  revenue: StatisticsRevenueSummary
  eventCount: number
  completedEventCount: number
  averageTicketCents: number
  clientLtv: StatisticsClientLtv[]
  mostRequestedDishes: StatisticsDishRank[]
  mostProfitableDishes: StatisticsDishRank[]
  busiestMonths: StatisticsMonthRank[]
  growthTrajectory: StatisticsGrowthTrajectory
}

export type StatisticsEventRow = {
  id: string
  tenant_id?: string | null
  client_id: string | null
  event_date: string
  status: string | null
  quoted_price_cents: number | null
  guest_count: number | null
  menu_id: string | null
}

export type StatisticsFinancialRow = {
  event_id: string
  tenant_id?: string | null
  total_paid_cents: number | null
  net_revenue_cents: number | null
  total_expenses_cents: number | null
  profit_cents: number | null
}

export type StatisticsClientRow = {
  id: string
  full_name: string | null
  email: string | null
}

export type StatisticsMenuRow = {
  id: string
  event_id: string | null
  name: string | null
}

export type StatisticsDishRow = {
  id: string
  menu_id: string
  name: string | null
  course_name: string | null
  description: string | null
}

export type StatisticsExpenseRow = {
  event_id: string | null
  amount_cents: number | null
}

export type StatisticsSourceRows = {
  tenantId: string
  asOfDate?: string
  events: StatisticsEventRow[]
  financials: StatisticsFinancialRow[]
  clients: StatisticsClientRow[]
  menus: StatisticsMenuRow[]
  dishes: StatisticsDishRow[]
  expenses: StatisticsExpenseRow[]
}

export type StatisticsHookEntity =
  | 'event'
  | 'client'
  | 'menu'
  | 'dish'
  | 'expense'
  | 'ledger_entry'
  | 'payment'

export type StatisticsHookInput = {
  tenantId: string
  entity: StatisticsHookEntity
  entityId?: string
  eventId?: string
  clientId?: string
  occurredAt?: string
}

export type StatisticsHookResult = {
  accepted: true
  tenantId: string
  affectedScopes: Array<
    | 'revenue'
    | 'event_count'
    | 'average_ticket'
    | 'client_ltv'
    | 'dish_rankings'
    | 'busiest_months'
    | 'growth_trajectory'
  >
  shouldRecompute: boolean
}
