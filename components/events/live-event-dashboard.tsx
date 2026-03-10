'use client'

// Live Event Coordination Dashboard
// Real-time ops view for in-progress events.
// Large touch-friendly UI for iPad/kitchen use.

import { useState, useEffect, useTransition, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  getLiveEventStatus,
  updateServicePhase,
  addLiveAlert,
  dismissAlert,
  checkInStaff,
  type LiveEventStatus,
  type ServicePhase,
  type AlertSeverity,
} from '@/lib/events/live-coordination-actions'

interface LiveEventDashboardProps {
  eventId: string
  initialStatus: LiveEventStatus
}

const PHASE_ORDER: ServicePhase[] = ['setup', 'prep', 'cooking', 'plating', 'service', 'cleanup']

const PHASE_LABELS: Record<ServicePhase, string> = {
  setup: 'Setup',
  prep: 'Prep',
  cooking: 'Cooking',
  plating: 'Plating',
  service: 'Service',
  cleanup: 'Cleanup',
}

function getServeTimeCountdown(serveTime: string | null, eventDate: string): string {
  if (!serveTime) return 'No serve time set'
  try {
    const serveDateTime = new Date(`${eventDate}T${serveTime}`)
    const now = new Date()
    const diffMs = serveDateTime.getTime() - now.getTime()
    if (diffMs <= 0) return 'Serve time passed'
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) return `${hours}h ${minutes}m until service`
    return `${minutes}m until service`
  } catch {
    return 'No serve time set'
  }
}

