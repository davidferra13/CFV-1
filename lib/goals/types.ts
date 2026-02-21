// ── Goal type and status ──────────────────────────────────────────────────────

export type GoalType =
  // Financial (auto-tracked)
  | 'revenue_monthly'
  | 'revenue_annual'
  | 'revenue_custom'
  | 'profit_margin'
  | 'expense_ratio'
  // Business Growth (auto-tracked)
  | 'booking_count'
  | 'new_clients'
  | 'repeat_booking_rate'
  | 'referrals_received'
  // Culinary Craft (manual count)
  | 'dishes_created'
  | 'cuisines_explored'
  | 'workshops_attended'
  // Reputation (auto-tracked)
  | 'review_average'
  | 'total_reviews'
  // Culinary Library (auto-tracked)
  | 'recipe_library'
  // Team & Leadership (manual count)
  | 'staff_training_hours'
  | 'vendor_relationships'
  // Learning (manual count)
  | 'books_read'
  | 'courses_completed'
  // Health & Wellbeing (manual count)
  | 'weekly_workouts'
  | 'rest_days_taken'
  // Work-Life Balance (manual count)
  | 'family_dinners'
  | 'vacation_days'
  // Community (manual count)
  | 'charity_events'
  | 'meals_donated'

export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived'
export type NudgeLevel = 'gentle' | 'standard' | 'aggressive'
export type TrackingMethod = 'auto' | 'manual_count'

// ── Goal categories ───────────────────────────────────────────────────────────

export type GoalCategory =
  | 'financial'
  | 'business_growth'
  | 'culinary_craft'
  | 'reputation'
  | 'team_leadership'
  | 'learning'
  | 'health_wellbeing'
  | 'work_life_balance'
  | 'community'

export type GoalCategoryMeta = {
  id: GoalCategory
  label: string
  description: string
  icon: string // lucide-react icon name
  defaultEnabled: boolean
  alwaysEnabled: boolean // financial + business_growth can't be disabled
  color: string // tailwind color class for the radar chart spoke
}

export const GOAL_CATEGORY_META: GoalCategoryMeta[] = [
  {
    id: 'financial',
    label: 'Financial',
    description: 'Revenue targets, profit margins, and expense control.',
    icon: 'DollarSign',
    defaultEnabled: true,
    alwaysEnabled: true,
    color: 'emerald',
  },
  {
    id: 'business_growth',
    label: 'Business Growth',
    description: 'Bookings, new clients, referrals, and repeat rate.',
    icon: 'TrendingUp',
    defaultEnabled: true,
    alwaysEnabled: true,
    color: 'blue',
  },
  {
    id: 'culinary_craft',
    label: 'Culinary Craft',
    description: 'New dishes, cuisines explored, workshops attended, recipe library.',
    icon: 'ChefHat',
    defaultEnabled: false,
    alwaysEnabled: false,
    color: 'orange',
  },
  {
    id: 'reputation',
    label: 'Reputation',
    description: 'Review average and total review count.',
    icon: 'Star',
    defaultEnabled: false,
    alwaysEnabled: false,
    color: 'yellow',
  },
  {
    id: 'team_leadership',
    label: 'Team & Leadership',
    description: 'Staff training hours and vendor relationships.',
    icon: 'Users',
    defaultEnabled: false,
    alwaysEnabled: false,
    color: 'purple',
  },
  {
    id: 'learning',
    label: 'Learning',
    description: 'Books read and courses completed.',
    icon: 'BookOpen',
    defaultEnabled: false,
    alwaysEnabled: false,
    color: 'indigo',
  },
  {
    id: 'health_wellbeing',
    label: 'Health & Wellbeing',
    description: 'Weekly workouts and scheduled rest days.',
    icon: 'Heart',
    defaultEnabled: false,
    alwaysEnabled: false,
    color: 'rose',
  },
  {
    id: 'work_life_balance',
    label: 'Work-Life Balance',
    description: 'Family dinners cooked at home and vacation days taken.',
    icon: 'Home',
    defaultEnabled: false,
    alwaysEnabled: false,
    color: 'teal',
  },
  {
    id: 'community',
    label: 'Community',
    description: 'Charity events and meals donated.',
    icon: 'HandHeart',
    defaultEnabled: false,
    alwaysEnabled: false,
    color: 'amber',
  },
]

