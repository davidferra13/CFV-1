'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ShieldAlert, XCircle } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OverrideDialog } from '@/components/events/override-dialog'
import type { GateResult, ReadinessResult } from '@/lib/events/readiness'

interface ReadinessGatePanelProps {
  eventId: string
  readiness: ReadinessResult
  targetLabel: string
  /** Event date (ISO string) for time-pressure detection in override dialog */
  eventDate?: string | null
}

function ProofStatusIcon({ gate }: { gate: GateResult }) {
  if (gate.status === 'verified') {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
  }
  if (gate.isHardBlock) {
    return <ShieldAlert className="h-4 w-4 shrink-0 text-rose-500" />
  }
  if (gate.status === 'stale' || gate.status === 'overridden') {
    return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
  }
  return <XCircle className="h-4 w-4 shrink-0 text-stone-500" />
}

function appendReturnTo(route: string, returnTo: string) {
  const separator = route.includes('?') ? '&' : '?'
  return `${route}${separator}returnTo=${encodeURIComponent(returnTo)}`
}

function ProofRow({
  eventId,
  gate,
  eventDate,
}: {
  eventId: string
  gate: GateResult
  eventDate?: string | null
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const verifyHref = appendReturnTo(
    gate.verifyRoute,
    `/events/${eventId}?tab=ops#service-simulation`
  )

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950/50 p-3">
      <div className="flex items-start gap-3">
        <ProofStatusIcon gate={gate} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-stone-100">{gate.label}</p>
            <Badge
              variant={
                gate.status === 'verified'
                  ? 'success'
                  : gate.isHardBlock
                    ? 'error'
                    : gate.status === 'stale' || gate.status === 'overridden'
                      ? 'warning'
                      : 'info'
              }
            >
              {gate.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-stone-400">{gate.details || gate.description}</p>
          {gate.overrideReason ? (
            <p className="mt-1 text-xs text-amber-400">Override: {gate.overrideReason}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button href={verifyHref} variant="secondary" size="sm">
              {gate.ctaLabel}
            </Button>
            {gate.status !== 'verified' && gate.status !== 'overridden' ? (
              <Button variant="ghost" size="sm" onClick={() => setDialogOpen(true)}>
                Override Proof
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <OverrideDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        eventId={eventId}
        gate={gate}
        eventDate={eventDate}
      />
    </div>
  )
}

export function ReadinessGatePanel({
  eventId,
  readiness,
  targetLabel,
  eventDate,
}: ReadinessGatePanelProps) {
  if (readiness.gates.length === 0) return null

  const headerTone =
    readiness.counts.blockers > 0
      ? 'border-rose-800/60 bg-rose-950/20'
      : readiness.counts.stale > 0 || readiness.counts.risks > 0
        ? 'border-amber-800/60 bg-amber-950/20'
        : 'border-emerald-800/60 bg-emerald-950/10'

  return (
    <Card className={`border ${headerTone}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Readiness Before {targetLabel}</CardTitle>
            <p className="mt-1 text-sm text-stone-400">
              Confidence {readiness.confidence}%. {readiness.counts.blockers} blockers,{' '}
              {readiness.counts.risks} risks, {readiness.counts.stale} stale.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={readiness.counts.blockers > 0 ? 'error' : 'success'}>
              {readiness.counts.blockers > 0 ? 'Needs Decision' : 'Clear To Proceed'}
            </Badge>
            <Badge variant="info">{targetLabel}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {readiness.gates.map((gate) => (
          <ProofRow key={gate.gate} eventId={eventId} gate={gate} eventDate={eventDate} />
        ))}
      </CardContent>
    </Card>
  )
}
