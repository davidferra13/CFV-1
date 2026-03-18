// Scope Drift Detection - pure computation, no DB access, no 'use server'
// Compares an original quote snapshot to current event state and flags
// material changes that may require a change order.

export type ScopeDriftChange = {
  field: string
  original: string | number
  current: string | number
  deltaPercent?: number
}

export type ScopeDriftResult = {
  hasDrift: boolean
  changes: ScopeDriftChange[]
}

type EventSnapshot = {
  guest_count?: number | null
  total_cents?: number | null
  service_hours?: number | null
  event_type?: string | null
}

/**
 * Detect whether the current event has drifted materially from the original quote.
 *
 * Thresholds:
 *   - guest_count: >10% change
 *   - total_cents: >15% change
 *   - service_hours: >20% change
 *   - event_type: any change
 */
export function detectScopeDrift(
  originalQuote: EventSnapshot,
  currentEvent: EventSnapshot
): ScopeDriftResult {
  const changes: ScopeDriftChange[] = []

  // Guest count drift (>10%)
  if (
    originalQuote.guest_count != null &&
    currentEvent.guest_count != null &&
    originalQuote.guest_count > 0
  ) {
    const delta = Math.abs(currentEvent.guest_count - originalQuote.guest_count)
    const deltaPercent = (delta / originalQuote.guest_count) * 100
    if (deltaPercent > 10) {
      changes.push({
        field: 'Guest Count',
        original: originalQuote.guest_count,
        current: currentEvent.guest_count,
        deltaPercent: Math.round(deltaPercent),
      })
    }
  }

  // Total price drift (>15%)
  if (
    originalQuote.total_cents != null &&
    currentEvent.total_cents != null &&
    originalQuote.total_cents > 0
  ) {
    const delta = Math.abs(currentEvent.total_cents - originalQuote.total_cents)
    const deltaPercent = (delta / originalQuote.total_cents) * 100
    if (deltaPercent > 15) {
      changes.push({
        field: 'Total Price',
        original: formatCents(originalQuote.total_cents),
        current: formatCents(currentEvent.total_cents),
        deltaPercent: Math.round(deltaPercent),
      })
    }
  }

  // Service hours drift (>20%)
  if (
    originalQuote.service_hours != null &&
    currentEvent.service_hours != null &&
    originalQuote.service_hours > 0
  ) {
    const delta = Math.abs(currentEvent.service_hours - originalQuote.service_hours)
    const deltaPercent = (delta / originalQuote.service_hours) * 100
    if (deltaPercent > 20) {
      changes.push({
        field: 'Service Hours',
        original: `${originalQuote.service_hours}h`,
        current: `${currentEvent.service_hours}h`,
        deltaPercent: Math.round(deltaPercent),
      })
    }
  }

  // Event type change (any change)
  if (
    originalQuote.event_type != null &&
    currentEvent.event_type != null &&
    originalQuote.event_type !== currentEvent.event_type
  ) {
    changes.push({
      field: 'Event Type',
      original: originalQuote.event_type,
      current: currentEvent.event_type,
    })
  }

  return {
    hasDrift: changes.length > 0,
    changes,
  }
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
