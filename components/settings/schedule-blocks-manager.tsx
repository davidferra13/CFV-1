'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  createScheduleBlock,
  deleteScheduleBlock,
  type ScheduleBlock,
  type ScheduleBlockType,
} from '@/lib/scheduling/schedule-block-actions'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'

// â”€â”€ Block Type Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BLOCK_TYPES: { value: ScheduleBlockType; label: string; color: string }[] = [
  { value: 'external_shift', label: 'Restaurant Shift', color: 'bg-blue-500' },
  { value: 'personal', label: 'Personal', color: 'bg-emerald-500' },
  { value: 'prep', label: 'Prep Block', color: 'bg-violet-500' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-500' },
]

function getBlockTypeConfig(type: ScheduleBlockType) {
  return BLOCK_TYPES.find((t) => t.value === type) ?? BLOCK_TYPES[0]
}

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Props {
  initialBlocks: ScheduleBlock[]
}

export function ScheduleBlocksManager({ initialBlocks }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  // â”€â”€ Form state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [title, setTitle] = useState('')
  const [blockType, setBlockType] = useState<ScheduleBlockType>('external_shift')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [notes, setNotes] = useState('')

  function resetForm() {
    setTitle('')
    setBlockType('external_shift')
    setStartAt('')
    setEndAt('')
    setAllDay(false)
    setNotes('')
    setShowForm(false)
  }

  function handleCreate() {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!startAt || !endAt) {
      toast.error('Start and end times are required')
      return
    }

    startTransition(async () => {
      try {
        const result = await createScheduleBlock({
          title: title.trim(),
          block_type: blockType,
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
          all_day: allDay,
          notes: notes.trim() || null,
        })

        if (result.success) {
          toast.success('Schedule block created')
          resetForm()
          router.refresh()
        } else {
          toast.error(result.error ?? 'Failed to create block')
        }
      } catch {
        toast.error('Failed to create schedule block')
      }
    })
  }

  function handleDelete(blockId: string) {
    startTransition(async () => {
      try {
        const result = await deleteScheduleBlock(blockId)
        if (result.success) {
          toast.success('Block deleted')
          router.refresh()
        } else {
          toast.error(result.error ?? 'Failed to delete block')
        }
      } catch {
        toast.error('Failed to delete block')
      }
    })
  }

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="space-y-4">
      {/* Add button */}
      {!showForm && <Button onClick={() => setShowForm(true)}>Add Schedule Block</Button>}

      {/* Create form */}
      {showForm && (
        <Card className="space-y-4 p-4">
          <h3 className="text-sm font-semibold text-stone-200">New Schedule Block</h3>

          <div className="space-y-3">
            {/* Title */}
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Restaurant shift, Personal day"
                className="w-full rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Block type */}
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">Type</label>
              <div className="flex flex-wrap gap-2">
                {BLOCK_TYPES.map((bt) => (
                  <button
                    key={bt.value}
                    onClick={() => setBlockType(bt.value)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors ${
                      blockType === bt.value
                        ? 'bg-stone-600 text-stone-100'
                        : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                    }`}
                  >
                    <span className={`inline-block h-2 w-2 rounded-full ${bt.color}`} />
                    {bt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* All day toggle */}
            <label className="flex items-center gap-2 text-sm text-stone-300">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="rounded border-stone-600"
              />
              All day
            </label>

            {/* Date/time inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-400">
                  {allDay ? 'Start date' : 'Start'}
                </label>
                <input
                  type={allDay ? 'date' : 'datetime-local'}
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-400">
                  {allDay ? 'End date' : 'End'}
                </label>
                <input
                  type={allDay ? 'date' : 'datetime-local'}
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Any notes about this block..."
                className="w-full rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Block'}
            </Button>
            <Button variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Block list */}
      {initialBlocks.length === 0 && !showForm && (
        <Card className="p-8 text-center">
          <p className="text-sm text-stone-400">
            No schedule blocks yet. Add your restaurant shifts and other commitments to see your
            real availability.
          </p>
        </Card>
      )}

      {initialBlocks.length > 0 && (
        <div className="space-y-2">
          {initialBlocks.map((block) => {
            const typeConfig = getBlockTypeConfig(block.block_type as ScheduleBlockType)
            return (
              <Card key={block.id} className="flex items-center gap-3 p-3">
                <span
                  className={`inline-block h-3 w-3 flex-shrink-0 rounded-full ${typeConfig.color}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-200">
                      {block.title || typeConfig.label}
                    </span>
                    <span className="text-xs text-stone-500">{typeConfig.label}</span>
                  </div>
                  <p className="text-xs text-stone-400">
                    {block.all_day
                      ? format(new Date(block.start_at), 'MMM d, yyyy')
                      : `${format(new Date(block.start_at), 'MMM d, h:mm a')} - ${format(new Date(block.end_at), 'h:mm a')}`}
                    {block.recurrence_rule && ' (recurring)'}
                  </p>
                  {block.notes && <p className="mt-0.5 text-xs text-stone-500">{block.notes}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(block.id)}
                  disabled={isPending}
                  className="flex-shrink-0 text-stone-500 hover:text-red-400"
                >
                  Delete
                </Button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
