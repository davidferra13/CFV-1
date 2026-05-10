'use client'

/**
 * IngredientPiePopover
 *
 * Expandable inline panel that shows full PIE pricing intelligence
 * for a recipe ingredient. Fetches data on-demand when clicked.
 *
 * Shows: resolved price with tier, confidence dots, price history
 * (last 5 entries), seasonal indicator, and trend direction.
 */

import { useState, useTransition } from 'react'
import { getIngredientPieDetail } from '@/lib/pricing/ingredient-pie-detail'
import type { IngredientPieDetail } from '@/lib/pricing/ingredient-pie-detail'
import { PriceBadge } from './price-badge'
import { Badge } from '@/components/ui/badge'

interface Props {
  ingredientId: string
  ingredientName: string
  className?: string
}

function SeasonBadge({ label }: { label: 'peak' | 'in-season' | 'off-season' }) {
  if (label === 'in-season') {
    return <Badge variant="success">In Season</Badge>
  }
  if (label === 'peak') {
    return <Badge variant="error">Peak Price</Badge>
  }
  return <Badge variant="default">Off Season</Badge>
}

function TierExplanation({ tier }: { tier: string }) {
  const explanations: Record<string, { label: string; color: string }> = {
    chef_override: { label: 'Your manually set price', color: 'text-emerald-400' },
    chef_receipt: { label: 'From your receipts', color: 'text-emerald-400' },
    wholesale: { label: 'Wholesale distributor', color: 'text-emerald-400' },
    zip_local: { label: 'Local store price', color: 'text-emerald-400' },
    regional: { label: 'Regional average', color: 'text-sky-400' },
    market_state: { label: 'State market average', color: 'text-sky-400' },
    market_national: { label: 'National average', color: 'text-amber-400' },
    government: { label: 'USDA estimate', color: 'text-amber-400' },
    historical: { label: 'Your historical average', color: 'text-stone-400' },
    category_baseline: { label: 'Category estimate', color: 'text-stone-500' },
    synthetic: { label: 'Synthetic estimate', color: 'text-stone-500' },
    none: { label: 'No data', color: 'text-red-400' },
  }

  const info = explanations[tier] || { label: tier, color: 'text-stone-400' }

  return <span className={`text-xs ${info.color}`}>{info.label}</span>
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-xs text-stone-400 w-8 text-right">{pct}%</span>
    </div>
  )
}

