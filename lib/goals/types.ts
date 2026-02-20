// ── Goal type and status ──────────────────────────────────────────────────────

export type GoalType =
  | 'revenue_monthly'
  | 'revenue_annual'
  | 'revenue_custom'
  | 'booking_count'
  | 'new_clients'
  | 'recipe_library'
  | 'profit_margin'
  | 'expense_ratio'

export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived'
export type NudgeLevel = 'gentle' | 'standard' | 'aggressive'

// ── Database record ───────────────────────────────────────────────────────────

export type ChefGoal = {
  id: string
  tenantId: string
  goalType: GoalType
  label: string
  status: GoalStatus
  /** Semantics differ by goalType:
   *  revenue_*  → cents (e.g. 1000000 = $10,000)
   *  booking_count | new_clients | recipe_library → whole count
   *  profit_margin | expense_ratio → basis points (6500 = 65.00%) */
  targetValue: number
  periodStart: string // ISO date YYYY-MM-DD
  periodEnd: string
  nudgeEnabled: boolean
  nudgeLevel: NudgeLevel
  notes: string | null
  createdAt: string
  updatedAt: string
}

// ── Computed progress ─────────────────────────────────────────────────────────

export type GoalProgress = {
  goalId: string
  goalType: GoalType
  label: string
  targetValue: number
  currentValue: number
  gapValue: number      // max(0, target - current)
  progressPercent: number // 0–999
  periodStart: string
  periodEnd: string
}

// ── Revenue-specific enrichment (only for revenue_* goals) ────────────────────

export type RevenueGoalEnrichment = {
  realizedCents: number
  projectedCents: number
  pipelineWeightedCents: number
  avgBookingValueCents: number
  eventsNeeded: number
  openDatesThisMonth: string[]
}

// ── Pricing scenario ──────────────────────────────────────────────────────────

export type PricingScenario = {
  priceDeltaCents: number      // e.g. 20000 = $200 price increase per event
  effectivePriceCents: number  // currentAvg + priceDelta
  eventsNeededAtPrice: number  // ceil(gap / effectivePrice)
}

// ── Client outreach suggestion ────────────────────────────────────────────────

export type ClientSuggestion = {
  clientId: string
  clientName: string
  daysDormant: number | null
  avgSpendCents: number
  lifetimeValueCents: number
  reason: string   // e.g. "Dormant 45 days — avg $1,200 booking"
  rank: number
  status: 'pending' | 'contacted' | 'booked' | 'declined' | 'dismissed'
  suggestionId?: string  // set if row exists in goal_client_suggestions table
}

// ── Full goal view ────────────────────────────────────────────────────────────

export type GoalView = {
  goal: ChefGoal
  progress: GoalProgress
  enrichment: RevenueGoalEnrichment | null   // only for revenue_* goals
  pricingScenarios: PricingScenario[]        // only for revenue_* goals
  clientSuggestions: ClientSuggestion[]      // only for revenue_* goals
}

// ── Historical snapshot ───────────────────────────────────────────────────────

export type GoalSnapshot = {
  id: string
  goalId: string
  snapshotDate: string
  snapshotMonth: string
  currentValue: number
  targetValue: number
  gapValue: number
  progressPercent: number
  realizedCents: number | null
  projectedCents: number | null
  avgBookingValueCents: number | null
  eventsNeeded: number | null
  pricingScenarios: PricingScenario[]
  clientSuggestionsJson: ClientSuggestion[]
  computedAt: string
}

// ── Dashboard aggregate ───────────────────────────────────────────────────────

export type GoalsDashboard = {
  activeGoals: GoalView[]
  computedAt: string
}

// ── Create/update input ───────────────────────────────────────────────────────

export type CreateGoalInput = {
  goalType: GoalType
  label: string
  targetValue: number
  periodStart: string
  periodEnd: string
  nudgeEnabled?: boolean
  nudgeLevel?: NudgeLevel
  notes?: string | null
}

// ── Goal type metadata (for display) ─────────────────────────────────────────

export type GoalTypeMeta = {
  type: GoalType
  label: string
  description: string
  unit: 'cents' | 'count' | 'basis_points'
  icon: string
}

export const GOAL_TYPE_META: GoalTypeMeta[] = [
  {
    type: 'revenue_monthly',
    label: 'Monthly Revenue',
    description: 'Hit a target revenue amount for a specific month.',
    unit: 'cents',
    icon: 'DollarSign',
  },
  {
    type: 'revenue_annual',
    label: 'Annual Revenue',
    description: 'Set a yearly revenue goal and track it all year.',
    unit: 'cents',
    icon: 'TrendingUp',
  },
  {
    type: 'revenue_custom',
    label: 'Custom Revenue Period',
    description: 'Target revenue for any custom date range (e.g. summer season).',
    unit: 'cents',
    icon: 'Calendar',
  },
  {
    type: 'booking_count',
    label: 'Booking Count',
    description: 'Complete a target number of events in a given period.',
    unit: 'count',
    icon: 'ChefHat',
  },
  {
    type: 'new_clients',
    label: 'New Clients',
    description: 'Add a target number of new clients this month or year.',
    unit: 'count',
    icon: 'Users',
  },
  {
    type: 'recipe_library',
    label: 'Recipe Library',
    description: 'Build your recipe library to a target count.',
    unit: 'count',
    icon: 'BookOpen',
  },
  {
    type: 'profit_margin',
    label: 'Profit Margin',
    description: 'Maintain a minimum profit margin across your events.',
    unit: 'basis_points',
    icon: 'Percent',
  },
  {
    type: 'expense_ratio',
    label: 'Expense Ratio',
    description: 'Keep expenses below a target percentage of revenue.',
    unit: 'basis_points',
    icon: 'PieChart',
  },
]
