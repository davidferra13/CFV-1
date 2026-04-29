import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { CalendarHealthSummary } from '@/lib/calendar/conflict-engine'

type Props = {
  health: CalendarHealthSummary
}

function HealthCell({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'default' | 'success' | 'warning' | 'error' | 'info'
}) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950/60 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</span>
        <Badge variant={tone}>{value}</Badge>
      </div>
    </div>
  )
}

export function CalendarHealthStrip({ health }: Props) {
  const hasRisk =
    health.criticalConflictCount > 0 ||
    health.criticalPrepGapCount > 0 ||
    health.unpaidEventCount > 0

  return (
    <section className="mb-4 rounded-xl border border-stone-800 bg-stone-900 p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-100">Calendar Health</h2>
          <p className="text-xs text-stone-500">
            Conflicts, prep gaps, open availability, waitlist demand, and unpaid event exposure.
          </p>
        </div>
        {hasRisk ? (
          <Badge variant="warning">Review needed</Badge>
        ) : (
          <Badge variant="success">No critical calendar risk</Badge>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <HealthCell
          label="Conflicts"
          value={health.conflictCount}
          tone={health.criticalConflictCount > 0 ? 'error' : 'default'}
        />
        <HealthCell
          label="Prep gaps"
          value={health.prepGapCount}
          tone={health.criticalPrepGapCount > 0 ? 'warning' : 'default'}
        />
        <HealthCell label="Public signals" value={health.publicSignalCount} tone="info" />
        <HealthCell label="Waitlist" value={health.waitlistOpportunityCount} tone="info" />
        <HealthCell
          label="Unpaid"
          value={health.unpaidEventCount}
          tone={health.unpaidEventCount > 0 ? 'warning' : 'default'}
        />
      </div>

      {(health.conflicts.length > 0 || health.prepGaps.length > 0) && (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {health.conflicts.slice(0, 3).map((conflict) => (
            <div key={conflict.id} className="rounded-lg border border-stone-800 bg-stone-950 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-stone-100">{conflict.title}</p>
                <Badge variant={conflict.severity === 'critical' ? 'error' : 'warning'}>
                  {conflict.severity}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-stone-500">{conflict.description}</p>
            </div>
          ))}
          {health.prepGaps.slice(0, 3).map((gap) => (
            <div key={gap.event_id} className="rounded-lg border border-stone-800 bg-stone-950 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-stone-100">
                  {gap.event_occasion || 'Event'} prep gap
                </p>
                <Badge variant={gap.severity === 'critical' ? 'error' : 'warning'}>
                  {gap.severity}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                Missing {gap.missing_block_types.length} prep block
                {gap.missing_block_types.length === 1 ? '' : 's'} for {gap.client_name}.
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button href="/calendar/week" variant="secondary" size="sm">
          Open Week Planner
        </Button>
        <Button href="/events" variant="ghost" size="sm">
          Review Events
        </Button>
      </div>
    </section>
  )
}
