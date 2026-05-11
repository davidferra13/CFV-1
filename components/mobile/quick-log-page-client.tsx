'use client'

import { useState } from 'react'
import { QuickLogInput } from './quick-log-input'
import { RecentLogsList } from './recent-logs-list'

type UpcomingEvent = {
  id: string
  label: string
  event_date: string
}

type LogEntry = {
  id: string
  action: string
  summary: string
  created_at: string
  metadata?: {
    type?: string
    amount_cents?: number
    vendor?: string
    description?: string
  }
}

export function QuickLogPageClient({
  upcomingEvents,
  recentLogs,
}: {
  upcomingEvents: UpcomingEvent[]
  recentLogs: LogEntry[]
}) {
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(
    upcomingEvents[0]?.id
  )
  const [logs, setLogs] = useState(recentLogs)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleSuccess() {
    // Trigger a refresh by updating key (next server fetch will get new logs)
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="space-y-6">
      {/* Event selector (optional) */}
      {upcomingEvents.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1.5">
            Link to event (optional)
          </label>
          <select
            value={selectedEventId ?? ''}
            onChange={(e) => setSelectedEventId(e.target.value || undefined)}
            className="w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-500"
          >
            <option value="">No event</option>
            {upcomingEvents.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Quick log input */}
      <QuickLogInput
        key={refreshKey}
        eventId={selectedEventId}
        onSuccess={handleSuccess}
      />

      {/* Recent logs */}
      <div>
        <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-3 px-1">
          Recent Logs
        </h2>
        <RecentLogsList logs={logs} />
      </div>
    </div>
  )
}
