'use client'

// CalendarEntryModal — Modal for creating a new chef calendar entry.
// Supports all 13 entry types with contextual sections:
// - Revenue section (for market, festival, class, etc.)
// - Public signal section (for target_booking only)
// - Blocking toggle (auto-set by type, chef-overridable)

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createCalendarEntry } from '@/lib/calendar/entry-actions'
import type { ChefCalendarEntryType } from '@/lib/calendar/entry-actions'
import {
  CALENDAR_COLORS,
  REVENUE_CAPABLE_TYPES,
  ENTRY_TYPE_BLOCKS_BOOKINGS,
} from '@/lib/calendar/colors'

type Props = {
  defaultDate?: string // YYYY-MM-DD
  defaultStartTime?: string // HH:MM
  onClose: () => void
  onCreated?: () => void
}

type EntryTypeGroup = {
  label: string
  types: Array<{ value: ChefCalendarEntryType; label: string; icon: string }>
}

const ENTRY_TYPE_GROUPS: EntryTypeGroup[] = [
  {
    label: 'Personal',
    types: [
      { value: 'vacation', label: 'Vacation', icon: '🏖' },
      { value: 'time_off', label: 'Time Off', icon: '🛋' },
      { value: 'personal', label: 'Personal Appt', icon: '📋' },
    ],
  },
  {
    label: 'Business',
    types: [
      { value: 'market', label: 'Farmers Market', icon: '🌿' },
      { value: 'festival', label: 'Food Festival', icon: '🎪' },
      { value: 'class', label: 'Class / Teaching', icon: '👨‍🍳' },
      { value: 'photo_shoot', label: 'Photo Shoot', icon: '📸' },
      { value: 'media', label: 'Media / Press', icon: '🎙' },
      { value: 'meeting', label: 'Business Meeting', icon: '🤝' },
      { value: 'admin_block', label: 'Admin Block', icon: '🗂' },
      { value: 'other', label: 'Other', icon: '📌' },
    ],
  },
  {
    label: 'Intentions',
    types: [
      { value: 'target_booking', label: 'Seeking Booking', icon: '🎯' },
      { value: 'soft_preference', label: 'Prefer Day Off', icon: '☁️' },
    ],
  },
]

const ALL_TYPES = ENTRY_TYPE_GROUPS.flatMap((g) => g.types)

function getTypeLabel(value: ChefCalendarEntryType) {
  return ALL_TYPES.find((t) => t.value === value)?.label ?? value
}

