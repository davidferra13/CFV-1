'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { deleteProtectedTime } from '@/lib/scheduling/protected-time-actions'

type ProtectedTimeDetailBlock = {
  id: string
  blockDate: string
  blockType: 'full_day' | 'partial'
  startTime: string | null
  endTime: string | null
  reason: string
  createdAt: string
}

type Props = {
  block: ProtectedTimeDetailBlock
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function formatTime(value: string | null) {
  if (!value) return null
  const [hour, minute] = value.split(':').map(Number)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hour, minute))
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null

  return (
    <div className="border-b border-stone-800 py-3 last:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-1 text-sm text-stone-200">{value}</dd>
    </div>
  )
}

export function ProtectedTimeDetail({ block }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const typeLabel = block.blockType === 'full_day' ? 'Full day' : 'Partial day'
  const startTime = formatTime(block.startTime)
  const endTime = formatTime(block.endTime)
  const timeRange =
    block.blockType === 'full_day'
      ? 'All day'
      : [startTime, endTime].filter(Boolean).join(' to ') || 'Partial day'

  function handleRemove() {
    const confirmed = window.confirm('Remove this protected time block from your calendar?')
    if (!confirmed) return

    setError(null)
    startTransition(async () => {
      try {
        const result = await deleteProtectedTime(block.id)
        if (!result.success) {
          setError(result.error ?? 'Failed to remove protected time block.')
          return
        }
        router.push('/calendar')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove protected time block.')
      }
    })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="warning">Protected time</Badge>
            <Badge variant="default">{typeLabel}</Badge>
          </div>
          <h1 className="text-2xl font-bold text-stone-100">{block.reason}</h1>
          <p className="mt-1 text-sm text-stone-500">{formatDate(block.blockDate)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/calendar" variant="secondary" size="sm">
            Calendar
          </Button>
          <Button variant="danger" size="sm" onClick={handleRemove} loading={isPending}>
            {isPending ? 'Removing...' : 'Remove'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="rounded-lg border border-stone-800 bg-stone-950/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
          Block Details
        </h2>
        <dl className="mt-3">
          <DetailRow label="Date" value={formatDate(block.blockDate)} />
          <DetailRow label="Type" value={typeLabel} />
          <DetailRow label="Time" value={timeRange} />
          <DetailRow label="Reason" value={block.reason} />
          <DetailRow label="Created" value={formatDate(block.createdAt)} />
        </dl>
      </section>
    </div>
  )
}
