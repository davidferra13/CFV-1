'use client'

import type { PriceComparisonData } from '@/lib/pricing/pricing-decision'
import { hasActiveOverride, sourceLabelFor, finalLabelFor } from '@/lib/pricing/pricing-decision'

interface PriceComparisonSummaryProps {
  data: PriceComparisonData
  /** Show per-person breakdown row when available */
  showPerPerson?: boolean
  /** Compact layout (quotes list, event summary cards) */
  compact?: boolean
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

/**
 * Shared receipt-style pricing display.
 *
 * - Final-only mode: when no baseline exists or override is 'none'.
 * - Comparison mode: when an active override exists with a different baseline.
 *
 * Do NOT use this for invoice or payment math. Display only.
 */
export function PriceComparisonSummary({
  data,
  showPerPerson = false,
  compact = false,
}: PriceComparisonSummaryProps) {
  const isOverride = hasActiveOverride(data)

  if (compact) {
    return (
      <span className="inline-flex items-baseline gap-1.5">
        {isOverride && data.baselineTotalCents != null && (
          <span className="text-stone-500 line-through text-xs">
            {formatCents(data.baselineTotalCents)}
          </span>
        )}
        <span className="font-semibold text-stone-100">{formatCents(data.finalTotalCents)}</span>
        {isOverride && (
          <span className="text-xs text-brand-400 bg-brand-900/30 px-1 py-0.5 rounded font-medium">
            {data.overrideKind === 'custom_total' ? 'Custom' : 'Chef rate'}
          </span>
        )}
      </span>
    )
  }

  const sourceLabel = sourceLabelFor(data.pricingSourceKind)
  const finalLabel = finalLabelFor(data.overrideKind)

  const deltaCents =
    isOverride && data.baselineTotalCents != null
      ? data.finalTotalCents - data.baselineTotalCents
      : null
  const deltaLabel =
    deltaCents == null
      ? null
      : deltaCents > 0
        ? `+${formatCents(deltaCents)} above estimate`
        : deltaCents < 0
          ? `${formatCents(Math.abs(deltaCents))} below estimate`
          : null

  return (
    <div className="space-y-1">
      {isOverride && data.baselineTotalCents != null ? (
        /* Comparison layout */
        <div className="space-y-0.5">
          {/* Baseline row: struck-through, muted */}
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-stone-500">{sourceLabel}</span>
            <span className="text-sm text-stone-500 line-through">
              {formatCents(data.baselineTotalCents)}
            </span>
          </div>
          {/* Final row: prominent */}
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-stone-300">{finalLabel}</span>
            <span className="text-base font-semibold text-stone-100">
              {formatCents(data.finalTotalCents)}
            </span>
          </div>
          {/* Delta badge */}
          {deltaLabel && (
            <div className="flex justify-end">
              <span className="text-xs text-brand-400 bg-brand-900/20 border border-brand-800/30 px-1.5 py-0.5 rounded">
                {deltaLabel}
              </span>
            </div>
          )}
          {/* Override reason */}
          {data.overrideReason && (
            <p className="text-xs text-stone-500 italic mt-0.5">{data.overrideReason}</p>
          )}
          {/* Per-person comparison */}
          {showPerPerson &&
            data.baselinePricePerPersonCents != null &&
            data.finalPricePerPersonCents != null && (
              <div className="flex items-baseline justify-between gap-2 border-t border-stone-800 mt-1 pt-1">
                <span className="text-xs text-stone-600">Per person</span>
                <span className="text-xs text-stone-500 line-through">
                  {formatCents(data.baselinePricePerPersonCents)}
                </span>
                <span className="text-xs font-medium text-stone-300">
                  {formatCents(data.finalPricePerPersonCents)}
                </span>
              </div>
            )}
          {/* Context notes: scope, minimums, exclusions */}
          {data.pricingContext &&
            typeof data.pricingContext === 'object' &&
            (data.pricingContext as any).pricing_basis &&
            (data.pricingContext as any).pricing_basis !== 'full_quote' && (
              <p className="text-xs text-amber-600">
                Note: estimate covers{' '}
                {String((data.pricingContext as any).pricing_basis).replace(/_/g, ' ')} only
              </p>
            )}
        </div>
      ) : (
        /* Final-only layout */
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm text-stone-400">Total</span>
          <span className="text-base font-semibold text-stone-100">
            {formatCents(data.finalTotalCents)}
          </span>
        </div>
      )}

      {/* Per-person rate when no override but per_person pricing */}
      {!isOverride && showPerPerson && data.finalPricePerPersonCents != null && (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-stone-500">Per person</span>
          <span className="text-xs text-stone-400">
            {formatCents(data.finalPricePerPersonCents)}
            {data.guestCount ? ` x ${data.guestCount}` : ''}
          </span>
        </div>
      )}
    </div>
  )
}
