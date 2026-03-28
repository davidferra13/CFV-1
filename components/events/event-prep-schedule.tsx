'use client'

// Event Prep Schedule
// Shows all prep blocks for a single event and provides the
// auto-suggest → confirm flow for scheduling prep activities.

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  autoSuggestEventBlocks,
  bulkCreatePrepBlocks,
  createPrepBlock,
  completePrepBlock,
  uncompletePrepBlock,
  deletePrepBlock,
  updatePrepBlock,
} from '@/lib/scheduling/prep-block-actions'
import type {
  PrepBlock,
  PrepBlockSuggestion,
  PrepBlockType,
  CreatePrepBlockInput,
  UpdatePrepBlockInput,
} from '@/lib/scheduling/types'
import { PREP_BLOCK_TYPE_LABELS } from '@/lib/scheduling/types'

// ============================================
// HELPERS
// ============================================

const BLOCK_TYPE_COLORS: Record<PrepBlockType, string> = {
  grocery_run: 'bg-green-900 text-green-800',
  specialty_sourcing: 'bg-emerald-900 text-emerald-800',
  prep_session: 'bg-orange-900 text-orange-800',
  packing: 'bg-brand-900 text-brand-800',
  travel_to_event: 'bg-purple-900 text-purple-800',
  mental_prep: 'bg-pink-900 text-pink-800',
  equipment_prep: 'bg-yellow-900 text-yellow-800',
  admin: 'bg-stone-800 text-stone-300',
  cleanup: 'bg-stone-800 text-stone-300',
  custom: 'bg-brand-900 text-brand-800',
}

function formatBlockTime(block: PrepBlock): string {
  if (block.start_time) {
    const [h, m] = block.start_time.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'pm' : 'am'
    const h12 = hour % 12 || 12
    const duration = block.estimated_duration_minutes
      ? ` · ${block.estimated_duration_minutes}min`
      : ''
    return `${h12}:${m}${ampm}${duration}`
  }
  if (block.estimated_duration_minutes) {
    return `~${block.estimated_duration_minutes}min`
  }
  return 'Flexible'
}

function formatBlockDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), 'EEE, MMM d')
  } catch {
    return isoDate
  }
}

// ============================================
// SUGGESTION CONFIRM PANEL
// ============================================

type SuggestionPanelProps = {
  eventId: string
  suggestions: PrepBlockSuggestion[]
  onConfirm: (confirmed: CreatePrepBlockInput[]) => Promise<void>
  onCancel: () => void
  isPending: boolean
}

