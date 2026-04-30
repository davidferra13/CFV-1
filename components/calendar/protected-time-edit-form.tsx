'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { updateProtectedTime } from '@/lib/scheduling/protected-time-actions'

type ProtectedTimeEditBlock = {
  id: string
  blockDate: string
  blockType: 'full_day' | 'partial'
  startTime: string | null
  endTime: string | null
  reason: string
}

type Props = {
  block: ProtectedTimeEditBlock
}

function normalizeDate(value: string) {
  return value.slice(0, 10)
}

function normalizeTime(value: string | null) {
  return value ? value.slice(0, 5) : ''
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function ProtectedTimeEditForm({ block }: Props) {
  const router = useRouter()
  const [blockDate, setBlockDate] = useState(normalizeDate(block.blockDate))
  const [blockType, setBlockType] = useState<'full_day' | 'partial'>(block.blockType)
  const [startTime, setStartTime] = useState(normalizeTime(block.startTime))
  const [endTime, setEndTime] = useState(normalizeTime(block.endTime))
  const [reason, setReason] = useState(block.reason)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const detailHref = `/calendar/protected/${block.id}`

  function validate() {
    const trimmedReason = reason.trim()

    if (!trimmedReason) {
      return 'Please enter a reason.'
    }

    if (!isDateOnly(blockDate)) {
      return 'Please select a valid date.'
    }

    if (blockType === 'partial') {
      if (!startTime || !endTime) {
        return 'Please enter a start and end time.'
      }

      if (startTime >= endTime) {
        return 'End time must be after start time.'
      }
    }

    return null
  }

  function handleSubmit() {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const updatedBlock = await updateProtectedTime(block.id, {
          block_date: blockDate,
          block_type: blockType,
          start_time: blockType === 'partial' ? startTime : null,
          end_time: blockType === 'partial' ? endTime : null,
          reason: reason.trim(),
          is_recurring: false,
        })

        router.push(`/calendar/protected/${updatedBlock.id}`)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update protected time block.')
      }
    })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="warning">Protected time</Badge>
            <Badge variant="default">{blockType === 'full_day' ? 'Full day' : 'Partial day'}</Badge>
          </div>
          <h1 className="text-2xl font-bold text-stone-100">Edit Protected Time</h1>
          <p className="mt-1 text-sm text-stone-500">Update this calendar block.</p>
        </div>
        <Button href={detailHref} variant="secondary" size="sm">
          Back
        </Button>
      </div>

      <section className="rounded-lg border border-stone-800 bg-stone-950/50 p-5">
        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
              Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
              placeholder="Family time, appointment, recovery day"
              disabled={isPending}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
              Date
            </label>
            <input
              type="date"
              value={blockDate}
              onChange={(event) => setBlockDate(event.target.value)}
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
              disabled={isPending}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-stone-500">
              Type
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-800 bg-stone-900/60 px-3 py-2 text-sm text-stone-200">
                <input
                  type="radio"
                  name="blockType"
                  value="full_day"
                  checked={blockType === 'full_day'}
                  onChange={() => setBlockType('full_day')}
                  disabled={isPending}
                />
                Full day
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-800 bg-stone-900/60 px-3 py-2 text-sm text-stone-200">
                <input
                  type="radio"
                  name="blockType"
                  value="partial"
                  checked={blockType === 'partial'}
                  onChange={() => setBlockType('partial')}
                  disabled={isPending}
                />
                Partial day
              </label>
            </div>
          </div>

          {blockType === 'partial' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
                  Start time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                  disabled={isPending}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
                  End time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                  disabled={isPending}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button href={detailHref} variant="ghost" size="sm">
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmit} loading={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
