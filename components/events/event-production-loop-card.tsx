import Link from 'next/link'
import { ArrowRight, CheckCircle, AlertTriangle, Clock } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { EventProductionLoopSnapshot } from '@/lib/events/production-loop-actions'
import type { ProductionStageState } from '@/lib/events/production-loop'

function stageVariant(state: ProductionStageState) {
  if (state === 'done' || state === 'ready') return 'success' as const
  if (state === 'blocked') return 'error' as const
  if (state === 'attention') return 'warning' as const
  return 'default' as const
}

function stageIcon(state: ProductionStageState) {
  if (state === 'done' || state === 'ready') {
    return <CheckCircle className="h-4 w-4 text-emerald-400" />
  }
  if (state === 'blocked' || state === 'attention') {
    return <AlertTriangle className="h-4 w-4 text-amber-400" />
  }
  return <Clock className="h-4 w-4 text-stone-400" />
}
export function EventProductionLoopCard({ snapshot }: { snapshot: EventProductionLoopSnapshot }) {
  const { event, shopping, variance, pnl } = snapshot
  const eventQuery = new URLSearchParams({
    startDate: event.eventDate,
    endDate: event.eventDate,
    eventIds: event.id,
  }).toString()
  const shortages = shopping.items.filter((item) => item.toBuy > 0)
  const openPoCount = snapshot.purchaseOrders.filter(
    (po) => !['received', 'cancelled'].includes(po.status)
  ).length

  const stageHref: Record<string, string> = {
    scale: `/events/${event.id}?tab=money`,
    buy: `/culinary/prep/shopping?${eventQuery}`,
    prep: `/events/${event.id}/prep-plan`,
    reconcile: `/events/${event.id}/receipts`,
  }

  return (
    <Card className="p-5" data-cf-surface="chef:event-production-loop">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Event production loop
          </p>
          <h2 className="mt-1 text-xl font-semibold text-stone-100">
            {event.guestCount} guests → buy → prep → actual profit
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-stone-400">
            One source of truth for scaled recipes, inventory shortages, purchasing, prep, receipts,
            and final event economics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href={`/culinary/prep/shopping/print?${eventQuery}`} variant="secondary" size="sm">
            Print shopping
          </Button>
          <Button href={`/events/${event.id}/receipts`} variant="ghost" size="sm">
            Capture receipt
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {snapshot.stages.map((stage) => (
          <Link
            key={stage.key}
            href={stageHref[stage.key]}
            className="rounded-lg border border-stone-800 bg-stone-950/50 p-4 hover:border-stone-700"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {stageIcon(stage.state)}
                <p className="text-sm font-semibold text-stone-100">{stage.label}</p>
              </div>
              <Badge variant={stageVariant(stage.state)}>{stage.status}</Badge>
            </div>
            <p className="mt-3 text-sm text-stone-400">{stage.nextStep}</p>
          </Link>
        ))}
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-stone-800 bg-stone-950/40 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-100">Scaled recipes</h3>
            <span className="text-xs text-stone-500">{snapshot.recipes.length} linked</span>
          </div>
          <div className="mt-3 space-y-2">
            {snapshot.recipes.slice(0, 6).map((recipe) => (
              <div key={recipe.recipeId} className="flex items-center justify-between gap-3 text-sm">
                <Link href={`/culinary/recipes/${recipe.recipeId}`} className="truncate text-stone-300 hover:text-white">
                  {recipe.name}
                </Link>
                <span className="shrink-0 text-stone-500">
                  {recipe.batches}× · {recipe.targetServings} servings
                </span>
              </div>
            ))}
            {snapshot.recipes.length === 0 ? (
              <p className="text-sm text-stone-500">No recipe-linked menu components yet.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-950/40 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-100">Purchase requirements</h3>
            <span className="text-xs text-stone-500">{shopping.shortageCount} shortages</span>
          </div>
          <div className="mt-3 space-y-2">
            {shortages.slice(0, 6).map((item) => (
              <div key={item.ingredientId} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-stone-300">{item.ingredientName}</p>
                  <p className="truncate text-xs text-stone-600">{item.supplier}</p>
                </div>
                <span className="shrink-0 text-stone-500">
                  {item.toBuy} {item.unit}
                </span>
              </div>
            ))}
            {shortages.length === 0 ? (
              <p className="text-sm text-stone-500">No current shortages.</p>
            ) : null}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-stone-800 pt-3 text-sm">
            <span className="text-stone-500">Projected purchase</span>
            <span className="font-medium text-stone-100">
              {formatCurrency(shopping.totalEstimatedCostCents)}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-950/40 p-4">
          <h3 className="text-sm font-semibold text-stone-100">Actuals</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">Receipt food cost</dt>
              <dd className="text-stone-200">{formatCurrency(variance.totalActualCents)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">Recipe estimate</dt>
              <dd className="text-stone-200">{formatCurrency(variance.totalEstimatedCents)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">Cost variance</dt>
              <dd className={variance.varianceCents > 0 ? 'text-red-400' : 'text-emerald-400'}>
                {variance.varianceCents > 0 ? '+' : ''}{formatCurrency(variance.varianceCents)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-stone-800 pt-2">
              <dt className="text-stone-500">True event profit</dt>
              <dd className="font-semibold text-stone-100">
                {pnl ? formatCurrency(pnl.netProfitCents) : 'Not available'}
              </dd>
            </div>
          </dl>
          <div className="mt-4 text-xs text-stone-500">
            {snapshot.prepBlockCount} prep blocks · {openPoCount} open PO{openPoCount === 1 ? '' : 's'} · {variance.unmatchedCount} unmatched receipt item{variance.unmatchedCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button href={`/events/${event.id}/production`} variant="secondary" size="sm">
          Open full production workspace
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
