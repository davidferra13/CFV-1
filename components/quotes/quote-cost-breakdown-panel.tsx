'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import type { QuoteCostIntelligence } from '@/lib/quotes/quote-cost-intelligence'

interface Props {
  intelligence: QuoteCostIntelligence | null
}

function getOverallHealth(
  warnings: QuoteCostIntelligence['warnings']
): 'ok' | 'warning' | 'critical' {
  if (warnings.some((w) => w.level === 'critical')) return 'critical'
  if (warnings.some((w) => w.level === 'warning')) return 'warning'
  return 'ok'
}

function getHealthBadgeVariant(
  health: 'ok' | 'warning' | 'critical'
): 'success' | 'warning' | 'error' {
  if (health === 'critical') return 'error'
  if (health === 'warning') return 'warning'
  return 'success'
}

function getHealthLabel(health: 'ok' | 'warning' | 'critical'): string {
  if (health === 'critical') return 'Needs attention'
  if (health === 'warning') return 'Review recommended'
  return 'Healthy'
}

function getMarginColor(pct: number | null): string {
  if (pct === null) return 'text-stone-400'
  if (pct >= 60) return 'text-emerald-400'
  if (pct >= 40) return 'text-green-400'
  if (pct >= 20) return 'text-amber-400'
  return 'text-red-400'
}

function getFoodCostColor(pct: number | null): string {
  if (pct === null) return 'text-stone-400'
  if (pct <= 25) return 'text-emerald-400'
  if (pct <= 35) return 'text-green-400'
  if (pct <= 45) return 'text-amber-400'
  return 'text-red-400'
}

function getWarningBg(level: 'info' | 'warning' | 'critical'): string {
  if (level === 'critical') return 'bg-red-950/30 border-red-800/40 text-red-300'
  if (level === 'warning') return 'bg-amber-950/30 border-amber-800/40 text-amber-300'
  return 'bg-blue-950/30 border-blue-800/40 text-blue-300'
}

function getWarningDot(level: 'info' | 'warning' | 'critical'): string {
  if (level === 'critical') return 'bg-red-400'
  if (level === 'warning') return 'bg-amber-400'
  return 'bg-blue-400'
}

