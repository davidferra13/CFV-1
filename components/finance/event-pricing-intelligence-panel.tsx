'use client'

import { AlertTriangle, Target, TrendingUp } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { EventPricingIntelligencePayload } from '@/lib/finance/event-pricing-intelligence-actions'

type Props = {
  data: EventPricingIntelligencePayload | null
  compact?: boolean
}

function formatPercent(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}%` : 'Pending'
}

function moneyOrPending(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? formatCurrency(value)
    : 'Pending'
}

function moneyWithUnit(value: number, unit: string | null): string {
  return `${formatCurrency(value)}${unit ? `/${unit}` : ''}`
}

function formatRange(low: number | null, high: number | null): string {
  if (low == null || high == null) return 'Pending'
  return `${formatCurrency(low)}-${formatCurrency(high)}`
}

function confidenceVariant(confidence: string): 'success' | 'warning' | 'error' | 'info' {
  if (confidence === 'high') return 'success'
  if (confidence === 'medium') return 'warning'
  return 'error'
}

function reliabilityVariant(verdict: string): 'success' | 'warning' | 'error' | 'info' {
  if (verdict === 'safe_to_quote') return 'success'
  if (verdict === 'verify_first') return 'warning'
  return 'error'
}

function reliabilityLabel(verdict: string): string {
  if (verdict === 'safe_to_quote') return 'Safe to quote'
  if (verdict === 'verify_first') return 'Verify first'
  return 'Planning only'
}

function enforcementVariant(status: string): 'success' | 'warning' | 'error' | 'info' {
  if (status === 'ready') return 'success'
  if (status === 'verify_first') return 'warning'
  if (status === 'blocked') return 'error'
  return 'info'
}

function suggestedPriceLabel(displayMode: string): string {
  if (displayMode === 'planning_estimate') return 'Planning Estimate'
  if (displayMode === 'verification_required') return 'Verify Before Quote'
  if (displayMode === 'manual_quote') return 'Manual Quote'
  return 'Suggested Price'
}

function warningVariant(severity: string): 'default' | 'warning' | 'error' | 'info' {
  if (severity === 'critical') return 'error'
  if (severity === 'warning') return 'warning'
  return 'info'
}

function Metric({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string
  value: string
  sub?: string
  tone?: 'default' | 'good' | 'bad' | 'muted'
}) {
  const valueClass =
    tone === 'good'
      ? 'text-emerald-400'
      : tone === 'bad'
        ? 'text-red-400'
        : tone === 'muted'
          ? 'text-stone-500'
          : 'text-stone-100'

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${valueClass}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-stone-500">{sub}</p> : null}
    </div>
  )
}

function CostRows({
  projected,
  actual,
}: {
  projected: EventPricingIntelligencePayload['projected']
  actual: EventPricingIntelligencePayload['actual']
}) {
  const rows = [
    ['Food', projected.foodCostCents, actual.foodCostCents],
    ['Labor', projected.laborCostCents, actual.laborCostCents],
    ['Travel', projected.travelCostCents, actual.travelCostCents],
    ['Overhead', projected.overheadCostCents, actual.overheadCostCents],
    ['Rentals', projected.rentalsCostCents, actual.rentalsCostCents],
    ['Miscellaneous', projected.miscellaneousCostCents, actual.miscellaneousCostCents],
  ] as const

  return (
    <div className="mt-2 space-y-1">
      {rows.map(([label, projectedCents, actualCents]) => (
        <div
          key={label}
          className="flex items-center justify-between gap-3 border-b border-stone-800/70 py-1 text-xs last:border-0"
        >
          <span className="text-stone-400">{label}</span>
          <span className="text-right text-stone-500">
            Projected {formatCurrency(projectedCents)} / Actual {formatCurrency(actualCents)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function EventPricingIntelligencePanel({ data, compact = false }: Props) {
  if (!data) {
    return (
      <Card className="border-dashed border-stone-700 p-5">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-stone-500" />
          <h2 className="font-semibold text-stone-100">Event Pricing Intelligence</h2>
        </div>
        <p className="mt-2 text-sm text-stone-500">
          Pricing intelligence is unavailable for this event.
        </p>
      </Card>
    )
  }

  const priceBasis =
    data.actual.revenueCents > 0
      ? `Revenue ${formatCurrency(data.actual.revenueCents)}`
      : data.projected.quoteTotalCents > 0
        ? `Quote ${formatCurrency(data.projected.quoteTotalCents)}`
        : 'No quote yet'
  const actualMarginTone =
    data.actual.actualMarginPercent == null
      ? 'muted'
      : data.actual.actualMarginPercent >= data.projected.targetMarginPercent
        ? 'good'
        : 'bad'
  const projectedMarginTone =
    data.projected.expectedMarginPercent >= data.projected.targetMarginPercent ? 'good' : 'bad'
  const varianceTone =
    data.variance.estimatedVsActualCostCents <= 0
      ? 'good'
      : Math.abs(data.variance.estimatedVsActualPercent ?? 0) > 10
        ? 'bad'
        : 'default'
  const riskLabel =
    data.guidance.priceRisk === 'too_cheap'
      ? 'Too cheap'
      : data.guidance.priceRisk === 'too_expensive'
        ? 'Too expensive'
        : data.guidance.priceRisk === 'balanced'
          ? 'Balanced'
          : 'Needs data'

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-500" />
            <h2 className="font-semibold text-stone-100">Event Pricing Intelligence</h2>
          </div>
          <p className="mt-1 text-sm text-stone-500">
            Quote, suggested price, spend, variance, and margin for this event.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={reliabilityVariant(data.pricingReliability.verdict)}>
            {reliabilityLabel(data.pricingReliability.verdict)}
          </Badge>
          <Badge variant={enforcementVariant(data.pricingEnforcement.status)}>
            {data.pricingEnforcement.label}
          </Badge>
          <Badge variant={confidenceVariant(data.confidence.pricingConfidence)}>
            {data.confidence.pricingConfidence} confidence
          </Badge>
          {data.warnings.length > 0 ? (
            <Badge
              variant={data.warnings.some((w) => w.severity === 'critical') ? 'error' : 'warning'}
            >
              {data.warnings.length} warning{data.warnings.length === 1 ? '' : 's'}
            </Badge>
          ) : (
            <Badge variant="success">Margin protected</Badge>
          )}
          {data.menu?.menuIds[0] ? (
            <Button href={`/menus/${data.menu.menuIds[0]}`} size="sm" variant="secondary">
              Open menu
            </Button>
          ) : null}
        </div>
      </div>

      <div className={`mt-4 grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        <Metric label={data.actual.revenueCents > 0 ? 'Revenue' : 'Quoted'} value={priceBasis} />
        <Metric
          label={suggestedPriceLabel(data.pricingEnforcement.displayMode)}
          value={moneyOrPending(data.projected.suggestedPriceCents)}
          sub={
            data.pricingEnforcement.canPresentAsFinalQuote
              ? `${data.projected.targetFoodCostPercent.toFixed(1)}% target food cost`
              : data.pricingEnforcement.requiredAction
          }
          tone={data.pricingEnforcement.canPresentAsFinalQuote ? 'default' : 'bad'}
        />
        <Metric
          label="Guided Range"
          value={formatRange(
            data.guidance.suggestedRangeLowCents,
            data.guidance.suggestedRangeHighCents
          )}
          sub={`${riskLabel}${data.similarEvents.sampleSize > 0 ? `; ${data.similarEvents.sampleSize} similar events` : ''}`}
          tone={
            data.guidance.priceRisk === 'balanced'
              ? 'good'
              : data.guidance.priceRisk === 'insufficient_data'
                ? 'muted'
                : 'bad'
          }
        />
        <Metric
          label="Projected Cost"
          value={moneyOrPending(data.projected.totalCostCents)}
          sub={formatPercent(data.projected.projectedFoodCostPercent)}
        />
        <Metric
          label="Actual Cost"
          value={moneyOrPending(data.actual.totalCostCents)}
          sub={formatPercent(data.actual.actualFoodCostPercent)}
        />
        <Metric
          label="Projected Margin"
          value={formatPercent(data.projected.expectedMarginPercent)}
          sub={
            data.projected.expectedProfitCents
              ? formatCurrency(data.projected.expectedProfitCents)
              : undefined
          }
          tone={projectedMarginTone}
        />
        <Metric
          label="Actual Margin"
          value={formatPercent(data.actual.actualMarginPercent)}
          sub={
            data.actual.revenueCents > 0
              ? formatCurrency(data.actual.actualProfitCents)
              : 'Awaiting revenue'
          }
          tone={actualMarginTone}
        />
        <Metric
          label="Cost Variance"
          value={
            data.variance.estimatedVsActualCostCents === 0
              ? '$0.00'
              : `${data.variance.estimatedVsActualCostCents > 0 ? '+' : '-'}${formatCurrency(
                  Math.abs(data.variance.estimatedVsActualCostCents)
                )}`
          }
          sub={
            data.variance.estimatedVsActualPercent != null
              ? `${data.variance.estimatedVsActualPercent > 0 ? '+' : ''}${data.variance.estimatedVsActualPercent.toFixed(1)}% vs estimate`
              : 'No estimate yet'
          }
          tone={varianceTone}
        />
        <Metric
          label="Target Food Cost"
          value={`${data.projected.targetFoodCostPercent.toFixed(1)}%`}
          sub={`Target margin ${data.projected.targetMarginPercent.toFixed(1)}%`}
        />
      </div>

      {data.warnings.length > 0 ? (
        <div className="mt-4 space-y-2">
          {!data.pricingEnforcement.canPresentAsFinalQuote ? (
            <div className="rounded-lg border border-red-900/70 bg-red-950/30 px-3 py-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-red-100">
                      {data.pricingEnforcement.label}
                    </p>
                    <Badge variant={enforcementVariant(data.pricingEnforcement.status)}>
                      {data.pricingEnforcement.displayMode.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-red-100/80">{data.pricingEnforcement.message}</p>
                  <p className="mt-1 text-xs text-red-100/70">
                    {data.pricingEnforcement.requiredAction}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          {data.warnings.slice(0, 3).map((warning) => (
            <div
              key={`${warning.type}-${warning.label}`}
              className="rounded-lg border border-stone-800 bg-stone-900/40 px-3 py-2"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-stone-200">{warning.label}</p>
                    <Badge variant={warningVariant(warning.severity)}>{warning.severity}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-stone-400">{warning.message}</p>
                  <p className="mt-1 text-xs text-stone-500">{warning.recommendation}</p>
                </div>
              </div>
            </div>
          ))}
          {data.warnings.length > 3 ? (
            <details className="rounded-lg border border-stone-800 bg-stone-900/30 px-3 py-2">
              <summary className="cursor-pointer text-xs text-stone-500 hover:text-stone-300">
                Show {data.warnings.length - 3} more warning
                {data.warnings.length - 3 === 1 ? '' : 's'}
              </summary>
              <div className="mt-2 space-y-2">
                {data.warnings.slice(3).map((warning) => (
                  <div
                    key={`${warning.type}-${warning.message}`}
                    className="text-xs text-stone-400"
                  >
                    <span className="font-medium text-stone-300">{warning.label}:</span>{' '}
                    {warning.message}
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : null}

      <details className="mt-4 rounded-lg border border-stone-800 bg-stone-900/30 px-3 py-2">
        <summary className="cursor-pointer text-xs text-stone-500 hover:text-stone-300">
          Source and category detail
        </summary>
        <div className="mt-2 space-y-3">
          <p className="text-xs text-stone-400">{data.projected.suggestedPriceReason}</p>
          <CostRows projected={data.projected} actual={data.actual} />
          {data.priceSignals.ingredientSpikes.length > 0 ? (
            <div className="space-y-1">
              {data.priceSignals.ingredientSpikes.map((spike) => (
                <div
                  key={spike.ingredientId}
                  className="flex flex-col gap-1 border-b border-stone-800/70 py-1 text-xs last:border-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium text-stone-300">{spike.ingredientName}</span>
                  <span className="text-stone-500">
                    {moneyWithUnit(spike.currentPriceCents, spike.unit)} vs{' '}
                    {moneyWithUnit(spike.averagePriceCents, spike.unit)} avg, +
                    {spike.spikePercent.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="grid gap-2 text-xs text-stone-500 sm:grid-cols-2">
            <p>
              Menu:{' '}
              {data.menu?.menuNames.length
                ? data.menu.menuNames.join(', ')
                : 'No costed menu linked'}
            </p>
            <p>
              Ingredient pricing: {data.confidence.totalIngredientCount} ingredients,{' '}
              {data.confidence.missingPriceCount} missing, {data.confidence.stalePriceCount} stale,{' '}
              {data.confidence.lowConfidenceIngredientCount} low confidence,{' '}
              {data.priceSignals.insufficientHistoryCount} without price history
            </p>
            <p>
              Reliability gate: {data.pricingReliability.safeToQuoteCount} safe,{' '}
              {data.pricingReliability.verifyFirstCount} verify first,{' '}
              {data.pricingReliability.planningOnlyCount} planning only,{' '}
              {data.pricingReliability.modeledCount} modeled fallback
            </p>
            <p>
              Average reliability confidence:{' '}
              {Math.round(data.pricingReliability.averageConfidence * 100)}%
            </p>
            <p>
              Enforcement: {data.pricingEnforcement.label}.{' '}
              {data.pricingEnforcement.canSendQuote
                ? 'Quote send is allowed with this decision.'
                : 'Final quote send is blocked until repair is complete.'}
            </p>
          </div>
          {data.pricingEnforcement.repairQueue.length > 0 ? (
            <div className="space-y-1">
              {data.pricingEnforcement.repairQueue.slice(0, 5).map((item) => (
                <div
                  key={item.kind}
                  className="flex flex-col gap-1 border-b border-stone-800/70 py-1 text-xs last:border-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium text-stone-300">{item.label}</span>
                  <span className="text-stone-500">{item.reason}</span>
                </div>
              ))}
            </div>
          ) : null}
          {data.pricingReliability.contracts.length > 0 ? (
            <div className="space-y-1">
              {data.pricingReliability.contracts
                .filter((contract) => contract.kind === 'priced')
                .slice(0, 6)
                .map((contract) => (
                  <div
                    key={`${contract.ingredientId ?? contract.normalizedName}-${contract.sourceClass}`}
                    className="flex flex-col gap-1 border-b border-stone-800/70 py-1 text-xs last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-medium text-stone-300">{contract.normalizedName}</span>
                    <span className="text-stone-500">
                      {formatCurrency(contract.priceCents)}/{contract.unit},{' '}
                      {reliabilityLabel(contract.quoteSafety)},{' '}
                      {contract.sourceClass.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
            </div>
          ) : null}
        </div>
      </details>
    </Card>
  )
}
