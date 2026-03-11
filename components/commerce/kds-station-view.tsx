'use client'

import { useEffect, useState, useTransition, useCallback } from 'react'
import { getStationTickets, bumpTicket, voidTicket } from '@/lib/commerce/kds-actions'
import type { KDSTicket } from '@/lib/commerce/kds-actions'
import { KDS_TICKET_STATUS_LABELS } from '@/lib/commerce/constants'

interface KDSStationViewProps {
  stationId: string
  stationName: string
}

function formatElapsed(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  const mins = Math.floor(diff / 60)
  const secs = diff % 60
  if (mins < 60) return `${mins}m ${secs}s`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m`
}

function statusBg(status: string): string {
  switch (status) {
    case 'new':
      return 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
    case 'in_progress':
      return 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
    case 'ready':
      return 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
    default:
      return 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'
  }
}

function priorityBadge(priority: string): React.ReactNode {
  if (priority === 'rush') {
    return (
      <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-200 dark:bg-orange-900 dark:text-orange-200 animate-pulse">
        RUSH
      </span>
    )
  }
  if (priority === 'vip') {
    return (
      <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-200 dark:bg-purple-900 dark:text-purple-200">
        VIP
      </span>
    )
  }
  return null
}

export default function KDSStationView({ stationId, stationName }: KDSStationViewProps) {
  const [tickets, setTickets] = useState<KDSTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const loadTickets = useCallback(async () => {
    try {
      const data = await getStationTickets(stationId)
      setTickets(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }, [stationId])

  useEffect(() => {
    loadTickets()
    const interval = setInterval(loadTickets, 10_000) // refresh every 10s
    return () => clearInterval(interval)
  }, [loadTickets])

  function handleBump(ticketId: string) {
    const previous = [...tickets]
    startTransition(async () => {
      try {
        await bumpTicket(ticketId)
        await loadTickets()
      } catch (err) {
        setTickets(previous)
        setError(err instanceof Error ? err.message : 'Failed to bump ticket')
      }
    })
  }

  function handleVoid(ticketId: string) {
    if (!confirm('Void this ticket?')) return
    const previous = [...tickets]
    startTransition(async () => {
      try {
        await voidTicket(ticketId)
        await loadTickets()
      } catch (err) {
        setTickets(previous)
        setError(err instanceof Error ? err.message : 'Failed to void ticket')
      }
    })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-zinc-300 border-t-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-3">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{stationName}</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">
            {tickets.length} active ticket{tickets.length !== 1 ? 's' : ''}
          </span>
          {isPending && (
            <div className="animate-spin h-4 w-4 rounded-full border-2 border-zinc-300 border-t-blue-600" />
          )}
        </div>
      </div>

      {error && (
        <div className="m-2 rounded-md bg-red-50 p-3 text-sm text-red-200 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Ticket Grid */}
      <div className="flex-1 overflow-auto p-4">
        {tickets.length === 0 ? (
          <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500 text-lg">
            No active tickets
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`rounded-lg border-2 shadow-sm flex flex-col ${statusBg(ticket.status)}`}
              >
                {/* Allergy Alert */}
                {ticket.allergyAlert && (
                  <div className="rounded-t-lg bg-red-600 px-3 py-2 text-sm font-bold text-white">
                    ALLERGY: {ticket.allergyAlert}
                  </div>
                )}

                {/* Ticket Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      #{ticket.ticketNumber}
                    </span>
                    {priorityBadge(ticket.priority)}
                  </div>
                  <span className="text-xs font-mono text-zinc-500">
                    {formatElapsed(ticket.createdAt)}
                  </span>
                </div>

                {/* Table/Server Info */}
                {(ticket.tableNumber || ticket.serverName) && (
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                    {ticket.tableNumber && (
                      <span className="font-medium">Table {ticket.tableNumber}</span>
                    )}
                    {ticket.serverName && <span>Server: {ticket.serverName}</span>}
                    {ticket.courseNumber != null && <span>Course {ticket.courseNumber}</span>}
                  </div>
                )}

                {/* Items */}
                <div className="flex-1 px-3 py-2 space-y-1.5">
                  {ticket.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 min-w-[1.5rem]">
                        {item.quantity}x
                      </span>
                      <div className="flex-1">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {item.name}
                        </span>
                        {item.modifiers.length > 0 && (
                          <div className="text-xs text-blue-600 dark:text-blue-400">
                            {item.modifiers.join(', ')}
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 italic">
                            {item.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {ticket.notes && (
                  <div className="px-3 py-1.5 text-xs text-zinc-500 italic border-t border-zinc-200 dark:border-zinc-700">
                    {ticket.notes}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 p-2 border-t border-zinc-200 dark:border-zinc-700">
                  <button
                    onClick={() => handleBump(ticket.id)}
                    disabled={isPending || ticket.status === 'served'}
                    className="flex-1 rounded-md px-4 py-3 text-sm font-bold text-white transition-colors
                      bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                      disabled:opacity-50 disabled:cursor-not-allowed
                      touch-manipulation"
                  >
                    BUMP (
                    {KDS_TICKET_STATUS_LABELS[
                      ticket.status as keyof typeof KDS_TICKET_STATUS_LABELS
                    ] ?? ticket.status}
                    )
                  </button>
                  <button
                    onClick={() => handleVoid(ticket.id)}
                    disabled={isPending}
                    className="rounded-md px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950
                      disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  >
                    Void
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
