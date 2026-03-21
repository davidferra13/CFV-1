'use client'

import { useState, useTransition } from 'react'
import { listDeviceEvents } from '@/lib/devices/actions'

interface DeviceEventLogProps {
  deviceId: string
  deviceName: string
}

const eventTypeLabels: Record<string, { label: string; color: string }> = {
  paired: { label: 'Paired', color: 'text-brand-400' },
  pin_verified: { label: 'PIN Verified', color: 'text-green-400' },
  pin_failed: { label: 'PIN Failed', color: 'text-red-400' },
  submitted_inquiry: { label: 'Inquiry Submitted', color: 'text-brand-400' },
  session_ended: { label: 'Session Ended', color: 'text-stone-400' },
  heartbeat: { label: 'Heartbeat', color: 'text-stone-500' },
  disabled: { label: 'Disabled', color: 'text-yellow-400' },
  enabled: { label: 'Re-enabled', color: 'text-green-400' },
  revoked: { label: 'Revoked', color: 'text-red-400' },
  hard_reset: { label: 'Hard Reset', color: 'text-red-300' },
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

interface EventRow {
  id: string
  type: string
  staff_name: string | null
  payload: Record<string, unknown>
  created_at: string
}

export function DeviceEventLog({ deviceId, deviceName }: DeviceEventLogProps) {
  const [events, setEvents] = useState<EventRow[] | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    if (!expanded && events === null) {
      // First open - fetch events
      startTransition(async () => {
        try {
          const data = await listDeviceEvents(deviceId)
          setEvents(data as EventRow[])
        } catch {
          setEvents([])
        }
      })
    }
    setExpanded(!expanded)
  }

  return (
    <div className="rounded-xl border border-stone-800">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800/50"
      >
        <span>Activity Log - {deviceName}</span>
        <svg
          className={`h-4 w-4 text-stone-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-stone-800 px-4 py-3">
          {isPending ? (
            <p className="text-center text-sm text-stone-500">Loading...</p>
          ) : !events || events.length === 0 ? (
            <p className="text-center text-sm text-stone-500">No events recorded</p>
          ) : (
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {events
                .filter((e) => e.type !== 'heartbeat') // Hide heartbeat noise
                .map((event) => {
                  const meta = eventTypeLabels[event.type] || {
                    label: event.type,
                    color: 'text-stone-400',
                  }
                  return (
                    <div key={event.id} className="flex items-center justify-between py-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${meta.color}`}>{meta.label}</span>
                        {event.staff_name && (
                          <span className="text-stone-500">by {event.staff_name}</span>
                        )}
                      </div>
                      <span className="text-stone-600">{formatTime(event.created_at)}</span>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
