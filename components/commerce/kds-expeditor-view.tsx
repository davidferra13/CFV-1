'use client'

import { useEffect, useState, useTransition, useCallback } from 'react'
import {
  getAllStationTickets,
  bumpTicket,
  voidTicket,
  fireAllForCourse,
  getKDSStats,
} from '@/lib/commerce/kds-actions'
import type { KDSTicket } from '@/lib/commerce/kds-actions'
import { KDS_TICKET_STATUS_LABELS } from '@/lib/commerce/constants'

function formatElapsed(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  const mins = Math.floor(diff / 60)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m`
}

function statusColor(status: string): string {
  switch (status) {
    case 'new':
      return 'border-zinc-300 dark:border-zinc-600'
    case 'in_progress':
      return 'border-amber-400 dark:border-amber-600'
    case 'ready':
      return 'border-emerald-400 dark:border-emerald-600'
    default:
      return 'border-zinc-300 dark:border-zinc-600'
  }
}

function statusBg(status: string): string {
  switch (status) {
    case 'in_progress':
      return 'bg-amber-50/50 dark:bg-amber-950/20'
    case 'ready':
      return 'bg-emerald-50/50 dark:bg-emerald-950/20'
    default:
      return ''
  }
}

interface StationData {
  id: string
  name: string
  tickets: KDSTicket[]
}

interface StatsData {
  avgTicketTimeMinutes: number
  ticketsPerHour: number
  backlogByStation: Array<{ stationId: string; stationName: string; count: number }>
  totalActive: number
  totalServedToday: number
}

export default function KDSExpeditorView() {
  const [stations, setStations] = useState<StationData[]>([])
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [courseInput, setCourseInput] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [ticketData, statsData] = await Promise.all([getAllStationTickets(), getKDSStats()])
      setStations(ticketData.stations)
      setStats(statsData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load KDS data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10_000)
    return () => clearInterval(interval)
  }, [loadData])

  function handleBump(ticketId: string) {
    startTransition(async () => {
      try {
        await bumpTicket(ticketId)
        await loadData()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to bump ticket')
      }
    })
  }

  function handleVoid(ticketId: string) {
    if (!confirm('Void this ticket?')) return
    startTransition(async () => {
      try {
        await voidTicket(ticketId)
        await loadData()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to void ticket')
      }
    })
  }

  function handleFireAll() {
    const course = parseInt(courseInput, 10)
    if (isNaN(course) || course < 1) {
      setError('Enter a valid course number')
      return
    }
    startTransition(async () => {
      try {
        const count = await fireAllForCourse(course)
        setCourseInput('')
        setError(null)
        if (count === 0) {
          setError(`No pending tickets found for course ${course}`)
        }
        await loadData()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fire course')
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

  const totalTickets = stations.reduce((sum, s) => sum + s.tickets.length, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header with Stats */}
      <div className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Expeditor View</h2>
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            {isPending && (
              <div className="animate-spin h-4 w-4 rounded-full border-2 border-zinc-300 border-t-blue-600" />
            )}
            <span>{totalTickets} active</span>
          </div>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="rounded-md bg-white dark:bg-zinc-800 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700">
              <span className="text-zinc-500">Avg time: </span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {stats.avgTicketTimeMinutes}m
              </span>
            </div>
            <div className="rounded-md bg-white dark:bg-zinc-800 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700">
              <span className="text-zinc-500">Throughput: </span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {stats.ticketsPerHour}/hr
              </span>
            </div>
            <div className="rounded-md bg-white dark:bg-zinc-800 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700">
              <span className="text-zinc-500">Served today: </span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {stats.totalServedToday}
              </span>
            </div>

            {/* Fire All Course */}
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="number"
                min="1"
                value={courseInput}
                onChange={(e) => setCourseInput(e.target.value)}
                placeholder="Course #"
                className="w-24 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm"
              />
              <button
                onClick={handleFireAll}
                disabled={isPending || !courseInput}
                className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50 touch-manipulation"
              >
                Fire All
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="m-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            dismiss
          </button>
        </div>
      )}

      {/* Station Columns */}
      <div className="flex-1 overflow-auto p-4">
        {stations.length === 0 ? (
          <div className="flex h-full items-center justify-center text-zinc-400 text-lg">
            No stations configured
          </div>
        ) : (
          <div className="flex gap-4 min-h-full" style={{ minWidth: stations.length * 320 }}>
            {stations.map((station) => (
              <div
                key={station.id}
                className="flex flex-col w-80 flex-shrink-0 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              >
                {/* Station Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 rounded-t-lg">
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{station.name}</h3>
                  <span className="rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                    {station.tickets.length}
                  </span>
                </div>

                {/* Tickets */}
                <div className="flex-1 overflow-auto p-2 space-y-2">
                  {station.tickets.length === 0 && (
                    <div className="text-sm text-zinc-400 text-center py-8">Clear</div>
                  )}
                  {station.tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className={`rounded-md border-l-4 ${statusColor(ticket.status)} ${statusBg(ticket.status)} p-2 shadow-sm`}
                    >
                      {/* Allergy */}
                      {ticket.allergyAlert && (
                        <div className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white mb-1">
                          ALLERGY: {ticket.allergyAlert}
                        </div>
                      )}

                      {/* Header line */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                            #{ticket.ticketNumber}
                          </span>
                          {ticket.priority === 'rush' && (
                            <span className="text-xs font-bold text-orange-600 animate-pulse">
                              RUSH
                            </span>
                          )}
                          {ticket.priority === 'vip' && (
                            <span className="text-xs font-bold text-purple-600">VIP</span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-zinc-400">
                          {formatElapsed(ticket.createdAt)}
                        </span>
                      </div>

                      {/* Table info */}
                      {ticket.tableNumber && (
                        <div className="text-xs text-zinc-500 mb-1">
                          Table {ticket.tableNumber}
                          {ticket.courseNumber != null && ` - Course ${ticket.courseNumber}`}
                        </div>
                      )}

                      {/* Items (compact) */}
                      <div className="space-y-0.5 mb-2">
                        {ticket.items.map((item, idx) => (
                          <div key={idx} className="text-sm text-zinc-800 dark:text-zinc-200">
                            <span className="font-semibold">{item.quantity}x</span> {item.name}
                            {item.modifiers.length > 0 && (
                              <span className="text-xs text-blue-500 ml-1">
                                ({item.modifiers.join(', ')})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleBump(ticket.id)}
                          disabled={isPending}
                          className="flex-1 rounded px-2 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 touch-manipulation"
                        >
                          BUMP
                        </button>
                        <button
                          onClick={() => handleVoid(ticket.id)}
                          disabled={isPending}
                          className="rounded px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50 touch-manipulation"
                        >
                          Void
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
