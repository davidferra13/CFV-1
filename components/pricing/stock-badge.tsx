'use client'

interface StockBadgeProps {
  inStockCount: number
  outOfStockCount: number
  compact?: boolean
}

export function StockBadge({ inStockCount, outOfStockCount, compact }: StockBadgeProps) {
  const total = inStockCount + outOfStockCount

  if (total === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-stone-500">
        <span className="w-1.5 h-1.5 rounded-full bg-stone-600 inline-block" />
        {!compact && 'Unknown'}
      </span>
    )
  }

  if (outOfStockCount === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
        {compact ? `In Stock (${inStockCount})` : 'In Stock'}
      </span>
    )
  }

  if (inStockCount === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
        Out of Stock
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-400">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
      Limited ({inStockCount}/{total} stores)
    </span>
  )
}
