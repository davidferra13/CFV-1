'use client'

import type { RecipeStockItem } from '@/lib/inventory/stock-lookup-actions'

const COLOR_CLASSES = {
  green: 'bg-emerald-950/60 text-emerald-400 border-emerald-900/50',
  yellow: 'bg-amber-950/60 text-amber-400 border-amber-900/50',
  red: 'bg-red-950/60 text-red-400 border-red-900/50',
} as const

const COLOR_DOTS = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
} as const

const LABELS = {
  green: 'In stock',
  yellow: 'Partial',
  red: 'Not tracked',
} as const

/**
 * Compact stock indicator dot for inline use in ingredient lists.
 */
export function StockDot({ color }: { color: 'green' | 'yellow' | 'red' }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${COLOR_DOTS[color]}`}
      title={LABELS[color]}
    />
  )
}

/**
 * Full stock status badge with label and quantity info.
 */
export function StockStatusBadge({ item }: { item: RecipeStockItem }) {
  const label =
    item.color === 'green'
      ? 'In stock'
      : item.color === 'yellow'
        ? `Need ${item.deficit} ${item.neededUnit}`
        : 'Not in inventory'

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${COLOR_CLASSES[item.color]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${COLOR_DOTS[item.color]}`} />
      {label}
    </span>
  )
}

/**
 * Stock coverage summary bar for a recipe.
 * Shows counts of green/yellow/red ingredients.
 */
export function StockCoverageSummary({ items }: { items: RecipeStockItem[] }) {
  if (items.length === 0) return null

  const green = items.filter((i) => i.color === 'green').length
  const yellow = items.filter((i) => i.color === 'yellow').length
  const red = items.filter((i) => i.color === 'red').length

  return (
    <div className="flex items-center gap-3 text-xs text-stone-400">
      <span className="text-stone-500">Inventory:</span>
      {green > 0 && (
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {green} stocked
        </span>
      )}
      {yellow > 0 && (
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          {yellow} partial
        </span>
      )}
      {red > 0 && (
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          {red} untracked
        </span>
      )}
    </div>
  )
}
