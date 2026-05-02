'use client'

// Ticket Waitlist & Access Control Panel
// Module: commerce
// Shows waitlist status per ticket type with capacity context.
// Allows notifying waiters when spots open.

import { useState, useEffect, useTransition } from 'react'
import {
  getTicketWaitlistSummary,
  notifyWaitlistForOpenings,
  type TicketWaitlistSummary,
} from '@/lib/tickets/waitlist-actions'

type Props = {
  eventId: string
}

export function TicketWaitlistPanel({ eventId }: Props) {
  const [summary, setSummary] = useState<TicketWaitlistSummary | null>(null)
  const [isPending, startTransition] = useTransition()
  const [notifyingId, setNotifyingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    startTransition(async () => {
      try {
        const data = await getTicketWaitlistSummary(eventId)
        if (!cancelled) setSummary(data)
      } catch {
        // Table may not exist; fail silently
      }
    })
    return () => {
      cancelled = true
    }
  }, [eventId])

  if (isPending && !summary) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-4">
        <p className="text-sm text-stone-500 animate-pulse">Loading waitlist...</p>
      </div>
    )
  }

  if (
    !summary ||
    (summary.totalWaiting === 0 && summary.totalNotified === 0 && summary.totalConverted === 0)
  ) {
    return null // No waitlist data to show
  }

  function handleNotify(ticketTypeId: string) {
    setNotifyingId(ticketTypeId)
    startTransition(async () => {
      try {
        await notifyWaitlistForOpenings(eventId, ticketTypeId)
        const refreshed = await getTicketWaitlistSummary(eventId)
        setSummary(refreshed)
      } catch {
        // Non-blocking
      } finally {
        setNotifyingId(null)
      }
    })
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-300">Waitlist</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-amber-400">{summary.totalWaiting} waiting</span>
          {summary.totalNotified > 0 && (
            <span className="text-blue-400">{summary.totalNotified} notified</span>
          )}
          {summary.totalConverted > 0 && (
            <span className="text-emerald-400">{summary.totalConverted} converted</span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {summary.byTicketType.map((tt) => {
          const isSoldOut = tt.remaining != null && tt.remaining <= 0
          const hasWaiters = tt.waiting > 0
          const hasOpenings = tt.remaining == null || tt.remaining > 0

          return (
            <div
              key={tt.ticketTypeId}
              className="flex items-center justify-between rounded bg-stone-800/50 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-stone-300 truncate">
                  {tt.ticketTypeName}
                </div>
                <div className="text-[10px] text-stone-500">
                  {tt.soldCount} sold
                  {tt.capacity != null && ` / ${tt.capacity} cap`}
                  {tt.remaining != null && (
                    <span className={isSoldOut ? ' text-red-400' : ''}>
                      {' '}
                      ({isSoldOut ? 'SOLD OUT' : `${tt.remaining} left`})
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {hasWaiters && <span className="text-xs text-amber-400">{tt.waiting} waiting</span>}
                {hasWaiters && hasOpenings && (
                  <button
                    type="button"
                    onClick={() => handleNotify(tt.ticketTypeId)}
                    disabled={notifyingId === tt.ticketTypeId}
                    className="text-[10px] px-2 py-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 disabled:opacity-50"
                  >
                    {notifyingId === tt.ticketTypeId ? 'Notifying...' : 'Notify'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