// Maps each goal type to its category
export const GOAL_TYPE_TO_CATEGORY: Record<GoalType, GoalCategory> = {
  revenue_monthly: 'financial',
  revenue_annual: 'financial',
  revenue_custom: 'financial',
  profit_margin: 'financial',
  expense_ratio: 'financial',
  booking_count: 'business_growth',
  new_clients: 'business_growth',
  repeat_booking_rate: 'business_growth',
  referrals_received: 'business_growth',
  dishes_created: 'culinary_craft',
  cuisines_explored: 'culinary_craft',
  workshops_attended: 'culinary_craft',
  recipe_library: 'culinary_craft',
  review_average: 'reputation',
  total_reviews: 'reputation',
  staff_training_hours: 'team_leadership',
  vendor_relationships: 'team_leadership',
  books_read: 'learning',
  courses_completed: 'learning',
  weekly_workouts: 'health_wellbeing',
  rest_days_taken: 'health_wellbeing',
  family_dinners: 'work_life_balance',
  vacation_days: 'work_life_balance',
  charity_events: 'community',
  meals_donated: 'community',
}

// ── Database record ───────────────────────────────────────────────────────────

export type ChefGoal = {
  id: string
  tenantId: string
  goalType: GoalType
  label: string
  status: GoalStatus
  /** Semantics differ by goalType:
   *  revenue_*           → cents (e.g. 1000000 = $10,000)
   *  booking_count | new_clients | recipe_library | dishes_created |
   *  cuisines_explored | workshops_attended | total_reviews |
   *  referrals_received | staff_training_hours | vendor_relationships |
   *  books_read | courses_completed | weekly_workouts | rest_days_taken |
   *  family_dinners | vacation_days | charity_events | meals_donated → whole count
   *  profit_margin | expense_ratio | repeat_booking_rate → basis points (6500 = 65.00%)
   *  review_average → basis points (450 = 4.50 stars) */
  targetValue: number
  periodStart: string // ISO date YYYY-MM-DD
  periodEnd: string
  nudgeEnabled: boolean
  nudgeLevel: NudgeLevel
  trackingMethod: TrackingMethod
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
  gapValue: number // max(0, target - current)
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
  priceDeltaCents: number // e.g. 20000 = $200 price increase per event
  effectivePriceCents: number // currentAvg + priceDelta
  eventsNeededAtPrice: number // ceil(gap / effectivePrice)
}

// ── Client outreach suggestion ────────────────────────────────────────────────

export type ClientSuggestion = {
  clientId: string
  clientName: string
  daysDormant: number | null
  avgSpendCents: number
  lifetimeValueCents: number
  reason: string // e.g. "Dormant 45 days — avg $1,200 booking"
  rank: number
  status: 'pending' | 'contacted' | 'booked' | 'declined' | 'dismissed'
  suggestionId?: string // set if row exists in goal_client_suggestions table
}

// ── Goal check-in ─────────────────────────────────────────────────────────────

export type GoalCheckIn = {
  id: string
  goalId: string
  tenantId: string
  loggedValue: number
  notes: string | null
  loggedAt: string
}

// ── Full goal view ────────────────────────────────────────────────────────────

export type GoalView = {
  goal: ChefGoal
  progress: GoalProgress
  enrichment: RevenueGoalEnrichment | null // only for revenue_* goals
  pricingScenarios: PricingScenario[] // only for revenue_* goals
  clientSuggestions: ClientSuggestion[] // only for revenue_* goals
  recentCheckIns: GoalCheckIn[] // only for manual_count goals (last 3)
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
  categoryProgress: Partial<Record<GoalCategory, number>> // category → avg % (0-100)
  enabledCategories: GoalCategory[]
  computedAt: string
}

// ── Category settings ─────────────────────────────────────────────────────────

export type CategorySettings = {
  enabledCategories: GoalCategory[]
  nudgeLevels: Partial<Record<GoalCategory, NudgeLevel>>
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
  unit: 'cents' | 'count' | 'basis_points' | 'rating_bp' | 'hours' | 'rate_bp'
  icon: string
  trackingMethod: TrackingMethod
}

