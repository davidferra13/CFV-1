'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  updateCalendarEntry,
  type ChefCalendarEntry,
  type ChefCalendarEntryType,
  type RevenueType,
} from '@/lib/calendar/entry-actions'
import {
  CALENDAR_COLORS,
  ENTRY_TYPE_BLOCKS_BOOKINGS,
  REVENUE_CAPABLE_TYPES,
} from '@/lib/calendar/colors'

type Props = {
  entry: ChefCalendarEntry
}

type EntryTypeOption = {
  value: ChefCalendarEntryType
  label: string
  group: string
}

const ENTRY_TYPES: EntryTypeOption[] = [
  { value: 'vacation', label: 'Vacation', group: 'Personal' },
  { value: 'time_off', label: 'Time Off', group: 'Personal' },
  { value: 'personal', label: 'Personal Appointment', group: 'Personal' },
  { value: 'market', label: 'Farmers Market', group: 'Business' },
  { value: 'festival', label: 'Food Festival', group: 'Business' },
  { value: 'class', label: 'Class / Teaching', group: 'Business' },
  { value: 'photo_shoot', label: 'Photo Shoot', group: 'Business' },
  { value: 'media', label: 'Media / Press', group: 'Business' },
  { value: 'meeting', label: 'Business Meeting', group: 'Business' },
  { value: 'admin_block', label: 'Admin Block', group: 'Business' },
  { value: 'other', label: 'Other', group: 'Business' },
  { value: 'target_booking', label: 'Seeking Booking', group: 'Intentions' },
  { value: 'soft_preference', label: 'Soft Preference', group: 'Intentions' },
]

const ENTRY_TYPE_GROUPS = ['Personal', 'Business', 'Intentions']

function centsToDollars(cents: number | null) {
  if (cents === null) return ''
  return (cents / 100).toFixed(2)
}

