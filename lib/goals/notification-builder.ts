import type { ClientSuggestion } from './types'

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

  const title = eventsNeeded === 1
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

// ── Non-revenue goal nudge ────────────────────────────────────────────────────

export function buildCountGoalNudgeMessage(input: {
  goalLabel: string
  gapValue: number
  unit: string
}): { title: string; body: string } {
  const { goalLabel, gapValue, unit } = input
  return {
    title: `${gapValue} ${unit}${gapValue === 1 ? '' : 's'} to go on your ${goalLabel}`,
    body: `You're ${gapValue} ${unit}${gapValue === 1 ? '' : 's'} away from hitting your ${goalLabel} goal.`,
  }
}
