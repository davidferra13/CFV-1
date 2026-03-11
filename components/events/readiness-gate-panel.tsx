'use client'

// Readiness Gate Panel
// Surfaces the pre-transition checklist on the event detail page.
// Shows which gates are passed, pending, or overridden — with actions
// for the chef to mark gates complete or override with a reason.

import { useState, useTransition } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { markGatePassed, overrideGate } from '@/lib/events/readiness'
import type { ReadinessResult, GateResult, ReadinessGate } from '@/lib/events/readiness'
import { canMarkReadinessGatePassed } from '@/lib/events/readiness-config'

// ─── Props ───────────────────────────────────────────────────────────────────

interface ReadinessGatePanelProps {
  eventId: string
  readiness: ReadinessResult
  targetLabel: string // e.g. "Confirm Event" or "Start Service"
}

// ─── Gate row ─────────────────────────────────────────────────────────────────

function GateRow({
  gate,
  eventId,
  onUpdate,
}: {
  gate: GateResult
  eventId: string
  onUpdate: () => void
}) {
  const [showOverride, setShowOverride] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const canMarkDone = canMarkReadinessGatePassed(gate.gate as ReadinessGate)

  const handleMarkPassed = () => {
    startTransition(async () => {
      setError(null)
      try {
        await markGatePassed(eventId, gate.gate as ReadinessGate)
        onUpdate()
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const handleOverride = () => {
    if (!overrideReason.trim() || overrideReason.trim().length < 5) {
      setError('Please provide a reason (at least 5 characters)')
      return
    }
    startTransition(async () => {
      setError(null)
      try {
        await overrideGate(eventId, gate.gate as ReadinessGate, overrideReason)
        setShowOverride(false)
        setOverrideReason('')
        onUpdate()
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const statusIcon =
    gate.status === 'passed' ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
    ) : gate.status === 'overridden' ? (
      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
    ) : gate.isHardBlock ? (
      <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
    ) : (
      <XCircle className="h-4 w-4 text-stone-400 shrink-0" />
    )

  const rowBg =
    gate.status === 'passed'
      ? 'bg-green-950 border-green-200'
      : gate.status === 'overridden'
        ? 'bg-amber-950 border-amber-200'
        : gate.isHardBlock
          ? 'bg-red-950 border-red-200'
          : 'bg-stone-800 border-stone-700'

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${rowBg}`}>
      <div className="flex items-start gap-2">
        {statusIcon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-stone-100">{gate.label}</span>
            {gate.isHardBlock && (
              <Badge variant="error" className="text-xs">
                Hard Block
              </Badge>
            )}
            {gate.status === 'overridden' && (
              <Badge variant="warning" className="text-xs">
                Bypassed
              </Badge>
            )}
          </div>
          {gate.details && <p className="text-xs text-stone-400 mt-0.5">{gate.details}</p>}
          {gate.overrideReason && (
            <p className="text-xs text-amber-200 mt-0.5 italic">
              Bypassed: &ldquo;{gate.overrideReason}&rdquo;
            </p>
          )}
        </div>

        {/* Actions for pending gates only */}
        {gate.status === 'pending' && (
          <div className="flex items-center gap-1.5 shrink-0">
            {!gate.isHardBlock && canMarkDone && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleMarkPassed}
                disabled={isPending}
                className="text-xs h-7 px-2"
              >
                Mark Done
              </Button>
            )}
            {!gate.isHardBlock && (
              <button
                onClick={() => setShowOverride(!showOverride)}
                className="text-xs text-stone-500 hover:text-stone-300 flex items-center gap-0.5"
              >
                Skip{' '}
                {showOverride ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Override reason input */}
      {showOverride && gate.status === 'pending' && !gate.isHardBlock && (
        <div className="ml-6 space-y-1.5">
          <p className="text-xs text-stone-500">
            Bypassing this gate is logged and audited. Provide a brief reason:
          </p>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Reason for bypassing..."
              className="flex-1 text-xs border border-stone-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOverride}
              disabled={isPending}
              className="text-xs h-7 px-2"
            >
              Confirm Skip
            </Button>
          </div>
        </div>
      )}

      {error && <p className="ml-6 text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function ReadinessGatePanel({ eventId, readiness, targetLabel }: ReadinessGatePanelProps) {
  const localReadiness = readiness

  const handleUpdate = async () => {
    // Trigger a page revalidation by refreshing (server component parent will re-fetch)
    window.location.reload()
  }

  if (localReadiness.gates.length === 0) return null

  const allReady = localReadiness.ready
  const hardBlocked = localReadiness.hardBlocked
  const pendingCount = localReadiness.blockers.length
  const passedCount = localReadiness.gates.filter((g) => g.status === 'passed').length
  const overriddenCount = localReadiness.gates.filter((g) => g.status === 'overridden').length

  const headerColor = hardBlocked
    ? 'border-red-200 bg-red-950'
    : allReady
      ? 'border-green-200 bg-green-950'
      : pendingCount > 0
        ? 'border-amber-200 bg-amber-950'
        : 'border-stone-700'

  return (
    <Card className={`border ${headerColor}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {allReady ? `Ready to ${targetLabel}` : `Readiness Check — ${targetLabel}`}
          </CardTitle>
          <div className="flex items-center gap-2">
            {passedCount > 0 && (
              <span className="text-xs font-medium text-green-200">
                {passedCount}/{localReadiness.gates.length} done
              </span>
            )}
            {allReady ? (
              <Badge variant="success">All Clear</Badge>
            ) : hardBlocked ? (
              <Badge variant="error">Blocked</Badge>
            ) : (
              <Badge variant="warning">{pendingCount} Pending</Badge>
            )}
          </div>
        </div>
        {hardBlocked && (
          <p className="text-xs text-red-200 mt-1">
            One or more items cannot be bypassed. Address them before proceeding.
          </p>
        )}
        {!hardBlocked && pendingCount > 0 && (
          <p className="text-xs text-stone-500 mt-1">
            Resolve these items before {targetLabel.toLowerCase()}. Manual checklist items can be
            marked done, and any non-safety item can be skipped with a reason.
          </p>
        )}
        {overriddenCount > 0 && !hardBlocked && (
          <p className="text-xs text-amber-200 mt-1">
            {overriddenCount} item{overriddenCount > 1 ? 's' : ''} bypassed — recorded in the event
            audit trail.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {localReadiness.gates.map((gate) => (
          <GateRow key={gate.gate} gate={gate} eventId={eventId} onUpdate={handleUpdate} />
        ))}
      </CardContent>
    </Card>
  )
}
