'use client'

// DietaryConflictAlert — Warning banner for dietary conflicts on an event.
// Displays guest-allergy-dish conflicts grouped by severity.
// Chef can acknowledge each conflict to indicate awareness.
// Critical = red, Warning = amber, Info = blue.
// Calls acknowledgeDietaryConflict(alertId) from dietary-conflict-actions.

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { acknowledgeDietaryConflict } from '@/lib/events/dietary-conflict-actions'
import { AlertTriangle, AlertCircle, Info, Check } from 'lucide-react'

type Conflict = {
  id: string
  guestName: string
  allergy: string
  conflictingDish: string
  severity: 'critical' | 'warning' | 'info'
  acknowledged: boolean
}

type Props = {
  conflicts: Conflict[]
  eventId: string
}

const SEVERITY_CONFIG = {
  critical: {
    banner: 'border-red-300 bg-red-50',
    icon: AlertTriangle,
    iconColor: 'text-red-600',
    textColor: 'text-red-900',
    subtextColor: 'text-red-700',
    badgeVariant: 'error' as const,
    label: 'Critical',
  },
  warning: {
    banner: 'border-amber-300 bg-amber-50',
    icon: AlertCircle,
    iconColor: 'text-amber-600',
    textColor: 'text-amber-900',
    subtextColor: 'text-amber-700',
    badgeVariant: 'warning' as const,
    label: 'Warning',
  },
  info: {
    banner: 'border-sky-300 bg-sky-50',
    icon: Info,
    iconColor: 'text-sky-600',
    textColor: 'text-sky-900',
    subtextColor: 'text-sky-700',
    badgeVariant: 'info' as const,
    label: 'Info',
  },
}

export function DietaryConflictAlert({ conflicts: initialConflicts, eventId }: Props) {
  const [conflicts, setConflicts] = useState(initialConflicts)
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  if (conflicts.length === 0) return null

  // Sort: critical first, then warning, then info; unacknowledged before acknowledged
  const sorted = [...conflicts].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1
    return severityOrder[a.severity] - severityOrder[b.severity]
  })

  const unacknowledgedCount = conflicts.filter((c) => !c.acknowledged).length
  const hasCritical = conflicts.some((c) => c.severity === 'critical' && !c.acknowledged)

  // Use the highest-severity unacknowledged conflict for the banner style
  const bannerSeverity = hasCritical
    ? 'critical'
    : conflicts.some((c) => c.severity === 'warning' && !c.acknowledged)
      ? 'warning'
      : 'info'
  const bannerConfig = SEVERITY_CONFIG[bannerSeverity]
  const BannerIcon = bannerConfig.icon

  function handleAcknowledge(conflictId: string) {
    setAcknowledgingId(conflictId)
    setError(null)

    // Optimistic update
    setConflicts((prev) =>
      prev.map((c) => (c.id === conflictId ? { ...c, acknowledged: true } : c))
    )

    startTransition(async () => {
      try {
        const result = await acknowledgeDietaryConflict(conflictId)
        if (!result.success) {
          // Rollback on failure
          setConflicts((prev) =>
            prev.map((c) => (c.id === conflictId ? { ...c, acknowledged: false } : c))
          )
          setError('Failed to acknowledge conflict')
        }
      } catch (err) {
        // Rollback on error
        setConflicts((prev) =>
          prev.map((c) => (c.id === conflictId ? { ...c, acknowledged: false } : c))
        )
        setError(err instanceof Error ? err.message : 'Failed to acknowledge conflict')
      } finally {
        setAcknowledgingId(null)
      }
    })
  }

  return (
    <div className={`rounded-lg border ${bannerConfig.banner} p-4`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <BannerIcon className={`h-5 w-5 ${bannerConfig.iconColor} shrink-0`} />
        <h3 className={`text-sm font-semibold ${bannerConfig.textColor}`}>
          Dietary Conflicts ({unacknowledgedCount} unacknowledged)
        </h3>
      </div>

      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}

      {/* Conflict list */}
      <div className="space-y-2">
        {sorted.map((conflict) => {
          const config = SEVERITY_CONFIG[conflict.severity]

          return (
            <div
              key={conflict.id}
              className={`flex items-start justify-between gap-3 rounded-md px-3 py-2 ${
                conflict.acknowledged
                  ? 'bg-white/60 opacity-60'
                  : 'bg-white/80'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-stone-900">
                    {conflict.guestName}
                  </span>
                  <Badge variant={config.badgeVariant}>{config.label}</Badge>
                  {conflict.acknowledged && (
                    <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600 font-medium">
                      <Check className="h-3 w-3" />
                      Acknowledged
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-600 mt-0.5">
                  <span className="font-medium">{conflict.allergy}</span>
                  {' '}conflicts with{' '}
                  <span className="font-medium">{conflict.conflictingDish}</span>
                </p>
              </div>

              {!conflict.acknowledged && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAcknowledge(conflict.id)}
                  disabled={acknowledgingId === conflict.id}
                  className="shrink-0"
                >
                  {acknowledgingId === conflict.id ? 'Saving...' : 'Acknowledge'}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
