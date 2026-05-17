'use client'

/**
 * PriceBadge - Unified price display component
 * Shows price + unit, store name, freshness, and confidence dots.
 *
 * Usage:
 *   <PriceBadge price={resolvedPrice} />
 *   <PriceBadge price={resolvedPrice} compact />
 */

import { useState, useTransition } from 'react'
import type {
  ResolvedPrice,
  PriceFreshness,
  PriceSource,
  ResolutionTier,
  CoverageLevel,
} from '@/lib/pricing/resolve-price'
import { submitPriceFeedback, setChefIngredientPrice } from '@/lib/pricing/chef-price-actions'

interface PriceBadgeProps {
  price: ResolvedPrice
  compact?: boolean
  className?: string
  trendDirection?: 'up' | 'down' | 'flat' | null
  trendPct?: number | null
  /** Pass ingredientId to enable confirm/override buttons */
  ingredientId?: string
  /** Called after successful feedback submission */
  onFeedback?: () => void
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

function freshnessDaysFromIso(iso: string | null | undefined): number | null {
  if (!iso) return null
  const confirmedTime = new Date(iso).getTime()
  if (Number.isNaN(confirmedTime)) return null
  return Math.max(0, Math.floor((Date.now() - confirmedTime) / (1000 * 60 * 60 * 24)))
}

function confidenceTooltipText(confidence: number, freshnessDays?: number | null): string {
  const pct = Math.round(confidence * 100)
  const schedule = 'Decay: 0-3d=100%, 3-14d=90%, 14-30d=75%, 30-60d=50%, 60-90d=30%, 90d+=15%'

  if (freshnessDays != null) {
    return `${pct}% confidence (price is ${freshnessDays}d old). ${schedule}`
  }

  return `${pct}% confidence. ${schedule}`
}

function sourceLabel(source: PriceSource): string {
  switch (source) {
    case 'chef_override':
      return 'Your price'
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
    case 'chef_override':
      return 'your price'
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
    case 'synthetic':
      return 'synthetic est.'
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
    case 'chef_override':
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
    case 'synthetic':
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

/**
 * Inline feedback buttons: confirm (thumbs up) and override (pencil).
 * Only rendered when ingredientId is provided.
 */
function PriceFeedbackButtons({
  ingredientId,
  price,
  onFeedback,
  autoExpand = false,
}: {
  ingredientId: string
  price: ResolvedPrice
  onFeedback?: () => void
  /** Start with override input open (for synthetic/no-data prices) */
  autoExpand?: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [showOverride, setShowOverride] = useState(autoExpand)
  const [overrideValue, setOverrideValue] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await submitPriceFeedback({
          ingredientId,
          shownPriceCents: price.cents,
          shownConfidence: price.confidence,
          shownSource: price.source,
          feedback: 'confirmed',
        })
        setConfirmed(true)
        onFeedback?.()
      } catch {
        // Silently fail; toast would be better but keeping deps minimal
      }
    })
  }

  const handleOverrideSubmit = () => {
    const cents = Math.round(parseFloat(overrideValue) * 100)
    if (Number.isNaN(cents) || cents <= 0) return
    startTransition(async () => {
      try {
        await setChefIngredientPrice({
          ingredientId,
          priceCents: cents,
          priceUnit: price.unit || 'each',
          source: 'manual',
          marketPriceCents: price.cents,
          marketConfidence: price.confidence,
        })
        setShowOverride(false)
        setOverrideValue('')
        onFeedback?.()
      } catch {
        // Silently fail
      }
    })
  }

  if (confirmed) {
    return <span className="text-xs text-emerald-500 ml-1">{'\u2713'}</span>
  }

  if (showOverride) {
    return (
      <span className="inline-flex items-center gap-1 ml-1.5">
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="$"
          value={overrideValue}
          onChange={(e) => setOverrideValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleOverrideSubmit()}
          className="w-16 h-5 text-xs bg-stone-800 border border-stone-600 rounded px-1 text-stone-200"
          autoFocus
          disabled={isPending}
        />
        <button
          type="button"
          onClick={handleOverrideSubmit}
          disabled={isPending || !overrideValue}
          className="text-xs text-emerald-400 hover:text-emerald-300 disabled:text-stone-600"
          title="Save your price"
        >
          {'\u2713'}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowOverride(false)
            setOverrideValue('')
          }}
          className="text-xs text-stone-500 hover:text-stone-400"
          title="Cancel"
        >
          {'\u2717'}
        </button>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isPending}
        className="text-[0.65rem] text-stone-600 hover:text-emerald-400 transition-colors disabled:opacity-50"
        title="Confirm this price is accurate"
      >
        {'\u{1F44D}'}
      </button>
      <button
        type="button"
        onClick={() => setShowOverride(true)}
        disabled={isPending}
        className="text-[0.65rem] text-stone-600 hover:text-sky-400 transition-colors disabled:opacity-50"
        title="Set your own price"
      >
        {'\u270E'}
      </button>
    </span>
  )
}

