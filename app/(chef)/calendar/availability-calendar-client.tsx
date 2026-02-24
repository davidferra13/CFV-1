'use client'

// Availability Calendar Client (v2)
// Monthly calendar with unified calendar data, color-coded item types,
// filter panel, multi-day entry banners, and entry creation modal.

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getDaysInMonth, getDay, startOfMonth, format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { blockDate, unblockDate, addToWaitlist } from '@/lib/availability/actions'
import { CalendarFilterPanel } from '@/components/calendar/calendar-filter-panel'
import { CalendarEntryModal } from '@/components/calendar/calendar-entry-modal'
import { CalendarLegend } from '@/components/calendar/calendar-legend'
import type { UnifiedCalendarItem } from '@/lib/calendar/types'
import type { CalendarFilters } from '@/lib/calendar/constants'
import { DEFAULT_CALENDAR_FILTERS } from '@/lib/calendar/constants'

type WaitlistEntry = {
  id: string
  requested_date: string
  occasion: string | null
  guest_count_estimate: number | null
  notes: string | null
  status: string
  clients: { id: string; full_name: string; email: string | null } | null
}

type Props = {
  year: number
  month: number
  chefId: string
  unifiedItems: UnifiedCalendarItem[]
  waitlistEntries: WaitlistEntry[]
}

const MONTH_NAMES = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const FILTER_STORAGE_KEY_PREFIX = 'chef-calendar-filters'

