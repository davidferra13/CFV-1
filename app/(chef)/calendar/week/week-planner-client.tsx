'use client'

// Week Planner Client
// 7-column grid (Mon–Sun) showing confirmed events as anchors and
// prep blocks as schedulable cards. Gap detection alerts at the top.
// Auto-schedule flow: suggest → chef reviews/edits → confirm → save.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  autoSuggestEventBlocks,
  bulkCreatePrepBlocks,
  createPrepBlock,
  completePrepBlock,
  uncompletePrepBlock,
  deletePrepBlock,
} from '@/lib/scheduling/prep-block-actions'
import type {
  PrepBlock,
  PrepBlockSuggestion,
  PrepBlockType,
  SchedulingGap,
  WeekSchedule,
  CreatePrepBlockInput,
} from '@/lib/scheduling/types'
import { PREP_BLOCK_TYPE_LABELS } from '@/lib/scheduling/types'
import type { ChefCalendarEntry } from '@/lib/calendar/entry-actions'
import { CALENDAR_COLORS } from '@/lib/calendar/colors'
import type { EventWeather } from '@/lib/weather/open-meteo'

const BLOCK_COLORS: Record<PrepBlockType, string> = {
  grocery_run: 'bg-green-900 text-green-800 border-green-200',
  specialty_sourcing: 'bg-emerald-900 text-emerald-800 border-emerald-200',
  prep_session: 'bg-orange-900 text-orange-800 border-orange-200',
  packing: 'bg-brand-900 text-brand-800 border-brand-200',
  travel_to_event: 'bg-purple-900 text-purple-800 border-purple-200',
  mental_prep: 'bg-pink-900 text-pink-800 border-pink-200',
  equipment_prep: 'bg-yellow-900 text-yellow-800 border-yellow-200',
  admin: 'bg-stone-800 text-stone-300 border-stone-700',
  cleanup: 'bg-stone-800 text-stone-300 border-stone-700',
  custom: 'bg-brand-900 text-brand-800 border-brand-200',
}

function fmtTime(block: PrepBlock): string {
  if (block.start_time) {
    const [h, m] = block.start_time.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'pm' : 'am'
    const h12 = hour % 12 || 12
    const dur = block.estimated_duration_minutes ? ` ·${block.estimated_duration_minutes}m` : ''
    return `${h12}:${m}${ampm}${dur}`
  }
  return block.estimated_duration_minutes ? `~${block.estimated_duration_minutes}min` : 'Flexible'
}

// ---- Suggestion modal ----

type SuggestionModalProps = {
  eventId: string
  eventName: string
  suggestions: PrepBlockSuggestion[]
  onConfirm: (confirmed: CreatePrepBlockInput[]) => Promise<void>
  onCancel: () => void
  isPending: boolean
}

