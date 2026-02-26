import type {
  RevenueGoalCustomProgress,
  RevenueGoalNudgeLevel,
  RevenueGoalRangeProgress,
  RevenueGoalRecommendation,
} from './types'

export type BuildRevenueGoalRangeProgressInput = {
  start: string
  end: string
  targetCents: number
  realizedCents: number
  projectedCents: number
}

export function buildRangeProgress(
  input: BuildRevenueGoalRangeProgressInput
): RevenueGoalRangeProgress {
  const target = Math.max(0, Math.round(input.targetCents))
  const realized = Math.max(0, Math.round(input.realizedCents))
  const projected = Math.max(realized, Math.round(input.projectedCents))
  const gap = Math.max(0, target - projected)
  const progressPercent = target > 0 ? Math.min(999, Math.round((projected / target) * 100)) : 0

  return {
    start: input.start,
    end: input.end,
    targetCents: target,
    realizedCents: realized,
    projectedCents: projected,
    gapCents: gap,
    progressPercent,
  }
}

export function computeDinnersNeeded(gapCents: number, averageBookingValueCents: number): number {
  if (gapCents <= 0) return 0
  if (averageBookingValueCents <= 0) return 0
  return Math.ceil(gapCents / averageBookingValueCents)
}

export function applyPipelineWeight(
  quotesTotalCents: number,
  inquiriesTotalCents: number,
  nudgeLevel: RevenueGoalNudgeLevel
): number {
  const quoteWeight = nudgeLevel === 'aggressive' ? 0.55 : nudgeLevel === 'standard' ? 0.45 : 0.35
  const inquiryWeight = nudgeLevel === 'aggressive' ? 0.35 : nudgeLevel === 'standard' ? 0.25 : 0.15
  return Math.round(quotesTotalCents * quoteWeight + inquiriesTotalCents * inquiryWeight)
}

function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

export function buildRevenueGoalRecommendations(input: {
  monthlyGapCents: number
  monthlyTargetCents: number
  dinnersNeededThisMonth: number
  avgBookingValueCents: number
  openDatesThisMonth: string[]
  dormantClientNames: string[]
  customGoals: RevenueGoalCustomProgress[]
}): RevenueGoalRecommendation[] {
  const recs: RevenueGoalRecommendation[] = []

  if (input.monthlyGapCents > 0 && input.dinnersNeededThisMonth > 0) {
    recs.push({
      id: 'monthly-gap-bookings',
      title: `${input.dinnersNeededThisMonth} dinner${input.dinnersNeededThisMonth === 1 ? '' : 's'} needed this month`,
      description: `You are ${dollars(input.monthlyGapCents)} below target. At your average booking value (${dollars(input.avgBookingValueCents)}), this is the fastest path to close the gap.`,
      href: '/inquiries',
      severity: 'high',
      confidence: 0.95,
      metadata: {
        gap_cents: input.monthlyGapCents,
        dinners_needed: input.dinnersNeededThisMonth,
      },
    })
  }

  if (input.monthlyGapCents > 0 && input.openDatesThisMonth.length > 0) {
    const dates = input.openDatesThisMonth.slice(0, 3).join(', ')
    recs.push({
      id: 'open-dates-promotion',
      title: `${input.openDatesThisMonth.length} open date${input.openDatesThisMonth.length === 1 ? '' : 's'} left this month`,
      description: `Push availability on ${dates}${input.openDatesThisMonth.length > 3 ? ', ...' : ''} to close revenue gap without overbooking.`,
      href: '/schedule',
      severity: 'normal',
      confidence: 0.88,
      metadata: {
        open_dates: input.openDatesThisMonth,
      },
    })
  }

  if (input.monthlyGapCents > 0 && input.dormantClientNames.length > 0) {
    recs.push({
      id: 'dormant-client-reengagement',
      title: 'Re-engage high-value dormant clients',
      description: `Start with ${input.dormantClientNames.slice(0, 3).join(', ')}. They have prior purchase history and can convert faster than cold leads.`,
      href: '/clients/insights/at-risk',
      severity: 'normal',
      confidence: 0.82,
      metadata: {
        clients: input.dormantClientNames,
      },
    })
  }

  for (const goal of input.customGoals) {
    if (!goal.enabled || goal.range.gapCents <= 0) continue
    recs.push({
      id: `custom-goal-${goal.id}`,
      title: `Custom goal behind: ${goal.label}`,
      description: `${goal.label} is ${dollars(goal.range.gapCents)} below target for this period.`,
      href: '/financials',
      severity: 'normal',
      confidence: 0.8,
      metadata: {
        goal_id: goal.id,
        gap_cents: goal.range.gapCents,
      },
    })
  }

  if (recs.length === 0 && input.monthlyTargetCents > 0) {
    recs.push({
      id: 'on-track-maintain',
      title: 'On track to hit goal',
      description:
        'Current trajectory is healthy. Keep conversion velocity steady and protect open premium dates.',
      href: '/financials',
      severity: 'low',
      confidence: 0.9,
    })
  }

  return recs
}
