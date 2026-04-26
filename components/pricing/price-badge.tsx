'use client'

/**
 * PriceBadge - Unified price display component
 * Shows price + unit, store name, freshness, and confidence dots.
 *
 * Usage:
 *   <PriceBadge price={resolvedPrice} />
 *   <PriceBadge price={resolvedPrice} compact />
 */

import type {
  ResolvedPrice,
  PriceFreshness,
  PriceSource,
  ResolutionTier,
} from '@/lib/pricing/resolve-price'

interface PriceBadgeProps {
  price: ResolvedPrice
  compact?: boolean
  className?: string
  trendDirection?: 'up' | 'down' | 'flat' | null
  trendPct?: number | null
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

function confidenceTooltipText(confidence: number, confirmedAt?: string | null): string {
  const pct = Math.round(confidence * 100)
  const schedule = 'Decay: 0-3d=100%, 3-14d=90%, 14-30d=75%, 30-60d=50%, 60-90d=30%, 90d+=15%'

  if (confirmedAt) {
    const confirmedTime = new Date(confirmedAt).getTime()
    if (!Number.isNaN(confirmedTime)) {
      const freshnessDays = Math.max(
        0,
        Math.floor((Date.now() - confirmedTime) / (1000 * 60 * 60 * 24))
      )
      return `${pct}% confidence (price is ${freshnessDays}d old). ${schedule}`
    }
  }

  return `${pct}% confidence. ${schedule}`
}

function sourceLabel(source: PriceSource): string {
  switch (source) {
    case 'receipt':
      return 'Receipt'
    case 'api_quote':
      return 'API quote'
    case 'wholesale':
      return 'Wholesale'
    case 'direct_scrape':
      return 'Store site'
    case 'flyer':
      return 'Circular'
    case 'instacart':
      return 'Instacart'
    case 'regional_average':
      return 'Regional avg'
    case 'market_aggregate':
      return 'Market avg'
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

/**
 * Honest human-readable label for the resolution tier. This is what the
 * chef actually sees next to the price. It tells the truth about where the
 * number came from so the UI cannot silently claim local data it does not
 * have.
 */
function tierLabel(tier: ResolutionTier): string {
  switch (tier) {
    case 'chef_receipt':
      return 'your data'
    case 'wholesale':
      return 'wholesale'
    case 'zip_local':
      return 'local'
    case 'regional':
      return 'regional'
    case 'market_state':
      return 'state avg'
    case 'market_national':
      return 'national avg'
    case 'government':
      return 'USDA est.'
    case 'historical':
      return 'your history'
    case 'category_baseline':
      return 'category est.'
    case 'none':
      return ''
  }
}

/**
 * Color the tier label based on how much geographic backing it has. The
 * chef needs to glance and know "is this a real local price, or a national
 * fallback?" without reading a tooltip.
 */
function tierColor(tier: ResolutionTier): string {
  switch (tier) {
    case 'chef_receipt':
    case 'wholesale':
    case 'zip_local':
      return 'text-emerald-400'
    case 'regional':
    case 'market_state':
      return 'text-sky-400'
    case 'market_national':
    case 'government':
      return 'text-amber-400'
    case 'historical':
    case 'category_baseline':
      return 'text-stone-500'
    case 'none':
      return 'text-red-400'
  }
}

function TrendIndicator({
  direction,
  pct,
}: {
  direction?: 'up' | 'down' | 'flat' | null
  pct?: number | null
}) {
  if (!direction || direction === 'flat' || pct == null) return null
  const isUp = direction === 'up'
  const color = isUp ? 'text-red-400' : 'text-emerald-400'
  const arrow = isUp ? '\u2191' : '\u2193'
  const absPct = Math.abs(pct)
  if (absPct < 1) return null // ignore negligible changes
  return (
    <span
      className={`text-xs ${color}`}
      title={`${isUp ? '+' : '-'}${absPct.toFixed(1)}% over 7 days`}
    >
      {arrow}
      {absPct.toFixed(0)}%
    </span>
  )
}

export function PriceBadge({
  price,
  compact = false,
  className = '',
  trendDirection,
  trendPct,
}: PriceBadgeProps) {
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
  const tier = tierLabel(price.resolutionTier)
  const tierClr = tierColor(price.resolutionTier)
  const tierTooltip = tierTooltipText(price.resolutionTier, price.store)

  if (compact) {
    return (
      <span className={`text-sm ${className}`}>
        <span className="font-medium text-stone-200">
          {formatCents(price.cents)}/{price.unit}
        </span>
        <TrendIndicator direction={trendDirection} pct={trendPct} />
        {tier && (
          <span
            className={`ml-1.5 text-[0.65rem] uppercase tracking-wide ${tierClr}`}
            title={tierTooltip}
          >
            {tier}
          </span>
        )}
        <span className={`ml-1.5 text-xs ${freshColor}`}>{fresh}</span>
        <span
          className="ml-1 text-xs text-stone-500"
          title={confidenceTooltipText(price.confidence, price.confirmedAt)}
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
      {tier && (
        <>
          <span className="text-stone-600">&middot;</span>
          <span className={`text-[0.65rem] uppercase tracking-wide ${tierClr}`} title={tierTooltip}>
            {tier}
          </span>
        </>
      )}
      <span className="text-stone-600">&middot;</span>
      <TrendIndicator direction={trendDirection} pct={trendPct} />
      <span className={`text-xs ${freshColor}`}>{fresh}</span>
      <span
        className="text-xs text-stone-500 tracking-tight"
        title={`${sourceLabel(price.source)} - ${confidenceTooltipText(
          price.confidence,
          price.confirmedAt
        )}`}
      >
        {dots}
      </span>
    </span>
  )
}

/** Full explanation shown in the tier badge tooltip. Be explicit about
 *  where the price came from so callers never need to guess. */
function tierTooltipText(tier: ResolutionTier, store: string | null): string {
  switch (tier) {
    case 'chef_receipt':
      return `Your own receipt${store ? ` from ${store}` : ''}`
    case 'wholesale':
      return `Wholesale distributor price${store ? ` (${store})` : ''}`
    case 'zip_local':
      return `Scraped price from a store in your area${store ? ` (${store})` : ''}`
    case 'regional':
      return `Cross-store median from regional data${store ? ` (${store})` : ''}`
    case 'market_state':
      return `Market aggregate that includes your state${store ? ` (${store})` : ''}`
    case 'market_national':
      return 'Market aggregate with no local coverage for your area. Treat as a rough national estimate.'
    case 'government':
      return 'USDA / BLS regional baseline. Low confidence - not a live store price.'
    case 'historical':
      return 'Your own long-tail receipt average. May be stale.'
    case 'category_baseline':
      return 'Category-level median estimate. No ingredient-specific data available.'
    case 'none':
      return 'No price data available.'
  }
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