function SuggestionModal({
  eventId,
  eventName,
  suggestions,
  onConfirm,
  onCancel,
  isPending,
}: SuggestionModalProps) {
  const [edits, setEdits] = useState(
    suggestions.map((s) => ({
      date: s.suggested_date,
      startTime: s.suggested_start_time ?? '',
      included: true,
    }))
  )
  const includedCount = edits.filter((e) => e.included).length

  function update(i: number, patch: Partial<(typeof edits)[0]>) {
    setEdits((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)))
  }

  async function confirm() {
    const confirmed: CreatePrepBlockInput[] = suggestions
      .filter((_, i) => edits[i].included)
      .map((s, i) => ({
        event_id: eventId,
        block_date: edits[i].date,
        start_time: edits[i].startTime || null,
        block_type: s.block_type,
        title: s.title,
        notes: s.notes,
        store_name: s.store_name,
        store_address: s.store_address,
        estimated_duration_minutes: s.estimated_duration_minutes,
        is_system_generated: true,
      }))
    await onConfirm(confirmed)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <p className="font-semibold">Auto-schedule - {eventName}</p>
            <p className="text-xs text-gray-500">
              Review suggestions, edit dates/times, then confirm.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="text-stone-500 hover:text-stone-400"
            onClick={onCancel}
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className={`border rounded-lg p-3 text-sm ${edits[i].included ? 'border-amber-300 bg-amber-950' : 'border-stone-700 opacity-50'}`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  aria-label={`Include ${s.title}`}
                  className="mt-0.5"
                  checked={edits[i].included}
                  onChange={(e) => update(i, { included: e.target.checked })}
                />
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-medium ${BLOCK_COLORS[s.block_type].split(' ').slice(0, 2).join(' ')}`}
                    >
                      {PREP_BLOCK_TYPE_LABELS[s.block_type]}
                    </span>
                    <span className="font-medium">{s.title}</span>
                    <span className="text-xs text-stone-500">
                      ~{s.estimated_duration_minutes}min
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{s.reason}</p>
                  <div className="flex gap-3 flex-wrap">
                    <div>
                      <label
                        className="text-xs text-stone-500 block mb-0.5"
                        htmlFor={`sug-date-${i}`}
                      >
                        Date
                      </label>
                      <input
                        id={`sug-date-${i}`}
                        type="date"
                        title="Block date"
                        className="text-xs border border-stone-700 rounded px-2 py-1"
                        value={edits[i].date}
                        onChange={(e) => update(i, { date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label
                        className="text-xs text-stone-500 block mb-0.5"
                        htmlFor={`sug-time-${i}`}
                      >
                        Time (opt.)
                      </label>
                      <input
                        id={`sug-time-${i}`}
                        type="time"
                        title="Start time (optional)"
                        className="text-xs border border-stone-700 rounded px-2 py-1"
                        value={edits[i].startTime}
                        onChange={(e) => update(i, { startTime: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={confirm}
            disabled={isPending || includedCount === 0}
          >
            {isPending
              ? 'Saving…'
              : `Confirm ${includedCount} Block${includedCount !== 1 ? 's' : ''}`}
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---- Add block inline form ----

type AddFormProps = {
  defaultDate: string
  eventId?: string
  onSaved: () => void
  onCancel: () => void
}

function AddBlockForm({ defaultDate, eventId, onSaved, onCancel }: AddFormProps) {
  const [type, setType] = useState<PrepBlockType>('custom')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [startTime, setStartTime] = useState('')
  const [duration, setDuration] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!title.trim()) {
      setError('Title required.')
      return
    }
    setSaving(true)
    const res = await createPrepBlock({
      event_id: eventId ?? null,
      block_date: date,
      start_time: startTime || null,
      block_type: type,
      title: title.trim(),
      estimated_duration_minutes: duration ? parseInt(duration) : null,
    })
    setSaving(false)
    if (res.success) onSaved()
    else setError(res.error ?? 'Error.')
  }

  return (
    <div className="bg-stone-900 border border-dashed border-stone-700 rounded-lg p-2 space-y-1.5 text-xs">
      <select
        title="Block type"
        className="w-full border border-stone-700 rounded px-2 py-1 text-xs"
        value={type}
        onChange={(e) => {
          const t = e.target.value as PrepBlockType
          setType(t)
          if (!title) setTitle(PREP_BLOCK_TYPE_LABELS[t])
        }}
      >
        {(Object.keys(PREP_BLOCK_TYPE_LABELS) as PrepBlockType[]).map((t) => (
          <option key={t} value={t}>
            {PREP_BLOCK_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Title *"
        className="w-full border border-stone-700 rounded px-2 py-1 text-xs"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="flex gap-1">
        <input
          type="date"
          title="Block date"
          className="flex-1 border border-stone-700 rounded px-1.5 py-1 text-xs"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          type="time"
          title="Start time (optional)"
          className="flex-1 border border-stone-700 rounded px-1.5 py-1 text-xs"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
      </div>
      <input
        type="number"
        min="5"
        step="5"
        placeholder="Duration (min)"
        className="w-full border border-stone-700 rounded px-2 py-1 text-xs"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
      />
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex gap-1">
        <Button variant="primary" size="sm" onClick={save} disabled={saving}>
          {saving ? '…' : 'Save'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ---- Main component ----

type Props = {
  weekSchedule: WeekSchedule
  prepBlocks: PrepBlock[]
  weekGaps: SchedulingGap[]
  weekOffset: number
  calendarEntries?: ChefCalendarEntry[]
  weatherByDate?: Record<string, EventWeather>
}

export function WeekPlannerClient({
  weekSchedule,
  prepBlocks,
  weekGaps,
  weekOffset,
  calendarEntries = [],
  weatherByDate = {},
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [modal, setModal] = useState<{
    eventId: string
    eventName: string
    suggestions: PrepBlockSuggestion[]
  } | null>(null)
  const [confirmPending, setConfirmPending] = useState(false)
  const [addFormDay, setAddFormDay] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteBlockId, setDeleteBlockId] = useState<string | null>(null)

  function go(offset: number) {
    router.push(`/calendar/week?offset=${offset}`)
    router.refresh()
  }

  async function autoSchedule(eventId: string, eventName: string) {
    try {
      const res = await autoSuggestEventBlocks(eventId)
      if (!res.error && res.suggestions.length > 0)
        setModal({ eventId, eventName, suggestions: res.suggestions })
    } catch (err) {
      toast.error('Failed to generate schedule suggestions')
    }
  }

  async function confirmSuggestions(confirmed: CreatePrepBlockInput[]) {
    setConfirmPending(true)
    try {
      await bulkCreatePrepBlocks(confirmed)
      setConfirmPending(false)
      setModal(null)
      startTransition(() => router.refresh())
    } catch (err) {
      setConfirmPending(false)
      toast.error('Failed to save prep blocks')
    }
  }

  async function toggleComplete(block: PrepBlock) {
    setToggling(block.id)
    try {
      if (block.is_completed) await uncompletePrepBlock(block.id)
      else await completePrepBlock(block.id)
      setToggling(null)
      startTransition(() => router.refresh())
    } catch (err) {
      setToggling(null)
      toast.error('Failed to update prep block')
    }
  }

  function removeBlock(id: string) {
    setDeleteBlockId(id)
  }

  async function handleConfirmDeleteBlock() {
    if (!deleteBlockId) return
    const id = deleteBlockId
    setDeleteBlockId(null)
    setDeleting(id)
    try {
      await deletePrepBlock(id)
      setDeleting(null)
      startTransition(() => router.refresh())
    } catch (err) {
      setDeleting(null)
      toast.error('Failed to delete prep block')
    }
  }

  const blocksByDate = prepBlocks.reduce<Record<string, PrepBlock[]>>((acc, b) => {
    if (!acc[b.block_date]) acc[b.block_date] = []
    acc[b.block_date].push(b)
    return acc
  }, {})

  // Calendar entries: build a map of date → entries overlapping that date
  function calendarEntriesForDate(date: string): ChefCalendarEntry[] {
    return calendarEntries.filter((e) => e.start_date <= date && e.end_date >= date)
  }

  // Find entries that span the full week or multiple days (for banner row)
  const multiDayEntries = calendarEntries.filter((e) => e.end_date > e.start_date)

  const { weekStart, weekEnd, days } = weekSchedule
  const weekLabel = `${format(parseISO(weekStart), 'MMM d')} – ${format(parseISO(weekEnd), 'MMM d, yyyy')}`
  const todayStr = new Date().toISOString().slice(0, 10)

  const criticalGaps = weekGaps.filter((g) => g.severity === 'critical')
  const warningGaps = weekGaps.filter((g) => g.severity !== 'critical')
  const hasEvents = days.some((d) => d.events.length > 0)

  return (
    <>
      {modal && (
        <SuggestionModal
          eventId={modal.eventId}
          eventName={modal.eventName}
          suggestions={modal.suggestions}
          onConfirm={confirmSuggestions}
          onCancel={() => setModal(null)}
          isPending={confirmPending}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-100">Week Planner</h1>
          <p className="text-sm text-gray-500">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/calendar/week?offset=${weekOffset - 1}`}>
            <Button variant="ghost" size="sm">
              ← Prev
            </Button>
          </Link>
          <Link href="/calendar/week?offset=0">
            <Button variant="ghost" size="sm">
              Today
            </Button>
          </Link>
          <Link href={`/calendar/week?offset=${weekOffset + 1}`}>
            <Button variant="ghost" size="sm">
              Next →
            </Button>
          </Link>
          <Link href="/calendar/year">
            <Button variant="secondary" size="sm">
              Year View
            </Button>
          </Link>
          <Link href="/calendar">
            <Button variant="ghost" size="sm">
              Availability
            </Button>
          </Link>
        </div>
      </div>

      {/* Gap alerts */}
      {criticalGaps.map((gap) => (
        <div
          key={gap.event_id}
          className="flex items-center justify-between rounded-lg border border-red-200 bg-red-950 px-4 py-3 text-sm text-red-900"
        >
          <div>
            <span className="font-semibold">Urgent: </span>
            <Link href={`/events/${gap.event_id}`} className="underline">
              {gap.event_occasion || 'Event'} - {gap.client_name}
            </Link>{' '}
            (in {gap.days_until_event}d) missing:{' '}
            {gap.missing_block_types.map((t) => PREP_BLOCK_TYPE_LABELS[t]).join(', ')}
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => autoSchedule(gap.event_id, gap.event_occasion ?? 'Event')}
          >
            Auto-schedule
          </Button>
        </div>
      ))}

      {warningGaps.map((gap) => (
        <div
          key={gap.event_id}
          className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-950 px-4 py-3 text-sm text-amber-900"
        >
          <div>
            <span className="font-semibold">
              {gap.event_occasion || 'Event'} - {gap.client_name}
            </span>{' '}
            (in {gap.days_until_event}d) missing:{' '}
            {gap.missing_block_types.map((t) => PREP_BLOCK_TYPE_LABELS[t]).join(', ')}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => autoSchedule(gap.event_id, gap.event_occasion ?? 'Event')}
          >
            Auto-schedule
          </Button>
        </div>
      ))}

      {weekGaps.length === 0 && hasEvents && (
        <div className="text-sm text-green-700 bg-green-950 border border-green-200 rounded-lg px-4 py-3">
          ✓ All events this week have required prep blocks scheduled.
        </div>
      )}

      {/* Multi-day calendar entry banners (vacation, market, etc.) */}
      {multiDayEntries.length > 0 && (
        <div className="space-y-1">
          {multiDayEntries.map((entry) => {
            const color = CALENDAR_COLORS[entry.entry_type] ?? '#6B7280'
            return (
              <div
                key={entry.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ backgroundColor: color }}
              >
                <span>{entry.title}</span>
                <span className="opacity-70">·</span>
                <span className="opacity-70">
                  {entry.start_date} – {entry.end_date}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* 7-column grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const isToday = day.date === todayStr
          const dayBlocks = (blocksByDate[day.date] ?? []).sort((a, b) => {
            if (!a.start_time) return 1
            if (!b.start_time) return -1
            return a.start_time.localeCompare(b.start_time)
          })
          const dayCalEntries = calendarEntriesForDate(day.date).filter(
            (e) => e.end_date === e.start_date
          )

          return (
            <div key={day.date} className="flex flex-col gap-1.5 min-w-0">
              {/* Day header */}
              <div
                className={`text-center py-1.5 rounded-lg text-xs font-semibold ${isToday ? 'bg-amber-500 text-white' : 'bg-stone-800 text-stone-400'}`}
              >
                <div>{format(parseISO(day.date), 'EEE')}</div>
                <div className={`text-xs ${isToday ? 'text-amber-100' : 'text-stone-500'}`}>
                  {format(parseISO(day.date), 'MMM d')}
                </div>
                {weatherByDate[day.date] && (
                  <div
                    className={`text-xs mt-0.5 ${isToday ? 'text-amber-200' : 'text-gray-500'}`}
                    title={`${weatherByDate[day.date].description} - ${weatherByDate[day.date].tempMinF}°–${weatherByDate[day.date].tempMaxF}°F`}
                  >
                    {weatherByDate[day.date].emoji} {weatherByDate[day.date].tempMinF}°–
                    {weatherByDate[day.date].tempMaxF}°
                  </div>
                )}
              </div>

              {/* Single-day calendar entries (personal, meeting, etc.) */}
              {dayCalEntries.map((entry) => {
                const color = CALENDAR_COLORS[entry.entry_type] ?? '#6B7280'
                return (
                  <div
                    key={entry.id}
                    className="rounded-md px-1.5 py-1 text-xs text-white truncate"
                    style={{ backgroundColor: color }}
                    title={entry.title}
                  >
                    {entry.title}
                  </div>
                )
              })}

              {/* Confirmed events */}
              {day.events.map((ev) => (
                <Link key={ev.id} href={`/events/${ev.id}`}>
                  <div className="bg-amber-950 border border-amber-300 rounded-md px-1.5 py-1 text-xs hover:bg-amber-900 transition-colors cursor-pointer">
                    <p className="font-semibold text-amber-900 truncate">
                      {ev.occasion || 'Event'}
                    </p>
                    <p className="text-amber-700 truncate text-xs">{ev.clientName}</p>
                    <p className="text-amber-600 text-xs">{ev.serveTime}</p>
                  </div>
                </Link>
              ))}

              {/* Prep blocks */}
              {dayBlocks.map((block) => (
                <div
                  key={block.id}
                  className={`rounded-md border px-1.5 py-1 text-xs ${block.is_completed ? 'bg-green-950 border-green-200 opacity-70' : BLOCK_COLORS[block.block_type]}`}
                >
                  <div className="flex items-start justify-between gap-0.5">
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium truncate text-xs ${block.is_completed ? 'line-through text-stone-500' : ''}`}
                      >
                        {block.title}
                      </p>
                      <p className="text-gray-500 text-xs">{fmtTime(block)}</p>
                    </div>
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        type="button"
                        className="text-stone-500 hover:text-emerald-600 text-xs leading-none"
                        onClick={() => toggleComplete(block)}
                        disabled={toggling === block.id}
                        title={block.is_completed ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {block.is_completed ? '↩' : '✓'}
                      </button>
                      <button
                        type="button"
                        title="Delete block"
                        className="text-gray-300 hover:text-red-500 text-xs leading-none"
                        onClick={() => removeBlock(block.id)}
                        disabled={deleting === block.id}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add form or button */}
              {addFormDay === day.date ? (
                <AddBlockForm
                  defaultDate={day.date}
                  eventId={day.events[0]?.id}
                  onSaved={() => {
                    setAddFormDay(null)
                    startTransition(() => router.refresh())
                  }}
                  onCancel={() => setAddFormDay(null)}
                />
              ) : (
                <button
                  type="button"
                  title={`Add prep block for ${format(parseISO(day.date), 'EEE MMM d')}`}
                  className="text-xs text-stone-500 hover:text-stone-400 py-1 border border-dashed border-stone-700 rounded-md hover:border-stone-700 transition-colors"
                  onClick={() => setAddFormDay(day.date)}
                >
                  + add
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-2">
        {[
          { color: 'bg-amber-900 border-amber-300', label: 'Event (anchor)' },
          { color: 'bg-orange-900 border-orange-200', label: 'Prep session' },
          { color: 'bg-green-900 border-green-200', label: 'Grocery / Sourcing' },
          { color: 'bg-brand-900 border-brand-200', label: 'Packing' },
          { color: 'bg-green-950 border-green-200', label: 'Completed' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded border ${color}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      <ConfirmModal
        open={deleteBlockId !== null}
        title="Delete this prep block?"
        description="This prep block will be permanently removed."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting !== null}
        onConfirm={handleConfirmDeleteBlock}
        onCancel={() => setDeleteBlockId(null)}
      />
    </>
  )
}
