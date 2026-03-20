// Taxonomy System Defaults Registry
// Maps each taxonomy category to its hardcoded system defaults.
// These are always available; chefs can hide them or add custom entries on top.

import type { TaxonomyCategory, TaxonomyEntry } from './types'

import {
  CUISINE_DISPLAY,
  OCCASION_SUGGESTIONS,
  SEASON_OPTIONS,
  MEAL_TYPE_DISPLAY,
} from '@/lib/recipes/recipe-constants'
import { COURSE_ORDER, STATION_LABELS } from '@/lib/events/fire-order-constants'
import {
  INQUIRY_SOURCE_OPTIONS,
  MENU_TYPE_OPTIONS,
  EXPENSE_CATEGORIES,
} from '@/lib/constants/business'
import { EQUIPMENT_CATEGORIES } from '@/lib/equipment/constants'
import { WASTE_REASONS } from '@/lib/waste/constants'
import { SOURCE_TYPE_LABELS } from '@/lib/sustainability/sourcing-constants'
import { COURSE_COLORS } from '@/lib/events/fire-order-constants'

function toEntry(
  value: string,
  displayLabel: string,
  sortOrder: number,
  metadata?: Record<string, unknown>
): TaxonomyEntry {
  return { value, displayLabel, isSystem: true, isHidden: false, sortOrder, metadata }
}

function buildDefaults(): Record<TaxonomyCategory, TaxonomyEntry[]> {
  return {
    cuisine: Object.entries(CUISINE_DISPLAY).map(([v, l], i) => toEntry(v, l, i)),

    occasion: OCCASION_SUGGESTIONS.map((label, i) =>
      toEntry(label.toLowerCase().replace(/[\s/]+/g, '_'), label, i)
    ),

    season: SEASON_OPTIONS.map((label, i) =>
      toEntry(label.toLowerCase().replace(/[\s-]+/g, '_'), label, i)
    ),

    meal_type: Object.entries(MEAL_TYPE_DISPLAY).map(([v, l], i) => toEntry(v, l, i)),

    course: COURSE_ORDER.map((c, i) =>
      toEntry(c, c.charAt(0) + c.slice(1).toLowerCase().replace('_', ' '), i, {
        color: COURSE_COLORS[c],
      })
    ),

    station: (Object.entries(STATION_LABELS) as [string, string][]).map(([v, l], i) =>
      toEntry(v, l, i)
    ),

    inquiry_source: INQUIRY_SOURCE_OPTIONS.map((label, i) =>
      toEntry(label.toLowerCase().replace(/[\s/]+/g, '_'), label, i)
    ),

    menu_type: MENU_TYPE_OPTIONS.map((label, i) =>
      toEntry(label.toLowerCase().replace(/[\s/]+/g, '_'), label, i)
    ),

    expense_category: EXPENSE_CATEGORIES.map(({ value, label }, i) => toEntry(value, label, i)),

    equipment_category: EQUIPMENT_CATEGORIES.map((cat, i) =>
      toEntry(cat, cat.charAt(0).toUpperCase() + cat.slice(1), i)
    ),

    waste_reason: WASTE_REASONS.map(({ value, label }, i) => toEntry(value, label, i)),

    sourcing_type: (Object.entries(SOURCE_TYPE_LABELS) as [string, string][]).map(([v, l], i) =>
      toEntry(v, l, i)
    ),
  }
}

let _cache: Record<TaxonomyCategory, TaxonomyEntry[]> | null = null

/** Returns the system default entries for a given taxonomy category. */
export function getSystemDefaults(category: TaxonomyCategory): TaxonomyEntry[] {
  if (!_cache) _cache = buildDefaults()
  return _cache[category] ?? []
}

/** Returns all system defaults keyed by category. */
export function getAllSystemDefaults(): Record<TaxonomyCategory, TaxonomyEntry[]> {
  if (!_cache) _cache = buildDefaults()
  return _cache
}
