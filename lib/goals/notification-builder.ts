import type { ClientSuggestion, GoalType, GoalView, GoalCategory } from './types'
import { formatGoalUnit } from './engine'

function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

// ── Revenue goal nudge notification ──────────────────────────────────────────
// Builds a rich notification message that names specific clients to reach out to.

export function buildGoalNudgeMessage(input: {
  goalLabel: string
  eventsNeeded: number
  avgBookingValueCents: number
  gapCents: number
  topSuggestions: ClientSuggestion[]
}): { title: string; body: string } {
  const { goalLabel, eventsNeeded, avgBookingValueCents, gapCents, topSuggestions } = input

  const title =
    eventsNeeded === 1
      ? `1 dinner away from your ${goalLabel}`
      : `${eventsNeeded} dinners to hit your ${goalLabel}`

  const gapStr = dollars(gapCents)
  const avgStr = dollars(avgBookingValueCents)

  let body = `You're ${gapStr} away. At your ${avgStr} average, ${eventsNeeded} event${eventsNeeded === 1 ? '' : 's'} closes it.`

  const actionable = topSuggestions.filter((s) => s.status === 'pending').slice(0, 3)
  if (actionable.length > 0) {
    const names = actionable.map((s) => {
      if (s.daysDormant !== null && s.daysDormant > 0) {
        return `${s.clientName} (dormant ${s.daysDormant}d, ${dollars(s.avgSpendCents)} avg)`
      }
      return `${s.clientName} (ready to rebook, ${dollars(s.avgSpendCents)} avg)`
    })
    body += ` Start with: ${names.join('; ')}.`
  }

  return { title, body }
}

// ── Non-revenue count/metric goal nudge ───────────────────────────────────────

export function buildCountGoalNudgeMessage(input: {
  goalLabel: string
  gapValue: number
  goalType: GoalType
}): { title: string; body: string } {
  const { goalLabel, gapValue, goalType } = input
  const unit = formatGoalUnit(goalType)
  const plural = gapValue === 1 ? unit : unit.endsWith('s') ? unit : `${unit}s`
  return {
    title: `${gapValue} ${plural} to go on your ${goalLabel}`,
    body: `You're ${gapValue} ${plural} away from hitting your ${goalLabel} goal.`,
  }
}

// ── Milestone celebration ─────────────────────────────────────────────────────

export function buildGoalMilestoneMessage(input: {
  goalLabel: string
  progressPercent: number
}): { title: string; body: string } | null {
  const { goalLabel, progressPercent } = input

  if (progressPercent >= 100) {
    return {
      title: `You hit your ${goalLabel} goal! 🎉`,
      body: `You reached 100%. Fantastic work - consider raising the bar for next period.`,
    }
  }
  if (progressPercent >= 75) {
    return {
      title: `75% there on your ${goalLabel}`,
      body: `Three-quarters of the way. You've got this.`,
    }
  }
  if (progressPercent >= 50) {
    return {
      title: `Halfway on your ${goalLabel}`,
      body: `50% complete. Stay the course.`,
    }
  }
  if (progressPercent >= 25) {
    return {
      title: `25% in on your ${goalLabel}`,
      body: `Good start. Keep building momentum.`,
    }
  }
  return null
}

// ── Weekly digest ─────────────────────────────────────────────────────────────
// Sunday evening summary across all active goals, grouped by category.

export function buildWeeklyDigestMessage(input: {
  goalViews: GoalView[]
  enabledCategories: GoalCategory[]
}): { title: string; body: string } {
  const { goalViews, enabledCategories } = input

  const onTrack = goalViews.filter((v) => v.progress.progressPercent >= 100)
  const ahead = goalViews.filter(
    (v) => v.progress.progressPercent >= 75 && v.progress.progressPercent < 100
  )
  const behind = goalViews.filter((v) => v.progress.progressPercent < 50)

  const title = `Your weekly goals summary`

  const parts: string[] = []
  if (onTrack.length > 0) {
    parts.push(`✅ On track: ${onTrack.map((v) => v.goal.label).join(', ')}`)
  }
  if (ahead.length > 0) {
    parts.push(
      `🟡 Almost there: ${ahead.map((v) => `${v.goal.label} (${v.progress.progressPercent}%)`).join(', ')}`
    )
  }
  if (behind.length > 0) {
    parts.push(
      `🔴 Needs attention: ${behind.map((v) => `${v.goal.label} (${v.progress.progressPercent}%)`).join(', ')}`
    )
  }
  if (parts.length === 0) {
    parts.push(
      `You have ${goalViews.length} active goal${goalViews.length === 1 ? '' : 's'}. Tap to review your progress.`
    )
  }

  const categorySummary =
    enabledCategories.length > 2 ? ` Tracking ${enabledCategories.length} life categories.` : ''

  return {
    title,
    body: parts.join(' ') + categorySummary,
  }
}
