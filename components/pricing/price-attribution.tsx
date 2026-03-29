'use client'

/**
 * PriceAttribution - Inline price display with source attribution.
 * Shows price, store name, confidence dot, trend arrow, and freshness.
 * Works directly with the enrichment columns from the ingredients table.
 *
 * Usage:
 *   <PriceAttribution priceCents={429} store="Stop & Shop" confidence={0.85} />
 *   <PriceAttribution priceCents={429} compact />
 */

import { formatCurrency } from '@/lib/utils/currency'

export interface PriceAttributionProps {
  priceCents: number | null
  priceUnit?: string | null
  store?: string | null
  confidence?: number | null
  trendDirection?: string | null
  trendPct?: number | null
  lastPriceDate?: string | null
  compact?: boolean
  /** Chef's preferred store name. When it matches `store`, a star indicator is shown. */
  preferredStore?: string | null
}

function freshnessText(date: string | null): string {
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

function freshnessColor(date: string | null): string {
  if (!date) return 'text-stone-500'
  const days = Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 7) return 'text-emerald-400'
  if (days <= 14) return 'text-stone-400'
  return 'text-amber-400'
}

function confidenceDot(confidence: number | null): {
  color: string
  title: string
} {
  if (confidence === null || confidence === undefined) {
    return { color: 'bg-stone-600', title: 'Unknown confidence' }
  }
  if (confidence >= 0.7) {
    return { color: 'bg-emerald-500', title: `${Math.round(confidence * 100)}% confidence` }
  }
  if (confidence >= 0.4) {
    return { color: 'bg-amber-500', title: `${Math.round(confidence * 100)}% confidence` }
  }
  return { color: 'bg-stone-500', title: `${Math.round(confidence * 100)}% confidence` }
}

function trendArrow(
  direction: string | null,
  pct: number | null
): {
  symbol: string
  color: string
  title: string
} | null {
  if (!direction || direction === 'flat') return null
  if (direction === 'up') {
    return {
      symbol: '\u2191',
      color: 'text-red-400',
      title: pct !== null ? `Up ${Math.abs(pct).toFixed(1)}% this week` : 'Trending up',
    }
  }
  if (direction === 'down') {
    return {
      symbol: '\u2193',
      color: 'text-emerald-400',
      title: pct !== null ? `Down ${Math.abs(pct).toFixed(1)}% this week` : 'Trending down',
    }
  }
  return null
}

export function PriceAttribution({
  priceCents,
  priceUnit,
  store,
  confidence,
  trendDirection,
  trendPct,
  lastPriceDate,
  compact = false,
  preferredStore,
}: PriceAttributionProps) {
  const isPreferred =
    !!preferredStore && !!store && store.toLowerCase() === preferredStore.toLowerCase()
  // No price
  if (priceCents === null || priceCents === undefined) {
    return <span className="text-sm text-stone-500">--</span>
  }

  const priceText = formatCurrency(priceCents)
  const unitSuffix = priceUnit ? `/${priceUnit}` : ''
  const dot = confidenceDot(confidence ?? null)
  const trend = trendArrow(trendDirection ?? null, trendPct != null ? Number(trendPct) : null)
  const fresh = freshnessText(lastPriceDate ?? null)
  const freshColor = freshnessColor(lastPriceDate ?? null)

  // No attribution data (legacy ingredient, no enrichment columns populated)
  if (!store && confidence === null && !trendDirection) {
    return (
      <span className="text-sm font-medium text-stone-200">
        {priceText}
        {unitSuffix && <span className="text-stone-400">{unitSuffix}</span>}
      </span>
    )
  }

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-sm">
        <span className="font-medium text-stone-200">
          {priceText}
          {unitSuffix && <span className="text-stone-400">{unitSuffix}</span>}
        </span>
        {store && (
          <span className="text-xs text-stone-500 truncate max-w-[80px]">
            {isPreferred && (
              <span className="text-amber-400 mr-0.5" title="Your preferred store">
                &#9733;
              </span>
            )}
            at {store}
          </span>
        )}
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${dot.color}`} title={dot.title} />
        {trend && (
          <span className={`text-xs ${trend.color}`} title={trend.title}>
            {trend.symbol}
          </span>
        )}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className="font-medium text-stone-200">
        {priceText}
        {unitSuffix && <span className="text-stone-400">{unitSuffix}</span>}
      </span>
      {store && (
        <>
          <span className="text-stone-600">&middot;</span>
          <span className="text-xs text-stone-400">
            {isPreferred && (
              <span className="text-amber-400 mr-0.5" title="Your preferred store">
                &#9733;
              </span>
            )}
            {store}
          </span>
        </>
      )}
      <span className={`inline-block w-2 h-2 rounded-full ${dot.color}`} title={dot.title} />
      {trend && (
        <span className={`text-xs font-medium ${trend.color}`} title={trend.title}>
          {trend.symbol}
        </span>
      )}
      {fresh && (
        <>
          <span className="text-stone-600">&middot;</span>
          <span className={`text-xs ${freshColor}`}>{fresh}</span>
        </>
      )}
    </span>
  )
}
