import type {
  PopUpCloseoutItem,
  PopUpConfig,
  PopUpLifecycleStage,
  PopUpLocationProfile,
  PopUpMenuItemPlan,
  PopUpOrderSource,
} from '@/lib/dinner-circles/types'

export type {
  PopUpCloseoutItem,
  PopUpConfig,
  PopUpLifecycleStage,
  PopUpLocationProfile,
  PopUpMenuItemPlan,
  PopUpOrderSource,
}

export type PopUpDropType = PopUpConfig['dropType']

export type PopUpForecastResult = {
  suggestedUnits: number
  reason: string
}

export type PopUpForecastInput = {
  item: PopUpMenuItemPlan
  dropType: PopUpDropType
  eventGuestCount?: number | null
  preorderOpensAt?: string | null
  preorderClosesAt?: string | null
  now?: Date
  currentSoldUnits?: number
  historicalSoldUnits?: number[]
  dishTimesServed?: number | null
}

export type PopUpOperatingSnapshot = {
  event: {
    id: string
    title: string
    date: string | null
    status: string
    location: string | null
  }
  stage: PopUpLifecycleStage
  nextActions: Array<{
    id: string
    label: string
    href?: string
    severity: 'info' | 'warning' | 'critical'
  }>
  menuItems: Array<{
    name: string
    ticketTypeId: string | null
    dishIndexId: string | null
    plannedUnits: number
    producedUnits: number
    soldUnits: number
    remainingUnits: number
    suggestedUnits: number
    priceCents: number
    unitCostCents: number | null
    marginPercent: number | null
    sellThroughPercent: number
    productionStatus: string
    forecastReason: string
  }>
  orders: {
    totalOrders: number
    totalUnits: number
    revenueCents: number
    bySource: Record<string, number>
    pickupWindows: Array<{ label: string; orderCount: number; unitCount: number }>
  }
  production: {
    totalPlannedUnits: number
    totalSoldUnits: number
    totalRemainingUnits: number
    estimatedIngredientCostCents: number
    estimatedMarginCents: number
    batchWarnings: string[]
    locationWarnings: string[]
  }
  closeout?: {
    sellThroughPercent: number
    wasteUnits: number
    wasteCostCents: number
    topItem: string | null
    underperformers: string[]
  }
}

export type PopUpEventSnapshotSource = {
  id: string
  title?: string | null
  occasion?: string | null
  event_date?: string | null
  status?: string | null
  location?: string | null
  location_address?: string | null
  location_city?: string | null
  location_state?: string | null
  guest_count?: number | null
}

export type PopUpTicketTypeSnapshotSource = {
  id: string
  name: string
  price_cents: number
  capacity: number | null
  sold_count?: number | null
  is_active?: boolean | null
}

export type PopUpTicketSnapshotSource = {
  id: string
  ticket_type_id: string | null
  quantity: number
  total_cents: number
  payment_status: string
  source?: string | null
  notes?: string | null
  created_at?: string | null
}

export type PopUpDishSummarySnapshotSource = {
  id: string
  name?: string | null
  linked_recipe_id?: string | null
  times_served?: number | null
  per_portion_cost_cents?: number | null
  recipe_cost_cents?: number | null
}

export type PopUpHistoricalDemandSource = {
  dishIndexId: string
  soldUnits: number
}
