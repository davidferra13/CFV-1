'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import type { EventPricingIntelligencePayload } from '@/lib/finance/event-pricing-intelligence-actions'

type Props = {
  data: EventPricingIntelligencePayload | null
  className?: string
}

function pctStr(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}%` : '--'
}

function marginColor(actual: number | null, target: number): string {
  if (actual == null) return 'text-stone-500'
  if (actual >= target) return 'text-emerald-400'
  if (actual >= target - 5) return 'text-amber-400'
  return 'text-red-400'
}

function foodCostColor(actual: number | null, target: number): string {
  if (actual == null) return 'text-stone-500'
  if (actual <= target) return 'text-emerald-400'
  if (actual <= target + 5) return 'text-amber-400'
  return 'text-red-400'
}

/**
 * Compact "pricing pulse" card for the event detail page.
 * Shows the full pricing chain at a glance: food cost, margin, quoted vs suggested, warnings.
 * Designed to sit above the fold, not inside the money tab.
 */
export function EventPricingVertical({ data, className }: Props) {
  if (!data) return null

  const quotedCents = data.projected.quoteTotalCents
  const suggestedCents = data.projected.suggestedPriceCents
  const foodCostPct = data.projected.projectedFoodCostPercent ?? data.actual.actualFoodCostPercent
  const marginPct = data.actual.actualMarginPercent ?? data.projected.expectedMarginPercent
  const isActualMargin = data.actual.actualMarginPercent != null
  const targetFoodCost = data.projected.targetFoodCostPercent
  const targetMargin = data.projected.targetMarginPercent
  const spikeCount = data.priceSignals.ingredientSpikeCount
  const criticalWarnings = data.warnings.filter((w) => w.severity === 'critical')
  const warningCount = data.warnings.length

  // Price delta: quoted vs suggested
  const priceDeltaCents =
    quotedCents > 0 && suggestedCents > 0 ? quotedCents - suggestedCents : null
  const priceDeltaPct =
    priceDeltaCents != null && suggestedCents > 0
      ? Math.round((priceDeltaCents / suggestedCents) * 100)
      : null

  return (
    <Card className={`p-4 ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-stone-200">Pricing Pulse</h3>
        <div className="flex gap-1.5">
          <Badge
            variant={
              data.confidence.pricingConfidence === 'high'
                ? 'success'
                : data.confidence.pricingConfidence === 'medium'
                  ? 'warning'
                  : 'error'
            }
          >
            {data.confidence.pricingConfidence}
          </Badge>
          {criticalWarnings.length > 0 && (
            <Badge variant="error">{criticalWarnings.length} critical</Badge>
          )}
          {warningCount > 0 && criticalWarnings.length === 0 && (
            <Badge variant="warning">
              {warningCount} warning{warningCount > 1 ? 's' : ''}
            </Badge>
          )}
          {warningCount === 0 && <Badge variant="success">Healthy</Badge>}
        </div>
      </div>

      {/* Core metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Food cost % */}
        <div>
          <p className="text-[10px] uppercase tracking-wide text-stone-500">Food cost</p>
          <p className={`text-lg font-bold ${foodCostColor(foodCostPct, targetFoodCost)}`}>
            {pctStr(foodCostPct)}
          </p>
          <p className="text-[10px] text-stone-600">target {targetFoodCost}%</p>
        </div>

        {/* Margin */}
        <div>
          <p className="text-[10px] uppercase tracking-wide text-stone-500">
            {isActualMargin ? 'Actual margin' : 'Projected margin'}
          </p>
          <p className={`text-lg font-bold ${marginColor(marginPct, targetMargin)}`}>
            {pctStr(marginPct)}
          </p>
          <p className="text-[10px] text-stone-600">target {targetMargin}%</p>
        </div>

        {/* Quoted price */}
        <div>
          <p className="text-[10px] uppercase tracking-wide text-stone-500">Quoted</p>
          <p className="text-lg font-bold text-stone-100">
            {quotedCents > 0 ? formatCurrency(quotedCents) : '--'}
          </p>
          {priceDeltaPct != null && (
            <p
              className={`text-[10px] ${priceDeltaPct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
            >
              {priceDeltaPct >= 0 ? '+' : ''}
              {priceDeltaPct}% vs suggested
            </p>
          )}
        </div>

        {/* Profit */}
        <div>
          <p className="text-[10px] uppercase tracking-wide text-stone-500">
            {data.actual.revenueCents > 0 ? 'Profit' : 'Expected profit'}
          </p>
          <p
            className={`text-lg font-bold ${
              (data.actual.revenueCents > 0
                ? data.actual.actualProfitCents
                : data.projected.expectedProfitCents) > 0
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}
          >
            {formatCurrency(
              data.actual.revenueCents > 0
                ? data.actual.actualProfitCents
                : data.projected.expectedProfitCents
            )}
          </p>
          {data.guestCount && data.guestCount > 0 && (
            <p className="text-[10px] text-stone-600">
              {formatCurrency(
                Math.round(
                  (data.actual.revenueCents > 0
                    ? data.actual.actualProfitCents
                    : data.projected.expectedProfitCents) / data.guestCount
                )
              )}
              /guest
            </p>
          )}
        </div>
      </div>

      {/* Spike + warning summary */}
      {(spikeCount > 0 || criticalWarnings.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {spikeCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-950/50 border border-amber-800/50 px-2 py-0.5 text-xs text-amber-400">
              {spikeCount} ingredient{spikeCount > 1 ? 's' : ''} spiking
            </span>
          )}
          {criticalWarnings.map((w) => (
            <span
              key={w.type}
              className="inline-flex items-center gap-1 rounded-md bg-red-950/50 border border-red-800/50 px-2 py-0.5 text-xs text-red-400"
            >
              {w.label}
            </span>
          ))}
        </div>
      )}
    </Card>
  )
}