export function IngredientPiePopover({ ingredientId, ingredientName, className = '' }: Props) {
  const [data, setData] = useState<IngredientPieDetail | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleToggle = () => {
    if (expanded) {
      setExpanded(false)
      return
    }

    if (data) {
      setExpanded(true)
      return
    }

    // Fetch on first expand
    setError(null)
    startTransition(async () => {
      try {
        const result = await getIngredientPieDetail(ingredientId)
        setData(result)
        setExpanded(true)
      } catch (err) {
        setError('Failed to load pricing data')
      }
    })
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleToggle}
        className="text-xs text-stone-500 hover:text-brand-400 transition-colors flex items-center gap-1"
        title="View PIE pricing intelligence"
      >
        {isPending ? (
          <span className="animate-pulse">Loading...</span>
        ) : (
          <>
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            PIE
          </>
        )}
      </button>

      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}

      {expanded && data && (
        <div className="mt-2 p-3 rounded-lg border border-stone-700 bg-stone-900/60 space-y-3 text-sm">
          {/* Resolved Price with full PriceBadge */}
          <div>
            <p className="text-xs text-stone-500 mb-1">Current Resolved Price</p>
            <PriceBadge price={data.resolvedPrice} ingredientId={ingredientId} />
          </div>

          {/* Confidence + Tier */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-stone-500 mb-1">Confidence</p>
              <ConfidenceBar value={data.resolvedPrice.effectiveConfidence} />
            </div>
            <div>
              <p className="text-xs text-stone-500 mb-1">Resolution Tier</p>
              <TierExplanation tier={data.resolvedPrice.resolutionTier} />
            </div>
          </div>

          {/* Source + Coverage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-stone-500 mb-1">Source</p>
              <span className="text-xs text-stone-300">
                {data.resolvedPrice.store || 'Unknown'}
              </span>
            </div>
            <div>
              <p className="text-xs text-stone-500 mb-1">Coverage</p>
              <span className="text-xs text-stone-300 capitalize">
                {data.resolvedPrice.coverageLevel}
              </span>
            </div>
          </div>

          {/* Reason (if present) */}
          {data.resolvedPrice.reason && (
            <div>
              <p className="text-xs text-stone-500 mb-0.5">Note</p>
              <p className="text-xs text-stone-400">{data.resolvedPrice.reason}</p>
            </div>
          )}

          {/* Seasonal Indicator */}
          {data.seasonLabel && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-stone-500">Season:</p>
              <SeasonBadge label={data.seasonLabel} />
              {data.currentMonthIndex !== null && (
                <span className="text-xs text-stone-400">
                  (
                  {data.currentMonthIndex > 100
                    ? `${data.currentMonthIndex - 100}% above avg`
                    : data.currentMonthIndex < 100
                      ? `${100 - data.currentMonthIndex}% below avg`
                      : 'at average'}
                  )
                </span>
              )}
            </div>
          )}

          {/* Seasonal Pattern Mini-Chart */}
          {data.seasonalPattern && data.seasonalPattern.monthly_prices.length > 0 && (
            <div>
              <p className="text-xs text-stone-500 mb-1">
                Seasonal Pattern
                {data.seasonalPattern.has_seasonal_pattern && (
                  <span className="text-amber-400 ml-1">
                    ({data.seasonalPattern.price_swing_pct}% swing)
                  </span>
                )}
              </p>
              <div className="flex items-end gap-0.5 h-8">
                {data.seasonalPattern.monthly_prices.map((m) => {
                  const maxCents = Math.max(
                    ...data.seasonalPattern!.monthly_prices.map((p) => p.avg_cents)
                  )
                  const heightPct = maxCents > 0 ? (m.avg_cents / maxCents) * 100 : 0
                  const currentMonth = new Date().getMonth() + 1
                  const isCurrentMonth = m.month === currentMonth
                  const isCheapest = m.month === data.seasonalPattern!.cheapest_month
                  const isExpensive = m.month === data.seasonalPattern!.most_expensive_month

                  return (
                    <div
                      key={m.month}
                      className={`flex-1 rounded-t transition-colors ${
                        isCurrentMonth
                          ? 'bg-brand-500'
                          : isCheapest
                            ? 'bg-emerald-500/60'
                            : isExpensive
                              ? 'bg-red-500/60'
                              : 'bg-stone-600'
                      }`}
                      style={{ height: `${Math.max(heightPct, 8)}%` }}
                      title={`${m.month_name}: ${formatCents(m.avg_cents)} (${m.data_points} pts)`}
                    />
                  )
                })}
              </div>
              <div className="flex gap-0.5 mt-0.5">
                {data.seasonalPattern.monthly_prices.map((m) => (
                  <span key={m.month} className="flex-1 text-center text-[0.5rem] text-stone-600">
                    {m.month_name.slice(0, 1)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent Price History */}
          {data.priceHistory.length > 0 && (
            <div>
              <p className="text-xs text-stone-500 mb-1">
                Recent Prices ({data.priceHistory.length})
              </p>
              <div className="space-y-1">
                {data.priceHistory.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center text-xs">
                    <span className="text-stone-400">{formatDate(entry.recordedAt)}</span>
                    <span className="text-stone-300">
                      {formatCents(entry.priceCents)}/{entry.unit}
                    </span>
                    <span className="text-stone-500 capitalize text-[0.65rem]">
                      {entry.source.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.priceHistory.length === 0 && !data.seasonalPattern && (
            <p className="text-xs text-stone-500 text-center py-1">
              No price history recorded yet. Log a receipt to build data.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
