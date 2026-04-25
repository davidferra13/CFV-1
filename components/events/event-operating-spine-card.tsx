import Link from 'next/link'
import { AlertTriangle, ArrowRight, CheckCircle, Clock } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type {
  EventOperatingSpine,
  EventSpineLane,
  EventSpineSeverity,
} from '@/lib/events/operating-spine'

type EventOperatingSpineCardProps = {
  spine: EventOperatingSpine
  title?: string
  description?: string
  audience: 'chef' | 'client'
}

function severityBadge(
  severity: EventSpineSeverity
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (severity) {
    case 'ok':
      return 'success'
    case 'blocked':
      return 'error'
    case 'attention':
      return 'warning'
    case 'waiting':
      return 'info'
    default:
      return 'default'
  }
}

function severityIcon(severity: EventSpineSeverity) {
  if (severity === 'ok') return <CheckCircle className="h-4 w-4 text-emerald-400" />
  if (severity === 'blocked' || severity === 'attention') {
    return <AlertTriangle className="h-4 w-4 text-amber-400" />
  }
  return <Clock className="h-4 w-4 text-stone-400" />
}

function LaneRow({ lane }: { lane: EventSpineLane }) {
  const content = (
    <div className="flex h-full flex-col gap-3 rounded-lg border border-stone-800 bg-stone-950/40 p-4 transition-colors hover:border-stone-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {severityIcon(lane.severity)}
            <p className="truncate text-sm font-semibold text-stone-100">{lane.label}</p>
          </div>
          <p className="mt-1 text-xs text-stone-500">Owner: {lane.owner}</p>
        </div>
        <Badge variant={severityBadge(lane.severity)} className="shrink-0">
          {lane.status}
        </Badge>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-stone-300">{lane.nextStep}</p>
        {lane.dueLabel ? <p className="text-xs text-stone-500">Due: {lane.dueLabel}</p> : null}
        {lane.missing && lane.missing.length > 0 ? (
          <p className="text-xs text-amber-400">Missing: {lane.missing.join(', ')}</p>
        ) : null}
      </div>
    </div>
  )

  if (!lane.href) return content

  return (
    <Link href={lane.href} className="block h-full" aria-label={`${lane.label}: ${lane.nextStep}`}>
      {content}
    </Link>
  )
}

export function EventOperatingSpineCard({
  spine,
  title = 'Operating spine',
  description,
  audience,
}: EventOperatingSpineCardProps) {
  return (
    <Card
      className="p-5"
      data-cf-surface={audience === 'chef' ? 'chef:event-operating-spine' : 'client:event-progress'}
      data-cf-mode={spine.mode}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{title}</p>
            <Badge variant={spine.readinessLabel.includes('blocker') ? 'error' : 'info'}>
              {spine.readinessLabel}
            </Badge>
          </div>
          {description ? <p className="mt-2 text-sm text-stone-400">{description}</p> : null}
        </div>
        <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-4 lg:w-80">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Next action
          </p>
          <p className="mt-2 text-base font-semibold text-stone-100">{spine.nextAction.label}</p>
          <p className="mt-1 text-sm text-stone-400">{spine.nextAction.reason}</p>
          <p className="mt-2 text-xs text-stone-500">Owner: {spine.nextAction.owner}</p>
          <div className="mt-3">
            <Button href={spine.nextAction.href} variant="secondary" size="sm">
              Open next step
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {spine.lanes.map((lane) => (
          <LaneRow key={lane.key} lane={lane} />
        ))}
      </div>
    </Card>
  )
}