// ── Service type registry ─────────────────────────────────────────────────────

export type ServiceTypePricingModel = 'flat_rate' | 'per_person' | 'hybrid'

export type ServiceType = {
  id: string
  tenantId: string
  name: string
  description: string | null
  pricingModel: ServiceTypePricingModel
  /** Flat component (used by flat_rate and hybrid) */
  basePriceCents: number
  /** Per-guest component (used by per_person and hybrid) */
  perPersonCents: number
  /** Default guest count used for effective price calculation */
  typicalGuestCount: number
  minGuests: number | null
  maxGuests: number | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  /** Computed client-side — never stored. Depends on pricingModel + typicalGuestCount. */
  effectivePriceCents: number
}

export type CreateServiceTypeInput = {
  name: string
  description?: string | null
  pricingModel: ServiceTypePricingModel
  basePriceCents: number
  perPersonCents: number
  typicalGuestCount: number
  minGuests?: number | null
  maxGuests?: number | null
  isActive?: boolean
  sortOrder?: number
}

// ── Service mix calculator ────────────────────────────────────────────────────

export type ServiceSlotClientMatch = {
  clientId: string
  clientName: string
  healthScore: number
  lastEventDate: string | null
  avgSpendCents: number
  lifetimeValueCents: number
  matchReason: string
}

export type ServiceMixItem = {
  serviceType: ServiceType
  quantity: number
  lineRevenueCents: number
  clientMatches: ServiceSlotClientMatch[]
}

export type ServiceMixPlan = {
  items: ServiceMixItem[]
  totalPlannedCents: number
  goalTargetCents: number
  alreadyBookedCents: number
  gapCents: number
  unfilledCents: number
  exceededByCents: number
}

// ── Revenue path server data ──────────────────────────────────────────────────

export type RevenuePathData = {
  goal: ChefGoal
  serviceTypes: ServiceType[]
  alreadyBookedCents: number
  alreadyBookedCount: number
  gapCents: number
  targetMonth: string // 'YYYY-MM'
}

