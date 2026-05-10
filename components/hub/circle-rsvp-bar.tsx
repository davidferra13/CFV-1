'use client'

import { useState, useTransition } from 'react'
import { updateRsvpStatus } from '@/lib/hub/rsvp-actions'
import type { RsvpStatus, RsvpSummary } from '@/lib/hub/rsvp-actions'

interface CircleRsvpBarProps {
  groupId: string
  summary: RsvpSummary
  currentStatus: RsvpStatus
}

const buttons: { status: RsvpStatus; label: string; activeClass: string; inactiveClass: string }[] =
  [
    {
      status: 'going',
      label: 'Going',
      activeClass: 'bg-emerald-600 text-white border-emerald-600',
      inactiveClass:
        'bg-transparent text-emerald-400 border-emerald-600/40 hover:bg-emerald-600/20',
    },
    {
      status: 'maybe',
      label: 'Maybe',
      activeClass: 'bg-amber-600 text-white border-amber-600',
      inactiveClass: 'bg-transparent text-amber-400 border-amber-600/40 hover:bg-amber-600/20',
    },
    {
      status: 'not_going',
      label: "Can't Make It",
      activeClass: 'bg-stone-600 text-white border-stone-600',
      inactiveClass: 'bg-transparent text-stone-400 border-stone-600/40 hover:bg-stone-600/20',
    },
  ]

export function CircleRsvpBar({ groupId, summary, currentStatus }: CircleRsvpBarProps) {
  const [status, setStatus] = useState<RsvpStatus>(currentStatus)
  const [localSummary, setLocalSummary] = useState<RsvpSummary>(summary)
  const [isPending, startTransition] = useTransition()

  const handleClick = (newStatus: RsvpStatus) => {
    if (newStatus === status || isPending) return

    const prevStatus = status
    const prevSummary = { ...localSummary }

    // Optimistic update
    setStatus(newStatus)
    setLocalSummary((prev) => {
      const updated = { ...prev }
      // Decrement old status count
      if (prevStatus === 'going') updated.going = Math.max(0, updated.going - 1)
      else if (prevStatus === 'maybe') updated.maybe = Math.max(0, updated.maybe - 1)
      else if (prevStatus === 'not_going') updated.notGoing = Math.max(0, updated.notGoing - 1)
      else updated.noResponse = Math.max(0, updated.noResponse - 1)
      // Increment new status count
      if (newStatus === 'going') updated.going += 1
      else if (newStatus === 'maybe') updated.maybe += 1
      else if (newStatus === 'not_going') updated.notGoing += 1
      else updated.noResponse += 1
      return updated
    })

    startTransition(async () => {
      try {
        const result = await updateRsvpStatus({ groupId, status: newStatus })
        if (!result.success) {
          // Rollback
          setStatus(prevStatus)
          setLocalSummary(prevSummary)
        }
      } catch {
        // Rollback
        setStatus(prevStatus)
        setLocalSummary(prevSummary)
      }
    })
  }

  const summaryParts: string[] = []
  if (localSummary.going > 0) summaryParts.push(`${localSummary.going} going`)
  if (localSummary.maybe > 0) summaryParts.push(`${localSummary.maybe} maybe`)
  if (localSummary.notGoing > 0) summaryParts.push(`${localSummary.notGoing} can't make it`)

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-3">
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 px-4 py-3">
        <p className="mb-2 text-xs font-medium text-stone-400">Are you coming?</p>
        <div className="flex gap-2">
          {buttons.map((btn) => (
            <button
              key={btn.status}
              type="button"
              disabled={isPending}
              onClick={() => handleClick(btn.status)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                status === btn.status ? btn.activeClass : btn.inactiveClass
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
        {summaryParts.length > 0 && (
          <p className="mt-2 text-xs text-stone-500">{summaryParts.join(', ')}</p>
        )}
      </div>
    </div>
  )
}
