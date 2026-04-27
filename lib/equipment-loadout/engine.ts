// Equipment Loadout Generator - Pure Function
// Takes event data + inventory, returns complete equipment checklist.
// No side effects, no DB calls. Server action fetches data, passes here.

import type { EquipmentLoadout, LoadoutItemSource } from '@/lib/equipment/types'
import type { LoadoutEntry, LoadoutInput } from './types'
import { extractTechniqueEquipment } from './maps/technique-equipment-map'
import { getCategoryEquipment } from './maps/category-prep-map'
import { getServiceStyleEquipment } from './maps/service-style-map'
import { getVenueEquipment, venueHasEquipment } from './maps/venue-modifiers'
import { findSubstitutions } from './substitutions'
import { getPortionsPerUnit } from './capacity-model'

/**
 * Build a complete equipment loadout for an event.
 * Pure function: deterministic, no side effects.
 */
export function buildEquipmentLoadout(input: LoadoutInput): EquipmentLoadout {
  const rawEntries: LoadoutEntry[] = []

  // Layer A: Recipe Equipment (explicit)
  for (const recipe of input.recipes) {
    for (const equipName of recipe.equipment) {
      rawEntries.push({
        name: equipName,
        canonical_name: equipName,
        category_slug: 'prep-tools',
        quantity: 1,
        scaling: 'fixed',
        source_layer: 'recipe_explicit',
        reason: [`${recipe.name}: explicit requirement`],
        is_essential: true,
      })
    }
  }

  // Layer B: Technique Inference
  for (const recipe of input.recipes) {
    if (recipe.method) {
      const techEntries = extractTechniqueEquipment(recipe.id, recipe.name, recipe.method)
      rawEntries.push(...techEntries)
    }
  }

  // Layer C: Component Category
  for (const recipe of input.recipes) {
    for (const comp of recipe.components) {
      const catEntries = getCategoryEquipment(comp.name, comp.category, recipe.name)
      rawEntries.push(...catEntries)
    }
  }

  // Layer D: Service Style
  const serviceEntries = getServiceStyleEquipment(
    input.service_style,
    input.guest_count,
    input.recipes.length // approximate course count
  )
  rawEntries.push(...serviceEntries)

  // Venue modifiers
  const venueEntries = getVenueEquipment(input.venue_type)
  rawEntries.push(...venueEntries)

  // Merge duplicates: aggregate by canonical name
  const merged = mergeEntries(rawEntries)

  // Scale scalable items by guest count
  for (const entry of merged) {
    if (entry.scaling === 'scalable') {
      const ppu = getPortionsPerUnit(entry.canonical_name ?? entry.name)
      entry.quantity = Math.ceil(input.guest_count / ppu)
    }
  }

  // Match against inventory and determine source
  const loadoutItems = merged.map((entry) => {
    const match = findInventoryMatch(entry, input.inventory)
    const isVenueProvided = venueHasEquipment(input.venue_type, entry.name)

    let source: LoadoutItemSource = 'need'
    let inventoryId: string | undefined

    if (match) {
      // Check if item is usable (not broken, retired, etc.)
      const usable = ['active', 'stored'].includes(match.status)
      if (usable && match.quantity_owned >= entry.quantity) {
        source = 'owned'
        inventoryId = match.id
      } else if (usable) {
        source = 'owned' // partial - gap detection handles the rest
        inventoryId = match.id
      }
    } else if (isVenueProvided) {
      source = 'venue'
    } else {
      // Check substitutions
      const subs = findSubstitutions(entry.name)
      for (const sub of subs) {
        const subMatch = input.inventory.find(
          (inv) =>
            (inv.canonical_name?.toLowerCase() === sub.use_instead.toLowerCase() ||
              inv.name.toLowerCase() === sub.use_instead.toLowerCase()) &&
            ['active', 'stored'].includes(inv.status)
        )
        if (subMatch) {
          return {
            name: entry.name,
            canonical_name: entry.canonical_name,
            category_slug: entry.category_slug,
            quantity: entry.quantity,
            source: 'substitute' as LoadoutItemSource,
            reason: entry.reason,
            inventory_id: subMatch.id,
            substitute_for: entry.name,
            substitute_quality: sub.quality,
            is_essential: entry.is_essential,
          }
        }
      }
    }

    return {
      name: entry.name,
      canonical_name: entry.canonical_name,
      category_slug: entry.category_slug,
      quantity: entry.quantity,
      source,
      reason: entry.reason,
      inventory_id: inventoryId,
      is_essential: entry.is_essential,
    }
  })

  // Summary counts
  const summary = {
    total_items: loadoutItems.length,
    owned: loadoutItems.filter((i) => i.source === 'owned').length,
    venue_provided: loadoutItems.filter((i) => i.source === 'venue').length,
    substituted: loadoutItems.filter((i) => i.source === 'substitute').length,
    gaps: loadoutItems.filter((i) => i.source === 'need').length,
  }

  return {
    event_id: input.event_id,
    generated_at: new Date().toISOString(),
    items: loadoutItems,
    summary,
  }
}

/**
 * Merge duplicate entries by name, combining reasons and taking max quantity.
 */
function mergeEntries(entries: LoadoutEntry[]): LoadoutEntry[] {
  const map = new Map<string, LoadoutEntry>()

  for (const entry of entries) {
    const key = (entry.canonical_name ?? entry.name).toLowerCase()
    const existing = map.get(key)

    if (existing) {
      existing.quantity = Math.max(existing.quantity, entry.quantity)
      existing.reason = [...new Set([...existing.reason, ...entry.reason])]
      if (entry.is_essential) existing.is_essential = true
      // Keep higher-priority source layer
      const layerPriority: Record<string, number> = {
        recipe_explicit: 4,
        technique_inference: 3,
        venue_modifier: 2,
        service_style: 1,
        component_category: 0,
      }
      if ((layerPriority[entry.source_layer] ?? 0) > (layerPriority[existing.source_layer] ?? 0)) {
        existing.source_layer = entry.source_layer
      }
    } else {
      map.set(key, { ...entry })
    }
  }

  return Array.from(map.values())
}

/**
 * Find matching inventory item by canonical name or fuzzy name match.
 */
function findInventoryMatch(entry: LoadoutEntry, inventory: LoadoutInput['inventory']) {
  const entryName = (entry.canonical_name ?? entry.name).toLowerCase()

  // Exact canonical match first
  const exact = inventory.find((inv) => inv.canonical_name?.toLowerCase() === entryName)
  if (exact) return exact

  // Fuzzy name match
  return inventory.find((inv) => inv.name.toLowerCase() === entryName)
}