export const GOAL_TYPE_META: GoalTypeMeta[] = [
  // ── Financial ──────────────────────────────────────────────────────────────
  {
    type: 'revenue_monthly',
    label: 'Monthly Revenue',
    description: 'Hit a target revenue amount for a specific month.',
    unit: 'cents',
    icon: 'DollarSign',
    trackingMethod: 'auto',
  },
  {
    type: 'revenue_annual',
    label: 'Annual Revenue',
    description: 'Set a yearly revenue goal and track it all year.',
    unit: 'cents',
    icon: 'TrendingUp',
    trackingMethod: 'auto',
  },
  {
    type: 'revenue_custom',
    label: 'Custom Revenue Period',
    description: 'Target revenue for any custom date range (e.g. summer season).',
    unit: 'cents',
    icon: 'Calendar',
    trackingMethod: 'auto',
  },
  {
    type: 'profit_margin',
    label: 'Profit Margin',
    description: 'Maintain a minimum profit margin across your events.',
    unit: 'basis_points',
    icon: 'Percent',
    trackingMethod: 'auto',
  },
  {
    type: 'expense_ratio',
    label: 'Expense Ratio',
    description: 'Keep expenses below a target percentage of revenue.',
    unit: 'basis_points',
    icon: 'PieChart',
    trackingMethod: 'auto',
  },
  // ── Business Growth ────────────────────────────────────────────────────────
  {
    type: 'booking_count',
    label: 'Booking Count',
    description: 'Complete a target number of events in a given period.',
    unit: 'count',
    icon: 'ChefHat',
    trackingMethod: 'auto',
  },
  {
    type: 'new_clients',
    label: 'New Clients',
    description: 'Add a target number of new clients this month or year.',
    unit: 'count',
    icon: 'Users',
    trackingMethod: 'auto',
  },
  {
    type: 'repeat_booking_rate',
    label: 'Repeat Booking Rate',
    description: 'What percentage of your clients have booked more than once.',
    unit: 'rate_bp',
    icon: 'RefreshCw',
    trackingMethod: 'auto',
  },
  {
    type: 'referrals_received',
    label: 'Referrals Received',
    description: 'Track referrals from happy clients and partners.',
    unit: 'count',
    icon: 'Share2',
    trackingMethod: 'manual_count',
  },
  // ── Culinary Craft ─────────────────────────────────────────────────────────
  {
    type: 'dishes_created',
    label: 'New Dishes Created',
    description: 'Develop and document new dishes this period.',
    unit: 'count',
    icon: 'Utensils',
    trackingMethod: 'manual_count',
  },
  {
    type: 'cuisines_explored',
    label: 'Cuisines Explored',
    description: 'Try cooking from a new cuisine tradition.',
    unit: 'count',
    icon: 'Globe',
    trackingMethod: 'manual_count',
  },
  {
    type: 'workshops_attended',
    label: 'Workshops Attended',
    description: 'Culinary workshops, courses, and training events attended.',
    unit: 'count',
    icon: 'GraduationCap',
    trackingMethod: 'auto',
  },
  {
    type: 'recipe_library',
    label: 'Recipe Library',
    description: 'Build your recipe library to a target count.',
    unit: 'count',
    icon: 'BookOpen',
    trackingMethod: 'auto',
  },
  // ── Reputation ─────────────────────────────────────────────────────────────
  {
    type: 'review_average',
    label: 'Review Average',
    description: 'Maintain a target average star rating across all reviews.',
    unit: 'rating_bp',
    icon: 'Star',
    trackingMethod: 'auto',
  },
  {
    type: 'total_reviews',
    label: 'Total Reviews',
    description: 'Grow your total number of public reviews.',
    unit: 'count',
    icon: 'MessageSquare',
    trackingMethod: 'auto',
  },
  // ── Team & Leadership ──────────────────────────────────────────────────────
  {
    type: 'staff_training_hours',
    label: 'Staff Training Hours',
    description: 'Invest in your team with structured training sessions.',
    unit: 'hours',
    icon: 'UserCheck',
    trackingMethod: 'manual_count',
  },
  {
    type: 'vendor_relationships',
    label: 'Vendor Relationships',
    description: 'Build and maintain active vendor or supplier relationships.',
    unit: 'count',
    icon: 'Handshake',
    trackingMethod: 'manual_count',
  },
  // ── Learning ───────────────────────────────────────────────────────────────
  {
    type: 'books_read',
    label: 'Books Read',
    description: 'Read books on culinary, business, or leadership.',
    unit: 'count',
    icon: 'BookMarked',
    trackingMethod: 'manual_count',
  },
  {
    type: 'courses_completed',
    label: 'Courses Completed',
    description: 'Complete online or in-person courses this year.',
    unit: 'count',
    icon: 'Award',
    trackingMethod: 'manual_count',
  },
  // ── Health & Wellbeing ─────────────────────────────────────────────────────
  {
    type: 'weekly_workouts',
    label: 'Weekly Workouts',
    description: 'Stay physically fit — track workouts per week on average.',
    unit: 'count',
    icon: 'Dumbbell',
    trackingMethod: 'manual_count',
  },
  {
    type: 'rest_days_taken',
    label: 'Rest Days Taken',
    description: 'Schedule real days off. A rested chef cooks better.',
    unit: 'count',
    icon: 'Sunset',
    trackingMethod: 'manual_count',
  },
  // ── Work-Life Balance ──────────────────────────────────────────────────────
  {
    type: 'family_dinners',
    label: 'Family Dinners',
    description: 'Cook at home for your family — not as a job.',
    unit: 'count',
    icon: 'Home',
    trackingMethod: 'manual_count',
  },
  {
    type: 'vacation_days',
    label: 'Vacation Days',
    description: 'Fully disconnect. Track real vacation days taken.',
    unit: 'count',
    icon: 'Plane',
    trackingMethod: 'manual_count',
  },
  // ── Community ──────────────────────────────────────────────────────────────
  {
    type: 'charity_events',
    label: 'Charity Events',
    description: 'Cook pro bono for your community or a cause you believe in.',
    unit: 'count',
    icon: 'Heart',
    trackingMethod: 'manual_count',
  },
  {
    type: 'meals_donated',
    label: 'Meals Donated',
    description: 'Track meals prepared for food banks, shelters, or donation programs.',
    unit: 'count',
    icon: 'Soup',
    trackingMethod: 'manual_count',
  },
]
