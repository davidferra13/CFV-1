/**
 * Central contract for allowed homepage discovery rail destinations.
 *
 * Every rail item rendered in the homepage marquee must pass through
 * validateRailItemDestination() before rendering as a link. Items
 * that fail validation should be omitted, not rendered as dead links.
 */

import {
  validateDiscoveryDestination,
  type DiscoveryDestinationFamily,
  type DiscoveryDestinationValidation,
} from '@/lib/discovery/discovery-destination-contract'
import { discoveryHrefHasPrivateIdentifier } from '@/lib/discovery/rail-contract-registry'
import type { DiscoveryItemType, DiscoveryRailItem } from '@/lib/discovery/homepage-discovery-rail'

export type RailDestinationValidation = {
  valid: boolean
  family: DiscoveryDestinationFamily | null
  privateIdLeak: boolean
  reason: string
}

/**
 * Validates a single rail item's destination href against the destination
 * contract. Returns whether the item should render as a navigable link.
 */
export function validateRailItemDestination(
  item: Pick<DiscoveryRailItem, 'type' | 'href'>
): RailDestinationValidation {
  const privateIdLeak = discoveryHrefHasPrivateIdentifier(item.href)
  if (privateIdLeak) {
    return {
      valid: false,
      family: null,
      privateIdLeak,
      reason: `Rail item leaks a private identifier: ${item.type} -> ${item.href}`,
    }
  }

  const destination = validateDiscoveryDestination(item.type, item.href)
  return {
    valid: destination.valid,
    family: destination.family,
    privateIdLeak: false,
    reason: destination.reason,
  }
}

/**
 * Filters an array of rail items, removing any that route to invalid or
 * private destinations. Items without a valid public destination are dropped.
 */
export function filterValidRailDestinations<T extends DiscoveryRailItem>(items: T[]): T[] {
  return items.filter((item) => validateRailItemDestination(item).valid)
}

/**
 * Validates all items in a collection and returns a report of any items
 * with invalid destinations. Used by tests and admin analytics.
 */
export function auditRailDestinations(
  items: Pick<DiscoveryRailItem, 'type' | 'label' | 'href'>[]
): { valid: typeof items; invalid: Array<{ item: (typeof items)[number]; reason: string }> } {
  const valid: typeof items = []
  const invalid: Array<{ item: (typeof items)[number]; reason: string }> = []

  for (const item of items) {
    const result = validateRailItemDestination(item)
    if (result.valid) {
      valid.push(item)
    } else {
      invalid.push({ item, reason: result.reason })
    }
  }

  return { valid, invalid }
}
