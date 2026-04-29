import { evaluateCallOutcomeQuality } from '@/lib/calls/outcome-quality'

export type ClientCallMemoryCall = {
  id: string
  call_type: string
  scheduled_at: string
  duration_minutes: number | null
  status: string
  title: string | null
  outcome_summary: string | null
  call_notes: string | null
  next_action: string | null
  next_action_due_at: string | null
  actual_duration_minutes: number | null
}

export type ClientCallMemoryItem = {
  id: string
  label: string
  href: string
  status: string
  scheduledAt: string
  detail: string
}

export type ClientCallMemorySnapshot = {
  totalCalls: number
  completedCalls: number
  missedCalls: number
  upcomingCalls: number
  missingOutcomes: number
  weakOutcomes: number
  averageOutcomeQuality: number | null
  relationshipTemperature: 'new' | 'warm' | 'needs_attention' | 'quiet'
  preferredTouch: string
  lastCall: ClientCallMemoryItem | null
  nextCall: ClientCallMemoryItem | null
  unresolvedPromises: ClientCallMemoryItem[]
  recentCalls: ClientCallMemoryItem[]
}

export function buildClientCallMemorySnapshot(
  calls: ClientCallMemoryCall[],
  now = new Date()
): ClientCallMemorySnapshot {
  const sorted = [...calls].sort((a, b) => toMs(b.scheduled_at) - toMs(a.scheduled_at))
  const completed = sorted.filter((call) => call.status === 'completed')
  const missed = sorted.filter((call) => call.status === 'no_show')
  const upcoming = sorted
    .filter((call) => ['scheduled', 'confirmed'].includes(call.status) && toMs(call.scheduled_at) >= now.getTime())
    .sort((a, b) => toMs(a.scheduled_at) - toMs(b.scheduled_at))
  const past = sorted.filter((call) => toMs(call.scheduled_at) <= now.getTime())
  const outcomeQualities = completed.map((call) => evaluateCallOutcomeQuality(call))
  const missingOutcomes = outcomeQualities.filter((quality) => quality.level === 'missing').length
  const weakOutcomes = outcomeQualities.filter((quality) => quality.level === 'weak').length
  const qualityScores = outcomeQualities.map((quality) => quality.score)

  const lastCompleted = completed.at(0) ?? null
  const lastAny = past.at(0) ?? sorted.at(0) ?? null

  return {
    totalCalls: sorted.length,
    completedCalls: completed.length,
    missedCalls: missed.length,
    upcomingCalls: upcoming.length,
    missingOutcomes,
    weakOutcomes,
    averageOutcomeQuality: qualityScores.length > 0 ? Math.round(average(qualityScores)) : null,
    relationshipTemperature: relationshipTemperature({
      totalCalls: sorted.length,
      completedCalls: completed.length,
      missedCalls: missed.length,
      missingOutcomes,
      weakOutcomes,
      lastCompletedAt: lastCompleted?.scheduled_at ?? null,
      now,
    }),
    preferredTouch: preferredTouchLabel(completed.length, upcoming.length),
    lastCall: lastAny ? toItem(lastAny) : null,
    nextCall: upcoming[0] ? toItem(upcoming[0]) : null,
    unresolvedPromises: sorted
      .filter((call) => call.status === 'completed' && hasText(call.next_action))
      .slice(0, 3)
      .map(toItem),
    recentCalls: sorted.slice(0, 5).map(toItem),
  }
}

function relationshipTemperature(input: {
  totalCalls: number
  completedCalls: number
  missedCalls: number
  missingOutcomes: number
  weakOutcomes: number
  lastCompletedAt: string | null
  now: Date
}): ClientCallMemorySnapshot['relationshipTemperature'] {
  if (input.totalCalls === 0) return 'new'
  if (input.missingOutcomes > 0 || input.weakOutcomes > 1 || input.missedCalls > 0) {
    return 'needs_attention'
  }
  if (!input.lastCompletedAt) return 'quiet'
  const ageDays = (input.now.getTime() - toMs(input.lastCompletedAt)) / 864e5
  if (input.completedCalls >= 2 && ageDays <= 45) return 'warm'
  if (ageDays > 90) return 'quiet'
  return 'warm'
}

function preferredTouchLabel(completedCalls: number, upcomingCalls: number): string {
  if (completedCalls >= 3) return 'Phone works well for this relationship'
  if (upcomingCalls > 0) return 'Upcoming call already scheduled'
  if (completedCalls > 0) return 'Call history exists, confirm preference next time'
  return 'No call pattern yet'
}

function toItem(call: ClientCallMemoryCall): ClientCallMemoryItem {
  return {
    id: call.id,
    label: call.title?.trim() || formatCallType(call.call_type),
    href: `/calls/${call.id}`,
    status: call.status,
    scheduledAt: call.scheduled_at,
    detail:
      call.next_action ??
      call.outcome_summary ??
      call.call_notes ??
      `${formatCallType(call.call_type)} call is ${call.status.replace(/_/g, ' ')}.`,
  }
}

function formatCallType(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function toMs(value: string): number {
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}