function SuggestionPanel({
  eventId,
  suggestions,
  onConfirm,
  onCancel,
  isPending,
}: SuggestionPanelProps) {
  // Local editable state for each suggestion
  const [edits, setEdits] = useState<
    {
      date: string
      startTime: string
      included: boolean
    }[]
  >(
    suggestions.map((s) => ({
      date: s.suggested_date,
      startTime: s.suggested_start_time ?? '',
      included: true,
    }))
  )

  function updateEdit(i: number, patch: Partial<(typeof edits)[0]>) {
    setEdits((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)))
  }

  async function handleConfirm() {
    const confirmed: CreatePrepBlockInput[] = suggestions
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
      .filter((_, i) => edits[i].included)

    await onConfirm(confirmed)
  }

  const includedCount = edits.filter((e) => e.included).length

  return (
    <div className="border border-amber-200 bg-amber-950 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-amber-900">
          Review Suggestions ({suggestions.length} prep blocks)
        </p>
        <p className="text-xs text-amber-700">Edit dates/times, then confirm</p>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {suggestions.map((s, i) => (
          <div
            key={i}
            className={`bg-stone-900 rounded border p-3 text-sm ${
              edits[i].included ? 'border-amber-300' : 'border-stone-700 opacity-50'
            }`}
          >
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={edits[i].included}
                onChange={(e) => updateEdit(i, { included: e.target.checked })}
              />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-medium ${BLOCK_TYPE_COLORS[s.block_type]}`}
                  >
                    {PREP_BLOCK_TYPE_LABELS[s.block_type]}
                  </span>
                  <span className="font-medium text-stone-100">{s.title}</span>
                </div>
                <p className="text-xs text-stone-400">{s.reason}</p>
                <div className="flex gap-3">
                  <div>
                    <label className="text-xs text-stone-400 block mb-0.5">Date</label>
                    <input
                      type="date"
                      className="text-xs border border-stone-700 rounded px-1.5 py-0.5"
                      value={edits[i].date}
                      onChange={(e) => updateEdit(i, { date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-400 block mb-0.5">
                      Start time (optional)
                    </label>
                    <input
                      type="time"
                      className="text-xs border border-stone-700 rounded px-1.5 py-0.5"
                      value={edits[i].startTime}
                      onChange={(e) => updateEdit(i, { startTime: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end">
                    <span className="text-xs text-stone-500">
                      ~{s.estimated_duration_minutes}min
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="primary"
          size="sm"
          onClick={handleConfirm}
          loading={isPending}
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
  )
}

// ============================================
// ADD BLOCK FORM
// ============================================

type AddBlockFormProps = {
  eventId: string
  defaultDate?: string
  onSaved: () => void
  onCancel: () => void
}

function AddBlockForm({ eventId, defaultDate, onSaved, onCancel }: AddBlockFormProps) {
  const [blockType, setBlockType] = useState<PrepBlockType>('grocery_run')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState('')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [storeName, setStoreName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!title.trim() || !date) {
      setError('Title and date are required.')
      return
    }
    setSaving(true)
    setError('')
    const result = await createPrepBlock({
      event_id: eventId,
      block_date: date,
      start_time: startTime || null,
      block_type: blockType,
      title: title.trim(),
      notes: notes.trim() || null,
      store_name: storeName.trim() || null,
      estimated_duration_minutes: duration ? parseInt(duration) : null,
    })
    setSaving(false)
    if (result.success) {
      onSaved()
    } else {
      setError(result.error ?? 'Failed to save.')
    }
  }

  return (
    <div className="border border-stone-700 rounded-lg p-4 space-y-3 bg-stone-900">
      <p className="text-sm font-medium text-stone-300">Add Prep Block</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-stone-400 block mb-1">Type</label>
          <select
            className="w-full text-sm border border-stone-700 rounded px-2 py-1.5"
            value={blockType}
            onChange={(e) => {
              const t = e.target.value as PrepBlockType
              setBlockType(t)
              if (!title) setTitle(PREP_BLOCK_TYPE_LABELS[t])
            }}
          >
            {(Object.keys(PREP_BLOCK_TYPE_LABELS) as PrepBlockType[]).map((t) => (
              <option key={t} value={t}>
                {PREP_BLOCK_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-stone-400 block mb-1">Title</label>
          <input
            type="text"
            className="w-full text-sm border border-stone-700 rounded px-2 py-1.5"
            placeholder="Block title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-stone-400 block mb-1">Date</label>
          <input
            type="date"
            className="w-full text-sm border border-stone-700 rounded px-2 py-1.5"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-stone-400 block mb-1">Start time (optional)</label>
          <input
            type="time"
            className="w-full text-sm border border-stone-700 rounded px-2 py-1.5"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-stone-400 block mb-1">Duration (min)</label>
          <input
            type="number"
            min="5"
            step="5"
            className="w-full text-sm border border-stone-700 rounded px-2 py-1.5"
            placeholder="e.g. 60"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
        {(blockType === 'grocery_run' || blockType === 'specialty_sourcing') && (
          <div>
            <label className="text-xs text-stone-400 block mb-1">Store name</label>
            <input
              type="text"
              className="w-full text-sm border border-stone-700 rounded px-2 py-1.5"
              placeholder="e.g. Whole Foods"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
          </div>
        )}
        <div className="col-span-2">
          <label className="text-xs text-stone-400 block mb-1">Notes (optional)</label>
          <input
            type="text"
            className="w-full text-sm border border-stone-700 rounded px-2 py-1.5"
            placeholder="Any notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Block'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ============================================
// PREP BLOCK CARD
// ============================================

type PrepBlockCardProps = {
  block: PrepBlock
  onToggleComplete: (id: string, isCompleted: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function PrepBlockCard({ block, onToggleComplete, onDelete }: PrepBlockCardProps) {
  const [pending, setPending] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  async function handleToggle() {
    setPending(true)
    await onToggleComplete(block.id, block.is_completed)
    setPending(false)
  }

  function handleDelete() {
    setShowDeleteConfirm(true)
  }

  async function handleConfirmedDelete() {
    setShowDeleteConfirm(false)
    setPending(true)
    await onDelete(block.id)
    setPending(false)
  }

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
        block.is_completed
          ? 'bg-green-950 border-green-200 opacity-75'
          : 'bg-stone-900 border-stone-700'
      }`}
    >
      <button
        className="mt-0.5 w-4 h-4 rounded border border-stone-700 flex-shrink-0 flex items-center justify-center"
        onClick={handleToggle}
        disabled={pending}
        title={block.is_completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {block.is_completed && (
          <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-medium ${BLOCK_TYPE_COLORS[block.block_type]}`}
          >
            {PREP_BLOCK_TYPE_LABELS[block.block_type]}
          </span>
          <span
            className={`font-medium ${block.is_completed ? 'line-through text-stone-500' : ''}`}
          >
            {block.title}
          </span>
        </div>
        <div className="text-xs text-stone-400 mt-0.5 flex items-center gap-2 flex-wrap">
          <span>{formatBlockDate(block.block_date)}</span>
          <span>{formatBlockTime(block)}</span>
          {block.store_name && <span>@ {block.store_name}</span>}
        </div>
        {block.notes && <p className="text-xs text-stone-500 mt-0.5 truncate">{block.notes}</p>}
      </div>

      <button
        className="text-xs text-stone-500 hover:text-red-500 flex-shrink-0"
        onClick={handleDelete}
        disabled={pending}
        title="Delete block"
      >
        ✕
      </button>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete this prep block?"
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={pending}
        onConfirm={handleConfirmedDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

type Props = {
  eventId: string
  initialBlocks: PrepBlock[]
}

export function EventPrepSchedule({ eventId, initialBlocks }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [blocks, setBlocks] = useState<PrepBlock[]>(initialBlocks)
  const [showAddForm, setShowAddForm] = useState(false)
  const [suggestions, setSuggestions] = useState<PrepBlockSuggestion[] | null>(null)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestError, setSuggestError] = useState('')
  const [confirmPending, setConfirmPending] = useState(false)

  async function handleAutoSuggest() {
    setSuggestLoading(true)
    setSuggestError('')
    const result = await autoSuggestEventBlocks(eventId)
    setSuggestLoading(false)
    if (result.error) {
      setSuggestError(result.error)
    } else if (result.suggestions.length === 0) {
      setSuggestError('All required prep blocks are already scheduled!')
    } else {
      setSuggestions(result.suggestions)
    }
  }

  async function handleConfirmSuggestions(confirmed: CreatePrepBlockInput[]) {
    setConfirmPending(true)
    try {
      const result = await bulkCreatePrepBlocks(confirmed)
      setConfirmPending(false)
      if (result.success) {
        setSuggestions(null)
        startTransition(() => router.refresh())
      } else {
        setSuggestError(result.error ?? 'Failed to save blocks.')
      }
    } catch (err) {
      setConfirmPending(false)
      toast.error('Failed to save prep blocks')
    }
  }

  async function handleToggleComplete(id: string, isCompleted: boolean) {
    try {
      if (isCompleted) {
        await uncompletePrepBlock(id)
      } else {
        await completePrepBlock(id)
      }
      startTransition(() => router.refresh())
    } catch (err) {
      toast.error('Failed to update prep block')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deletePrepBlock(id)
      startTransition(() => router.refresh())
    } catch (err) {
      toast.error('Failed to delete prep block')
    }
  }

  // Group blocks by date
  const byDate = blocks.reduce<Record<string, PrepBlock[]>>((acc, block) => {
    if (!acc[block.block_date]) acc[block.block_date] = []
    acc[block.block_date].push(block)
    return acc
  }, {})

  const sortedDates = Object.keys(byDate).sort()

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-stone-100">Prep Schedule</h3>
          <p className="text-xs text-stone-400 mt-0.5">
            {blocks.length === 0
              ? 'No prep blocks scheduled yet'
              : `${blocks.filter((b) => b.is_completed).length} of ${blocks.length} complete`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAutoSuggest}
            disabled={suggestLoading || isPending}
          >
            {suggestLoading ? 'Generating…' : 'Auto-schedule'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowAddForm((v) => !v)}>
            + Add Block
          </Button>
        </div>
      </div>

      {/* Suggestion confirm panel */}
      {suggestions && (
        <SuggestionPanel
          eventId={eventId}
          suggestions={suggestions}
          onConfirm={handleConfirmSuggestions}
          onCancel={() => setSuggestions(null)}
          isPending={confirmPending}
        />
      )}

      {/* Error */}
      {suggestError && (
        <p className="text-xs text-red-600 bg-red-950 border border-red-100 rounded px-3 py-2">
          {suggestError}
        </p>
      )}

      {/* Add block form */}
      {showAddForm && (
        <AddBlockForm
          eventId={eventId}
          onSaved={() => {
            setShowAddForm(false)
            startTransition(() => router.refresh())
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Block list grouped by date */}
      {sortedDates.length > 0 ? (
        <div className="space-y-4">
          {sortedDates.map((date) => (
            <div key={date}>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                {formatBlockDate(date)}
              </p>
              <div className="space-y-2">
                {byDate[date].map((block) => (
                  <PrepBlockCard
                    key={block.id}
                    block={block}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showAddForm &&
        !suggestions && (
          <div className="text-center py-6 text-sm text-stone-500">
            <p>No prep blocks scheduled yet.</p>
            <p className="mt-1">
              Click <strong>Auto-schedule</strong> to generate a full prep plan for this event.
            </p>
          </div>
        )
      )}
    </Card>
  )
}
