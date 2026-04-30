// Unified Calendar View - FullCalendar-based view consuming UnifiedCalendarItem[]
// Consolidates /calendar (7 data types, filtering) and /schedule (FullCalendar UX, keyboard shortcuts).
// This is now the single calendar implementation for ChefFlow.

'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import type { EventClickArg, DatesSetArg, EventContentArg, EventDropArg } from '@fullcalendar/core'
import type { DateClickArg } from '@fullcalendar/interaction'
import { toast } from 'sonner'
import { getUnifiedCalendar } from '@/lib/calendar/actions'
import { rescheduleEvent } from '@/lib/calendar/reschedule-action'
import { getUSHolidaysInRange, type HolidayEvent } from '@/lib/holidays/us-holidays'
import { CalendarFilterPanel } from '@/components/calendar/calendar-filter-panel'
import { CalendarEntryModal } from '@/components/calendar/calendar-entry-modal'
import { CalendarLegend } from '@/components/calendar/calendar-legend'
import { CalendarDayCommandPanel } from '@/components/calendar/calendar-day-command-panel'
import type { UnifiedCalendarItem } from '@/lib/calendar/types'
import type { CalendarFilters } from '@/lib/calendar/constants'
import { DEFAULT_CALENDAR_FILTERS } from '@/lib/calendar/constants'
import { CALENDAR_BORDER_STYLES } from '@/lib/calendar/colors'
import {
  detectCalendarConflicts,
  findCalendarOpenSlots,
  getConflictsForMove,
  scoreCalendarDate,
  type CalendarConflictSeverity,
} from '@/lib/calendar/conflict-engine'
import {
  autoSuggestEventBlocks,
  bulkCreatePrepBlocks,
  moveEventPrepBlocks,
} from '@/lib/scheduling/prep-block-actions'
import type { CreatePrepBlockInput } from '@/lib/scheduling/types'
import { Button } from '@/components/ui/button'

type ViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'agenda'

const VIEW_LABELS: Record<ViewType, string> = {
  dayGridMonth: 'Month',
  timeGridWeek: 'Week',
  timeGridDay: 'Day',
  agenda: 'Agenda',
}

const RESCHEDULABLE_STATUSES = new Set(['draft', 'proposed', 'accepted'])

