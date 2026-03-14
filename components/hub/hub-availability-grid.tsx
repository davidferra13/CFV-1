'use client'

import { useState, useTransition } from 'react'
import type { HubAvailability, HubAvailabilityResponse } from '@/lib/hub/availability-actions'
import {
  createAvailability,
  setAvailabilityResponse,
  closeAvailability,
  getAvailabilityWithResponses,
} from '@/lib/hub/availability-actions'

interface HubAvailabilityGridProps {
  groupId: string
  availabilityPolls: HubAvailability[]
  profileToken: string | null
  canPost: boolean
}

export function HubAvailabilityGrid({
  groupId,
  availabilityPolls,
  profileToken,
  canPost,
}: HubAvailabilityGridProps) {
  const [polls, setPolls] = useState(availabilityPolls)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-300">Scheduling</h3>
        {canPost && profileToken && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-[var(--hub-primary,#e88f47)] px-3 py-1.5 text-xs font-medium text-white"
          >
            New Schedule
          </button>
        )}
      </div>

      {showCreate && profileToken && (
        <CreateAvailabilityForm
          groupId={groupId}
          profileToken={profileToken}
          onCreated={(a) => {
            setPolls((prev) => [a, ...prev])
            setShowCreate(false)
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {polls.length === 0 && !showCreate ? (
        <div className="py-12 text-center text-sm text-stone-600">
          No scheduling polls yet. Create one to find when everyone is free!
        </div>
      ) : (
        <div className="space-y-3">
          {polls.map((poll) => (
            <AvailabilityCard
              key={poll.id}
              poll={poll}
              profileToken={profileToken}
              isExpanded={expandedId === poll.id}
              onToggle={() => setExpandedId(expandedId === poll.id ? null : poll.id)}
              onClose={() =>
                setPolls((prev) =>
                  prev.map((p) => (p.id === poll.id ? { ...p, is_closed: true } : p))
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Create form
function CreateAvailabilityForm({
  groupId,
  profileToken,
  onCreated,
  onCancel,
}: {
  groupId: string
  profileToken: string
  onCreated: (a: HubAvailability) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('When works for everyone?')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleCreate = () => {
    if (!startDate || !endDate) return
    startTransition(async () => {
      try {
        const avail = await createAvailability({
          groupId,
          profileToken,
          title: title.trim() || 'When works for everyone?',
          dateRangeStart: startDate,
          dateRangeEnd: endDate,
        })
        onCreated(avail)
      } catch (err) {
        console.error('Failed to create availability:', err)
      }
    })
  }

  return (
    <div className="mb-4 rounded-xl border border-stone-700 bg-stone-900/50 p-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="mb-3 w-full rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-[var(--hub-primary,#e88f47)]"
      />
      <div className="mb-3 flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-stone-500">Start</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 outline-none ring-1 ring-stone-700 focus:ring-[var(--hub-primary,#e88f47)]"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-stone-500">End</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 outline-none ring-1 ring-stone-700 focus:ring-[var(--hub-primary,#e88f47)]"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleCreate}
          disabled={!startDate || !endDate || isPending}
          className="flex-1 rounded-lg bg-[var(--hub-primary,#e88f47)] py-2 text-xs font-semibold text-white disabled:opacity-30"
        >
          {isPending ? 'Creating...' : 'Create'}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg bg-stone-800 px-4 py-2 text-xs text-stone-400 hover:bg-stone-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// Single availability card
function AvailabilityCard({
  poll,
  profileToken,
  isExpanded,
  onToggle,
  onClose,
}: {
  poll: HubAvailability
  profileToken: string | null
  isExpanded: boolean
  onToggle: () => void
  onClose: () => void
}) {
  const [responses, setResponses] = useState<HubAvailabilityResponse[]>(poll.responses ?? [])
  const [loaded, setLoaded] = useState(!!poll.responses)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    onToggle()
    if (!loaded && !isExpanded) {
      startTransition(async () => {
        try {
          const full = await getAvailabilityWithResponses(poll.id)
          if (full?.responses) {
            setResponses(full.responses)
            setLoaded(true)
          }
        } catch {
          // Ignore
        }
      })
    }
  }

  const handleResponse = (date: string, status: 'available' | 'maybe' | 'unavailable') => {
    if (!profileToken) return
    startTransition(async () => {
      try {
        await setAvailabilityResponse({
          availabilityId: poll.id,
          profileToken,
          responseDate: date,
          status,
        })
        // Reload
        const full = await getAvailabilityWithResponses(poll.id)
        if (full?.responses) setResponses(full.responses)
      } catch {
        // Ignore
      }
    })
  }

  const handleClose = () => {
    if (!profileToken) return
    startTransition(async () => {
      try {
        await closeAvailability({ availabilityId: poll.id, profileToken })
        onClose()
      } catch {
        // Ignore
      }
    })
  }

  // Generate date range
  const dates: string[] = []
  if (poll.date_range_start && poll.date_range_end) {
    const start = new Date(poll.date_range_start)
    const end = new Date(poll.date_range_end)
    const current = new Date(start)
    while (current <= end && dates.length < 31) {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }
  }

  // Group responses by date
  const responsesByDate: Record<string, HubAvailabilityResponse[]> = {}
  for (const r of responses) {
    if (!responsesByDate[r.response_date]) responsesByDate[r.response_date] = []
    responsesByDate[r.response_date].push(r)
  }

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/50 overflow-hidden">
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div>
          <h4 className="text-sm font-semibold text-stone-200">{poll.title}</h4>
          <p className="text-xs text-stone-500">
            {poll.date_range_start} to {poll.date_range_end}
            {poll.is_closed && (
              <span className="ml-2 rounded-full bg-stone-700 px-2 py-0.5 text-xs text-stone-400">
                Closed
              </span>
            )}
          </p>
        </div>
        <span className="text-stone-500">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="border-t border-stone-800 p-4">
          {isPending && !loaded ? (
            <div className="py-4 text-center text-sm text-stone-500">Loading...</div>
          ) : (
            <div className="space-y-1">
              {dates.map((date) => {
                const dateResponses = responsesByDate[date] ?? []
                const availCount = dateResponses.filter((r) => r.status === 'available').length
                const maybeCount = dateResponses.filter((r) => r.status === 'maybe').length
                const d = new Date(date + 'T12:00:00')
                const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
                const dayNum = d.getDate()
                const month = d.toLocaleDateString('en-US', { month: 'short' })

                return (
                  <div
                    key={date}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-stone-800/50"
                  >
                    <div className="w-16 text-xs text-stone-400">
                      {dayName} {month} {dayNum}
                    </div>
                    <div className="flex-1">
                      <div className="flex gap-1">
                        {availCount > 0 && (
                          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                            {availCount}
                          </span>
                        )}
                        {maybeCount > 0 && (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                            {maybeCount}?
                          </span>
                        )}
                      </div>
                    </div>
                    {profileToken && !poll.is_closed && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleResponse(date, 'available')}
                          className="rounded px-2 py-0.5 text-xs text-green-400 hover:bg-green-500/20"
                          title="Available"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => handleResponse(date, 'maybe')}
                          className="rounded px-2 py-0.5 text-xs text-amber-400 hover:bg-amber-500/20"
                          title="Maybe"
                        >
                          ?
                        </button>
                        <button
                          onClick={() => handleResponse(date, 'unavailable')}
                          className="rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/20"
                          title="Unavailable"
                        >
                          ✗
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {profileToken && !poll.is_closed && (
            <button
              onClick={handleClose}
              disabled={isPending}
              className="mt-3 w-full rounded-lg bg-stone-800 py-1.5 text-xs text-stone-400 hover:bg-stone-700"
            >
              Close Poll
            </button>
          )}
        </div>
      )}
    </div>
  )
}
