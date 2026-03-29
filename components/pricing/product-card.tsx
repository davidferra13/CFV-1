'use client'

import { ImageWithFallback } from './image-with-fallback'
import { FreshnessDot } from './freshness-dot'
import type { CatalogItemV2 } from '@/lib/openclaw/catalog-actions'

function formatCurrency(cents: number | null): string {
  if (cents == null) return 'N/A'
  return `$${(cents / 100).toFixed(2)}`
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const hours = Math.round((now - then) / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

interface ProductCardProps {
  item: CatalogItemV2
  onAddToCart?: (item: CatalogItemV2) => void
  onExpand?: (item: CatalogItemV2) => void
  isInCart?: boolean
}

export function ProductCard({ item, onAddToCart, onExpand, isInCart }: ProductCardProps) {
  const stockTotal = item.inStockCount + item.outOfStockCount
  const isAvailable = item.inStockCount > 0

  return (
    <div
      className="group flex flex-col rounded-lg border border-stone-800 bg-stone-900/50 overflow-hidden hover:border-stone-600 transition-colors cursor-pointer"
      onClick={() => onExpand?.(item)}
    >
      {/* Image */}
      <ImageWithFallback
        src={item.imageUrl}
        alt={item.name}
        category={item.category}
        className="w-full aspect-square rounded-t-lg"
      />

      {/* Content */}
      <div className="flex flex-col gap-1 p-3 flex-1">
        {/* Brand */}
        {item.brand && (
          <span className="text-[11px] text-stone-500 uppercase tracking-wide truncate">
            {item.brand}
          </span>
        )}

        {/* Name */}
        <h3 className="text-sm font-medium text-stone-200 line-clamp-2 leading-tight">
          {item.name}
        </h3>

        {/* Price */}
        <div className="mt-auto pt-2">
          {item.bestPriceCents != null ? (
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-white">
                {formatCurrency(item.bestPriceCents)}
              </span>
              {item.bestPriceUnit && (
                <span className="text-xs text-stone-500">/{item.bestPriceUnit}</span>
              )}
            </div>
          ) : (
            <span className="text-sm text-stone-600">No price data</span>
          )}
        </div>

        {/* Store */}
        {item.bestPriceStore && (
          <span className="text-xs text-stone-500 truncate">{item.bestPriceStore}</span>
        )}

        {/* Status row */}
        <div className="flex items-center gap-2 mt-1">
          {stockTotal > 0 && (
            <span className={`text-[11px] ${isAvailable ? 'text-emerald-500' : 'text-red-500'}`}>
              {isAvailable ? 'Available' : 'Unavailable'}
            </span>
          )}
          {item.lastUpdated && (
            <span className="flex items-center gap-1 text-[11px] text-stone-600">
              <FreshnessDot date={item.lastUpdated} />
              {relativeTime(item.lastUpdated)}
            </span>
          )}
        </div>

        {/* Add to cart */}
        {onAddToCart && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddToCart(item)
            }}
            className={`mt-2 w-full py-1.5 px-3 rounded text-xs font-medium transition-colors ${
              isInCart
                ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700'
            }`}
          >
            {isInCart ? 'In Cart' : '+ Add to Cart'}
          </button>
        )}
      </div>
    </div>
  )
}
