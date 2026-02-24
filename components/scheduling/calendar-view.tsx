// Full Calendar View — Google Calendar-style schedule
// Month, week, day, and agenda views with drag-and-drop, keyboard shortcuts, mini calendar.

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import type { EventClickArg, DatesSetArg, EventContentArg, EventDropArg } from '@fullcalendar/core'
import type { DateClickArg, EventResizeDoneArg } from '@fullcalendar/interaction'
import { getCalendarEvents, rescheduleEvent, type CalendarEvent } from '@/lib/scheduling/actions'
import { getUSHolidaysInRange, type HolidayEvent } from '@/lib/holidays/us-holidays'
import type { SeasonalPalette } from '@/lib/seasonal/types'
import { getCurrentSeason } from '@/lib/seasonal/helpers'
import { EventDetailPopover } from './event-detail-popover'
import { AgendaView } from './agenda-view'
import { MiniCalendar } from './mini-calendar'
import { Button } from '@/components/ui/button'

type ViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'agenda'

const VIEW_LABELS: Record<ViewType, string> = {
  dayGridMonth: 'Month',
  timeGridWeek: 'Week',
  timeGridDay: 'Day',
  agenda: 'Agenda',
}

const VIEW_SHORTCUTS: Record<string, ViewType> = {
  m: 'dayGridMonth',
  w: 'timeGridWeek',
  d: 'timeGridDay',
  a: 'agenda',
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  draft: { bg: '#f5f3ef', border: '#d6d3d1', text: '#57534e' },
  proposed: { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af' },
  accepted: { bg: '#fef3c7', border: '#fcd34d', text: '#92400e' },
  paid: { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46' },
  confirmed: { bg: '#fcf0e0', border: '#f3c596', text: '#b15c26' },
  in_progress: { bg: '#fef9f3', border: '#e88f47', text: '#8e4a24' },
  completed: { bg: '#d1fae5', border: '#34d399', text: '#065f46' },
  inquiry: { bg: '#f3f4f6', border: '#9ca3af', text: '#6b7280' },
}

const PREP_STATUS_DOT: Record<string, string> = {
  ready: '#22c55e',
  partial: '#eab308',
  not_started: '#ef4444',
}

const SEASON_EMOJI: Record<string, string> = {
  Winter: '❄️',
  Spring: '🌸',
  Summer: '☀️',
  Autumn: '🍂',
}

function formatRange(start: string, end: string): string {
  const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const [sm, sd] = start.split('-').map(Number)
  const [em, ed] = end.split('-').map(Number)
  return `${MONTHS[sm - 1]} ${sd} \u2013 ${MONTHS[em - 1]} ${ed}`
}

export function CalendarView({
  initialEvents,
  palettes,
}: {
  initialEvents: CalendarEvent[]
  palettes?: SeasonalPalette[]
}) {
  const router = useRouter()
  const calendarRef = useRef<InstanceType<typeof FullCalendar>>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [holidayEvents, setHolidayEvents] = useState<HolidayEvent[]>([])
  const [currentView, setCurrentView] = useState<ViewType>('dayGridMonth')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null)
  const [title, setTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [rescheduleToast, setRescheduleToast] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined)
  const [viewSeason, setViewSeason] = useState<SeasonalPalette | null>(null)

  // ============================================
  // DATA FETCHING
  // ============================================

  const handleDatesSet = useCallback(
    async (arg: DatesSetArg) => {
      setTitle(arg.view.title)
      setIsLoading(true)
      try {
        const start = arg.startStr.split('T')[0]
        const end = arg.endStr.split('T')[0]
        const fetched = await getCalendarEvents(start, end)
        setEvents(fetched)
        setHolidayEvents(getUSHolidaysInRange(start, end))
        // time-machine: compute season for the visible center date
        if (palettes && palettes.length > 0) {
          const startMs = new Date(arg.start).getTime()
          const endMs = new Date(arg.end).getTime()
          const mid = new Date(Math.floor((startMs + endMs) / 2))
          const season = getCurrentSeason(palettes, mid)
          setViewSeason(season)
        }
      } catch (err) {
        console.error('[CalendarView] Failed to fetch events:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [palettes]
  )

  // ============================================
  // EVENT CLICK → POPOVER
  // ============================================

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      info.jsEvent.preventDefault()
      if (info.event.extendedProps.dayType === 'holiday') return
      const rect = info.el.getBoundingClientRect()
      setPopoverPosition({ x: rect.left + rect.width / 2, y: rect.top })
      const evt = events.find((e) => e.id === info.event.id)
      setSelectedEvent(evt ?? null)
    },
    [events]
  )

  const handleAgendaEventClick = useCallback((event: CalendarEvent, rect: DOMRect) => {
    setPopoverPosition({ x: rect.left + rect.width / 2, y: rect.top })
    setSelectedEvent(event)
  }, [])

  const closePopover = useCallback(() => {
    setSelectedEvent(null)
    setPopoverPosition(null)
  }, [])

  useEffect(() => {
    if (!selectedEvent) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.event-popover') && !target.closest('.fc-event')) {
        closePopover()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [selectedEvent, closePopover])

  // ============================================
  // CLICK EMPTY DATE → CREATE EVENT
  // ============================================

  const handleDateClick = useCallback(
    (info: DateClickArg) => {
      const date = info.dateStr.split('T')[0]
      const time = info.dateStr.includes('T') ? info.dateStr.split('T')[1]?.slice(0, 5) : undefined
      const params = new URLSearchParams({ event_date: date })
      if (time) params.set('serve_time', time)
      router.push(`/events/new?${params.toString()}`)
    },
    [router]
  )

  // ============================================
  // DRAG-AND-DROP RESCHEDULE
  // ============================================

  const handleEventDrop = useCallback(async (info: EventDropArg) => {
    const eventId = info.event.extendedProps.eventId
    const isPrep = info.event.extendedProps.dayType === 'prep'

    const isInquiry = info.event.extendedProps.dayType === 'inquiry'

    // Don't allow dragging prep days or inquiry holds
    if (isPrep || isInquiry) {
      info.revert()
      return
    }

    const newDate = info.event.startStr.split('T')[0]
    const newTime = info.event.startStr.includes('T')
      ? info.event.startStr.split('T')[1]?.slice(0, 5)
      : undefined

    setRescheduleToast('Rescheduling...')

    const result = await rescheduleEvent(eventId, newDate, newTime)

    if (!result.success) {
      info.revert()
      setRescheduleToast(result.error || 'Failed to reschedule')
      setTimeout(() => setRescheduleToast(null), 3000)
      return
    }

    const toastMsg =
      result.clearedPrepBlocks && result.clearedPrepBlocks > 0
        ? `Event rescheduled — ${result.clearedPrepBlocks} prep block${result.clearedPrepBlocks === 1 ? '' : 's'} cleared`
        : 'Event rescheduled'
    setRescheduleToast(toastMsg)
    setTimeout(() => setRescheduleToast(null), 3500)

    // Refresh events
    const api = calendarRef.current?.getApi()
    if (api) {
      const start = api.view.activeStart.toISOString().split('T')[0]
      const end = api.view.activeEnd.toISOString().split('T')[0]
      const fetched = await getCalendarEvents(start, end)
      setEvents(fetched)
      setHolidayEvents(getUSHolidaysInRange(start, end))
    }
  }, [])

  const handleEventResize = useCallback(async (info: EventResizeDoneArg) => {
    // Resize only changes end time visually; we don't persist service duration yet
    // Just revert for now — the event keeps its default 3-hour window
    info.revert()
  }, [])

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in inputs
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const api = calendarRef.current?.getApi()
      if (!api) return

      switch (e.key.toLowerCase()) {
        case 't':
          api.today()
          if (currentView === 'agenda') {
            // Force re-fetch for agenda
          }
          break
        case 'm':
          api.changeView('dayGridMonth')
          setCurrentView('dayGridMonth')
          break
        case 'w':
          api.changeView('timeGridWeek')
          setCurrentView('timeGridWeek')
          break
        case 'd':
          api.changeView('timeGridDay')
          setCurrentView('timeGridDay')
          break
        case 'a':
          setCurrentView('agenda')
          break
        case 'arrowleft':
          if (!e.altKey && !e.ctrlKey && !e.metaKey) {
            api.prev()
          }
          break
        case 'arrowright':
          if (!e.altKey && !e.ctrlKey && !e.metaKey) {
            api.next()
          }
          break
        case 'n':
          if (!e.ctrlKey && !e.metaKey) {
            router.push('/events/new')
          }
          break
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [currentView, router])

  // ============================================
  // NAVIGATION
  // ============================================

  const goToday = () => {
    calendarRef.current?.getApi().today()
    setSelectedDate(new Date().toISOString().split('T')[0])
  }
  const goPrev = () => calendarRef.current?.getApi().prev()
  const goNext = () => calendarRef.current?.getApi().next()
  const changeView = (view: ViewType) => {
    if (view !== 'agenda') {
      calendarRef.current?.getApi().changeView(view)
    }
    setCurrentView(view)
  }

  // Mini calendar date select → jump calendar to that date
  const handleMiniDateSelect = useCallback((date: string) => {
    setSelectedDate(date)
    const api = calendarRef.current?.getApi()
    if (api) {
      api.gotoDate(date)
    }
  }, [])

  // ============================================
  // CUSTOM EVENT RENDERER
  // ============================================

  const renderEventContent = (arg: EventContentArg) => {
    if (arg.event.extendedProps.dayType === 'holiday') {
      return (
        <div className="flex items-center gap-1 px-1.5 py-0.5 min-w-0 overflow-hidden">
          <span className="text-xs font-medium truncate">{arg.event.title}</span>
        </div>
      )
    }
    const props = arg.event.extendedProps
    const isPrep = props.dayType === 'prep'
    const dotColor = PREP_STATUS_DOT[props.prepStatus] || '#94a3b8'

    if (arg.view.type === 'listWeek') {
      return (
        <div className="flex items-center gap-3 py-1">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: dotColor }}
          />
          <div className="min-w-0">
            <span className="font-medium text-stone-100">{arg.event.title}</span>
            <span className="text-stone-500 ml-2 text-sm">{props.clientName}</span>
            {props.guestCount > 0 && (
              <span className="text-stone-400 ml-2 text-sm">{props.guestCount} guests</span>
            )}
          </div>
        </div>
      )
    }

    if (arg.view.type === 'dayGridMonth') {
      return (
        <div className="flex items-center gap-1 px-1 py-0.5 min-w-0 overflow-hidden">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: dotColor }}
          />
          {!isPrep && arg.timeText && (
            <span className="text-[10px] font-medium flex-shrink-0 opacity-75">{arg.timeText}</span>
          )}
          <span className="text-xs font-medium truncate">{arg.event.title}</span>
        </div>
      )
    }

    // Week / Day view
    return (
      <div className="px-1.5 py-1 min-w-0 overflow-hidden h-full">
        <div className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: dotColor }}
          />
          <span className="text-xs font-semibold truncate">{arg.event.title}</span>
        </div>
        <div className="text-[10px] opacity-80 truncate mt-0.5">{props.clientName}</div>
        {arg.timeText && <div className="text-[10px] opacity-70">{arg.timeText}</div>}
      </div>
    )
  }

  // ============================================
  // RENDER
  // ============================================

  const isCalendarView = currentView !== 'agenda'

  return (
    <div className="calendar-container" ref={containerRef}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        {/* Left: Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={goToday}>
            Today
          </Button>
          {isCalendarView && (
            <div className="flex items-center border border-stone-700 rounded-lg overflow-hidden">
              <button
                onClick={goPrev}
                className="px-2.5 py-1.5 hover:bg-stone-700 transition-colors text-stone-400"
                aria-label="Previous"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goNext}
                className="px-2.5 py-1.5 hover:bg-stone-700 transition-colors text-stone-400 border-l border-stone-700"
                aria-label="Next"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
          <h2 className="text-lg font-semibold text-stone-100 ml-2">{title}</h2>
          {isLoading && (
            <div className="w-4 h-4 border-2 border-brand-600 border-t-brand-600 rounded-full animate-spin ml-2" />
          )}
        </div>

        {/* Right: View Switcher + Create */}
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-stone-700 rounded-lg overflow-hidden">
            {(Object.entries(VIEW_LABELS) as [ViewType, string][]).map(([view, label]) => (
              <button
                key={view}
                onClick={() => changeView(view)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors border-r border-stone-700 last:border-r-0 ${
                  currentView === view
                    ? 'bg-brand-9500 text-white'
                    : 'text-stone-400 hover:bg-stone-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => router.push('/events/new')}>
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Event
          </Button>
        </div>
      </div>

      {/* Main content area with mini calendar sidebar */}
      <div className="flex gap-5">
        {/* Mini Calendar Sidebar (hidden on mobile) */}
        <div className="hidden xl:block w-52 flex-shrink-0 space-y-5">
          <div className="bg-surface rounded-xl border border-stone-700 shadow-sm p-3">
            <MiniCalendar
              events={events}
              selectedDate={selectedDate}
              onDateSelect={handleMiniDateSelect}
            />
          </div>

          {/* Keyboard shortcuts help */}
          <div className="bg-surface rounded-xl border border-stone-700 shadow-sm p-3">
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Shortcuts
            </h4>
            <div className="space-y-1 text-xs text-stone-500">
              {[
                ['T', 'Today'],
                ['M', 'Month'],
                ['W', 'Week'],
                ['D', 'Day'],
                ['A', 'Agenda'],
                ['N', 'New event'],
                ['\u2190 \u2192', 'Navigate'],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span>{label}</span>
                  <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-[10px] font-mono font-medium text-stone-400">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar / Agenda */}
        <div className="flex-1 min-w-0">
          {isCalendarView ? (
            <div className="bg-surface rounded-xl border border-stone-700 shadow-sm overflow-hidden">
              {viewSeason && (
                <div className="p-3 border-b bg-stone-800">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold">
                          {SEASON_EMOJI[viewSeason.season_name] || '🌱'} {viewSeason.season_name}{' '}
                          <span className="text-xs text-stone-500">
                            ({formatRange(viewSeason.start_month_day, viewSeason.end_month_day)})
                          </span>
                        </div>
                      </div>
                      {viewSeason.sensory_anchor && (
                        <div className="text-xs text-stone-400 italic mt-1">
                          The Vibe: {viewSeason.sensory_anchor}
                        </div>
                      )}
                      {viewSeason.micro_windows && viewSeason.micro_windows.length > 0 && (
                        <div className="text-xs text-stone-400 mt-1">
                          Peak Ingredients:{' '}
                          {viewSeason.micro_windows
                            .map((m) => m.ingredient)
                            .slice(0, 6)
                            .join(', ')}
                        </div>
                      )}
                      {viewSeason.proven_wins && viewSeason.proven_wins.length > 0 && (
                        <div className="text-xs text-stone-400 mt-1">
                          Go-To Dishes:{' '}
                          {viewSeason.proven_wins
                            .map((p) => p.dish_name)
                            .slice(0, 3)
                            .join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-stone-400">Time Machine</div>
                  </div>
                </div>
              )}
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                initialView="dayGridMonth"
                headerToolbar={false}
                events={[...events, ...holidayEvents]}
                eventClick={handleEventClick}
                datesSet={handleDatesSet}
                dateClick={handleDateClick}
                eventDrop={handleEventDrop}
                eventResize={handleEventResize}
                eventContent={renderEventContent}
                editable={true}
                droppable={true}
                eventStartEditable={true}
                eventDurationEditable={false}
                height="auto"
                dayMaxEvents={3}
                moreLinkClick="popover"
                nowIndicator={true}
                weekNumbers={false}
                fixedWeekCount={false}
                eventDisplay="block"
                dayHeaderFormat={{ weekday: 'short' }}
                slotMinTime="06:00:00"
                slotMaxTime="23:00:00"
                slotDuration="00:30:00"
                slotLabelInterval="01:00:00"
                slotLabelFormat={{
                  hour: 'numeric',
                  minute: '2-digit',
                  meridiem: 'short',
                }}
                allDaySlot={true}
                allDayText="All Day"
                eventClassNames={(arg) => {
                  const status = arg.event.extendedProps.status
                  const dayType = arg.event.extendedProps.dayType
                  return [
                    'cf-event',
                    `cf-event--${status}`,
                    dayType === 'prep' ? 'cf-event--prep' : '',
                    dayType === 'inquiry' ? 'cf-event--inquiry' : '',
                  ].filter(Boolean)
                }}
                eventDidMount={(info) => {
                  const dayType = info.event.extendedProps.dayType
                  if (dayType === 'holiday') {
                    info.el.style.backgroundColor = '#fff1f2'
                    info.el.style.borderColor = '#f43f5e'
                    info.el.style.borderLeftWidth = '3px'
                    info.el.style.borderRadius = '4px'
                    info.el.style.color = '#881337'
                    info.el.style.cursor = 'default'
                    info.el.style.opacity = '0.9'
                    return
                  }
                  const status = info.event.extendedProps.status
                  const isPrep = dayType === 'prep'
                  const isInquiry = dayType === 'inquiry'
                  const colors = isInquiry
                    ? STATUS_COLORS.inquiry
                    : isPrep
                      ? { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' }
                      : STATUS_COLORS[status] || {
                          bg: '#f5f3ef',
                          border: '#d6d3d1',
                          text: '#57534e',
                        }

                  info.el.style.backgroundColor = colors.bg
                  info.el.style.borderColor = colors.border
                  info.el.style.borderLeftWidth = '3px'
                  info.el.style.color = colors.text
                  info.el.style.borderRadius = '6px'
                  info.el.style.cursor = 'pointer'
                  if (isInquiry) {
                    info.el.style.borderStyle = 'dashed'
                    info.el.style.opacity = '0.8'
                  }
                }}
              />
            </div>
          ) : (
            <AgendaView events={events} onEventClick={handleAgendaEventClick} />
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-xs text-stone-500 justify-center">
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded"
            style={{
              backgroundColor: STATUS_COLORS.draft.bg,
              border: `1px solid ${STATUS_COLORS.draft.border}`,
            }}
          />{' '}
          Draft
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded"
            style={{
              backgroundColor: STATUS_COLORS.proposed.bg,
              border: `1px solid ${STATUS_COLORS.proposed.border}`,
            }}
          />{' '}
          Proposed
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded"
            style={{
              backgroundColor: STATUS_COLORS.confirmed.bg,
              border: `1px solid ${STATUS_COLORS.confirmed.border}`,
            }}
          />{' '}
          Confirmed
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded"
            style={{
              backgroundColor: STATUS_COLORS.paid.bg,
              border: `1px solid ${STATUS_COLORS.paid.border}`,
            }}
          />{' '}
          Paid
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded"
            style={{
              backgroundColor: STATUS_COLORS.completed.bg,
              border: `1px solid ${STATUS_COLORS.completed.border}`,
            }}
          />{' '}
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-900 border border-amber-400" /> Prep Day
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded border border-dashed"
            style={{
              backgroundColor: STATUS_COLORS.inquiry.bg,
              borderColor: STATUS_COLORS.inquiry.border,
            }}
          />{' '}
          Tentative Hold
        </span>
        <span className="mx-2 border-l border-stone-700" />
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-9500" /> Ready
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-9500" /> Partial
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-9500" /> Not Started
        </span>
        <span className="mx-2 border-l border-stone-700" />
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded"
            style={{ backgroundColor: '#fff1f2', border: '1px solid #f43f5e' }}
          />{' '}
          Holiday
        </span>
      </div>

      {/* Reschedule Toast */}
      {rescheduleToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-lg shadow-lg animate-in">
          {rescheduleToast}
        </div>
      )}

      {/* Event Detail Popover */}
      {selectedEvent && popoverPosition && (
        <EventDetailPopover
          event={selectedEvent}
          position={popoverPosition}
          onClose={closePopover}
        />
      )}
    </div>
  )
}