export function PriceBadge({
  price,
  compact = false,
  className = '',
  trendDirection,
  trendPct,
  ingredientId,
  onFeedback,
}: PriceBadgeProps) {
  // Low confidence gate: any price below 0.40 effective confidence gets
  // visually flagged as unreliable. This catches synthetic floors, category
  // baselines, stale government data, and any other tier that shouldn't
  // be trusted for menu costing. The old gate only triggered for
  // source=synthetic && confidence<=0.1, letting $4.99 "protein" estimates
  // through looking authoritative.
  const isLowConfidence = price.effectiveConfidence < 0.4
  const isVeryLowConfidence = price.effectiveConfidence < 0.15

  if (isVeryLowConfidence) {
    return (
      <span className={`text-sm ${className}`}>
        {ingredientId ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-amber-500/80 text-xs font-medium">No reliable price</span>
            <span
              className="inline-block px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide rounded bg-red-500/20 text-red-400 border border-red-500/30"
              title="No real price data available. This is a statistical estimate. Do not use for client quotes without verification."
            >
              Unverified
            </span>
            <PriceFeedbackButtons
              ingredientId={ingredientId}
              price={price}
              onFeedback={onFeedback}
              autoExpand
            />
          </span>
        ) : !compact ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-amber-500/80 text-xs">No local price data</span>
            <span
              className="inline-block px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide rounded bg-red-500/20 text-red-400 border border-red-500/30"
              title="No real price data available. This is a statistical estimate. Do not use for client quotes without verification."
            >
              Unverified
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <span className="text-stone-500 text-xs">--</span>
            <span
              className="inline-block px-1 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wide rounded bg-red-500/20 text-red-400"
              title="No real price data available. This is a statistical estimate. Do not use for client quotes without verification."
            >
              Unverified
            </span>
          </span>
        )}
      </span>
    )
  }

  if (isLowConfidence) {
    const freshnessDays = freshnessDaysFromIso(price.confirmedAt)
    const isEstimateTerritory = price.effectiveConfidence < 0.25

    return (
      <span className={`text-sm ${className}`}>
        <span className="text-stone-400">
          ~{formatCents(price.cents)}/{price.unit}
        </span>
        {isEstimateTerritory && (
          <span
            className="ml-1.5 inline-block px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide rounded bg-amber-500/20 text-amber-400 border border-amber-500/30"
            title="This price is a rough estimate based on category averages. Confirm with your supplier before quoting."
          >
            Estimate
          </span>
        )}
        {!compact && (
          <span
            className={`ml-1.5 text-[0.65rem] uppercase tracking-wide ${tierColor(price.resolutionTier)}`}
          >
            {tierLabel(price.resolutionTier)}
          </span>
        )}
        <span
          className="ml-1.5 text-xs text-stone-500"
          title={confidenceTooltipText(price.confidence, freshnessDays)}
        >
          {confidenceDots(price.confidence)}
        </span>
        {ingredientId && (
          <PriceFeedbackButtons ingredientId={ingredientId} price={price} onFeedback={onFeedback} />
        )}
      </span>
    )
  }

  // Legacy price state (source unknown)
  if (price.source === 'none') {
    return (
      <span className={`text-sm text-stone-400 ${className}`}>
        {formatCents(price.cents)}
        <span className="text-xs text-stone-600 ml-1">(source unknown)</span>
      </span>
    )
  }

  const dots = confidenceDots(price.confidence)
  const freshnessDays = freshnessDaysFromIso(price.confirmedAt)
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
          title={confidenceTooltipText(price.confidence, freshnessDays)}
        >
          {dots}
        </span>
        {ingredientId && (
          <PriceFeedbackButtons ingredientId={ingredientId} price={price} onFeedback={onFeedback} />
        )}
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
        title={`${sourceLabel(price.source)} - ${confidenceTooltipText(price.confidence, freshnessDays)}`}
      >
        {dots}
      </span>
      {ingredientId && (
        <PriceFeedbackButtons ingredientId={ingredientId} price={price} onFeedback={onFeedback} />
      )}
    </span>
  )
}

/** Full explanation shown in the tier badge tooltip. Be explicit about
 *  where the price came from so callers never need to guess. */
function tierTooltipText(tier: ResolutionTier, store: string | null): string {
  switch (tier) {
    case 'chef_override':
      return 'Your saved price for this ingredient. Updates when you confirm or change it.'
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
    case 'synthetic':
      return 'Synthetic estimate generated from category averages and regional cost adjustments. Log a receipt for a real price.'
    case 'none':
      return 'No price data available.'
  }
}

