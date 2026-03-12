'use client'

import { useState, useEffect, useCallback, useTransition, useRef } from 'react'
import {
  verifyKdsPin,
  getPublicKdsTickets,
  bumpPublicKdsTicket,
  fireAllPublicKdsCourse,
} from '@/lib/commerce/kds-public-actions'
import type { PublicKDSTicket } from '@/lib/commerce/kds-public-actions'

// ─── Elapsed time helper ─────────────────────────────────────────

function formatElapsed(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  const mins = Math.floor(diff / 60)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m`
}

// ─── Color helpers ───────────────────────────────────────────────

function statusBorder(status: string): string {
  switch (status) {
    case 'new':
      return 'border-red-500'
    case 'in_progress':
      return 'border-yellow-500'
    case 'ready':
      return 'border-emerald-500'
    default:
      return 'border-zinc-500'
  }
}

function statusBg(status: string): string {
  switch (status) {
    case 'new':
      return 'bg-red-950/30'
    case 'in_progress':
      return 'bg-yellow-950/30'
    case 'ready':
      return 'bg-emerald-950/30'
    default:
      return 'bg-zinc-900'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'new':
      return 'NEW'
    case 'in_progress':
      return 'FIRING'
    case 'ready':
      return 'READY'
    default:
      return status.toUpperCase()
  }
}

// ─── Ticket Card ─────────────────────────────────────────────────

function TicketCard({
  ticket,
  onBump,
  isPending,
}: {
  ticket: PublicKDSTicket
  onBump: (id: string) => void
  isPending: boolean
}) {
  const elapsed = formatElapsed(ticket.createdAt)
  const isOverdue = (Date.now() - new Date(ticket.createdAt).getTime()) / 60000 > 15

  return (
    <div
      className={`rounded-lg border-l-4 ${statusBorder(ticket.status)} ${statusBg(ticket.status)} flex flex-col shadow-md`}
    >
      {/* Allergy alert */}
      {ticket.allergyAlert && (
        <div className="rounded-t-lg bg-red-600 px-4 py-2 text-base font-black text-white animate-pulse">
          ALLERGY: {ticket.allergyAlert}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-white">#{ticket.ticketNumber}</span>
          {ticket.priority === 'rush' && (
            <span className="rounded-full bg-orange-600 px-3 py-1 text-sm font-black text-white animate-pulse">
              RUSH
            </span>
          )}
          {ticket.priority === 'vip' && (
            <span className="rounded-full bg-purple-600 px-3 py-1 text-sm font-black text-white">
              VIP
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              ticket.status === 'new'
                ? 'bg-red-600 text-white'
                : ticket.status === 'in_progress'
                  ? 'bg-yellow-600 text-black'
                  : 'bg-emerald-600 text-white'
            }`}
          >
            {statusLabel(ticket.status)}
          </span>
        </div>
        <span
          className={`text-lg font-mono font-bold ${isOverdue ? 'text-red-400 animate-pulse' : 'text-zinc-400'}`}
        >
          {elapsed}
        </span>
      </div>

      {/* Table / Server info */}
      {(ticket.tableNumber || ticket.serverName) && (
        <div className="flex items-center gap-3 px-4 py-1 text-sm text-zinc-400 border-t border-zinc-700/50">
          {ticket.tableNumber && (
            <span className="font-semibold text-zinc-300">Table {ticket.tableNumber}</span>
          )}
          {ticket.serverName && <span>Server: {ticket.serverName}</span>}
          {ticket.courseNumber != null && <span>Course {ticket.courseNumber}</span>}
          {ticket.guestCount != null && <span>{ticket.guestCount} guests</span>}
        </div>
      )}

      {/* Items */}
      <div className="flex-1 px-4 py-3 space-y-2 border-t border-zinc-700/50">
        {ticket.items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <span className="text-xl font-black text-white min-w-[2.5rem] text-right">
              {item.quantity}x
            </span>
            <div className="flex-1">
              <span className="text-lg font-bold text-white">{item.name}</span>
              {item.modifiers.length > 0 && (
                <div className="text-sm text-blue-400 font-medium">{item.modifiers.join(', ')}</div>
              )}
              {item.notes && <div className="text-sm text-amber-400 italic">{item.notes}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      {ticket.notes && (
        <div className="px-4 py-2 text-sm text-zinc-400 italic border-t border-zinc-700/50">
          {ticket.notes}
        </div>
      )}

      {/* Bump button */}
      {ticket.status !== 'served' && (
        <button
          onClick={() => onBump(ticket.id)}
          disabled={isPending}
          className="mx-3 mb-3 mt-1 rounded-lg px-4 py-4 text-lg font-black text-white transition-colors
            bg-blue-600 hover:bg-blue-700 active:bg-blue-800
            disabled:opacity-50 disabled:cursor-not-allowed
            touch-manipulation select-none"
        >
          BUMP
        </button>
      )}
    </div>
  )
}

// ─── PIN Entry ───────────────────────────────────────────────────

