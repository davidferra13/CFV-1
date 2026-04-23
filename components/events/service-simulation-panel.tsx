'use client'

import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ServiceSimulationRollupCard } from '@/components/events/service-simulation-rollup-card'
import {
  getEventServiceSimulationPanelState,
  simulateEventService,
} from '@/lib/service-simulation/actions'
import type {
  ServiceSimulationActionItem,
  ServiceSimulationPanelState,
  ServiceSimulationPhase,
  ServiceSimulationSeverityBand,
} from '@/lib/service-simulation/types'

type ServiceSimulationPanelProps = {
  eventId: string
  initialState?: ServiceSimulationPanelState | null
}

const BAND_LABELS: Record<ServiceSimulationSeverityBand, string> = {
  must_fix: 'Must Fix Before Service',
  should_verify: 'Should Verify',
  optional_improvement: 'Optional Improvement',
}

const BAND_STYLES: Record<ServiceSimulationSeverityBand, string> = {
  must_fix: 'border-rose-900/60 bg-rose-950/25',
  should_verify: 'border-amber-900/60 bg-amber-950/25',
  optional_improvement: 'border-stone-800 bg-stone-900/80',
}

function IssueBandSection({
  title,
  items,
  returnToHref,
}: {
  title: string
  items: ServiceSimulationActionItem[]
  returnToHref: string
}) {
  if (items.length === 0) return null

  const buildFixHref = (href: string) => {
    const url = new URL(href, 'https://cheflowhq.com')
    url.searchParams.set('returnTo', returnToHref)
    return `${url.pathname}${url.search}${url.hash}`
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">{title}</p>
        <Badge
          variant={
            items[0]?.severity === 'must_fix'
              ? 'error'
              : items[0]?.severity === 'should_verify'
                ? 'warning'
                : 'info'
          }
        >
          {items.length}
        </Badge>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div
            key={`${item.phaseKey}-${item.key}`}
            className={`rounded-xl border p-3 ${BAND_STYLES[item.severity]}`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-stone-100">{item.label}</p>
                  <span className="text-xs text-stone-500">{item.phaseLabel}</span>
                </div>
                <p className="mt-1 text-sm text-stone-300">{item.detail}</p>
              </div>
              <Button
                href={buildFixHref(item.route)}
                variant="ghost"
                size="sm"
                className="sm:shrink-0"
              >
                {item.ctaLabel}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PhaseCard({
  phase,
  actionItems,
  returnToHref,
}: {
  phase: ServiceSimulationPhase
  actionItems: ServiceSimulationActionItem[]
  returnToHref: string
}) {
  const mustFix = actionItems.filter((item) => item.severity === 'must_fix').length
  const shouldVerify = actionItems.filter((item) => item.severity === 'should_verify').length
  const optionalImprovement = actionItems.filter(
    (item) => item.severity === 'optional_improvement'
  ).length
  const buildFixHref = (href: string) => {
    const url = new URL(href, 'https://cheflowhq.com')
    url.searchParams.set('returnTo', returnToHref)
    return `${url.pathname}${url.search}${url.hash}`
  }

  return (
    <div
      className="rounded-xl border border-stone-800/80 bg-stone-950/60 p-4"
      data-testid={`service-simulation-phase-${phase.key}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-stone-100">{phase.label}</h3>
            <Badge
              variant={
                phase.status === 'complete'
                  ? 'success'
                  : phase.status === 'ready'
                    ? 'info'
                    : phase.status === 'attention'
                      ? 'warning'
                      : 'default'
              }
            >
              {phase.status}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-stone-300">{phase.summary}</p>
          {(mustFix > 0 || shouldVerify > 0 || optionalImprovement > 0) && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {mustFix > 0 && <Badge variant="error">{mustFix} must fix</Badge>}
              {shouldVerify > 0 && <Badge variant="warning">{shouldVerify} verify</Badge>}
              {optionalImprovement > 0 && (
                <Badge variant="info">{optionalImprovement} optional</Badge>
              )}
            </div>
          )}
        </div>

        {phase.nextAction ? (
          <Button
            href={buildFixHref(phase.nextAction.route)}
            variant="secondary"
            size="sm"
            className="sm:shrink-0"
          >
            {phase.nextAction.ctaLabel}
          </Button>
        ) : null}
      </div>

      {actionItems.length > 0 ? (
        <div className="mt-4 space-y-2">
          {actionItems.map((item) => (
            <div
              key={`${item.phaseKey}-${item.key}`}
              className="rounded-lg border border-stone-800 bg-stone-900/70 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    item.severity === 'must_fix'
                      ? 'error'
                      : item.severity === 'should_verify'
                        ? 'warning'
                        : 'info'
                  }
                >
                  {BAND_LABELS[item.severity]}
                </Badge>
                <p className="text-sm font-medium text-stone-100">{item.label}</p>
              </div>
              <p className="mt-1 text-sm text-stone-400">{item.detail}</p>
            </div>
          ))}
        </div>
      ) : null}

      {phase.nextAction ? (
        <div className="mt-4 rounded-lg border border-stone-800 bg-stone-900/70 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Next Action
          </p>
          <p className="mt-2 text-sm font-medium text-stone-100">{phase.nextAction.label}</p>
          <p className="mt-1 text-sm text-stone-400">{phase.nextAction.detail}</p>
        </div>
      ) : null}
    </div>
  )
}

export function ServiceSimulationPanel({
  eventId,
  initialState = null,
}: ServiceSimulationPanelProps) {
  const [panelState, setPanelState] = useState<ServiceSimulationPanelState | null>(initialState)
  const [loading, setLoading] = useState(initialState === null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const returnToHref = `/events/${eventId}?tab=ops#service-simulation`

  useEffect(() => {
    setPanelState(initialState)
    setLoading(initialState === null)
    void loadPanel(initialState !== null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, initialState?.latestRun?.id, initialState?.status])

  useEffect(() => {
    function handleFocus() {
      void loadPanel(true)
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  async function loadPanel(quiet = false) {
    if (!quiet) {
      setLoading(true)
    }
    setError(null)

    try {
      const state = await getEventServiceSimulationPanelState(eventId)
      setPanelState(state)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load service simulation')
    } finally {
      if (!quiet) {
        setLoading(false)
      }
    }
  }

  function handleSimulate() {
    startTransition(async () => {
      setError(null)
      try {
        const nextState = await simulateEventService(eventId)
        setPanelState(nextState)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save service simulation')
      }
    })
  }

  if (loading && !panelState) {
    return (
      <div id="service-simulation" data-testid="service-simulation-panel">
        <Card className="p-6">
          <div className="space-y-3 animate-pulse">
            <div className="h-5 w-48 rounded bg-stone-800" />
            <div className="h-4 w-72 rounded bg-stone-800" />
            <div className="h-24 rounded-xl bg-stone-900/70" />
            <div className="h-24 rounded-xl bg-stone-900/70" />
          </div>
        </Card>
      </div>
    )
  }

  if (error && !panelState) {
    return (
      <div id="service-simulation" data-testid="service-simulation-panel">
        <Card className="p-6">
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-stone-100">Service Simulation</h2>
              <p className="mt-1 text-sm text-rose-400">{error}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void loadPanel()}>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!panelState) return null

  const primaryButtonLabel = panelState.status === 'stale' ? 'Re-simulate' : 'Simulate Service'
  const phaseActionItems = new Map(
    panelState.simulation.actionItems.reduce<
      Array<[ServiceSimulationPhase['key'], ServiceSimulationActionItem[]]>
    >((acc, item) => {
      const existing = acc.find(([phaseKey]) => phaseKey === item.phaseKey)
      if (existing) {
        existing[1].push(item)
      } else {
        acc.push([item.phaseKey, [item]])
      }
      return acc
    }, [])
  )

  return (
    <div id="service-simulation" className="space-y-4" data-testid="service-simulation-panel">
      <ServiceSimulationRollupCard
        eventId={eventId}
        panelState={panelState}
        showOpenButton={false}
        returnToHref={returnToHref}
      />

      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-stone-100">Saved Rehearsal</h3>
            <p className="mt-1 text-sm text-stone-400">
              Simulating records that you rehearsed this event under the current conditions. The
              live rollup above always reflects current truth, even before you save a run.
            </p>
            {panelState.status === 'stale' && panelState.staleReasons.length > 0 ? (
              <div className="mt-3 space-y-2">
                {panelState.staleReasons.slice(0, 3).map((reason) => (
                  <div
                    key={reason.code}
                    className="rounded-lg border border-amber-800/60 bg-amber-950/30 p-3"
                  >
                    <p className="text-sm font-medium text-amber-200">{reason.label}</p>
                    <p className="mt-1 text-sm text-amber-300">{reason.detail}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {panelState.status !== 'current' ? (
            <Button
              onClick={handleSimulate}
              loading={isPending}
              data-testid="service-simulation-run-button"
            >
              {primaryButtonLabel}
            </Button>
          ) : null}
        </div>
        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      </Card>

      <Card className="p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-100">What To Fix Next</h3>
            <p className="mt-1 text-sm text-stone-400">
              Tight, operational grouping for service week. Only real blockers land in must-fix.
            </p>
          </div>
          <Button href={`/events/${eventId}/execution`} variant="ghost" size="sm">
            Open Execution View
          </Button>
        </div>

        <div className="mt-4 space-y-6">
          <IssueBandSection
            title="Must Fix Before Service"
            items={panelState.simulation.severityBands.mustFix}
            returnToHref={returnToHref}
          />
          <IssueBandSection
            title="Should Verify"
            items={panelState.simulation.severityBands.shouldVerify}
            returnToHref={returnToHref}
          />
          <IssueBandSection
            title="Optional Improvement"
            items={panelState.simulation.severityBands.optionalImprovement}
            returnToHref={returnToHref}
          />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-100">Chronological Walkthrough</h3>
            <p className="mt-1 text-sm text-stone-400">
              Keep the operational storyline intact after you handle the top concerns.
            </p>
          </div>
          <p className="text-xs text-stone-500">{panelState.simulation.summary}</p>
        </div>

        <div className="mt-4 space-y-4">
          {panelState.simulation.phases.map((phase) => (
            <PhaseCard
              key={phase.key}
              phase={phase}
              actionItems={phaseActionItems.get(phase.key) ?? []}
              returnToHref={returnToHref}
            />
          ))}
        </div>
      </Card>
    </div>
  )
}
