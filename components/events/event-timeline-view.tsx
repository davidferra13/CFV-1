'use client'

import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { EventStatus } from '@/lib/events/fsm'

// ── Types ──────────────────────────────────────────────────────────
type TimelineEvent = {
  id: string
  occasion: string
  event_date: string
  serve_time: string | null
  guest_count: number | null
  status: string
  client_name: string
}

type Props = {
  events: TimelineEvent[]
}

// ── Status colors ──────────────────────────────────────────────────
const STATUS_COLORS: Record<EventStatus, { bg: string; text: string; border: string }> = {
  draft: { bg: 'bg-yellow-200', text: 'text-yellow-900', border: 'border-yellow-300' },
  proposed: { bg: 'bg-blue-300', text: 'text-blue-900', border: 'border-blue-400' },
  accepted: { bg: 'bg-green-300', text: 'text-green-900', border: 'border-green-400' },
  paid: { bg: 'bg-yellow-400', text: 'text-yellow-900', border: 'border-yellow-500' },
  confirmed: { bg: 'bg-amber-500', text: 'text-amber-950', border: 'border-amber-600' },
  in_progress: { bg: 'bg-red-500', text: 'text-white', border: 'border-red-600' },
  completed: { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-600' },
  cancelled: { bg: 'bg-stone-500', text: 'text-stone-200', border: 'border-stone-600' },
}

const STATUS_LABEL: Record<EventStatus, string> = {
  draft: 'Draft',
  proposed: 'Proposed',
  accepted: 'Accepted',
  paid: 'Paid',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

// ── Helpers ────────────────────────────────────────────────────────

/** Parse YYYY-MM-DD to a Date in local time (avoids UTC offset shift) */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000
  return Math.round((b.getTime() - a.getTime()) / msPerDay)
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

// ── Constants ──────────────────────────────────────────────────────
const DAY_WIDTH = 40 // px per day column
const ROW_HEIGHT = 52 // px per event row
const HEADER_HEIGHT = 64 // px for the date header area
const BAR_HEIGHT = 36 // px for each event bar
const LEFT_LABEL_WIDTH = 220 // px for the left labels column

// ── Component ──────────────────────────────────────────────────────
export function EventTimelineView({ events }: Props) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Sort events by date
  const sorted = useMemo(
    () =>
      [...events].sort(
        (a, b) => parseLocalDate(a.event_date).getTime() - parseLocalDate(b.event_date).getTime()
      ),
    [events]
  )

  // Calculate the visible date range: earliest event minus 7 days to latest event plus 14 days,
  // with a minimum of current month +/- 2 weeks
  const { rangeStart, totalDays } = useMemo(() => {
    const today = startOfDay(new Date())
    const defaultStart = addDays(today, -14)
    const defaultEnd = addDays(today, 28)

    if (sorted.length === 0) {
      const days = daysBetween(defaultStart, defaultEnd)
      return { rangeStart: defaultStart, totalDays: days }
    }

    const earliest = parseLocalDate(sorted[0].event_date)
    const latest = parseLocalDate(sorted[sorted.length - 1].event_date)

    const start = new Date(Math.min(addDays(earliest, -7).getTime(), defaultStart.getTime()))
    const end = new Date(Math.max(addDays(latest, 14).getTime(), defaultEnd.getTime()))
    const days = daysBetween(start, end)

    return { rangeStart: start, totalDays: days }
  }, [sorted])

  // Generate day columns
  const days = useMemo(() => {
    const result: Date[] = []
    for (let i = 0; i <= totalDays; i++) {
      result.push(addDays(rangeStart, i))
    }
    return result
  }, [rangeStart, totalDays])

  // Build month headers
  const monthHeaders = useMemo(() => {
    const headers: { label: string; startIdx: number; span: number }[] = []
    let currentMonth = -1
    let currentYear = -1

    for (let i = 0; i < days.length; i++) {
      const d = days[i]
      if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) {
        if (headers.length > 0) {
          headers[headers.length - 1].span = i - headers[headers.length - 1].startIdx
        }
        currentMonth = d.getMonth()
        currentYear = d.getFullYear()
        headers.push({ label: formatMonthYear(d), startIdx: i, span: 0 })
      }
    }
    if (headers.length > 0) {
      headers[headers.length - 1].span = days.length - headers[headers.length - 1].startIdx
    }
    return headers
  }, [days])

  // Today marker position
  const todayOffset = useMemo(() => {
    const today = startOfDay(new Date())
    const offset = daysBetween(rangeStart, today)
    if (offset < 0 || offset > totalDays) return null
    return offset
  }, [rangeStart, totalDays])

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current && todayOffset !== null) {
      const scrollTarget = todayOffset * DAY_WIDTH - scrollRef.current.clientWidth / 3
      scrollRef.current.scrollLeft = Math.max(0, scrollTarget)
    }
  }, [todayOffset])

  const handleBarClick = useCallback(
    (eventId: string) => {
      router.push(`/events/${eventId}`)
    },
    [router]
  )

  // ── Empty State ────────────────────────────────────────────────
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-stone-500 text-lg mb-2">No events to display</div>
        <p className="text-stone-600 text-sm mb-6">
          Create your first event to see it on the timeline
        </p>
        <button
          onClick={() => router.push('/events/new')}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + New Event
        </button>
      </div>
    )
  }

  // ── Legend ──────────────────────────────────────────────────────
  const activeStatuses = useMemo(() => {
    const set = new Set(sorted.map((e) => e.status))
    return (Object.keys(STATUS_COLORS) as EventStatus[]).filter((s) => set.has(s))
  }, [sorted])

  const timelineWidth = totalDays * DAY_WIDTH

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {activeStatuses.map((status) => {
          const color = STATUS_COLORS[status]
          return (
            <div key={status} className="flex items-center gap-1.5 text-xs text-stone-400">
              <span className={`inline-block w-3 h-3 rounded-sm ${color.bg}`} />
              {STATUS_LABEL[status]}
            </div>
          )
        })}
      </div>

      {/* Timeline container */}
      <div className="border border-stone-700 rounded-lg bg-stone-900 overflow-hidden">
        <div className="flex">
          {/* Left labels (sticky) */}
          <div
            className="flex-shrink-0 border-r border-stone-700 bg-stone-900 z-20"
            style={{ width: LEFT_LABEL_WIDTH }}
          >
            {/* Label header */}
            <div
              className="border-b border-stone-700 px-3 flex items-end pb-2 text-xs font-medium text-stone-400 uppercase tracking-wider"
              style={{ height: HEADER_HEIGHT }}
            >
              Event
            </div>

            {/* Event labels */}
            {sorted.map((event) => (
              <div
                key={event.id}
                className="border-b border-stone-800 px-3 flex items-center cursor-pointer hover:bg-stone-800/60 transition-colors"
                style={{ height: ROW_HEIGHT }}
                onClick={() => handleBarClick(event.id)}
                onMouseEnter={() => setHoveredId(event.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="min-w-0">
                  <div className="text-sm text-stone-200 truncate font-medium">
                    {event.occasion}
                  </div>
                  <div className="text-xs text-stone-500 truncate">{event.client_name}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable timeline area */}
          <div ref={scrollRef} className="overflow-x-auto flex-1">
            <div style={{ width: timelineWidth, minWidth: '100%' }}>
              {/* Date headers */}
              <div className="border-b border-stone-700" style={{ height: HEADER_HEIGHT }}>
                {/* Month row */}
                <div className="flex h-7">
                  {monthHeaders.map((mh) => (
                    <div
                      key={`${mh.label}-${mh.startIdx}`}
                      className="text-xs font-medium text-stone-300 px-2 flex items-center border-l border-stone-700 first:border-l-0"
                      style={{ width: mh.span * DAY_WIDTH }}
                    >
                      {mh.label}
                    </div>
                  ))}
                </div>

                {/* Day row */}
                <div className="flex" style={{ height: HEADER_HEIGHT - 28 }}>
                  {days.map((d, i) => {
                    const isToday = todayOffset !== null && i === todayOffset
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6
                    const isFirstOfMonth = d.getDate() === 1

                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-center text-[10px] leading-none border-l border-stone-800 ${
                          isToday
                            ? 'text-red-400 font-bold'
                            : isWeekend
                              ? 'text-stone-600'
                              : 'text-stone-500'
                        } ${isFirstOfMonth ? 'border-l-stone-600' : ''}`}
                        style={{ width: DAY_WIDTH }}
                      >
                        {d.getDate()}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Event rows */}
              <div className="relative">
                {/* Weekend shading + grid lines */}
                <div className="absolute inset-0 flex pointer-events-none" aria-hidden="true">
                  {days.map((d, i) => {
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6
                    const isFirstOfMonth = d.getDate() === 1
                    return (
                      <div
                        key={i}
                        className={`border-l ${
                          isFirstOfMonth ? 'border-stone-600' : 'border-stone-800/50'
                        } ${isWeekend ? 'bg-stone-800/30' : ''}`}
                        style={{ width: DAY_WIDTH, height: sorted.length * ROW_HEIGHT }}
                      />
                    )
                  })}
                </div>

                {/* Today marker */}
                {todayOffset !== null && (
                  <div
                    className="absolute top-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                    style={{
                      left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2,
                      height: sorted.length * ROW_HEIGHT,
                    }}
                  >
                    <div className="absolute -top-0.5 -left-1.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-stone-900" />
                  </div>
                )}

                {/* Event bars */}
                {sorted.map((event, rowIdx) => {
                  const eventDate = parseLocalDate(event.event_date)
                  const dayOffset = daysBetween(rangeStart, eventDate)
                  const colors = STATUS_COLORS[event.status as EventStatus] ?? STATUS_COLORS.draft
                  const isHovered = hoveredId === event.id

                  // Bar is 1 day wide, positioned at the event date
                  const barLeft = dayOffset * DAY_WIDTH + 2
                  const barWidth = Math.max(DAY_WIDTH - 4, 60)
                  const barTop = rowIdx * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2

                  return (
                    <div
                      key={event.id}
                      className="border-b border-stone-800/50"
                      style={{ height: ROW_HEIGHT }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleBarClick(event.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleBarClick(event.id)
                          }
                        }}
                        onMouseEnter={() => setHoveredId(event.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className={`absolute rounded border cursor-pointer transition-all ${colors.bg} ${colors.border} ${colors.text} ${
                          isHovered ? 'ring-2 ring-white/30 scale-[1.02] z-10' : 'z-[1]'
                        }`}
                        style={{
                          left: barLeft,
                          top: barTop,
                          width: barWidth,
                          height: BAR_HEIGHT,
                        }}
                        title={`${event.occasion} (${event.client_name}) - ${formatDate(eventDate)}${event.guest_count ? ` - ${event.guest_count} guests` : ''}`}
                      >
                        <div className="flex items-center gap-1 px-2 h-full overflow-hidden">
                          <span className="text-xs font-medium truncate">{event.occasion}</span>
                          {event.guest_count != null && event.guest_count > 0 && (
                            <span className="flex-shrink-0 text-[10px] opacity-80 font-medium rounded-full bg-black/10 px-1.5 py-0.5">
                              {event.guest_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
