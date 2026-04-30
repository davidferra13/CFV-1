'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  MotionProgressFill,
  StateChangePulse,
  StateMotionBadge,
} from '@/components/ui/state-motion'
import { evaluateEventReadiness } from '@/lib/events/event-readiness-engine'
import type {
  EventReadinessResult,
  ReadinessCheck,
  ReadinessOverallStatus,
} from '@/lib/events/event-readiness-engine'

// ─── Status Config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ReadinessOverallStatus,
  { label: string; className: string; badgeVariant: 'success' | 'warning' | 'error' }
> = {
  READY: {
    label: 'READY',
    className: 'text-emerald-400',
    badgeVariant: 'success',
  },
  AT_RISK: {
    label: 'AT RISK',
    className: 'text-amber-400',
    badgeVariant: 'warning',
  },
  NOT_READY: {
    label: 'NOT READY',
    className: 'text-rose-400',
    badgeVariant: 'error',
  },
}

// ─── Check Row ───────────────────────────────────────────────────────────────

function CheckIcon({ check }: { check: ReadinessCheck }) {
  if (check.status === 'pass') {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
  }
  if (check.status === 'fail') {
    return <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
  }
  return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
}

function CheckRow({ check }: { check: ReadinessCheck }) {
  return (
    <StateChangePulse
      watch={`${check.status}:${check.message}:${check.blocking ? 'blocking' : 'open'}`}
      className="block"
    >
      <div className="flex items-center gap-3 py-1.5">
        <CheckIcon check={check} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-stone-200">{check.label}</span>
            {check.blocking && check.status === 'fail' && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                blocking
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500">{check.message}</p>
        </div>
        {check.status !== 'pass' && (
          <Link href={check.fixRoute}>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              {check.fixLabel}
            </Button>
          </Link>
        )}
      </div>
    </StateChangePulse>
  )
}

// ─── Panel ───────────────────────────────────────────────────────────────────

interface EventReadinessEnginePanelProps {
  eventId: string
  readiness: EventReadinessResult
}

export function EventReadinessEnginePanel({ eventId, readiness }: EventReadinessEnginePanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const config = STATUS_CONFIG[readiness.overallStatus]

  function handleRefresh() {
    startTransition(async () => {
      try {
        await evaluateEventReadiness(eventId)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to evaluate readiness')
      }
    })
  }

  return (
    <Card className="border-stone-800 bg-stone-950">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">Event Readiness</CardTitle>
            <StateMotionBadge watch={readiness.overallStatus} variant={config.badgeVariant}>
              {config.label}
            </StateMotionBadge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-stone-400">
              {readiness.passedChecks}/{readiness.totalChecks}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleRefresh}
              disabled={isPending}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {/* Score bar */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
          <MotionProgressFill
            value={readiness.score}
            className={
              readiness.overallStatus === 'READY'
                ? 'bg-emerald-500'
                : readiness.overallStatus === 'AT_RISK'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
            }
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {readiness.checks.map((check) => (
          <CheckRow key={check.key} check={check} />
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Compact Badge (for event header) ────────────────────────────────────────

interface EventReadinessBadgeProps {
  readiness: EventReadinessResult
}

export function EventReadinessBadge({ readiness }: EventReadinessBadgeProps) {
  const config = STATUS_CONFIG[readiness.overallStatus]
  return (
    <StateMotionBadge
      watch={readiness.overallStatus}
      variant={config.badgeVariant}
      className="text-xs"
    >
      {config.label} ({readiness.score}%)
    </StateMotionBadge>
  )
}
