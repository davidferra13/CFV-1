'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  clearRefreshTelemetry,
  getRefreshTelemetrySnapshot,
  subscribeRefreshTelemetry,
  type RefreshTelemetryEvent,
  type RefreshTelemetrySnapshot,
} from '@/lib/runtime/refresh-telemetry'

function formatEventTime(value: number) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'now'

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function describeEvent(event: RefreshTelemetryEvent) {
  const subject = event.entity ?? event.event ?? event.source
  const reason = event.reason ? ` (${event.reason})` : ''
  return `${subject} on ${event.pathname}${reason}`
}

export function RefreshTelemetryPanel() {
  const [collapsed, setCollapsed] = useState(true)
  const [snapshot, setSnapshot] = useState<RefreshTelemetrySnapshot>(() =>
    getRefreshTelemetrySnapshot()
  )

  useEffect(() => {
    const refresh = () => setSnapshot(getRefreshTelemetrySnapshot())
    const unsubscribe = subscribeRefreshTelemetry(refresh)

    refresh()

    return unsubscribe
  }, [])

  const total = snapshot.totalRefreshes + snapshot.totalSkips
  const eventRows = useMemo(() => snapshot.events.slice(-6).reverse(), [snapshot.events])

  return (
    <aside className="fixed bottom-3 right-3 z-30 max-w-[calc(100vw-1.5rem)] font-mono text-[11px] text-stone-100">
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="ml-auto flex items-center gap-2 rounded-md border border-stone-700 bg-stone-950/90 px-2.5 py-1.5 shadow-lg backdrop-blur transition hover:border-stone-500"
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Show refresh telemetry' : 'Hide refresh telemetry'}
      >
        <span className="text-stone-400">refresh</span>
        <span className="text-emerald-300">{snapshot.recentRefreshes}</span>
        <span className="text-stone-600">/</span>
        <span className="text-amber-300">{snapshot.recentSkips}</span>
      </button>

      {!collapsed && (
        <div className="mt-2 w-[340px] max-w-full rounded-md border border-stone-700 bg-stone-950/95 p-3 shadow-xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-normal text-stone-500">
                Refresh telemetry
              </div>
              <div className="text-stone-300">{total} total events</div>
            </div>
            <button
              type="button"
              onClick={() => {
                clearRefreshTelemetry()
                setSnapshot(getRefreshTelemetrySnapshot())
              }}
              className="rounded border border-stone-700 px-2 py-1 text-[10px] text-stone-300 transition hover:border-stone-500 hover:text-stone-100"
            >
              Clear
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border border-stone-800 bg-stone-900/80 p-2">
              <div className="text-stone-500">Recent refreshes</div>
              <div className="text-base text-emerald-300">{snapshot.recentRefreshes}</div>
            </div>
            <div className="rounded border border-stone-800 bg-stone-900/80 p-2">
              <div className="text-stone-500">Recent skips</div>
              <div className="text-base text-amber-300">{snapshot.recentSkips}</div>
            </div>
          </div>

          <div className="mt-3 max-h-36 overflow-y-auto pr-1">
            {eventRows.length > 0 ? (
              <ul className="space-y-1.5">
                {eventRows.map((event, index) => (
                  <li
                    key={`${event.occurredAt}-${event.kind}-${index}`}
                    className="grid grid-cols-[4.5rem_1fr] gap-2 text-stone-300"
                  >
                    <span className="text-stone-500">{formatEventTime(event.occurredAt)}</span>
                    <span className="min-w-0 truncate" title={describeEvent(event)}>
                      <span
                        className={
                          event.kind === 'refresh' ? 'text-emerald-300' : 'text-amber-300'
                        }
                      >
                        {event.kind}
                      </span>
                      <span className="text-stone-500"> {describeEvent(event)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded border border-dashed border-stone-800 px-2 py-3 text-center text-stone-500">
                No refresh events yet
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