function PinEntry({
  tenantId,
  onSuccess,
}: {
  tenantId: string
  onSuccess: (pin: string, stations: Array<{ id: string; name: string }>) => void
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length < 4) return
    setLoading(true)
    setError('')
    try {
      const result = await verifyKdsPin(tenantId, pin)
      if (result.valid) {
        onSuccess(pin, result.stations)
      } else {
        setError('Invalid PIN. Check with your chef.')
        setPin('')
        inputRef.current?.focus()
      }
    } catch {
      setError('Connection error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-zinc-900 rounded-xl p-8 shadow-2xl w-full max-w-sm"
      >
        <h1 className="text-2xl font-black text-white text-center mb-2">Kitchen Display</h1>
        <p className="text-zinc-400 text-center text-sm mb-6">
          Enter your kitchen PIN to access the display
        </p>

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="\d{4,6}"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="PIN"
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-4 text-center text-3xl font-mono text-white tracking-[0.5em] placeholder:tracking-normal placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 mb-4"
          autoComplete="off"
        />

        {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

        <button
          type="submit"
          disabled={pin.length < 4 || loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-4 text-lg font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
        >
          {loading ? 'Verifying...' : 'Open KDS'}
        </button>
      </form>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────

interface StationData {
  id: string
  name: string
  tickets: PublicKDSTicket[]
}

export default function PublicKDSClient({ tenantId }: { tenantId: string }) {
  const [pin, setPin] = useState<string | null>(null)
  const [stations, setStations] = useState<Array<{ id: string; name: string }>>([])
  const [stationData, setStationData] = useState<StationData[]>([])
  const [selectedStation, setSelectedStation] = useState<string | 'all'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [courseInput, setCourseInput] = useState('')
  const [now, setNow] = useState(Date.now())

  // Update elapsed timers every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const loadTickets = useCallback(async () => {
    if (!pin) return
    try {
      const result = await getPublicKdsTickets(
        tenantId,
        pin,
        selectedStation === 'all' ? undefined : selectedStation
      )
      setStationData(result.stations)
      setError(null)
    } catch (err) {
      if (err instanceof Error && err.message === 'Invalid PIN') {
        setPin(null)
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }, [tenantId, pin, selectedStation])

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!pin) return
    setLoading(true)
    loadTickets()
    const interval = setInterval(loadTickets, 5_000)
    return () => clearInterval(interval)
  }, [loadTickets, pin])

  function handleBump(ticketId: string) {
    if (!pin) return
    startTransition(async () => {
      try {
        await bumpPublicKdsTicket(tenantId, pin, ticketId)
        await loadTickets()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to bump')
      }
    })
  }

  function handleFireAll() {
    if (!pin) return
    const course = parseInt(courseInput, 10)
    if (isNaN(course) || course < 1) return
    startTransition(async () => {
      try {
        await fireAllPublicKdsCourse(tenantId, pin, course)
        setCourseInput('')
        await loadTickets()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fire course')
      }
    })
  }

  // PIN entry screen
  if (!pin) {
    return (
      <PinEntry
        tenantId={tenantId}
        onSuccess={(p, s) => {
          setPin(p)
          setStations(s)
        }}
      />
    )
  }

  const totalTickets = stationData.reduce((sum, s) => sum + s.tickets.length, 0)

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-2 flex-shrink-0">
        <h1 className="text-xl font-black mr-4">KDS</h1>

        {/* Station tabs */}
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          <button
            onClick={() => setSelectedStation('all')}
            className={`rounded-md px-3 py-1.5 text-sm font-bold whitespace-nowrap transition-colors touch-manipulation ${
              selectedStation === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            All Stations
          </button>
          {stations.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStation(s.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-bold whitespace-nowrap transition-colors touch-manipulation ${
                selectedStation === s.id
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Fire course */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            value={courseInput}
            onChange={(e) => setCourseInput(e.target.value)}
            placeholder="Course #"
            className="w-24 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white"
          />
          <button
            onClick={handleFireAll}
            disabled={isPending || !courseInput}
            className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50 touch-manipulation"
          >
            Fire All
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-sm text-zinc-400 ml-2">
          <span>{totalTickets} active</span>
          {(loading || isPending) && (
            <div className="animate-spin h-4 w-4 rounded-full border-2 border-zinc-600 border-t-blue-500" />
          )}
        </div>

        {/* Fullscreen */}
        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {})
            } else {
              document.exitFullscreen().catch(() => {})
            }
          }}
          className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 touch-manipulation"
          title="Toggle fullscreen"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
        </button>

        {/* Lock (exit to PIN) */}
        <button
          onClick={() => setPin(null)}
          className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 touch-manipulation"
          title="Lock KDS"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-2 rounded-md bg-red-950 border border-red-800 p-3 text-sm text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            dismiss
          </button>
        </div>
      )}

      {/* Ticket display */}
      <div className="flex-1 overflow-auto p-4">
        {stationData.length === 0 && !loading ? (
          <div className="flex h-full items-center justify-center text-zinc-500 text-xl">
            No stations configured
          </div>
        ) : selectedStation !== 'all' ? (
          // Single station view - grid of tickets
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {stationData
              .flatMap((s) => s.tickets)
              .map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onBump={handleBump}
                  isPending={isPending}
                />
              ))}
            {stationData.flatMap((s) => s.tickets).length === 0 && (
              <div className="col-span-full flex h-64 items-center justify-center text-zinc-500 text-xl">
                All clear
              </div>
            )}
          </div>
        ) : (
          // Expeditor view - columns per station
          <div className="flex gap-4 min-h-full" style={{ minWidth: stationData.length * 340 }}>
            {stationData.map((station) => (
              <div
                key={station.id}
                className="flex flex-col w-80 flex-shrink-0 rounded-lg border border-zinc-800 bg-zinc-900"
              >
                {/* Station header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-800/50 rounded-t-lg">
                  <h3 className="font-black text-lg text-white">{station.name}</h3>
                  <span
                    className={`rounded-full px-3 py-0.5 text-sm font-bold ${
                      station.tickets.length > 0
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-700 text-zinc-400'
                    }`}
                  >
                    {station.tickets.length}
                  </span>
                </div>

                {/* Tickets */}
                <div className="flex-1 overflow-auto p-3 space-y-3">
                  {station.tickets.length === 0 && (
                    <div className="text-zinc-600 text-center py-12 text-lg">Clear</div>
                  )}
                  {station.tickets.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onBump={handleBump}
                      isPending={isPending}
                    />
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
