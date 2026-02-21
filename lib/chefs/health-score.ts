// Chef Health Score — computed from existing data, no additional DB queries
// Used in admin panel to surface at-risk or stalled chefs at a glance.
//
// Dimensions:
//   Activity  (30 pts) — recent event throughput
//   Revenue   (25 pts) — GMV level
//   Clients   (25 pts) — client roster size
//   Setup     (20 pts) — account completeness / age vs usage

export type ChefHealthTier = 'thriving' | 'active' | 'building' | 'stalled' | 'at_risk'

export interface ChefHealthScore {
  score: number
  tier: ChefHealthTier
  activityScore: number  // 0–30
  revenueScore: number   // 0–25
  clientScore: number    // 0–25
  setupScore: number     // 0–20
}

export interface ChefHealthInput {
  eventCount: number
  /** Events completed or in_progress in the last 90 days (optional — falls back to total). */
  recentEventCount?: number
  clientCount: number
  gmvCents: number
  daysSinceSignup: number
  hasBusinessName: boolean
}

export function computeChefHealthScore({
  eventCount,
  recentEventCount,
  clientCount,
  gmvCents,
  daysSinceSignup,
  hasBusinessName,
}: ChefHealthInput): ChefHealthScore {
  // Activity (30 pts) — favour recent usage
  const recent = recentEventCount ?? Math.min(eventCount, 5) // estimate if not provided
  const activityScore =
    recent >= 4 ? 30 :
    recent === 3 ? 24 :
    recent === 2 ? 16 :
    recent === 1 ? 8 :
    0

  // Revenue (25 pts)
  const revenueScore =
    gmvCents >= 1_000_000 ? 25 :  // $10k+
    gmvCents >= 500_000   ? 20 :  // $5k+
    gmvCents >= 100_000   ? 14 :  // $1k+
    gmvCents > 0          ? 6 :
    0

  // Clients (25 pts)
  const clientScore =
    clientCount >= 10 ? 25 :
    clientCount >= 5  ? 18 :
    clientCount >= 3  ? 12 :
    clientCount >= 1  ? 6 :
    0

  // Setup (20 pts): completeness + did they use the platform in a reasonable time?
  let setupScore = 0
  if (hasBusinessName) setupScore += 6
  if (eventCount >= 1) setupScore += 7
  if (clientCount >= 1) setupScore += 7
  // Penalty: account > 30 days old with 0 events = cap setup at 6
  if (daysSinceSignup > 30 && eventCount === 0) setupScore = Math.min(setupScore, 6)

  const score = activityScore + revenueScore + clientScore + setupScore

  const tier: ChefHealthTier =
    score >= 80 ? 'thriving' :
    score >= 60 ? 'active' :
    score >= 40 ? 'building' :
    score >= 20 ? 'stalled' :
    'at_risk'

  return { score, tier, activityScore, revenueScore, clientScore, setupScore }
}

export const CHEF_TIER_LABELS: Record<ChefHealthTier, string> = {
  thriving: 'Thriving',
  active:   'Active',
  building: 'Building',
  stalled:  'Stalled',
  at_risk:  'At Risk',
}

export const CHEF_TIER_COLORS: Record<ChefHealthTier, string> = {
  thriving: 'bg-emerald-100 text-emerald-700',
  active:   'bg-blue-100 text-blue-700',
  building: 'bg-brand-100 text-brand-700',
  stalled:  'bg-amber-100 text-amber-700',
  at_risk:  'bg-red-100 text-red-700',
}
