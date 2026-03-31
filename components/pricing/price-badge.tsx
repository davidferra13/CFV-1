'use client'

/**
 * PriceBadge - Unified price display component
 * Shows price + unit, store name, freshness, and confidence dots.
 *
 * Usage:
 *   <PriceBadge price={resolvedPrice} />
 *   <PriceBadge price={resolvedPrice} compact />
 */

import type { ResolvedPrice, PriceFreshness, PriceSource } from '@/lib/pricing/resolve-price'

interface PriceBadgeProps {
  price: ResolvedPrice
  compact?: boolean
  className?: string
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function freshnessLabel(date: string | null): string {
  if (!date) return ''
  const now = new Date()
  const then = new Date(date)
  const days = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function freshnessColor(freshness: PriceFreshness): string {
  switch (freshness) {
    case 'current':
      return 'text-emerald-400'
    case 'recent':
      return 'text-stone-400'
    case 'stale':
      return 'text-amber-400'
    case 'none':
      return 'text-red-400'
  }
}

function confidenceDots(confidence: number): string {
  if (confidence >= 0.9) return '\u25CF\u25CF\u25CF\u25CF' // ●●●●
  if (confidence >= 0.65) return '\u25CF\u25CF\u25CF\u25CB' // ●●●○
  if (confidence >= 0.45) return '\u25CF\u25CF\u25CB\u25CB' // ●●○○
  if (confidence >= 0.2) return '\u25CF\u25CB\u25CB\u25CB' // ●○○○
  return '\u25CB\u25CB\u25CB\u25CB' // ○○○○
}

function sourceLabel(source: PriceSource): string {
  switch (source) {
    case 'receipt':
      return 'Receipt'
    case 'api_quote':
      return 'API quote'
    case 'direct_scrape':
      return 'Store site'
    case 'flyer':
      return 'Circular'
    case 'instacart':
      return 'Instacart'
    case 'regional_average':
      return 'Regional avg'
    case 'government':
      return 'USDA avg'
    case 'historical':
      return 'Your avg'
    case 'category_baseline':
      return 'Category est.'
    case 'none':
      return ''
    default:
      return ''
  }
}

export function PriceBadge({ price, compact = false, className = '' }: PriceBadgeProps) {
  // No price state
  if (price.cents === null) {
    return (
      <span className={`text-sm text-stone-500 ${className}`}>
        No price data
        {!compact && (
          <span className="text-xs text-stone-600 ml-1"> - Log a receipt to set price</span>
        )}
      </span>
    )
  }

  // Legacy price state (source unknown)
  if (price.source === 'none' && price.cents !== null) {
    return (
      <span className={`text-sm text-stone-400 ${className}`}>
        {formatCents(price.cents)}
        <span className="text-xs text-stone-600 ml-1">(source unknown)</span>
      </span>
    )
  }

  const dots = confidenceDots(price.confidence)
  const fresh = freshnessLabel(price.confirmedAt)
  const freshColor = freshnessColor(price.freshness)

  if (compact) {
    return (
      <span className={`text-sm ${className}`}>
        <span className="font-medium text-stone-200">
          {formatCents(price.cents)}/{price.unit}
        </span>
        <span className={`ml-1.5 text-xs ${freshColor}`}>{fresh}</span>
        <span
          className="ml-1 text-xs text-stone-500"
          title={`Confidence: ${Math.round(price.confidence * 100)}%`}
        >
          {dots}
        </span>
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
      <span className="font-medium text-stone-200">
        {formatCents(price.cents)}/{price.unit}
      </span>
      <span className="text-stone-600">&middot;</span>
      <span className="text-xs text-stone-400">{price.store}</span>
      <span className="text-stone-600">&middot;</span>
      <span className={`text-xs ${freshColor}`}>{fresh}</span>
      <span
        className="text-xs text-stone-500 tracking-tight"
        title={`${sourceLabel(price.source)} - ${Math.round(price.confidence * 100)}% confidence`}
      >
        {dots}
      </span>
    </span>
  )
}

/**
 * NoPriceBadge - Explicit empty state for when no price is available.
 * Use this instead of showing $0.00 or blank space.
 */
export function NoPriceBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`text-sm text-stone-500 ${className}`}>
      No price data <span className="text-xs text-stone-600">- Log a receipt to set price</span>
    </span>
  )
}
