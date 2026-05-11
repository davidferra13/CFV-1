import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from '@/components/ui/icons'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'

type QuoteCurrentCostComparisonProps = {
  quotedPriceCents: number | null
  snapshotCostCents: number | null
  currentCostCents: number | null
  snapshotAt?: string | null
  costNeedsRefresh?: boolean | null
  regionalSettings?: { currencyCode: string; locale: string }
}

function formatPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

export function QuoteCurrentCostComparison({
  quotedPriceCents,
  snapshotCostCents,
  currentCostCents,
  snapshotAt,
  costNeedsRefresh,
  regionalSettings,
}: QuoteCurrentCostComparisonProps) {
  if (!quotedPriceCents || !currentCostCents) return null

  const formatterOptions = regionalSettings
    ? { locale: regionalSettings.locale, currency: regionalSettings.currencyCode }
    : {}
  const fmt = (cents: number) => formatCurrency(cents, formatterOptions)
  const baselineCostCents = snapshotCostCents && snapshotCostCents > 0 ? snapshotCostCents : null
  const driftCents = baselineCostCents ? currentCostCents - baselineCostCents : null
  const driftPercent =
    baselineCostCents && baselineCostCents > 0 ? (driftCents! / baselineCostCents) * 100 : null
  const marginCents = quotedPriceCents - currentCostCents
  const foodCostPercent = (currentCostCents / quotedPriceCents) * 100
  const hasMaterialDrift =
    Boolean(costNeedsRefresh) || (driftPercent !== null && Math.abs(driftPercent) >= 5)
  const isHigher = driftCents !== null && driftCents > 0
  const Icon = hasMaterialDrift ? (isHigher ? TrendingUp : TrendingDown) : CheckCircle2

  return (
    <Card
      className={`p-6 ${
        hasMaterialDrift ? 'border-amber-500/40 bg-amber-950/20' : 'border-emerald-500/30'
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 rounded-full p-2 ${
              hasMaterialDrift
                ? 'bg-amber-500/15 text-amber-300'
                : 'bg-emerald-500/15 text-emerald-300'
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Quote vs Current Cost</h2>
            <p className="mt-1 text-sm text-stone-400">
              {baselineCostCents
                ? `Snapshot ${snapshotAt ? new Date(snapshotAt).toLocaleDateString() : 'recorded'} compared with live menu cost.`
                : 'Live menu cost compared with the quoted event price.'}
            </p>
          </div>
        </div>
        {hasMaterialDrift && (
          <div className="flex items-center gap-2 rounded-md border border-amber-500/30 px-3 py-2 text-sm text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Review before relying on this quote.</span>
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Quoted</dt>
          <dd className="mt-1 text-xl font-bold text-stone-100">{fmt(quotedPriceCents)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Current Cost
          </dt>
          <dd className="mt-1 text-xl font-bold text-stone-100">{fmt(currentCostCents)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Margin</dt>
          <dd
            className={`mt-1 text-xl font-bold ${marginCents >= 0 ? 'text-emerald-300' : 'text-red-300'}`}
          >
            {fmt(marginCents)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Food Cost</dt>
          <dd className="mt-1 text-xl font-bold text-stone-100">{foodCostPercent.toFixed(1)}%</dd>
        </div>
      </div>

      {driftCents !== null && driftPercent !== null && (
        <div className="mt-4 rounded-md bg-stone-900/70 px-3 py-2 text-sm text-stone-300">
          Cost drift from snapshot:{' '}
          <span
            className={
              driftCents > 0 ? 'font-semibold text-amber-300' : 'font-semibold text-emerald-300'
            }
          >
            {driftCents > 0 ? '+' : ''}
            {fmt(driftCents)} ({formatPercent(driftPercent)})
          </span>
        </div>
      )}
    </Card>
  )
}
