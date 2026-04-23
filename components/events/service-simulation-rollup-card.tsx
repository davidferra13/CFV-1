import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ServiceSimulationPanelState } from '@/lib/service-simulation/types'

type ServiceSimulationRollupCardProps = {
  eventId: string
  panelState: ServiceSimulationPanelState
  compact?: boolean
  title?: string
  description?: string
  showOpenButton?: boolean
  className?: string
  returnToHref?: string | null
}

function getSimulationStatusLabel(status: ServiceSimulationPanelState['status']): string {
  switch (status) {
    case 'current':
      return 'Current saved rehearsal'
    case 'stale':
      return 'Saved rehearsal is stale'
    default:
      return 'Not yet simulated'
  }
}

function getSimulationStatusVariant(
  status: ServiceSimulationPanelState['status']
): 'success' | 'warning' | 'info' {
  switch (status) {
    case 'current':
      return 'success'
    case 'stale':
      return 'warning'
    default:
      return 'info'
  }
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return 'Unknown time'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ServiceSimulationRollupCard({
  eventId,
  panelState,
  compact = false,
  title = 'Service Simulation',
  description,
  showOpenButton = true,
  className = '',
  returnToHref = null,
}: ServiceSimulationRollupCardProps) {
  const { rollup } = panelState.simulation
  const readiness = panelState.simulation.readiness
  const helperCopy =
    description ??
    'Live service check from current event truth. Saved rehearsal status stays separate from the live walkthrough.'
  const buildFixHref = (href: string) => {
    if (!returnToHref) return href
    const url = new URL(href, 'https://cheflowhq.com')
    url.searchParams.set('returnTo', returnToHref)
    return `${url.pathname}${url.search}${url.hash}`
  }

  return (
    <Card
      className={`border-stone-700/80 bg-stone-950/70 p-4 ${className}`}
      data-testid="service-simulation-rollup"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-stone-100">{title}</h2>
            <Badge
              variant={getSimulationStatusVariant(panelState.status)}
              data-testid="service-simulation-status"
            >
              {getSimulationStatusLabel(panelState.status)}
            </Badge>
            <Badge variant={readiness.counts.blockers > 0 ? 'error' : 'success'}>
              Confidence {readiness.overallScore}%
            </Badge>
          </div>
          <p className="mt-2 text-sm text-stone-300">{helperCopy}</p>
          {panelState.latestRun ? (
            <p className="mt-2 text-xs text-stone-500">
              Last saved rehearsal {formatTimestamp(panelState.latestRun.createdAt)}.
            </p>
          ) : null}
        </div>

        {showOpenButton ? (
          <Button
            href={`/events/${eventId}?tab=ops#service-simulation`}
            variant="secondary"
            size="sm"
          >
            Open Full Simulation
          </Button>
        ) : null}
      </div>

      <div
        className={`mt-4 grid gap-3 ${compact ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}
      >
        <div className="rounded-xl border border-stone-800 bg-stone-900/80 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Readiness</p>
          <p className="mt-2 text-2xl font-semibold text-stone-100">{readiness.overallScore}%</p>
          <p className="mt-1 text-sm text-stone-400">{rollup.readinessLabel}</p>
        </div>
        <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-rose-400">Blockers</p>
          <p className="mt-2 text-2xl font-semibold text-rose-200">
            {readiness.counts.blockers}
          </p>
          <p className="mt-1 text-sm text-rose-300">Critical blocking proof gaps</p>
        </div>
        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-400">Risks / Stale</p>
          <p className="mt-2 text-2xl font-semibold text-amber-200">
            {readiness.counts.risks + readiness.counts.stale}
          </p>
          <p className="mt-1 text-sm text-amber-300">
            {readiness.counts.risks} risks, {readiness.counts.stale} stale
          </p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900/80 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Top Concern</p>
          {rollup.topConcern ? (
            <>
              <p className="mt-2 text-sm font-medium text-stone-100">{rollup.topConcern.label}</p>
              <p className="mt-1 text-sm text-stone-400">{rollup.topConcern.phaseLabel}</p>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm font-medium text-emerald-400">No current concerns</p>
              <p className="mt-1 text-sm text-stone-400">Current truth supports rehearsal.</p>
            </>
          )}
        </div>
      </div>

      {rollup.topConcern ? (
        <div className="mt-4 rounded-xl border border-stone-800 bg-stone-900/80 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                Most Likely Failure Point
              </p>
              <p className="mt-2 text-sm font-medium text-stone-100">{rollup.topConcern.label}</p>
              <p className="mt-1 text-sm text-stone-400">{rollup.topConcern.detail}</p>
            </div>
            <Button href={buildFixHref(rollup.topConcern.route)} variant="ghost" size="sm">
              {rollup.topConcern.ctaLabel}
            </Button>
          </div>
        </div>
      ) : null}

      {panelState.status === 'stale' && panelState.staleReasons.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-800/60 bg-amber-950/30 p-3">
          <p className="text-sm font-medium text-amber-200">
            Saved rehearsal is stale because {panelState.staleReasons[0]?.label.toLowerCase()}.
          </p>
        </div>
      ) : null}
    </Card>
  )
}