export function AvailabilityCalendarClient({
  year,
  month,
  chefId,
  unifiedItems,
  waitlistEntries,
}: Props) {
  const router = useRouter()
  const [filters, setFilters] = useState<CalendarFilters>(DEFAULT_CALENDAR_FILTERS)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showNewEntryModal, setShowNewEntryModal] = useState(false)
  const [newEntryDefaultDate, setNewEntryDefaultDate] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBlockForm, setShowBlockForm] = useState(false)
  const [blockReason, setBlockReason] = useState('')

  const storageKey = `${FILTER_STORAGE_KEY_PREFIX}-${chefId}`

  // Reset selected date when month/year changes (props come from server)
  useEffect(() => {
    setSelectedDate(null)
    setShowBlockForm(false)
    setError(null)
  }, [year, month])

  const daysInMonth = getDaysInMonth(new Date(year, month - 1))
  const firstDayOfWeek = getDay(startOfMonth(new Date(year, month - 1))) // 0=Sun

  function dateStr(day: number) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  const prevHref = `/calendar?year=${prev.year}&month=${prev.month}`
  const nextHref = `/calendar?year=${next.year}&month=${next.month}`

  const isCurrentMonth = (() => {
    const now = new Date()
    return year === now.getFullYear() && month === now.getMonth() + 1
  })()
  const todayHref = (() => {
    const now = new Date()
    return `/calendar?year=${now.getFullYear()}&month=${now.getMonth() + 1}`
  })()

  // Apply filters to items
  const filteredItems = useCallback((): UnifiedCalendarItem[] => {
    return unifiedItems.filter((item) => {
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
  }, [unifiedItems, filters])

  // Get items for a specific date (including multi-day spans)
  function itemsForDate(ds: string): UnifiedCalendarItem[] {
    return filteredItems().filter((item) => item.startDate <= ds && item.endDate >= ds)
  }

  // Check if a date has any hard-blocking item
  function isDateBlocked(ds: string): boolean {
    return itemsForDate(ds).some((item) => item.isBlocking)
  }

  // Check if an event (auto-block) is on this date
  function hasEvent(ds: string): boolean {
    return itemsForDate(ds).some((item) => item.type === 'event')
  }

  async function handleBlock() {
    if (!selectedDate) return
    setLoading(true)
    try {
      await blockDate({
        block_date: selectedDate,
        block_type: 'full_day',
        reason: blockReason || undefined,
      })
      setShowBlockForm(false)
      setBlockReason('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to block date')
    } finally {
      setLoading(false)
    }
  }

  async function handleUnblock(date: string) {
    setLoading(true)
    try {
      await unblockDate(date)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unblock')
    } finally {
      setLoading(false)
    }
  }

  function openNewEntry(date?: string) {
    setNewEntryDefaultDate(date)
    setShowNewEntryModal(true)
  }

  const waitlistForSelected = selectedDate
    ? waitlistEntries.filter((w) => w.requested_date === selectedDate)
    : []

  const selectedDateItems = selectedDate ? itemsForDate(selectedDate) : []

  return (
    <div className="space-y-5">
      {/* Top bar: filter panel + new entry button */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <CalendarFilterPanel
          storageKey={storageKey}
          onChange={setFilters}
          initialFilters={DEFAULT_CALENDAR_FILTERS}
        />
        <Button
          variant="primary"
          size="sm"
          onClick={() => openNewEntry()}
          className="flex-shrink-0"
        >
          + New Entry
        </Button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Link href={prevHref}>
          <Button variant="ghost">←</Button>
        </Link>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-stone-100">
            {MONTH_NAMES[month]} {year}
          </h2>
          {!isCurrentMonth && (
            <Link href={todayHref}>
              <Button variant="secondary" size="sm">
                Today
              </Button>
            </Link>
          )}
        </div>
        <Link href={nextHref}>
          <Button variant="ghost">→</Button>
        </Link>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-xs text-stone-400 py-1 font-medium">
            {d}
          </div>
        ))}

        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const ds = dateStr(day)
          const dayItems = itemsForDate(ds)
          const isSelected = selectedDate === ds
          const hasEventOnDay = hasEvent(ds)
          const hasBlock = dayItems.some(
            (i) => i.type === 'availability_block' || (i.isBlocking && i.type === 'calendar_entry')
          )
          const today = new Date().toISOString().split('T')[0]
          const isToday = ds === today

          // Background color for cell
          let cellBg = 'bg-surface border-stone-700 hover:bg-stone-800'
          if (hasEventOnDay) cellBg = 'bg-amber-950 border-amber-200'
          else if (hasBlock) cellBg = 'bg-red-950 border-red-200'

          // Dots for items on this day (up to 4)
          const visibleDots = dayItems.slice(0, 4)
          const overflow = dayItems.length > 4 ? dayItems.length - 4 : 0

          return (
            <button
              key={day}
              onClick={() => {
                setSelectedDate(isSelected ? null : ds)
                setShowBlockForm(false)
              }}
              className={[
                'rounded-lg border p-1.5 text-center transition-all min-h-[56px] flex flex-col items-center',
                cellBg,
                isSelected ? 'ring-2 ring-brand-500 ring-offset-1' : '',
                isToday ? 'font-bold' : '',
              ].join(' ')}
            >
              <span
                className={[
                  'text-sm leading-none mb-1',
                  isToday
                    ? 'bg-brand-600 text-white w-6 h-6 rounded-full flex items-center justify-center mx-auto'
                    : 'text-stone-100',
                ].join(' ')}
              >
                {day}
              </span>
              {/* Color dots */}
              {dayItems.length > 0 && (
                <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
                  {visibleDots.map((item) => (
                    <span
                      key={item.id}
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                      title={item.title}
                    />
                  ))}
                  {overflow > 0 && (
                    <span className="text-stone-400 text-[8px] leading-none">+{overflow}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected date detail panel */}
      {selectedDate && (
        <div className="rounded-xl border border-stone-700 bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-100">
              {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
            </h3>
            <Button variant="secondary" size="sm" onClick={() => openNewEntry(selectedDate)}>
              + Add Entry
            </Button>
          </div>

          {/* Items on this date */}
          {selectedDateItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Schedule
              </p>
              {selectedDateItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: item.color + '18',
                    borderLeft: `3px ${item.borderStyle} ${item.color}`,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-100 truncate">{item.title}</p>
                    {item.startTime && (
                      <p className="text-xs text-stone-500">
                        {item.startTime}
                        {item.endTime ? ` – ${item.endTime}` : ''}
                      </p>
                    )}
                    {item.isMultiDay && (
                      <p className="text-xs text-stone-500">
                        {item.startDate} – {item.endDate}
                      </p>
                    )}
                  </div>
                  {item.url && (
                    <a
                      href={item.url}
                      className="text-xs text-brand-600 hover:underline flex-shrink-0"
                    >
                      View →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quick block (for dates with no blocking item) */}
          {!isDateBlocked(selectedDate) && !hasEvent(selectedDate) && (
            <div className="space-y-2 pt-1 border-t border-stone-800">
              <p className="text-sm text-stone-500">This date is available.</p>
              {!showBlockForm ? (
                <Button size="sm" variant="secondary" onClick={() => setShowBlockForm(true)}>
                  Quick Block
                </Button>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="w-full rounded border border-stone-600 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleBlock} loading={loading}>
                      Block
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowBlockForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Availability block unblock option */}
          {selectedDateItems.some((i) => i.type === 'availability_block') && (
            <div className="pt-1 border-t border-stone-800">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleUnblock(selectedDate)}
                loading={loading}
              >
                Remove Manual Block
              </Button>
            </div>
          )}

          {/* Waitlist for this date */}
          {waitlistForSelected.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-stone-800">
              <p className="text-sm font-medium text-stone-300">
                Waitlist ({waitlistForSelected.length})
              </p>
              {waitlistForSelected.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-blue-100 bg-blue-950 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-stone-100">
                    {entry.clients?.full_name ?? 'Unknown client'}
                  </p>
                  <p className="text-xs text-stone-500">
                    {entry.occasion ?? 'Event'} · {entry.guest_count_estimate ?? '?'} guests
                    {entry.notes ? ` · "${entry.notes}"` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Color legend */}
      <CalendarLegend />

      {/* New Entry Modal */}
      {showNewEntryModal && (
        <CalendarEntryModal
          defaultDate={newEntryDefaultDate}
          onClose={() => setShowNewEntryModal(false)}
          onCreated={() => router.refresh()}
        />
      )}
    </div>
  )
}