export function QuoteCostBreakdownPanel({ intelligence }: Props) {
  const [showBreakdown, setShowBreakdown] = useState(false)

  if (!intelligence) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-stone-500">
            Cost intelligence unavailable. Link a menu to this quote's event to see projections.
          </p>
        </CardContent>
      </Card>
    )
  }

  const health = getOverallHealth(intelligence.warnings)
  const {
    foodCostCents,
    costPerGuestCents,
    foodCostPercent,
    marginCents,
    marginPercent,
    laborCostCents,
    overheadCostCents,
    travelCostCents,
    totalProjectedCostCents,
    targetMarginPercent,
    similarEvents,
    clientHistory,
    suggestedPriceCents,
    suggestedPriceReason,
    drift,
    warnings,
    menuName,
  } = intelligence

  return (
    <Card>
      <CardContent className="py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-300">Cost Intelligence</h3>
          <Badge variant={getHealthBadgeVariant(health)}>{getHealthLabel(health)}</Badge>
        </div>

        {/* Menu name */}
        {menuName && <p className="text-xs text-stone-500">Based on menu: {menuName}</p>}

        {/* 4-metric grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Food Cost */}
          <div className="rounded-lg border border-stone-800 bg-stone-900/30 px-3 py-2">
            <p className="text-[10px] text-stone-500 uppercase tracking-wide">Food Cost</p>
            <p className="text-lg font-bold text-stone-200 mt-0.5">
              {foodCostCents !== null ? formatCurrency(foodCostCents) : 'N/A'}
            </p>
            {costPerGuestCents !== null && (
              <p className="text-xs text-stone-500">{formatCurrency(costPerGuestCents)}/guest</p>
            )}
          </div>

          {/* Food Cost % */}
          <div className="rounded-lg border border-stone-800 bg-stone-900/30 px-3 py-2">
            <p className="text-[10px] text-stone-500 uppercase tracking-wide">Food Cost %</p>
            {foodCostPercent !== null ? (
              <>
                <p className={`text-lg font-bold mt-0.5 ${getFoodCostColor(foodCostPercent)}`}>
                  {foodCostPercent}%
                </p>
                <p className="text-xs text-stone-500">Target: below 35%</p>
              </>
            ) : (
              <p className="text-sm text-stone-500 mt-1">Set a quoted price</p>
            )}
          </div>

          {/* Projected Margin */}
          <div className="rounded-lg border border-stone-800 bg-stone-900/30 px-3 py-2">
            <p className="text-[10px] text-stone-500 uppercase tracking-wide">Projected Margin</p>
            {marginCents !== null ? (
              <p
                className={`text-lg font-bold mt-0.5 ${marginCents > 0 ? 'text-emerald-400' : 'text-red-400'}`}
              >
                {formatCurrency(marginCents)}
              </p>
            ) : (
              <p className="text-sm text-stone-500 mt-1">N/A</p>
            )}
          </div>

          {/* Margin % */}
          <div className="rounded-lg border border-stone-800 bg-stone-900/30 px-3 py-2">
            <p className="text-[10px] text-stone-500 uppercase tracking-wide">Margin %</p>
            {marginPercent !== null ? (
              <>
                <p className={`text-lg font-bold mt-0.5 ${getMarginColor(marginPercent)}`}>
                  {marginPercent}%
                </p>
                <p className="text-xs text-stone-500">Target: {targetMarginPercent}%</p>
              </>
            ) : (
              <p className="text-sm text-stone-500 mt-1">N/A</p>
            )}
          </div>
        </div>

        {/* Cost breakdown (collapsible) */}
        <div>
          <button
            type="button"
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="text-xs text-stone-400 hover:text-stone-200 underline underline-offset-2"
          >
            {showBreakdown ? 'Hide cost breakdown' : 'Show cost breakdown'}
          </button>

          {showBreakdown && (
            <div className="mt-2 space-y-1.5 rounded-lg border border-stone-800 bg-stone-900/20 px-3 py-2">
              <div className="flex justify-between text-xs">
                <span className="text-stone-400">Ingredients</span>
                <span className="text-stone-200">
                  {foodCostCents !== null ? formatCurrency(foodCostCents) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-400">Labor</span>
                <span className="text-stone-200">{formatCurrency(laborCostCents)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-400">Overhead</span>
                <span className="text-stone-200">{formatCurrency(overheadCostCents)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-400">Travel</span>
                <span className="text-stone-200">{formatCurrency(travelCostCents)}</span>
              </div>
              <div className="flex justify-between text-xs pt-1.5 border-t border-stone-800">
                <span className="text-stone-300 font-semibold">Total Cost</span>
                <span className="text-stone-100 font-semibold">
                  {formatCurrency(totalProjectedCostCents)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Benchmarks */}
        {(similarEvents || clientHistory || suggestedPriceCents) && (
          <div className="space-y-1.5">
            <h4 className="text-[10px] text-stone-500 uppercase tracking-wide">Benchmarks</h4>

            {similarEvents &&
              similarEvents.sampleSize > 0 &&
              similarEvents.avgPricePerGuestCents !== null && (
                <p className="text-xs text-stone-400">
                  Similar events: avg {formatCurrency(similarEvents.avgPricePerGuestCents)}/head (
                  {similarEvents.sampleSize} event
                  {similarEvents.sampleSize !== 1 ? 's' : ''})
                </p>
              )}

            {clientHistory && clientHistory.eventCount > 0 && (
              <p className="text-xs text-stone-400">
                This client's average: {formatCurrency(clientHistory.avgSpendCents)} (
                {clientHistory.eventCount} event
                {clientHistory.eventCount !== 1 ? 's' : ''})
              </p>
            )}

            {suggestedPriceCents !== null && suggestedPriceReason && (
              <p className="text-xs text-stone-400">
                Suggested price:{' '}
                <span className="text-stone-200 font-medium">
                  {formatCurrency(suggestedPriceCents)}
                </span>{' '}
                ({suggestedPriceReason})
              </p>
            )}
          </div>
        )}

        {/* Drift warning */}
        {drift?.hasDrift && drift.driftPercent !== null && (
          <div
            className={`rounded-md border px-3 py-2 text-xs ${
              drift.driftPercent > 15
                ? 'bg-red-950/30 border-red-800/40 text-red-300'
                : 'bg-amber-950/30 border-amber-800/40 text-amber-300'
            }`}
          >
            Menu costs have changed {drift.driftPercent}% since the cost snapshot was taken
            {drift.snapshotAt ? ` on ${new Date(drift.snapshotAt).toLocaleDateString()}` : ''}.
          </div>
        )}

        {/* Guard rail warnings */}
        {warnings.length > 0 && (
          <div className="space-y-1.5">
            {warnings.map((warning, i) => (
              <div
                key={`${warning.code}-${i}`}
                className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${getWarningBg(warning.level)}`}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full mt-1 shrink-0 ${getWarningDot(warning.level)}`}
                />
                <span>{warning.message}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
