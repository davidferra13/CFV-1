'use client'

// Day View Client
// Full time-slotted grid for a single day (6am–midnight in 30-min slots).
// All-day items shown as banners at the top.
// Timed items placed in their exact slots.
// Empty slot click → opens New Entry modal pre-filled with that time.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { CalendarEntryModal } from '@/components/calendar/calendar-entry-modal'
import type { UnifiedCalendarItem } from '@/lib/calendar/types'

type Props = {
  date: string
  items: UnifiedCalendarItem[]
  chefId: string
}

// Time slots: 6:00 → 23:30 in 30-min increments
const SLOT_START_HOUR = 6
const SLOT_END_HOUR = 24 // midnight
const SLOT_COUNT = (SLOT_END_HOUR - SLOT_START_HOUR) * 2 // 30-min slots

function slotToLabel(slotIndex: number): string {
  const totalMinutes = SLOT_START_HOUR * 60 + slotIndex * 30
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`
}

function timeToSlot(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h - SLOT_START_HOUR) * 2 + Math.floor(m / 30)
}

function slotToTime(slotIndex: number): string {
  const totalMinutes = SLOT_START_HOUR * 60 + slotIndex * 30
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const CATEGORY_TEXT_COLORS: Record<string, string> = {
  events: 'text-amber-900',
  draft: 'text-yellow-900',
  prep: 'text-green-900',
  calls: 'text-blue-900',
  personal: 'text-purple-900',
  business: 'text-teal-900',
  intentions: 'text-green-700',
  leads: 'text-orange-900',
  blocked: 'text-red-900',
}

export function DayViewClient({ date, items, chefId }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [modalStartTime, setModalStartTime] = useState<string | undefined>()

  // Compute prev/next day href
  const prevDate = (() => {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  })()
  const nextDate = (() => {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })()
  const prevHref = `/calendar/day?date=${prevDate}`
  const nextHref = `/calendar/day?date=${nextDate}`

  const isToday = date === new Date().toISOString().split('T')[0]

  // Separate all-day items from timed items
  const allDayItems = items.filter((i) => i.allDay || !i.startTime)
  const timedItems = items.filter((i) => !i.allDay && i.startTime)

  // Build slot map: slot index → items occupying that slot
  const slotMap: Record<number, UnifiedCalendarItem[]> = {}
  for (const item of timedItems) {
    const startSlot = Math.max(0, timeToSlot(item.startTime!))
    const endSlot = item.endTime ? Math.min(SLOT_COUNT, timeToSlot(item.endTime)) : startSlot + 2 // default 1 hour
    for (let s = startSlot; s < Math.min(endSlot, SLOT_COUNT); s++) {
      if (!slotMap[s]) slotMap[s] = []
      slotMap[s].push(item)
    }
  }

  // Track rendered items to avoid duplicates across slot rows
  const rendered = new Set<string>()

  function openNewEntry(slotIndex?: number) {
    setModalStartTime(slotIndex !== undefined ? slotToTime(slotIndex) : undefined)
    setShowModal(true)
  }

  return (
    <div className="space-y-4">
      {/* Day navigation */}
      <div className="flex items-center justify-between">
        <Link href={prevHref}>
          <Button variant="ghost" size="sm">
            ← Prev
          </Button>
        </Link>
        <div className="text-center">
          <p className={`text-lg font-semibold ${isToday ? 'text-brand-600' : 'text-stone-100'}`}>
            {format(parseISO(date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
          </p>
          {isToday && <p className="text-xs text-brand-500 font-medium">Today</p>}
        </div>
        <Link href={nextHref}>
          <Button variant="ghost" size="sm">
            Next →
          </Button>
        </Link>
      </div>

      {!isToday && (
        <div className="flex justify-center">
          <Link href="/calendar/day">
            <Button variant="secondary" size="sm">
              Go to Today
            </Button>
          </Link>
        </div>
      )}

      {/* All-day banner area */}
      {allDayItems.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">All Day</p>
          {allDayItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: item.color }}
            >
              <span>{item.title}</span>
              {item.url && (
                <a href={item.url} className="text-white/70 hover:text-white text-xs underline">
                  View →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* + New Entry button */}
      <div className="flex justify-end">
        <Button variant="primary" size="sm" onClick={() => openNewEntry()}>
          + New Entry
        </Button>
      </div>

      {/* Time grid */}
      <div className="border border-stone-700 rounded-xl overflow-hidden">
        {Array.from({ length: SLOT_COUNT }, (_, slotIndex) => {
          const isHour = slotIndex % 2 === 0
          const label = isHour ? slotToLabel(slotIndex) : ''
          const slotItems = (slotMap[slotIndex] ?? []).filter((i) => !rendered.has(i.id))
          // Mark first-occurrence items as rendered
          slotItems.forEach((i) => rendered.add(i.id))

          return (
            <div
              key={slotIndex}
              className={[
                'flex min-h-[40px] group',
                isHour ? 'border-t border-stone-700' : 'border-t border-stone-800',
              ].join(' ')}
            >
              {/* Time label column */}
              <div className="w-16 flex-shrink-0 flex items-start justify-end pr-3 pt-1">
                {label && <span className="text-xs text-stone-400 font-medium">{label}</span>}
              </div>

              {/* Content column */}
              <div
                className="flex-1 px-2 py-0.5 cursor-pointer hover:bg-stone-800 transition-colors min-h-[40px] flex flex-col gap-1"
                onClick={() => (slotItems.length === 0 ? openNewEntry(slotIndex) : undefined)}
                title={slotItems.length === 0 ? `Add entry at ${slotToTime(slotIndex)}` : undefined}
              >
                {slotItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between px-2 py-1 rounded-md text-xs"
                    style={{
                      backgroundColor: item.color + '25',
                      borderLeft: `3px ${item.borderStyle} ${item.color}`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <span
                        className={`font-medium ${CATEGORY_TEXT_COLORS[item.category] ?? 'text-stone-200'}`}
                      >
                        {item.title}
                      </span>
                      {item.startTime && (
                        <span className="text-stone-400 ml-1">
                          {item.startTime}
                          {item.endTime ? ` – ${item.endTime}` : ''}
                        </span>
                      )}
                    </div>
                    {item.url && (
                      <a
                        href={item.url}
                        className="text-brand-600 hover:underline text-xs flex-shrink-0 ml-2"
                      >
                        View →
                      </a>
                    )}
                  </div>
                ))}

                {/* Empty slot hover hint */}
                {slotItems.length === 0 && (
                  <span className="text-xs text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity">
                    + Add at {slotToTime(slotIndex)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-12 text-stone-400">
          <p className="text-sm">Nothing scheduled for this day.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => openNewEntry()}>
            Add an entry
          </Button>
        </div>
      )}

      {/* New Entry Modal */}
      {showModal && (
        <CalendarEntryModal
          defaultDate={date}
          defaultStartTime={modalStartTime}
          onClose={() => setShowModal(false)}
          onCreated={() => router.refresh()}
        />
      )}
    </div>
  )
}
