// Pure utility helpers for event labels - no 'use server', no async.

import type { ChefEventTypeLabel, EventLabelType } from './label-actions'

// The built-in labels that chefs can override
export const DEFAULT_OCCASION_TYPES: readonly string[] = [
  'Wedding',
  'Birthday',
  'Corporate',
  'Dinner Party',
  'Holiday',
  'Other',
] as const

// The 8 FSM states (display form)
export const DEFAULT_STATUS_LABELS: readonly string[] = [
  'draft',
  'proposed',
  'accepted',
  'paid',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
] as const

/**
 * Builds a resolved label map for a given label type.
 * Pass in the existing DB rows; returns a Record<defaultLabel, displayLabel>.
 */
export function buildLabelMap(
  rows: ChefEventTypeLabel[],
  labelType: EventLabelType,
  defaults: readonly string[]
): Record<string, string> {
  const map: Record<string, string> = {}
  const rowMap = new Map(
    rows.filter((r) => r.label_type === labelType).map((r) => [r.default_label, r.custom_label])
  )
  for (const d of defaults) {
    map[d] = rowMap.get(d) ?? d
  }
  return map
}