export function LiveEventDashboard({ eventId, initialStatus }: LiveEventDashboardProps) {
  const [status, setStatus] = useState<LiveEventStatus>(initialStatus)
  const [isPending, startTransition] = useTransition()
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertSeverity, setAlertSeverity] = useState<AlertSeverity>('info')
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Auto-refresh every 30 seconds
  const refresh = useCallback(async () => {
    try {
      const updated = await getLiveEventStatus(eventId)
      if (updated) {
        setStatus(updated)
        setLastRefresh(new Date())
      }
    } catch {
      // Non-blocking: keep showing last known state
    }
  }, [eventId])

  useEffect(() => {
    const interval = setInterval(refresh, 30_000)
    return () => clearInterval(interval)
  }, [refresh])

  const handleAdvancePhase = () => {
    const currentIndex = PHASE_ORDER.indexOf(status.currentPhase)
    if (currentIndex >= PHASE_ORDER.length - 1) return
    const nextPhase = PHASE_ORDER[currentIndex + 1]
    const previous = status

    setStatus((prev) => ({
      ...prev,
      currentPhase: nextPhase,
      timelineProgress: prev.timelineProgress.map((tp, i) => ({
        ...tp,
        completed: i < currentIndex + 1,
      })),
    }))

    startTransition(async () => {
      try {
        await updateServicePhase(eventId, nextPhase)
        toast.success(`Advanced to ${PHASE_LABELS[nextPhase]}`)
      } catch {
        setStatus(previous)
        toast.error('Failed to advance phase')
      }
    })
  }

  const handleSetPhase = (phase: ServicePhase) => {
    const previous = status
    const phaseIndex = PHASE_ORDER.indexOf(phase)

    setStatus((prev) => ({
      ...prev,
      currentPhase: phase,
      timelineProgress: prev.timelineProgress.map((tp, i) => ({
        ...tp,
        completed: i < phaseIndex,
      })),
    }))

    startTransition(async () => {
      try {
        await updateServicePhase(eventId, phase)
        toast.success(`Set phase to ${PHASE_LABELS[phase]}`)
      } catch {
        setStatus(previous)
        toast.error('Failed to update phase')
      }
    })
  }

  const handleCheckIn = (staffMemberId: string, staffName: string) => {
    const previous = status

    setStatus((prev) => ({
      ...prev,
      staff: prev.staff.map((s) =>
        s.assignment_id === staffMemberId || s.staff_name === staffName
          ? { ...s, checked_in: true, checked_in_at: new Date().toISOString() }
          : s
      ),
    }))

    startTransition(async () => {
      try {
        await checkInStaff(eventId, staffMemberId)
        toast.success(`${staffName} checked in`)
      } catch {
        setStatus(previous)
        toast.error('Failed to check in staff')
      }
    })
  }

  const handleAddAlert = () => {
    if (!alertMessage.trim()) return

    startTransition(async () => {
      try {
        await addLiveAlert(eventId, alertMessage.trim(), alertSeverity)
        toast.success('Alert posted')
        setAlertMessage('')
        setShowAlertForm(false)
        await refresh()
      } catch {
        toast.error('Failed to post alert')
      }
    })
  }

  const handleDismissAlert = (alertId: string) => {
    const previous = status

    setStatus((prev) => ({
      ...prev,
      alerts: prev.alerts.filter((a) => a.id !== alertId),
    }))

    startTransition(async () => {
      try {
        await dismissAlert(eventId, alertId)
      } catch {
        setStatus(previous)
        toast.error('Failed to dismiss alert')
      }
    })
  }

  const countdown = getServeTimeCountdown(status.event.serve_time, status.event.event_date)

  const currentPhaseIndex = PHASE_ORDER.indexOf(status.currentPhase)
  const checkedInCount = status.staff.filter((s) => s.checked_in).length
  const uncheckedCount = status.staff.length - checkedInCount

  const severityColors: Record<AlertSeverity, string> = {
    info: 'bg-blue-900/50 border-blue-700 text-blue-200',
    warning: 'bg-amber-900/50 border-amber-700 text-amber-200',
    urgent: 'bg-red-900/50 border-red-700 text-red-200',
  }

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {status.event.occasion || 'Live Event'}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-stone-400 text-sm">
            {status.event.location_city && <span>{status.event.location_city}</span>}
            {status.event.guest_count && <span>{status.event.guest_count} guests</span>}
            <span className="font-medium text-brand-400">{countdown}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">Updated {lastRefresh.toLocaleTimeString()}</span>
          <Button variant="secondary" onClick={refresh} disabled={isPending}>
            Refresh
          </Button>
          <a href={`/events/${eventId}`}>
            <Button variant="ghost">Back to Event</Button>
          </a>
        </div>
      </div>

      {/* Service Phase Stepper */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wider">
            Service Phase
          </h2>
          {currentPhaseIndex < PHASE_ORDER.length - 1 && (
            <Button onClick={handleAdvancePhase} disabled={isPending}>
              Advance to {PHASE_LABELS[PHASE_ORDER[currentPhaseIndex + 1]]}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2">
          {PHASE_ORDER.map((phase, i) => {
            const isCurrent = phase === status.currentPhase
            const isCompleted = i < currentPhaseIndex
            return (
              <button
                key={phase}
                onClick={() => handleSetPhase(phase)}
                disabled={isPending}
                className={`
                  flex-1 min-w-[80px] py-3 px-2 rounded-lg text-center text-sm font-medium
                  transition-colors cursor-pointer
                  ${
                    isCurrent
                      ? 'bg-brand-600 text-white ring-2 ring-brand-400'
                      : isCompleted
                        ? 'bg-emerald-900/50 text-emerald-300'
                        : 'bg-stone-800 text-stone-500'
                  }
                `}
              >
                {PHASE_LABELS[phase]}
              </button>
            )
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff Panel */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wider">
              Staff ({checkedInCount}/{status.staff.length} checked in)
            </h2>
            {uncheckedCount > 0 && <Badge variant="warning">{uncheckedCount} pending</Badge>}
          </div>
          {status.staff.length === 0 ? (
            <p className="text-stone-500 text-sm">No staff assigned to this event.</p>
          ) : (
            <div className="space-y-2">
              {status.staff.map((s) => (
                <div
                  key={s.assignment_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-stone-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        s.checked_in ? 'bg-emerald-500' : 'bg-stone-600'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-sm">{s.staff_name}</p>
                      <p className="text-xs text-stone-400">{s.role_override || s.staff_role}</p>
                    </div>
                  </div>
                  {!s.checked_in ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        // Extract staff member ID from assignment for check-in
                        // The check-in uses the assignment_id to find the right staff
                        handleCheckIn(s.assignment_id, s.staff_name)
                      }}
                      disabled={isPending}
                      className="min-h-[48px] min-w-[100px]"
                    >
                      Check In
                    </Button>
                  ) : (
                    <span className="text-xs text-emerald-400">
                      {s.checked_in_at
                        ? new Date(s.checked_in_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Present'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Alerts Panel */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wider">
              Alerts
            </h2>
            <Button
              variant="secondary"
              onClick={() => setShowAlertForm(!showAlertForm)}
              className="min-h-[48px]"
            >
              {showAlertForm ? 'Cancel' : 'Add Alert'}
            </Button>
          </div>

          {showAlertForm && (
            <div className="mb-4 p-3 rounded-lg bg-stone-800/50 space-y-3">
              <textarea
                value={alertMessage}
                onChange={(e) => setAlertMessage(e.target.value)}
                placeholder="What's the alert?"
                className="w-full bg-stone-700 border border-stone-600 rounded-lg p-3 text-sm text-stone-100 placeholder-stone-400 resize-none"
                rows={2}
              />
              <div className="flex items-center gap-2">
                <select
                  value={alertSeverity}
                  onChange={(e) => setAlertSeverity(e.target.value as AlertSeverity)}
                  className="bg-stone-700 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-100"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="urgent">Urgent</option>
                </select>
                <Button
                  onClick={handleAddAlert}
                  disabled={isPending || !alertMessage.trim()}
                  className="min-h-[48px]"
                >
                  Post Alert
                </Button>
              </div>
            </div>
          )}

          {status.alerts.length === 0 ? (
            <p className="text-stone-500 text-sm">No active alerts.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {status.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start justify-between p-3 rounded-lg border ${
                    severityColors[alert.severity]
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={
                          alert.severity === 'urgent'
                            ? 'error'
                            : alert.severity === 'warning'
                              ? 'warning'
                              : 'info'
                        }
                      >
                        {alert.severity}
                      </Badge>
                      <span className="text-xs opacity-70">
                        {new Date(alert.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm">{alert.message}</p>
                  </div>
                  <button
                    onClick={() => handleDismissAlert(alert.id)}
                    className="ml-2 text-stone-400 hover:text-stone-200 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    disabled={isPending}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        {status.currentPhase !== 'cleanup' && (
          <Button
            onClick={() => handleSetPhase('cleanup')}
            variant="secondary"
            disabled={isPending}
            className="min-h-[56px] text-base px-6"
          >
            Start Cleanup
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => {
            setAlertSeverity('urgent')
            setShowAlertForm(true)
          }}
          className="min-h-[56px] text-base px-6"
        >
          Urgent Alert
        </Button>
        <a href={`/events/${eventId}/breakdown`}>
          <Button variant="secondary" className="min-h-[56px] text-base px-6">
            Breakdown Checklist
          </Button>
        </a>
      </div>
    </div>
  )
}
