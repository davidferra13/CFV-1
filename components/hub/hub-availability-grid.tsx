'use client'

import { useState, useTransition, useMemo } from 'react'
import type { HubAvailability, HubAvailabilityResponse } from '@/lib/hub/availability-actions'
import {
  createAvailability,
  setAvailabilityResponse,
  closeAvailability,
  getAvailabilityWithResponses,
} from '@/lib/hub/availability-actions'
import { toast } from 'sonner'

// Best dates summary: shows top 1-3 dates where most people are available
function BestDatesSummary({
  dates,
  responsesByDate,
}: {
  dates: string[]
  responsesByDate: Record<string, HubAvailabilityResponse[]>
}) {
  const ranked = useMemo(() => {
    return dates
      .map((date) => {
        const rs = responsesByDate[date] ?? []
        const avail = rs.filter((r) => r.status === 'available').length
        const maybe = rs.filter((r) => r.status === 'maybe').length
        // Score: available = 1 point, maybe = 0.5 points
        return { date, score: avail + maybe * 0.5, avail, maybe }
      })
      .filter((d) => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [dates, responsesByDate])

  if (ranked.length === 0) return null

  return (
    <div className="mb-3 rounded-lg bg-green-500/10 p-3">
      <div className="mb-1 text-xs font-semibold text-green-400">Best dates</div>
      <div className="flex flex-wrap gap-2">
        {ranked.map((d, i) => {
          const dt = new Date(d.date + 'T12:00:00')
          const label = dt.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })
          return (
            <span
              key={d.date}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                i === 0 ? 'bg-green-500/20 text-green-300' : 'bg-stone-700/50 text-stone-300'
              }`}
            >
              {label} ({d.avail}
              {d.maybe > 0 ? `+${d.maybe}?` : ''})
            </span>
          )
        })}
      </div>
    </div>
  )
}

// Shows who has responded and their overall status
function RespondentLegend({ responses }: { responses: HubAvailabilityResponse[] }) {
  const respondents = useMemo(() => {
    const map = new Map<
      string,
      { name: string; available: number; maybe: number; unavailable: number }
    >()
    for (const r of responses) {
      const name = r.profile?.display_name ?? 'Someone'
      const key = r.profile_id
      if (!map.has(key)) {
        map.set(key, { name, available: 0, maybe: 0, unavailable: 0 })
      }
      const entry = map.get(key)!
      if (r.status === 'available') entry.available++
      else if (r.status === 'maybe') entry.maybe++
      else entry.unavailable++
    }
    return Array.from(map.values())
  }, [responses])

  if (respondents.length === 0) return null

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {respondents.map((r) => (
        <span
          key={r.name}
          className="inline-flex items-center gap-1 rounded-full bg-stone-800 px-2 py-0.5 text-xs text-stone-300"
          title={`${r.name}: ${r.available} available, ${r.maybe} maybe, ${r.unavailable} unavailable`}
        >
          {r.name.split(' ')[0]}
          {r.available > 0 && <span className="text-green-400">{r.available}</span>}
          {r.maybe > 0 && <span className="text-amber-400">{r.maybe}</span>}
          {r.unavailable > 0 && <span className="text-red-400">{r.unavailable}</span>}
        </span>
      ))}
    </div>
  )
}

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
      } catch {
        toast.error('Failed to create schedule')
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
          toast.error('Failed to load responses')
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
        toast.error('Failed to save response')
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
        toast.error('Failed to close poll')
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
            <>
              {/* Best dates summary */}
              {responses.length > 0 && (
                <BestDatesSummary dates={dates} responsesByDate={responsesByDate} />
              )}

              {/* Respondent legend */}
              {responses.length > 0 && <RespondentLegend responses={responses} />}

              <div className="space-y-1">
                {dates.map((date) => {
                  const dateResponses = responsesByDate[date] ?? []
                  const availCount = dateResponses.filter((r) => r.status === 'available').length
                  const maybeCount = dateResponses.filter((r) => r.status === 'maybe').length
                  const unavailCount = dateResponses.filter(
                    (r) => r.status === 'unavailable'
                  ).length
                  const totalResponses = dateResponses.length
                  const d = new Date(date + 'T12:00:00')
                  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
                  const dayNum = d.getDate()
                  const month = d.toLocaleDateString('en-US', { month: 'short' })

                  // Heatmap intensity based on available count
                  const maxAvail = Math.max(
                    1,
                    ...dates.map(
                      (dt) =>
                        (responsesByDate[dt] ?? []).filter((r) => r.status === 'available').length
                    )
                  )
                  const heatIntensity = availCount / maxAvail

                  return (
                    <div key={date}>
                      <div
                        className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-stone-800/50"
                        style={{
                          background:
                            availCount > 0
                              ? `rgba(34, 197, 94, ${heatIntensity * 0.15})`
                              : undefined,
                        }}
                      >
                        <div className="w-20 text-xs text-stone-400">
                          {dayName} {month} {dayNum}
                        </div>

                        {/* Heatmap bar */}
                        <div className="flex-1">
                          {totalResponses > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-stone-800">
                                {availCount > 0 && (
                                  <div
                                    className="h-full bg-green-500"
                                    style={{ width: `${(availCount / totalResponses) * 100}%` }}
                                  />
                                )}
                                {maybeCount > 0 && (
                                  <div
                                    className="h-full bg-amber-500"
                                    style={{ width: `${(maybeCount / totalResponses) * 100}%` }}
                                  />
                                )}
                                {unavailCount > 0 && (
                                  <div
                                    className="h-full bg-red-500/60"
                                    style={{ width: `${(unavailCount / totalResponses) * 100}%` }}
                                  />
                                )}
                              </div>
                              <div className="flex gap-1 text-xs">
                                {availCount > 0 && (
                                  <span className="text-green-400">{availCount}</span>
                                )}
                                {maybeCount > 0 && (
                                  <span className="text-amber-400">{maybeCount}?</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="h-2 rounded-full bg-stone-800" />
                          )}

                          {/* Show who responded on this date */}
                          {dateResponses.length > 0 && (
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              {dateResponses.map((r) => (
                                <span
                                  key={r.id}
                                  className={`rounded px-1 text-xxs ${
                                    r.status === 'available'
                                      ? 'bg-green-500/10 text-green-400'
                                      : r.status === 'maybe'
                                        ? 'bg-amber-500/10 text-amber-400'
                                        : 'bg-red-500/10 text-red-400'
                                  }`}
                                  title={`${r.profile?.display_name ?? 'Someone'}: ${r.status}`}
                                >
                                  {r.profile?.display_name?.split(' ')[0] ?? '?'}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {profileToken && !poll.is_closed && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleResponse(date, 'available')}
                              className="rounded px-2 py-0.5 text-xs text-green-400 hover:bg-green-500/20"
                              title="Available"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResponse(date, 'maybe')}
                              className="rounded px-2 py-0.5 text-xs text-amber-400 hover:bg-amber-500/20"
                              title="Maybe"
                            >
                              ?
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResponse(date, 'unavailable')}
                              className="rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/20"
                              title="Unavailable"
                            >
                              ✗
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {profileToken && !poll.is_closed && (
            <button
              type="button"
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