// Local date as YYYY-MM-DD without UTC offset shift (safe after 7pm ET)
function localDateISO(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

// Types that use dashed/dotted border styling in the calendar
const DASHED_TYPES = new Set(Object.keys(CALENDAR_BORDER_STYLES))

type Props = {
  initialItems: UnifiedCalendarItem[]
  chefId: string
}

// Convert UnifiedCalendarItem to FullCalendar EventInput
function toFullCalendarEvent(
  item: UnifiedCalendarItem,
  conflictSeverity?: CalendarConflictSeverity,
  conflictCount = 0
) {
  const startStr = item.allDay
    ? item.startDate
    : `${item.startDate}T${item.startTime || '00:00'}:00`

  let endStr: string | undefined
  if (item.isMultiDay) {
    // FullCalendar exclusive end for multi-day: add one day
    const endDate = new Date(item.endDate + 'T12:00:00')
    endDate.setDate(endDate.getDate() + 1)
    endStr = endDate.toISOString().split('T')[0]
  } else if (!item.allDay && item.endTime) {
    endStr = `${item.startDate}T${item.endTime}:00`
  } else if (!item.allDay && item.startTime) {
    // Default 1-hour block if no end time
    const [h, m] = item.startTime.split(':').map(Number)
    const endH = Math.min(h + 1, 23)
    endStr = `${item.startDate}T${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
  }

  return {
    id: item.id,
    title: item.title,
    start: startStr,
    end: endStr,
    allDay: item.allDay,
    editable: item.type === 'event' && RESCHEDULABLE_STATUSES.has(item.status ?? ''),
    extendedProps: {
      ...item,
      conflictSeverity,
      conflictCount,
    },
  }
}

export function UnifiedCalendarView({ initialItems, chefId }: Props) {
  const router = useRouter()
  const calendarRef = useRef<InstanceType<typeof FullCalendar>>(null)
  const [items, setItems] = useState<UnifiedCalendarItem[]>(initialItems)
  const [holidayEvents, setHolidayEvents] = useState<HolidayEvent[]>([])
  const [currentView, setCurrentView] = useState<ViewType>('dayGridMonth')
  const [title, setTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState<CalendarFilters>(DEFAULT_CALENDAR_FILTERS)
  const [showNewEntryModal, setShowNewEntryModal] = useState(false)
  const [newEntryDefaultDate, setNewEntryDefaultDate] = useState<string | undefined>()

  // Selected date detail panel
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const storageKey = `chef-calendar-filters-${chefId}`

  // Apply filters to items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (item.category === 'events' && !filters.showEvents) return false
      if (item.category === 'draft' && !filters.showDraftEvents) return false
      if (item.category === 'prep' && !filters.showPrepBlocks) return false
      if (item.category === 'calls' && !filters.showCalls) return false
      if (item.category === 'personal' && !filters.showPersonal) return false
      if (item.category === 'business' && !filters.showBusiness) return false
      if (item.category === 'intentions' && !filters.showIntentions) return false
      if (
        (item.category === 'leads' || item.type === 'waitlist' || item.type === 'inquiry') &&
        !filters.showLeads
      )
        return false
      return true
    })
  }, [items, filters])

  const calendarConflicts = useMemo(() => detectCalendarConflicts(items), [items])

  const conflictMetaByItemId = useMemo(() => {
    const rank: Record<CalendarConflictSeverity, number> = { critical: 0, warning: 1, info: 2 }
    const meta = new Map<string, { severity: CalendarConflictSeverity; count: number }>()
    for (const conflict of calendarConflicts) {
      for (const itemId of conflict.itemIds) {
        const current = meta.get(itemId)
        meta.set(itemId, {
          severity:
            !current || rank[conflict.severity] < rank[current.severity]
              ? conflict.severity
              : current.severity,
          count: (current?.count ?? 0) + 1,
        })
      }
    }
    return meta
  }, [calendarConflicts])

  // Convert to FullCalendar events
  const calendarEvents = useMemo(() => {
    return filteredItems.map((item) => {
      const conflictMeta = conflictMetaByItemId.get(item.id)
      return toFullCalendarEvent(item, conflictMeta?.severity, conflictMeta?.count ?? 0)
    })
  }, [filteredItems, conflictMetaByItemId])

  // Items for a selected date
  const selectedDateItems = useMemo(() => {
    if (!selectedDate) return []
    return filteredItems.filter(
      (item) => item.startDate <= selectedDate && item.endDate >= selectedDate
    )
  }, [filteredItems, selectedDate])

  const selectedDateAllItems = useMemo(() => {
    if (!selectedDate) return []
    return items.filter((item) => item.startDate <= selectedDate && item.endDate >= selectedDate)
  }, [items, selectedDate])

  const selectedDateConflicts = useMemo(() => {
    if (!selectedDate) return []
    return calendarConflicts.filter((conflict) => conflict.date === selectedDate)
  }, [calendarConflicts, selectedDate])

  const selectedDateWaitlistMatches = useMemo(() => {
    if (!selectedDate) return []
    return selectedDateAllItems.filter((item) => item.type === 'waitlist')
  }, [selectedDateAllItems, selectedDate])

  const selectedDateAvailability = useMemo(() => {
    if (!selectedDate) return null
    return scoreCalendarDate(items, selectedDate, calendarConflicts)
  }, [items, calendarConflicts, selectedDate])

  const selectedDateOpenSlots = useMemo(() => {
    if (!selectedDate) return []
    return findCalendarOpenSlots(items, selectedDate, selectedDate, {
      durationMinutes: 180,
      maxSlots: 3,
    })
  }, [items, selectedDate])

  const refreshCurrentRange = useCallback(async () => {
    const api = calendarRef.current?.getApi()
    if (!api) return
    const start = api.view.activeStart.toISOString().split('T')[0]
    const end = api.view.activeEnd.toISOString().split('T')[0]
    const fetched = await getUnifiedCalendar(start, end)
    setItems(fetched)
  }, [])

  // ── Data fetching on date range change ──────────────────────────────

  const handleDatesSet = useCallback(async (arg: DatesSetArg) => {
    setTitle(arg.view.title)
    setIsLoading(true)
    try {
      const start = arg.startStr.split('T')[0]
      const end = arg.endStr.split('T')[0]
      const [fetched, holidays] = await Promise.all([
        getUnifiedCalendar(start, end),
        Promise.resolve(getUSHolidaysInRange(start, end)),
      ])
      setItems(fetched)
      setHolidayEvents(holidays)
    } catch (err) {
      console.error('[UnifiedCalendarView] Failed to fetch:', err)
      toast.error('Failed to load calendar data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ── Click empty date -> show detail or create ───────────────────────

  const handleDateClick = useCallback((info: DateClickArg) => {
    const date = info.dateStr.split('T')[0]
    setSelectedDate((prev) => (prev === date ? null : date))
  }, [])

  // ── Event click -> show detail panel for that date ──────────────────

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      info.jsEvent.preventDefault()
      const props = info.event.extendedProps
      if (props.dayType === 'holiday') return

      // Navigate to the item's detail page if it has a URL
      const url = props.url as string | undefined
      if (url) {
        router.push(url)
        return
      }

      // Otherwise show the date panel
      const date = (props.startDate as string) || info.event.startStr.split('T')[0]
      setSelectedDate(date)
    },
    [router]
  )

  // ── Drag-and-drop reschedule ────────────────────────────────────────

  const handleEventDrop = useCallback(
    async (info: EventDropArg) => {
      const props = info.event.extendedProps
      const itemType = props.type as string

      // Only events can be rescheduled via drag
      if (itemType !== 'event') {
        info.revert()
        return
      }

      const eventId = info.event.id
      const newDate = info.event.startStr.split('T')[0]
      const previousDate = (props.startDate as string) || info.oldEvent.startStr.split('T')[0]
      const moveConflicts = getConflictsForMove(items, eventId, newDate)
      const relatedPrepBlocks = items.filter(
        (item) => item.type === 'prep_block' && item.url === `/events/${eventId}`
      )

      if (moveConflicts.length > 0 || relatedPrepBlocks.length > 0) {
        const conflictLine =
          moveConflicts.length > 0
            ? `${moveConflicts.length} conflict${moveConflicts.length === 1 ? '' : 's'}`
            : null
        const prepLine =
          relatedPrepBlocks.length > 0
            ? `${relatedPrepBlocks.length} prep block${relatedPrepBlocks.length === 1 ? '' : 's'} may need regeneration`
            : null
        const confirmed = window.confirm(
          ['Reschedule this event?', conflictLine, prepLine].filter(Boolean).join('\n')
        )
        if (!confirmed) {
          info.revert()
          return
        }
      }

      const previousItems = items
      // Optimistic update
      setItems((prev) =>
        prev.map((i) => (i.id === eventId ? { ...i, startDate: newDate, endDate: newDate } : i))
      )

      try {
        const result = await rescheduleEvent(eventId, newDate)
        if (!result.success) {
          setItems(previousItems)
          info.revert()
          toast.error(result.error ?? 'Failed to reschedule')
          return
        }
        toast.success(
          `Rescheduled to ${new Date(newDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
        )
        if (relatedPrepBlocks.length > 0) {
          const moveExisting = window.confirm(
            'Move existing prep blocks by the same date offset as this event?'
          )
          if (moveExisting) {
            const moved = await moveEventPrepBlocks(eventId, previousDate, newDate)
            if (!moved.success) {
              toast.error(moved.error ?? 'Failed to move prep blocks')
              return
            }
            await refreshCurrentRange()
            toast.success(`Moved ${moved.moved ?? 0} prep block${moved.moved === 1 ? '' : 's'}`)
            return
          }

          const regenerate = window.confirm('Regenerate suggested prep blocks for the new date?')
          if (regenerate) {
            const suggestions = await autoSuggestEventBlocks(eventId)
            if (suggestions.error) {
              toast.error(suggestions.error)
              return
            }
            if (suggestions.suggestions.length === 0) {
              toast.info('No prep suggestions were available for this event')
              return
            }
            const blocks: CreatePrepBlockInput[] = suggestions.suggestions.map((suggestion) => ({
              event_id: eventId,
              block_date: suggestion.suggested_date,
              start_time: suggestion.suggested_start_time ?? null,
              block_type: suggestion.block_type,
              title: suggestion.title,
              notes: suggestion.notes,
              store_name: suggestion.store_name,
              store_address: suggestion.store_address,
              estimated_duration_minutes: suggestion.estimated_duration_minutes,
              is_system_generated: true,
            }))
            const created = await bulkCreatePrepBlocks(blocks)
            if (!created.success) {
              toast.error(created.error ?? 'Failed to regenerate prep blocks')
              return
            }
            await refreshCurrentRange()
            toast.success(
              `Created ${created.count ?? 0} prep block${created.count === 1 ? '' : 's'}`
            )
          }
        }
      } catch {
        setItems(previousItems)
        info.revert()
        toast.error('Failed to reschedule')
      }
    },
    [items, refreshCurrentRange]
  )

  // ── Keyboard shortcuts ──────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const api = calendarRef.current?.getApi()
      if (!api) return

      switch (e.key.toLowerCase()) {
        case 't':
          api.today()
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
          if (!e.altKey && !e.ctrlKey && !e.metaKey) api.prev()
          break
        case 'arrowright':
          if (!e.altKey && !e.ctrlKey && !e.metaKey) api.next()
          break
        case 'n':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            setNewEntryDefaultDate(undefined)
            setShowNewEntryModal(true)
          }
          break
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // ── Navigation helpers ──────────────────────────────────────────────

  const goToday = () => calendarRef.current?.getApi().today()
  const goPrev = () => calendarRef.current?.getApi().prev()
  const goNext = () => calendarRef.current?.getApi().next()
  const changeView = (view: ViewType) => {
    if (view !== 'agenda') {
      calendarRef.current?.getApi().changeView(view)
    }
    setCurrentView(view)
  }

  // ── Mini calendar date navigation ───────────────────────────────────

  const miniCalendarDates = useMemo(() => {
    const dates = new Set<string>()
    for (const item of filteredItems) {
      let current = item.startDate
      while (current <= item.endDate) {
        dates.add(current)
        const d = new Date(current + 'T12:00:00')
        d.setDate(d.getDate() + 1)
        current = d.toISOString().split('T')[0]
      }
    }
    return dates
  }, [filteredItems])

  const handleMiniDateSelect = useCallback((date: string) => {
    setSelectedDate(date)
    const api = calendarRef.current?.getApi()
    if (api) api.gotoDate(date)
  }, [])

  // ── Custom event renderer ───────────────────────────────────────────

  const renderEventContent = useCallback((arg: EventContentArg) => {
    const props = arg.event.extendedProps
    const conflictCount = Number(props.conflictCount ?? 0)
    if (props.dayType === 'holiday') {
      return (
        <div className="flex items-center gap-1 px-1.5 py-0.5 min-w-0 overflow-hidden">
          <span className="text-xs font-medium truncate">{arg.event.title}</span>
        </div>
      )
    }

    const color = (props.color as string) || '#6B7280'

    if (arg.view.type === 'listWeek') {
      return (
        <div className="flex items-center gap-2.5 py-1">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <div className="min-w-0">
            <span className="font-medium text-stone-100">{arg.event.title}</span>
            {props.status && <span className="text-stone-500 ml-2 text-sm">{props.status}</span>}
            {conflictCount > 0 && (
              <span className="ml-2 text-xs font-semibold text-red-300">Conflict</span>
            )}
          </div>
        </div>
      )
    }

    if (arg.view.type === 'dayGridMonth') {
      return (
        <div className="flex items-center gap-1 px-1 py-0.5 min-w-0 overflow-hidden">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          {!arg.event.allDay && arg.timeText && (
            <span className="text-xxs font-medium flex-shrink-0 opacity-75">{arg.timeText}</span>
          )}
          <span className="text-xs font-medium truncate">{arg.event.title}</span>
          {conflictCount > 0 && (
            <span className="rounded bg-red-500/20 px-1 text-xxs font-semibold text-red-200">
              {conflictCount}
            </span>
          )}
        </div>
      )
    }

    // Week / Day view
    return (
      <div className="px-1.5 py-1 min-w-0 overflow-hidden h-full">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-xs font-semibold truncate">{arg.event.title}</span>
          {conflictCount > 0 && (
            <span className="rounded bg-red-500/20 px-1 text-xxs font-semibold text-red-200">
              {conflictCount}
            </span>
          )}
        </div>
        {arg.timeText && <div className="text-xxs opacity-70 mt-0.5">{arg.timeText}</div>}
      </div>
    )
  }, [])

  // ── Agenda view (list mode) ─────────────────────────────────────────

  const agendaItems = useMemo(() => {
    // Group by date for agenda display
    const byDate: Record<string, UnifiedCalendarItem[]> = {}
    for (const item of filteredItems) {
      let current = item.startDate
      while (current <= item.endDate) {
        if (!byDate[current]) byDate[current] = []
        byDate[current].push(item)
        const d = new Date(current + 'T12:00:00')
        d.setDate(d.getDate() + 1)
        current = d.toISOString().split('T')[0]
      }
    }
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .filter(([date]) => {
        const n = new Date()
        const todayLocal = [
          n.getFullYear(),
          String(n.getMonth() + 1).padStart(2, '0'),
          String(n.getDate()).padStart(2, '0'),
        ].join('-')
        return date >= todayLocal
      })
      .slice(0, 30)
  }, [filteredItems])

  const isCalendarView = currentView !== 'agenda'

  return (
    <div className="space-y-4">
      {/* Top bar: filters + new entry */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <CalendarFilterPanel
          storageKey={storageKey}
          onChange={setFilters}
          initialFilters={DEFAULT_CALENDAR_FILTERS}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setNewEntryDefaultDate(selectedDate ?? undefined)
              setShowNewEntryModal(true)
            }}
          >
            + New Entry
          </Button>
        </div>
      </div>

      {/* Toolbar: navigation + view switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={goToday}>
            Today
          </Button>
          {isCalendarView && (
            <div className="flex items-center border border-stone-700 rounded-lg overflow-hidden">
              <button
                onClick={goPrev}
                className="px-2.5 py-1.5 hover:bg-stone-700 transition-colors text-stone-300"
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
                className="px-2.5 py-1.5 hover:bg-stone-700 transition-colors text-stone-300 border-l border-stone-700"
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
            <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin ml-2" />
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center border border-stone-700 rounded-lg overflow-hidden">
            {(Object.entries(VIEW_LABELS) as [ViewType, string][]).map(([view, label]) => (
              <button
                key={view}
                onClick={() => changeView(view)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors border-r border-stone-700 last:border-r-0 ${
                  currentView === view
                    ? 'bg-brand-500 text-white'
                    : 'text-stone-300 hover:bg-stone-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Quick links to specialized views */}
          <div className="hidden md:flex items-center gap-1">
            <a
              href="/calendar/year"
              className="px-2 py-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors"
            >
              Year
            </a>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex gap-5">
        {/* Mini Calendar Sidebar */}
        <div className="hidden xl:block w-52 flex-shrink-0 space-y-4">
          <div className="bg-stone-900 rounded-xl border border-stone-700 shadow-sm p-3">
            <MiniCalendarUnified
              eventDates={miniCalendarDates}
              selectedDate={selectedDate ?? undefined}
              onDateSelect={handleMiniDateSelect}
            />
          </div>
          <div className="bg-stone-900 rounded-xl border border-stone-700 shadow-sm p-3">
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
                ['N', 'New entry'],
                ['\u2190 \u2192', 'Navigate'],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span>{label}</span>
                  <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-xxs font-mono font-medium text-stone-300">
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
            <div className="bg-stone-900 rounded-xl border border-stone-700 shadow-sm overflow-hidden">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                initialView="dayGridMonth"
                headerToolbar={false}
                events={[...calendarEvents, ...holidayEvents]}
                eventClick={handleEventClick}
                datesSet={handleDatesSet}
                dateClick={handleDateClick}
                eventDrop={handleEventDrop}
                eventContent={renderEventContent}
                editable={true}
                droppable={false}
                eventStartEditable={true}
                eventDurationEditable={false}
                height="auto"
                dayMaxEvents={4}
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
                  const props = arg.event.extendedProps
                  const borderStyle = props.borderStyle as string
                  return [
                    'cf-unified-event',
                    borderStyle === 'dashed' ? 'cf-event--dashed' : '',
                    borderStyle === 'dotted' ? 'cf-event--dotted' : '',
                    props.conflictCount ? 'cf-event--conflict' : '',
                  ].filter(Boolean)
                }}
                eventDidMount={(info) => {
                  const props = info.event.extendedProps
                  if (props.dayType === 'holiday') {
                    info.el.style.backgroundColor = '#fff1f2'
                    info.el.style.borderColor = '#f43f5e'
                    info.el.style.borderLeftWidth = '3px'
                    info.el.style.borderRadius = '4px'
                    info.el.style.color = '#881337'
                    info.el.style.cursor = 'default'
                    info.el.style.opacity = '0.9'
                    return
                  }

                  const color = (props.color as string) || '#6B7280'
                  const borderStyle = (props.borderStyle as string) || 'solid'

                  info.el.style.backgroundColor = color + '18'
                  info.el.style.borderColor = color
                  info.el.style.borderLeftWidth = '3px'
                  info.el.style.borderLeftStyle = borderStyle
                  info.el.style.color = color
                  info.el.style.borderRadius = '4px'
                  info.el.style.cursor = props.url ? 'pointer' : 'default'

                  if (props.conflictSeverity === 'critical') {
                    info.el.style.boxShadow = 'inset 0 0 0 1px rgba(248, 113, 113, 0.7)'
                  } else if (props.conflictSeverity === 'warning') {
                    info.el.style.boxShadow = 'inset 0 0 0 1px rgba(251, 191, 36, 0.65)'
                  }

                  if (borderStyle === 'dashed') {
                    info.el.style.opacity = '0.85'
                  }
                }}
              />
            </div>
          ) : (
            /* Agenda view */
            <div className="bg-stone-900 rounded-xl border border-stone-700 shadow-sm overflow-hidden">
              {agendaItems.length === 0 ? (
                <div className="p-8 text-center text-stone-500">
                  No upcoming items match your filters.
                </div>
              ) : (
                <div className="divide-y divide-stone-800">
                  {agendaItems.map(([date, dayItems]) => (
                    <div key={date} className="p-4">
                      <h3 className="text-sm font-semibold text-stone-300 mb-2">
                        {new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </h3>
                      <div className="space-y-1.5">
                        {dayItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => item.url && router.push(item.url)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-stone-800 transition-colors text-left"
                            style={{
                              borderLeft: `3px ${item.borderStyle} ${item.color}`,
                            }}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-stone-100 truncate block">
                                {item.title}
                              </span>
                              <span className="text-xs text-stone-500">
                                {item.startTime ? item.startTime : 'All day'}
                                {item.endTime ? ` - ${item.endTime}` : ''}
                                {item.status ? ` \u00B7 ${item.status}` : ''}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selected date detail panel */}
      {selectedDate && selectedDateAvailability && (
        <CalendarDayCommandPanel
          selectedDate={selectedDate}
          visibleItems={selectedDateItems}
          waitlistMatches={selectedDateWaitlistMatches}
          conflicts={selectedDateConflicts}
          availability={selectedDateAvailability}
          openSlots={selectedDateOpenSlots}
          onAddEntry={() => {
            setNewEntryDefaultDate(selectedDate)
            setShowNewEntryModal(true)
          }}
          onClose={() => setSelectedDate(null)}
        />
      )}

      {/* Legend */}
      <CalendarLegend />

      {/* New Entry Modal */}
      {showNewEntryModal && (
        <CalendarEntryModal
          defaultDate={newEntryDefaultDate}
          onClose={() => setShowNewEntryModal(false)}
          onCreated={() => {
            setShowNewEntryModal(false)
            refreshCurrentRange().catch(console.error)
          }}
        />
      )}
    </div>
  )
}

// ── Mini Calendar (adapted for unified items) ─────────────────────────

function MiniCalendarUnified({
  eventDates,
  selectedDate,
  onDateSelect,
}: {
  eventDates: Set<string>
  selectedDate?: string
  onDateSelect: (date: string) => void
}) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const lastDay = new Date(viewYear, viewMonth + 1, 0)

    let startOffset = firstDay.getDay() - 1
    if (startOffset < 0) startOffset = 6

    const days: { date: string; dayNum: number; isCurrentMonth: boolean }[] = []

    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth, -i)
      days.push({
        date: localDateISO(d),
        dayNum: d.getDate(),
        isCurrentMonth: false,
      })
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(viewYear, viewMonth, i)
      days.push({
        date: localDateISO(d),
        dayNum: i,
        isCurrentMonth: true,
      })
    }

    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(viewYear, viewMonth + 1, i)
        days.push({
          date: localDateISO(d),
          dayNum: i,
          isCurrentMonth: false,
        })
      }
    }

    return days
  }, [viewYear, viewMonth])

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={goPrevMonth}
          className="p-1 rounded hover:bg-stone-700 text-stone-500 transition-colors"
          aria-label="Previous month"
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
          onClick={() => {
            setViewMonth(today.getMonth())
            setViewYear(today.getFullYear())
            onDateSelect(todayStr)
          }}
          className="text-sm font-semibold text-stone-300 hover:text-brand-600 transition-colors"
        >
          {monthLabel}
        </button>
        <button
          onClick={goNextMonth}
          className="p-1 rounded hover:bg-stone-700 text-stone-500 transition-colors"
          aria-label="Next month"
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

      <div className="grid grid-cols-7 mb-1">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <div key={d} className="text-center text-xxs font-semibold text-stone-300 uppercase py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          const isToday = day.date === todayStr
          const isSelected = day.date === selectedDate
          const hasItem = eventDates.has(day.date)

          return (
            <button
              key={i}
              onClick={() => onDateSelect(day.date)}
              className={`
                relative w-full aspect-square flex items-center justify-center text-xs rounded-full
                transition-all
                ${!day.isCurrentMonth ? 'text-stone-300 opacity-40' : 'text-stone-300'}
                ${isToday && !isSelected ? 'text-brand-600 font-bold' : ''}
                ${isSelected ? 'bg-brand-500 text-white font-bold' : 'hover:bg-stone-700'}
              `}
            >
              {day.dayNum}
              {hasItem && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-400" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
