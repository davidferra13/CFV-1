// Menu Performance Types
// Used by: lib/menus/performance-actions.ts
// Aggregated analytics types for menu and dish performance

// ── Menu-level performance ────────────────────────────────────────────────

export type MenuPerformance = {
  menuId: string
  menuName: string
  status: string
  serviceStyle: string | null
  season: string | null
  isTemplate: boolean
  timesServed: number
  avgRevenueCents: number
  avgRating: number | null
  reuseCount: number
  lastServedAt: string | null
  createdAt: string
}

export type MenuPerformanceDetail = {
  menuId: string
  menuName: string
  description: string | null
  status: string
  serviceStyle: string | null
  season: string | null
  isTemplate: boolean
  forkCount: number
  events: MenuEventRecord[]
  dishPerformance: DishInMenuPerformance[]
  costAnalysis: MenuCostAnalysis | null
}

export type MenuEventRecord = {
  eventId: string
  eventDate: string
  clientName: string | null
  guestCount: number
  revenueCents: number
  feedbackRating: number | null
  feedbackText: string | null
}

export type DishInMenuPerformance = {
  dishName: string
  category: string | null
  timesSold: number
  totalRevenueCents: number
  foodCostPct: number | null
  profitPerUnitCents: number | null
}

export type MenuCostAnalysis = {
  totalRevenueCents: number
  totalFoodCostCents: number
  foodCostPct: number
  avgRevenuePerEventCents: number
  avgRevenuePerGuestCents: number
  eventCount: number
  totalGuests: number
}

// ── Dish-level performance ────────────────────────────────────────────────

export type DishRanking = {
  dishId: string
  dishName: string
  course: string
  timesServed: number
  avgRating: number | null
  feedbackCount: number
  isSignature: boolean
  rotationStatus: string
  lastServed: string | null
  seasonAffinity: string[]
}

// ── Seasonal trends ───────────────────────────────────────────────────────

export type SeasonalTrend = {
  season: string
  eventCount: number
  totalRevenueCents: number
  avgRevenueCents: number
  avgRating: number | null
  avgGuestCount: number
}

// ── Composite metrics ─────────────────────────────────────────────────────

export type PerformanceMetrics = {
  totalMenus: number
  totalEvents: number
  totalRevenueCents: number
  avgRevenuePerEventCents: number
  avgRating: number | null
  topSeason: string | null
  retirementCandidateCount: number
}
