// Collector: Completion Contract -> CurrentUnit[]
// Turns incomplete event CompletionResults into CurrentUnits.

import type { CompletionResult } from '@/lib/completion/types'
import type { CurrentUrgency, CurrentUnit } from '../types'

interface EventContext {
  eventId: string
  eventName: string
  eventDate: string | null
}

function urgencyFromScore(score: number, eventDate: string | null): CurrentUrgency {
  const daysUntil = eventDate
    ? (new Date(eventDate + 'T00:00:00').getTime() - Date.now()) / 86400000
    : null

  // Event within 3 days with low completion = critical
  if (daysUntil != null && daysUntil < 3 && score < 70) return 'critical'
  if (daysUntil != null && daysUntil < 7 && score < 50) return 'high'
  if (score < 40) return 'high'
  if (score < 70) return 'normal'
  return 'low'
}

function mapResult(result: CompletionResult, ctx: EventContext): CurrentUnit | null {
  // Don't surface complete events
  if (result.status === 'complete') return null
  if (!result.nextAction) return null

  return {
    id: `completion:event:${ctx.eventId}`,
    category: 'completion',
    urgency: urgencyFromScore(result.score, ctx.eventDate),
    title: `${ctx.eventName}: ${result.nextAction.label}`,
    description: `Event readiness: ${result.score}%${result.blockingRequirements.length > 0 ? ` (${result.blockingRequirements.length} blocking)` : ''}`,
    href: result.nextAction.url,
    actions: [{ label: result.nextAction.label, href: result.nextAction.url }],
    score: 0,
    source: 'completion',
    entityId: ctx.eventId,
    entityType: 'event',
    contextLines: [
      ctx.eventDate
        ? `Event: ${new Date(ctx.eventDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : 'No date set',
      `${result.missingRequirements.length} items remaining`,
    ],
    estimatedMinutes: null,
    dueAt: ctx.eventDate ? new Date(ctx.eventDate + 'T00:00:00').toISOString() : null,
    revenueCents: null,
    createdAt: new Date().toISOString(),
  }
}

export function collectFromCompletionResults(
  results: { result: CompletionResult; ctx: EventContext }[]
): CurrentUnit[] {
  const units: CurrentUnit[] = []
  for (const { result, ctx } of results) {
    const unit = mapResult(result, ctx)
    if (unit) units.push(unit)
  }
  return units
}
