export type CollabTrustLevel = 'partner' | 'preferred' | 'inner_circle'
export type CollabHandoffStatus = 'open' | 'partially_accepted' | 'closed' | 'cancelled' | 'expired'
export type CollabHandoffRecipientStatus =
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'converted'
export type CollabAvailabilityStatus = 'available' | 'limited' | 'unavailable'

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().trim()
}

function toCuisineSet(cuisines: string[] | undefined): Set<string> {
  return new Set((cuisines ?? []).map((value) => normalizeText(value)).filter(Boolean))
}

export function deriveHandoffStatusFromRecipientStatuses(
  statuses: CollabHandoffRecipientStatus[]
): CollabHandoffStatus {
  if (statuses.length === 0) return 'open'
  const hasPending = statuses.some((status) => status === 'sent' || status === 'viewed')
  const hasPositive = statuses.some((status) => status === 'accepted' || status === 'converted')

  if (hasPending && hasPositive) return 'partially_accepted'
  if (!hasPending) return 'closed'
  return 'open'
}

export function isCollabHandoffActionable(status: CollabHandoffStatus): boolean {
  return status === 'open' || status === 'partially_accepted'
}

export function hasCollabHandoffExpired(
  expiresAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!expiresAt) return false
  const expiresAtMs = Date.parse(expiresAt)
  if (!Number.isFinite(expiresAtMs)) return false
  return expiresAtMs <= now.getTime()
}

export function scoreCollabRecipientSuggestion(input: {
  trustLevel: CollabTrustLevel | null
  signal: {
    date_start: string
    date_end: string
    region_text: string | null
    cuisines: string[]
    max_guest_count: number | null
    status: CollabAvailabilityStatus
  } | null
  eventDate: string | null
  guestCount: number | null
  locationText: string | null
  cuisines: string[]
}): { score: number; reasons: string[]; hasActiveSignal: boolean } {
  let score = 10
  const reasons: string[] = []

  if (input.trustLevel === 'inner_circle') {
    score += 40
    reasons.push('Inner circle trust')
  } else if (input.trustLevel === 'preferred') {
    score += 30
    reasons.push('Preferred trust level')
  } else if (input.trustLevel === 'partner') {
    score += 20
    reasons.push('Partner trust level')
  }

  const signal = input.signal
  if (!signal) return { score, reasons, hasActiveSignal: false }

  if (signal.status === 'available') {
    score += 20
    reasons.push('Marked available')
  } else if (signal.status === 'limited') {
    score += 10
    reasons.push('Marked limited availability')
  } else {
    score -= 20
    reasons.push('Marked unavailable')
  }

  if (input.eventDate) {
    if (signal.date_start <= input.eventDate && signal.date_end >= input.eventDate) {
      score += 14
      reasons.push('Availability window matches event date')
    } else {
      score -= 6
    }
  }

  if (input.guestCount && signal.max_guest_count) {
    if (signal.max_guest_count >= input.guestCount) {
      score += 8
      reasons.push(`Capacity up to ${signal.max_guest_count} guests`)
    } else {
      score -= 8
      reasons.push(`Capacity capped at ${signal.max_guest_count} guests`)
    }
  }

  const location = normalizeText(input.locationText)
  const region = normalizeText(signal.region_text)
  if (location && region && (location.includes(region) || region.includes(location))) {
    score += 6
    reasons.push('Region match')
  }

  const wantedCuisineSet = toCuisineSet(input.cuisines)
  if (wantedCuisineSet.size > 0) {
    const availableCuisineSet = toCuisineSet(signal.cuisines)
    const overlap = Array.from(wantedCuisineSet).filter((cuisine) =>
      availableCuisineSet.has(cuisine)
    )
    if (overlap.length > 0) {
      score += Math.min(12, overlap.length * 4)
      reasons.push(`Cuisine overlap: ${overlap.join(', ')}`)
    }
  }

  return { score, reasons, hasActiveSignal: true }
}