/**
 * NoPriceBadge - Explicit empty state for when no price is available.
 * Use this instead of showing $0.00 or blank space.
 */
export function NoPriceBadge({
  className = '',
  ingredientId,
  onRequestQuote,
}: {
  className?: string
  ingredientId?: string
  onRequestQuote?: () => void
}) {
  return (
    <span className={`text-sm text-stone-500 inline-flex items-center gap-1.5 ${className}`}>
      <span className="text-amber-500/80">(price unavailable)</span>
      {ingredientId && onRequestQuote ? (
        <button
          type="button"
          onClick={onRequestQuote}
          className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors"
        >
          Request quote
        </button>
      ) : (
        <span className="text-xs text-stone-600">Log a receipt or set your price</span>
      )}
    </span>
  )
}

/**
 * PriceBadgeFromFlat - Adapter that builds a ResolvedPrice from flat ingredient
 * table columns so PriceBadge can render with full confidence dots, tier labels,
 * and feedback buttons. Use this anywhere you have flattened price columns
 * (ingredients table, recipe_ingredients join) instead of PriceAttribution.
 */
export interface PriceBadgeFromFlatProps {
  priceCents: number | null
  priceUnit?: string | null
  store?: string | null
  confidence?: number | null
  source?: string | null
  lastPriceDate?: string | null
  trendDirection?: 'up' | 'down' | 'flat' | null
  trendPct?: number | null
  ingredientId?: string
  compact?: boolean
  className?: string
  onFeedback?: () => void
}

function sourceToResolutionTier(source: string | null | undefined): ResolutionTier {
  switch (source) {
    case 'chef_override':
      return 'chef_override'
    case 'receipt':
    case 'manual':
    case 'grocery_entry':
    case 'po_receipt':
    case 'vendor_invoice':
      return 'chef_receipt'
    case 'api_quote':
      return 'zip_local'
    case 'wholesale':
    case 'openclaw_wholesale':
      return 'wholesale'
    case 'direct_scrape':
    case 'openclaw_scrape':
      return 'zip_local'
    case 'flyer':
    case 'openclaw_flyer':
      return 'regional'
    case 'instacart':
    case 'openclaw_instacart':
      return 'regional'
    case 'regional_average':
      return 'regional'
    case 'resolved_national':
      return 'market_national'
    case 'market_aggregate':
      return 'market_state'
    case 'government':
    case 'openclaw_government':
      return 'government'
    case 'historical':
      return 'historical'
    case 'category_baseline':
      return 'category_baseline'
    case 'synthetic':
      return 'synthetic'
    default:
      return 'none'
  }
}

function sourceToCoverageLevel(source: string | null | undefined): CoverageLevel {
  switch (source) {
    case 'chef_override':
    case 'receipt':
    case 'manual':
    case 'grocery_entry':
    case 'po_receipt':
    case 'vendor_invoice':
    case 'api_quote':
    case 'wholesale':
    case 'openclaw_wholesale':
    case 'direct_scrape':
    case 'openclaw_scrape':
    case 'flyer':
    case 'openclaw_flyer':
    case 'instacart':
    case 'openclaw_instacart':
    case 'regional_average':
      return 'direct'
    case 'market_aggregate':
    case 'resolved_national':
      return 'regional'
    default:
      return 'estimated'
  }
}

function computeFreshnessFromDate(dateStr: string | null): PriceFreshness {
  if (!dateStr) return 'none'
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 3) return 'current'
  if (days <= 14) return 'recent'
  if (days <= 90) return 'stale'
  return 'none'
}

export function PriceBadgeFromFlat({
  priceCents,
  priceUnit,
  store,
  confidence,
  source,
  lastPriceDate,
  trendDirection,
  trendPct,
  ingredientId,
  compact = false,
  className,
  onFeedback,
}: PriceBadgeFromFlatProps) {
  if (priceCents == null) return <NoPriceBadge className={className} />

  const conf = confidence ?? 0
  const freshness = computeFreshnessFromDate(lastPriceDate ?? null)
  const resolvedPrice: ResolvedPrice = {
    cents: priceCents,
    unit: priceUnit || 'each',
    source: (source as PriceSource) || 'none',
    sourceTier: source || null,
    resolutionTier: sourceToResolutionTier(source),
    coverageLevel: sourceToCoverageLevel(source),
    store: store || null,
    confidence: conf,
    effectiveConfidence: conf,
    freshness,
    confirmedAt: lastPriceDate || null,
    reason: null,
  }

  return (
    <PriceBadge
      price={resolvedPrice}
      compact={compact}
      className={className}
      trendDirection={trendDirection}
      trendPct={trendPct}
      ingredientId={ingredientId}
      onFeedback={onFeedback}
    />
  )
}