function dollarsToCents(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const normalized = trimmed.replace(/[$,]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null

  return Math.round(Number(normalized) * 100)
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Failed to update calendar entry'
}

export function CalendarEntryEditForm({ entry }: Props) {
  const router = useRouter()
  const [entryType, setEntryType] = useState<ChefCalendarEntryType>(entry.entry_type)
  const [title, setTitle] = useState(entry.title)
  const [description, setDescription] = useState(entry.description ?? '')
  const [startDate, setStartDate] = useState(entry.start_date.slice(0, 10))
  const [endDate, setEndDate] = useState(entry.end_date.slice(0, 10))
  const [allDay, setAllDay] = useState(entry.all_day)
  const [startTime, setStartTime] = useState(entry.start_time ?? '09:00')
  const [endTime, setEndTime] = useState(entry.end_time ?? '17:00')
  const [blocksBookings, setBlocksBookings] = useState(entry.blocks_bookings)
  const [isRevenueGenerating, setIsRevenueGenerating] = useState(entry.is_revenue_generating)
  const [revenueType, setRevenueType] = useState<RevenueType>(entry.revenue_type ?? 'income')
  const [expectedRevenue, setExpectedRevenue] = useState(
    centsToDollars(entry.expected_revenue_cents)
  )
  const [actualRevenue, setActualRevenue] = useState(centsToDollars(entry.actual_revenue_cents))
  const [revenueNotes, setRevenueNotes] = useState(entry.revenue_notes ?? '')
  const [isPublic, setIsPublic] = useState(entry.is_public)
  const [publicNote, setPublicNote] = useState(entry.public_note ?? '')
  const [colorOverride, setColorOverride] = useState(entry.color_override ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isRevenueCapable = REVENUE_CAPABLE_TYPES.has(entryType)
  const isTargetBooking = entryType === 'target_booking'

  function handleTypeChange(nextType: ChefCalendarEntryType) {
    setEntryType(nextType)
    setBlocksBookings(ENTRY_TYPE_BLOCKS_BOOKINGS[nextType] ?? false)

    if (nextType !== 'target_booking') {
      setIsPublic(false)
      setPublicNote('')
    }

    if (!REVENUE_CAPABLE_TYPES.has(nextType)) {
      setIsRevenueGenerating(false)
      setRevenueType('income')
      setExpectedRevenue('')
      setActualRevenue('')
      setRevenueNotes('')
    }
  }

  function validateForm() {
    if (!title.trim()) return 'Title is required.'
    if (!startDate || !endDate) return 'Start date and end date are required.'
    if (endDate < startDate) return 'End date must be on or after start date.'
    if (!allDay && (!startTime || !endTime)) return 'Start time and end time are required.'
    if (!allDay && startDate === endDate && endTime <= startTime) {
      return 'End time must be after start time.'
    }
    if (entry.color_override && !colorOverride) {
      return 'Color override cannot be cleared from this form. Enter a hex color or keep the current value.'
    }
    if (colorOverride && !/^#[0-9A-Fa-f]{6}$/.test(colorOverride)) {
      return 'Color override must be a hex color like #0D9488.'
    }

    return null
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    const expectedRevenueCents =
      isRevenueCapable && isRevenueGenerating && revenueType === 'income'
        ? dollarsToCents(expectedRevenue)
        : undefined
    const actualRevenueCents =
      isRevenueCapable && isRevenueGenerating ? dollarsToCents(actualRevenue) : undefined

    if (expectedRevenueCents === null) {
      setError('Enter expected revenue as dollars and cents.')
      return
    }
    if (actualRevenueCents === null) {
      setError('Enter actual revenue as dollars and cents.')
      return
    }

    setError(null)
    setIsSaving(true)

    try {
      await updateCalendarEntry(entry.id, {
        entry_type: entryType,
        title: title.trim(),
        description,
        start_date: startDate,
        end_date: endDate,
        all_day: allDay,
        start_time: allDay ? null : startTime,
        end_time: allDay ? null : endTime,
        blocks_bookings: blocksBookings,
        is_revenue_generating: isRevenueCapable ? isRevenueGenerating : false,
        revenue_type: isRevenueCapable && isRevenueGenerating ? revenueType : null,
        expected_revenue_cents:
          isRevenueCapable && isRevenueGenerating && revenueType === 'income'
            ? (expectedRevenueCents ?? null)
            : null,
        actual_revenue_cents:
          isRevenueCapable && isRevenueGenerating ? (actualRevenueCents ?? null) : null,
        revenue_notes: isRevenueCapable && isRevenueGenerating ? revenueNotes : '',
        is_public: isTargetBooking ? isPublic : false,
        public_note: isTargetBooking && isPublic ? publicNote : '',
        color_override: colorOverride || undefined,
      })
      toast.success('Calendar entry updated')
      router.push(`/calendar/entry/${entry.id}`)
      router.refresh()
    } catch (err) {
      const message = getErrorMessage(err)
      setError(message)
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-stone-500">
            Calendar Entry
          </p>
          <h1 className="mt-1 text-2xl font-bold text-stone-100">Edit {entry.title}</h1>
        </div>
        <Button href={`/calendar/entry/${entry.id}`} variant="secondary" size="sm">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Entry
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="rounded-lg border border-stone-800 bg-stone-950/50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">Details</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-300" htmlFor="entry-title">
                Title
              </label>
              <input
                id="entry-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium text-stone-300"
                htmlFor="entry-description"
              >
                Notes
              </label>
              <textarea
                id="entry-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="mt-1 w-full resize-none rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-stone-300">Type</p>
              <div className="mt-2 space-y-3">
                {ENTRY_TYPE_GROUPS.map((group) => (
                  <div key={group}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      {group}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ENTRY_TYPES.filter((option) => option.group === group).map((option) => {
                        const active = entryType === option.value
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleTypeChange(option.value)}
                            className={[
                              'min-h-[36px] rounded-lg border px-3 text-sm font-medium transition-colors',
                              active
                                ? 'border-transparent text-white'
                                : 'border-stone-700 bg-stone-900 text-stone-300 hover:bg-stone-800',
                            ].join(' ')}
                            style={
                              active
                                ? { backgroundColor: CALENDAR_COLORS[option.value] ?? '#6B7280' }
                                : undefined
                            }
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-stone-800 bg-stone-950/50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">Schedule</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-stone-300" htmlFor="start-date">
                Start date
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value)
                  if (endDate < event.target.value) setEndDate(event.target.value)
                }}
                className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300" htmlFor="end-date">
                End date
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          </div>

          <label className="mt-4 flex items-start gap-3 rounded-lg border border-stone-800 bg-stone-900/60 p-3 text-sm text-stone-300">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(event) => setAllDay(event.target.checked)}
              className="mt-1 rounded border-stone-600 text-brand-600"
            />
            <span>All day</span>
          </label>

          {!allDay && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-stone-300" htmlFor="start-time">
                  Start time
                </label>
                <input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300" htmlFor="end-time">
                  End time
                </label>
                <input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
            </div>
          )}

          <label className="mt-4 flex items-start gap-3 rounded-lg border border-stone-800 bg-stone-900/60 p-3 text-sm text-stone-300">
            <input
              type="checkbox"
              checked={blocksBookings}
              onChange={(event) => setBlocksBookings(event.target.checked)}
              className="mt-1 rounded border-stone-600 text-brand-600"
            />
            <span>Block bookings for these dates</span>
          </label>
        </section>

        {isRevenueCapable && (
          <section className="rounded-lg border border-stone-800 bg-stone-950/50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
              Revenue
            </h2>
            <label className="mt-4 flex items-start gap-3 rounded-lg border border-stone-800 bg-stone-900/60 p-3 text-sm text-stone-300">
              <input
                type="checkbox"
                checked={isRevenueGenerating}
                onChange={(event) => setIsRevenueGenerating(event.target.checked)}
                className="mt-1 rounded border-stone-600 text-brand-600"
              />
              <span>This entry generates revenue</span>
            </label>

            {isRevenueGenerating && (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-4 text-sm text-stone-300">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="revenue-type"
                      value="income"
                      checked={revenueType === 'income'}
                      onChange={() => setRevenueType('income')}
                      className="text-brand-600"
                    />
                    Revenue
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="revenue-type"
                      value="promotional"
                      checked={revenueType === 'promotional'}
                      onChange={() => setRevenueType('promotional')}
                      className="text-brand-600"
                    />
                    Promotional
                  </label>
                </div>

                {revenueType === 'income' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        className="block text-sm font-medium text-stone-300"
                        htmlFor="expected-revenue"
                      >
                        Expected revenue
                      </label>
                      <input
                        id="expected-revenue"
                        type="text"
                        inputMode="decimal"
                        value={expectedRevenue}
                        onChange={(event) => setExpectedRevenue(event.target.value)}
                        placeholder="0.00"
                        className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                      />
                    </div>
                    <div>
                      <label
                        className="block text-sm font-medium text-stone-300"
                        htmlFor="actual-revenue"
                      >
                        Actual revenue
                      </label>
                      <input
                        id="actual-revenue"
                        type="text"
                        inputMode="decimal"
                        value={actualRevenue}
                        onChange={(event) => setActualRevenue(event.target.value)}
                        placeholder="0.00"
                        className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label
                    className="block text-sm font-medium text-stone-300"
                    htmlFor="revenue-notes"
                  >
                    Revenue notes
                  </label>
                  <input
                    id="revenue-notes"
                    type="text"
                    value={revenueNotes}
                    onChange={(event) => setRevenueNotes(event.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {isTargetBooking && (
          <section className="rounded-lg border border-stone-800 bg-stone-950/50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
              Public Signal
            </h2>
            <label className="mt-4 flex items-start gap-3 rounded-lg border border-stone-800 bg-stone-900/60 p-3 text-sm text-stone-300">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(event) => setIsPublic(event.target.checked)}
                className="mt-1 rounded border-stone-600 text-brand-600"
              />
              <span>Show on public profile</span>
            </label>
            {isPublic && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-stone-300" htmlFor="public-note">
                  Public note
                </label>
                <input
                  id="public-note"
                  type="text"
                  value={publicNote}
                  onChange={(event) => setPublicNote(event.target.value)}
                  maxLength={500}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
            )}
          </section>
        )}

        <section className="rounded-lg border border-stone-800 bg-stone-950/50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">Display</h2>
          <div className="mt-4">
            <div>
              <label className="block text-sm font-medium text-stone-300" htmlFor="color-override">
                Color override
              </label>
              <input
                id="color-override"
                type="text"
                value={colorOverride}
                onChange={(event) => setColorOverride(event.target.value)}
                placeholder="#0D9488"
                className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          </div>
        </section>

        {error && (
          <p className="rounded-lg border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button href={`/calendar/entry/${entry.id}`} variant="secondary">
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSaving}>
            <Save className="h-4 w-4" aria-hidden="true" />
            Save Entry
          </Button>
        </div>
      </form>
    </div>
  )
}
