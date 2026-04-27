// Equipment Gap Detection Engine
// Compares loadout requirements against inventory to find gaps.
// Pure function: no side effects, no DB calls.

import type { EquipmentGap, GapSeverity, GapType, LoadoutItemSource } from './types'

interface LoadoutItem {
  name: string
  canonical_name: string | null
  category_slug: string
  quantity: number
  source: LoadoutItemSource
  reason: string[]
  inventory_id?: string
  is_essential: boolean
}

interface InventoryMatch {
  id: string
  name: string
  canonical_name: string | null
  quantity_owned: number
  status: string
  size_label: string | null
}

interface SameDayAllocation {
  equipment_id: string
  event_id: string
}

export interface GapDetectionInput {
  event_id: string
  chef_id: string
  loadout_items: LoadoutItem[]
  inventory: InventoryMatch[]
  same_day_allocations: SameDayAllocation[]
}

// Items that are irreplaceable (venue must have or event cannot proceed)
const IRREPLACEABLE_CATEGORIES = new Set(['oven', 'stovetop', 'refrigerator', 'freezer', 'sink'])

/**
 * Detect equipment gaps from loadout vs inventory.
 * Returns gap records with severity classification.
 */
export function detectGaps(input: GapDetectionInput): EquipmentGap[] {
  const gaps: EquipmentGap[] = []

  for (const item of input.loadout_items) {
    // Skip items already covered
    if (item.source === 'venue' || item.source === 'substitute') continue

    const match = item.inventory_id
      ? input.inventory.find((inv) => inv.id === item.inventory_id)
      : findMatch(item, input.inventory)

    if (!match) {
      // Missing entirely
      gaps.push({
        event_id: input.event_id,
        chef_id: input.chef_id,
        equipment_name: item.name,
        equipment_category: item.category_slug,
        gap_type: 'missing',
        severity: classifySeverity('missing', item.is_essential, item.name),
        quantity_needed: item.quantity,
        quantity_available: 0,
        used_for: item.reason.join('; '),
        status: 'open',
        resolution_note: null,
      })
      continue
    }

    // Check if item is usable
    if (match.status === 'broken') {
      gaps.push({
        event_id: input.event_id,
        chef_id: input.chef_id,
        equipment_name: item.name,
        equipment_category: item.category_slug,
        gap_type: 'broken',
        severity: classifySeverity('broken', item.is_essential, item.name),
        quantity_needed: item.quantity,
        quantity_available: 0,
        used_for: item.reason.join('; '),
        status: 'open',
        resolution_note: null,
      })
      continue
    }

    if (match.status === 'borrowed' || match.status === 'lent_out') {
      gaps.push({
        event_id: input.event_id,
        chef_id: input.chef_id,
        equipment_name: item.name,
        equipment_category: item.category_slug,
        gap_type: 'borrowed_unavailable',
        severity: classifySeverity('borrowed_unavailable', item.is_essential, item.name),
        quantity_needed: item.quantity,
        quantity_available: 0,
        used_for: item.reason.join('; '),
        status: 'open',
        resolution_note: null,
      })
      continue
    }

    // Check double-booking
    const allocatedToOtherEvents = input.same_day_allocations.filter(
      (a) => a.equipment_id === match.id && a.event_id !== input.event_id
    ).length
    const effectiveAvailable = Math.max(0, match.quantity_owned - allocatedToOtherEvents)

    if (allocatedToOtherEvents > 0 && effectiveAvailable < item.quantity) {
      gaps.push({
        event_id: input.event_id,
        chef_id: input.chef_id,
        equipment_name: item.name,
        equipment_category: item.category_slug,
        gap_type: 'double_booked',
        severity: classifySeverity('double_booked', item.is_essential, item.name),
        quantity_needed: item.quantity,
        quantity_available: effectiveAvailable,
        used_for: item.reason.join('; '),
        status: 'open',
        resolution_note: null,
      })
      continue
    }

    // Check quantity
    if (match.quantity_owned < item.quantity) {
      gaps.push({
        event_id: input.event_id,
        chef_id: input.chef_id,
        equipment_name: item.name,
        equipment_category: item.category_slug,
        gap_type: 'insufficient_qty',
        severity: classifySeverity('insufficient_qty', item.is_essential, item.name),
        quantity_needed: item.quantity,
        quantity_available: match.quantity_owned,
        used_for: item.reason.join('; '),
        status: 'open',
        resolution_note: null,
      })
    }
  }

  return gaps
}

/**
 * Classify gap severity based on type, essentiality, and item identity.
 */
function classifySeverity(gapType: GapType, isEssential: boolean, itemName: string): GapSeverity {
  const lowerName = itemName.toLowerCase()

  // Irreplaceable infrastructure items are always critical
  if (IRREPLACEABLE_CATEGORIES.has(lowerName)) return 'critical'

  // Non-essential items are always nice-to-have
  if (!isEssential) return 'nice_to_have'

  switch (gapType) {
    case 'missing':
      return 'critical'
    case 'broken':
      return 'critical'
    case 'double_booked':
      return 'critical'
    case 'borrowed_unavailable':
      return 'important'
    case 'insufficient_qty':
      return 'important'
    case 'wrong_size':
      return 'important'
    default:
      return 'important'
  }
}

/**
 * Find matching inventory item by name.
 */
function findMatch(item: LoadoutItem, inventory: InventoryMatch[]): InventoryMatch | undefined {
  const name = (item.canonical_name ?? item.name).toLowerCase()
  return (
    inventory.find((inv) => inv.canonical_name?.toLowerCase() === name) ??
    inventory.find((inv) => inv.name.toLowerCase() === name)
  )
}
