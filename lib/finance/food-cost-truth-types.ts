export type FoodCostTruthDataState =
  | 'complete'
  | 'partial'
  | 'missing_projected_cost'
  | 'missing_actual_cost'
  | 'missing_revenue'
  | 'unavailable'

export type RevenueBasis =
  | 'collected_revenue'
  | 'quoted_price'
  | 'ledger_revenue'
  | 'daily_revenue'
  | 'service_day_sales'

export type FoodCostTruthSource =
  | 'menu_cost_summary'
  | 'projected_food_cost_rpc'
  | 'event_expenses'
  | 'expense_line_items'
  | 'grocery_spend_entries'
  | 'vendor_invoices'
  | 'daily_revenue'
  | 'service_day_summary'
  | 'ledger_entries'
  | 'event_estimated_food_cost'

export type FoodExpenseCategory = 'groceries' | 'alcohol' | 'specialty_items'

export type FoodExpenseLike = {
  category: string | null
  amount_cents: number | null
  is_business: boolean | null
}

export type EventFoodCostTruthInput = {
  eventId: string
  eventName: string
  eventDate: string | null
  guestCount: number | null
  projectedFoodCostCents: number | null
  actualFoodCostCents: number | null
  netFoodCostCents?: number | null
  revenueCents: number | null
  revenueBasis: RevenueBasis | null
  sources: FoodCostTruthSource[]
}

export type EventFoodCostTruth = {
  eventId: string
  eventName: string
  eventDate: string | null
  guestCount: number | null
  projectedFoodCostCents: number | null
  actualFoodCostCents: number | null
  netFoodCostCents: number | null
  revenueCents: number | null
  revenueBasis: RevenueBasis | null
  foodCostPercent: number | null
  varianceCents: number | null
  variancePercent: number | null
  dataState: FoodCostTruthDataState
  missingReasons: string[]
  sources: FoodCostTruthSource[]
}

export type RangeFoodCostTruthInput = {
  startDate: string
  endDate: string
  actualFoodCostCents: number | null
  revenueCents: number | null
  revenueBasis: RevenueBasis
  eventCount: number
  completeEventCount?: number
  partialEventCount?: number
  sources: FoodCostTruthSource[]
}

export type RangeFoodCostTruth = {
  startDate: string
  endDate: string
  actualFoodCostCents: number | null
  revenueCents: number | null
  revenueBasis: RevenueBasis
  foodCostPercent: number | null
  eventCount: number
  completeEventCount: number
  partialEventCount: number
  missingReasons: string[]
  sources: FoodCostTruthSource[]
}