export function CalendarEntryModal({ defaultDate, defaultStartTime, onClose, onCreated }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const [entryType, setEntryType] = useState<ChefCalendarEntryType>('time_off')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(defaultDate ?? today)
  const [endDate, setEndDate] = useState(defaultDate ?? today)
  const [allDay, setAllDay] = useState(true)
  const [startTime, setStartTime] = useState(defaultStartTime ?? '09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [blocksBookings, setBlocksBookings] = useState(
    ENTRY_TYPE_BLOCKS_BOOKINGS[entryType] ?? false
  )

  // Revenue
  const [isRevenueGenerating, setIsRevenueGenerating] = useState(false)
  const [revenueType, setRevenueType] = useState<'income' | 'promotional'>('income')
  const [expectedRevenueCents, setExpectedRevenueCents] = useState('')
  const [revenueNotes, setRevenueNotes] = useState('')

  // Public signal
  const [isPublic, setIsPublic] = useState(false)
  const [publicNote, setPublicNote] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isRevenueCApable = REVENUE_CAPABLE_TYPES.has(entryType)
  const isTargetBooking = entryType === 'target_booking'

  function handleTypeChange(newType: ChefCalendarEntryType) {
    setEntryType(newType)
    // Auto-set blocking and title
    setBlocksBookings(ENTRY_TYPE_BLOCKS_BOOKINGS[newType] ?? false)
    setTitle('')
    if (newType !== 'target_booking') {
      setIsPublic(false)
    }
    if (!REVENUE_CAPABLE_TYPES.has(newType)) {
      setIsRevenueGenerating(false)
    }
  }

  // Auto-fill title if empty when type changes
  function titlePlaceholder() {
    const found = ALL_TYPES.find((t) => t.value === entryType)
    return found ? `e.g. ${found.label}...` : 'Add a title...'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (endDate < startDate) {
      setError('End date must be on or after start date')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await createCalendarEntry({
        entry_type: entryType,
        title: title.trim(),
        description: description.trim() || undefined,
        start_date: startDate,
        end_date: endDate,
        all_day: allDay,
        start_time: allDay ? undefined : startTime,
        end_time: allDay ? undefined : endTime,
        blocks_bookings: blocksBookings,
        is_revenue_generating: isRevenueCApable ? isRevenueGenerating : false,
        revenue_type: isRevenueCApable && isRevenueGenerating ? revenueType : undefined,
        expected_revenue_cents:
          isRevenueCApable &&
          isRevenueGenerating &&
          revenueType === 'income' &&
          expectedRevenueCents
            ? Math.round(parseFloat(expectedRevenueCents) * 100)
            : undefined,
        revenue_notes:
          isRevenueCApable && isRevenueGenerating ? revenueNotes || undefined : undefined,
        is_public: isTargetBooking ? isPublic : false,
        public_note: isTargetBooking && isPublic ? publicNote.trim() || undefined : undefined,
      })
      onCreated?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create entry')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-800">
          <h2 className="text-lg font-semibold text-stone-100">New Calendar Entry</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-400 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Entry type selector */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">Type</label>
            <div className="space-y-3">
              {ENTRY_TYPE_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.types.map((t) => {
                      const active = entryType === t.value
                      const color = CALENDAR_COLORS[t.value] ?? '#6B7280'
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => handleTypeChange(t.value)}
                          className={[
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
                            active
                              ? 'border-transparent text-white shadow-sm'
                              : 'border-stone-700 text-stone-400 bg-stone-800 hover:bg-stone-700',
                          ].join(' ')}
                          style={active ? { backgroundColor: color } : {}}
                        >
                          <span>{t.icon}</span>
                          {t.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={titlePlaceholder()}
              className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Any additional notes..."
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (endDate < e.target.value) setEndDate(e.target.value)
                }}
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* All-day toggle */}
          <div className="flex items-center gap-3">
            <input
              id="all-day"
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded border-stone-600 text-brand-600"
            />
            <label htmlFor="all-day" className="text-sm text-stone-300">
              All day
            </label>
          </div>

          {/* Time pickers (when not all-day) */}
          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          )}

          {/* Blocking toggle */}
          <div className="bg-stone-800 rounded-lg p-3 flex items-start gap-3">
            <input
              id="blocks-bookings"
              type="checkbox"
              checked={blocksBookings}
              onChange={(e) => setBlocksBookings(e.target.checked)}
              className="mt-0.5 rounded border-stone-600 text-brand-600"
            />
            <div>
              <label htmlFor="blocks-bookings" className="text-sm font-medium text-stone-300">
                Block bookings for these date(s)
              </label>
              <p className="text-xs text-stone-500 mt-0.5">
                {blocksBookings
                  ? 'These dates will be marked as unavailable.'
                  : 'These dates remain open for client bookings.'}
              </p>
            </div>
          </div>

          {/* Revenue section (market, festival, class, etc.) */}
          {isRevenueCApable && (
            <div className="border border-teal-200 rounded-lg p-4 space-y-3 bg-teal-950">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-teal-800">Revenue</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="is-revenue"
                  type="checkbox"
                  checked={isRevenueGenerating}
                  onChange={(e) => setIsRevenueGenerating(e.target.checked)}
                  className="rounded border-teal-300 text-teal-600"
                />
                <label htmlFor="is-revenue" className="text-sm text-stone-300">
                  This engagement generates revenue
                </label>
              </div>
              {isRevenueGenerating && (
                <>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="revenue-type"
                        value="income"
                        checked={revenueType === 'income'}
                        onChange={() => setRevenueType('income')}
                        className="text-teal-600"
                      />
                      <span className="text-sm text-stone-300">Income (paid)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="revenue-type"
                        value="promotional"
                        checked={revenueType === 'promotional'}
                        onChange={() => setRevenueType('promotional')}
                        className="text-teal-600"
                      />
                      <span className="text-sm text-stone-300">Promotional (no pay)</span>
                    </label>
                  </div>
                  {revenueType === 'income' && (
                    <div>
                      <label className="block text-sm font-medium text-stone-300 mb-1">
                        Expected Revenue
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={expectedRevenueCents}
                          onChange={(e) => setExpectedRevenueCents(e.target.value)}
                          placeholder="0.00"
                          className="w-full border border-stone-600 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Revenue Notes (optional)
                    </label>
                    <input
                      type="text"
                      value={revenueNotes}
                      onChange={(e) => setRevenueNotes(e.target.value)}
                      placeholder="e.g. booth fee $400 + tips"
                      className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Public signal section (target_booking only) */}
          {isTargetBooking && (
            <div className="border border-green-200 rounded-lg p-4 space-y-3 bg-green-950">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-green-800">
                  Public Availability Signal
                </span>
              </div>
              <div className="flex items-start gap-3">
                <input
                  id="is-public"
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="mt-0.5 rounded border-green-300 text-emerald-600"
                />
                <div>
                  <label htmlFor="is-public" className="text-sm text-stone-300 font-medium">
                    Show on my public profile
                  </label>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Clients visiting your profile will see this date as available, with a button to
                    inquire.
                  </p>
                </div>
              </div>
              {isPublic && (
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">
                    Public Message (optional)
                  </label>
                  <input
                    type="text"
                    value={publicNote}
                    onChange={(e) => setPublicNote(e.target.value)}
                    placeholder="e.g. Available for a Valentine's Day dinner"
                    className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    maxLength={500}
                  />
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && <p className="text-sm text-red-600 bg-red-950 rounded-lg px-3 py-2">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading} className="flex-1">
              Add to Calendar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
