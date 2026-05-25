// Pure utility functions for shopping list grouping/sorting.
// Extracted from shopping-list-actions.ts because Next.js requires
// all exports from 'use server' files to be async functions.

import type { ShoppingListItem, ShoppingListResult } from './shopping-list-actions'

const CATEGORY_SORT_ORDER: string[] = [
  'produce',
  'meat_seafood',
  'dairy_eggs',
  'bakery',
  'deli',
  'frozen',
  'pantry_dry',
  'canned',
  'condiments_sauces',
  'spices',
  'baking',
  'beverages',
  'bulk',
  'international',
  'household',
  'other',
]

export function groupByCategory(items: ShoppingListItem[]): Map<string, ShoppingListItem[]> {
  const map = new Map<string, ShoppingListItem[]>()
  for (const item of items) {
    const cat = item.category || 'other'
    const list = map.get(cat) ?? []
    list.push(item)
    map.set(cat, list)
  }
  // Sort categories by grocery-store walk order
  const sorted = new Map<string, ShoppingListItem[]>()
  for (const cat of CATEGORY_SORT_ORDER) {
    const items = map.get(cat)
    if (items) {
      items.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))
      sorted.set(cat, items)
    }
  }
  // Any categories not in the predefined order
  for (const [cat, items] of map) {
    if (!sorted.has(cat)) {
      items.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))
      sorted.set(cat, items)
    }
  }
  return sorted
}

export function splitByVendor(items: ShoppingListItem[]): Map<string, ShoppingListItem[]> {
  const map = new Map<string, ShoppingListItem[]>()
  for (const item of items) {
    const vendor = item.supplier || 'Unassigned'
    const list = map.get(vendor) ?? []
    list.push(item)
    map.set(vendor, list)
  }
  // Sort: alphabetical vendors, Unassigned last
  const sorted = new Map<string, ShoppingListItem[]>()
  const keys = [...map.keys()].sort((a, b) => {
    if (a === 'Unassigned') return 1
    if (b === 'Unassigned') return -1
    return a.localeCompare(b)
  })
  for (const key of keys) {
    sorted.set(key, map.get(key)!)
  }
  return sorted
}

// ── Formatting Helpers ───────────────────────────────────────────────────

function formatCategoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    produce: 'PRODUCE',
    meat_seafood: 'PROTEIN',
    dairy_eggs: 'DAIRY',
    bakery: 'BAKERY',
    deli: 'DELI',
    frozen: 'FROZEN',
    pantry_dry: 'DRY GOODS',
    canned: 'CANNED',
    condiments_sauces: 'CONDIMENTS',
    spices: 'SPICES',
    baking: 'BAKING',
    beverages: 'BEVERAGES',
    bulk: 'BULK',
    international: 'INTERNATIONAL',
    household: 'HOUSEHOLD',
    other: 'OTHER',
  }
  return labels[cat] ?? cat.toUpperCase().replace(/_/g, ' ')
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length)
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str : ' '.repeat(len - str.length) + str
}

function formatPrice(cents: number): string {
  if (cents === 0) return ''
  return `~$${(cents / 100).toFixed(2)}`
}

// ── Plain Text Export ────────────────────────────────────────────────────

export function formatPlainText(
  result: ShoppingListResult,
  options?: { shortagesOnly?: boolean }
): string {
  const items = options?.shortagesOnly ? result.items.filter((i) => i.toBuy > 0) : result.items

  const grouped = groupByCategory(items)
  const lines: string[] = []

  // Header
  lines.push(`SHOPPING LIST - ${result.startDate} to ${result.endDate}`)
  const eventCount = new Set(items.flatMap((i) => i.eventBreakdown.map((b) => b.eventId))).size
  const guestInfo = eventCount > 0 ? `${eventCount} event${eventCount === 1 ? '' : 's'}` : ''
  if (guestInfo) lines.push(guestInfo)
  lines.push('='.repeat(50))
  lines.push('')

  let noPriceCount = 0

  for (const [category, categoryItems] of grouped) {
    lines.push(formatCategoryLabel(category))

    for (const item of categoryItems) {
      const name = padRight(`  ${item.ingredientName}`, 26)
      const qty = padLeft(`${item.toBuy.toFixed(1)} ${item.unit}`, 14)
      const hasPriceData = item.estimatedCostCents > 0
      const price = hasPriceData ? padLeft(formatPrice(item.estimatedCostCents), 12) : ''
      if (!hasPriceData) noPriceCount++
      const marker = !hasPriceData && item.toBuy > 0 ? ' *' : ''
      lines.push(`${name}${qty}${price}${marker}`)
    }
    lines.push('')
  }

  // Footer
  lines.push('='.repeat(50))
  lines.push(`ESTIMATED TOTAL: ~$${(result.totalEstimatedCostCents / 100).toFixed(2)}`)
  if (noPriceCount > 0) {
    lines.push(`Items without prices: ${noPriceCount} (marked with *)`)
  }
  if (result.incompleteRecipes.length > 0) {
    const uniqueRecipes = [...new Set(result.incompleteRecipes.map((w) => w.recipeName))]
    lines.push(
      `Recipes with missing quantities: ${uniqueRecipes.length} (${uniqueRecipes.join(', ')})`
    )
  }

  return lines.join('\n')
}

// ── Per-Vendor Text Export ───────────────────────────────────────────────

export function formatPerVendorText(
  result: ShoppingListResult,
  options?: { shortagesOnly?: boolean }
): string {
  const items = options?.shortagesOnly ? result.items.filter((i) => i.toBuy > 0) : result.items

  const vendorMap = splitByVendor(items)
  const sections: string[] = []

  for (const [vendor, vendorItems] of vendorMap) {
    const lines: string[] = []
    lines.push(`ORDER FOR: ${vendor}`)
    lines.push('='.repeat(50))

    const grouped = groupByCategory(vendorItems)
    for (const [category, catItems] of grouped) {
      lines.push(formatCategoryLabel(category))
      for (const item of catItems) {
        const name = padRight(`  ${item.ingredientName}`, 26)
        const qty = padLeft(`${item.toBuy.toFixed(1)} ${item.unit}`, 14)
        lines.push(`${name}${qty}`)
      }
      lines.push('')
    }

    const subtotal = vendorItems.reduce((sum, i) => sum + i.estimatedCostCents, 0)
    lines.push('='.repeat(50))
    lines.push(`${vendorItems.length} items    ~$${(subtotal / 100).toFixed(2)}`)
    sections.push(lines.join('\n'))
  }

  return sections.join('\n\n')
}

// ── Vendor Order Summary ─────────────────────────────────────────────────

export type VendorSummary = {
  vendor: string
  itemCount: number
  estimatedCostCents: number
}

export function getVendorOrderSummary(items: ShoppingListItem[]): VendorSummary[] {
  const vendorMap = splitByVendor(items.filter((i) => i.toBuy > 0))
  const summaries: VendorSummary[] = []

  for (const [vendor, vendorItems] of vendorMap) {
    summaries.push({
      vendor,
      itemCount: vendorItems.length,
      estimatedCostCents: vendorItems.reduce((sum, i) => sum + i.estimatedCostCents, 0),
    })
  }

  return summaries
}
