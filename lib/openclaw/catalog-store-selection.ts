// Canonical store naming and query-token generation for catalog store-card clicks.
// Fixes the bug where merged store cards send the first raw source_id (which may
// have zero products) instead of a stable token that returns data across all sources.

import type { CatalogStore } from './catalog-actions'

export type CatalogStoreSelection = {
  displayName: string
  canonicalKey: string
  queryValue: string
  sourceIds: string[]
}

// Known slug-to-display mappings for stores whose upstream names use underscores or
// abbreviations instead of proper display names.
const SLUG_DISPLAY_MAP: Record<string, string> = {
  stop_and_shop: 'Stop & Shop',
  stop_shop: 'Stop & Shop',
  market_basket: 'Market Basket',
  whole_foods: 'Whole Foods',
  trader_joes: "Trader Joe's",
  trader_joe: "Trader Joe's",
  bjs_wholesale: "BJ's",
  bjs: "BJ's",
}

/**
 * Canonicalize a raw upstream store name into a human-friendly display name.
 * 1. Strip "(via X)" suffixes
 * 2. Map known slugs to proper names
 * 3. Convert remaining underscores to spaces and title-case
 */
export function canonicalizeStoreName(rawName: string): string {
  // Strip "(via X)" suffix
  let name = rawName.replace(/\s*\(via\s+[^)]+\)/gi, '').trim()

  // Check slug map (case-insensitive, with or without dashes)
  const slugKey = name.toLowerCase().replace(/-/g, '_')
  if (SLUG_DISPLAY_MAP[slugKey]) {
    return SLUG_DISPLAY_MAP[slugKey]
  }

  // If name is all-lowercase with underscores, convert to title case
  if (name.includes('_') && name === name.toLowerCase()) {
    name = name
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  return name
}

/**
 * Build a CatalogStoreSelection from a group of merged store sources.
 * The queryValue uses the canonical display name (not a UUID), because
 * searchCatalogV2 already supports name-based filtering via LOWER(s.name).
 */
export function buildStoreSelection(
  stores: (CatalogStore & { _sourceIds?: string[] })[]
): CatalogStoreSelection[] {
  const grouped = new Map<string, CatalogStoreSelection>()

  for (const store of stores) {
    const displayName = canonicalizeStoreName(store.name)
    const canonicalKey = displayName.toLowerCase()

    const existing = grouped.get(canonicalKey)
    if (existing) {
      if (store._sourceIds) {
        existing.sourceIds.push(...store._sourceIds)
      } else {
        existing.sourceIds.push(store.id)
      }
    } else {
      grouped.set(canonicalKey, {
        displayName,
        canonicalKey,
        queryValue: displayName,
        sourceIds: store._sourceIds ? [...store._sourceIds] : [store.id],
      })
    }
  }

  return Array.from(grouped.values())
}
