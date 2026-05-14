export type DiscoveryDataClass =
  | 'menu'
  | 'hours'
  | 'website_reachability'
  | 'operator_status'
  | 'event_status'
  | 'price'
  | 'photos'
  | 'geocode'
  | 'claimed_profile'
  | 'chef_availability'
  | 'source_adapter_health'

export type DiscoveryFreshnessState = 'fresh' | 'aging' | 'stale' | 'unknown' | 'invalid'

export type DiscoveryFreshnessThreshold = {
  freshHours: number
  staleHours: number
}

export type DiscoveryFreshnessInput = {
  dataClass: DiscoveryDataClass
  checkedAt?: string | Date | null
  changedAt?: string | Date | null
  currentAt?: string | Date
  eventStartsAt?: string | Date | null
  eventEndsAt?: string | Date | null
  eventStatus?: 'scheduled' | 'postponed' | 'cancelled' | 'ended' | null
  operatorStatus?: 'open' | 'closed' | 'temporarily_closed' | 'unknown' | null
}

export type DiscoveryFreshnessEvaluation = {
  state: DiscoveryFreshnessState
  ageHours: number | null
  checkedAt: string | null
  threshold: DiscoveryFreshnessThreshold
  canSupportFreshClaim: boolean
  reason: string
}

export const DISCOVERY_FRESHNESS_THRESHOLDS: Record<
  DiscoveryDataClass,
  DiscoveryFreshnessThreshold
> = {
  menu: { freshHours: 72, staleHours: 14 * 24 },
  hours: { freshHours: 7 * 24, staleHours: 30 * 24 },
  website_reachability: { freshHours: 48, staleHours: 7 * 24 },
  operator_status: { freshHours: 7 * 24, staleHours: 45 * 24 },
  event_status: { freshHours: 12, staleHours: 48 },
  price: { freshHours: 7 * 24, staleHours: 30 * 24 },
  photos: { freshHours: 90 * 24, staleHours: 365 * 24 },
  geocode: { freshHours: 180 * 24, staleHours: 730 * 24 },
  claimed_profile: { freshHours: 30 * 24, staleHours: 180 * 24 },
  chef_availability: { freshHours: 24, staleHours: 7 * 24 },
  source_adapter_health: { freshHours: 24, staleHours: 72 },
}

export function classifyDiscoveryFreshness(
  input: DiscoveryFreshnessInput
): DiscoveryFreshnessEvaluation {
  const currentAt = parseDate(input.currentAt) ?? new Date()
  const threshold = DISCOVERY_FRESHNESS_THRESHOLDS[input.dataClass]

  if (input.operatorStatus === 'closed') {
    return result('invalid', null, null, threshold, 'Operator is closed.')
  }

  if (input.dataClass === 'event_status') {
    const eventState = classifyEventFreshness(input, currentAt, threshold)
    if (eventState) return eventState
  }

  const checkedAt = parseDate(input.changedAt) ?? parseDate(input.checkedAt)
  if (!checkedAt) {
    return result('unknown', null, null, threshold, 'No freshness timestamp is available.')
  }

  const ageHours = hoursBetween(checkedAt, currentAt)
  if (ageHours < 0) {
    return result(
      'invalid',
      ageHours,
      checkedAt.toISOString(),
      threshold,
      'Timestamp is in the future.'
    )
  }
  if (ageHours <= threshold.freshHours) {
    return result(
      'fresh',
      ageHours,
      checkedAt.toISOString(),
      threshold,
      'Within the fresh SLA window.'
    )
  }
  if (ageHours <= threshold.staleHours) {
    return result(
      'aging',
      ageHours,
      checkedAt.toISOString(),
      threshold,
      'Past fresh SLA but still usable with caution.'
    )
  }

  return result('stale', ageHours, checkedAt.toISOString(), threshold, 'Past stale SLA window.')
}

function classifyEventFreshness(
  input: DiscoveryFreshnessInput,
  currentAt: Date,
  threshold: DiscoveryFreshnessThreshold
): DiscoveryFreshnessEvaluation | null {
  if (input.eventStatus === 'cancelled' || input.eventStatus === 'ended') {
    return result('invalid', null, null, threshold, `Event is ${input.eventStatus}.`)
  }

  const eventEndsAt = parseDate(input.eventEndsAt)
  const eventStartsAt = parseDate(input.eventStartsAt)
  if (eventEndsAt && eventEndsAt.getTime() < currentAt.getTime()) {
    return result(
      'invalid',
      hoursBetween(eventEndsAt, currentAt),
      eventEndsAt.toISOString(),
      threshold,
      'Event has ended.'
    )
  }
  if (eventStartsAt && eventStartsAt.getTime() < currentAt.getTime()) {
    return result(
      'aging',
      hoursBetween(eventStartsAt, currentAt),
      eventStartsAt.toISOString(),
      threshold,
      'Event is in progress or recently started.'
    )
  }

  return null
}

function result(
  state: DiscoveryFreshnessState,
  ageHours: number | null,
  checkedAt: string | null,
  threshold: DiscoveryFreshnessThreshold,
  reason: string
): DiscoveryFreshnessEvaluation {
  return {
    state,
    ageHours: ageHours === null ? null : round(ageHours),
    checkedAt,
    threshold,
    canSupportFreshClaim: state === 'fresh',
    reason,
  }
}

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function hoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
