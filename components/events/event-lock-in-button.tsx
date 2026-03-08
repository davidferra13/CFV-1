'use client'

import { useState, useTransition } from 'react'
import { lockInToEvent, unlockEvent } from '@/lib/chef/actions'
import { useRouter } from 'next/navigation'
import { Focus } from '@/components/ui/icons'

export function EventLockInButton({
  eventId,
  eventTitle,
  eventDate,
  isLockedToThis,
  isLockedToOther,
}: {
  eventId: string
  eventTitle: string
  eventDate: string
  isLockedToThis: boolean
  isLockedToOther: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      try {
        if (isLockedToThis) {
          await unlockEvent()
        } else {
          await lockInToEvent(eventId)
        }
        router.refresh()
      } catch (err) {
        setError(isLockedToThis ? 'Failed to exit' : 'Failed to lock in')
      }
    })
  }

  if (isLockedToOther) return null

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        isLockedToThis
          ? 'bg-brand-950 text-brand-400 hover:bg-brand-900'
          : 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-stone-100'
      } disabled:opacity-50`}
      title={
        isLockedToThis
          ? 'Exit lock-in and restore full navigation'
          : 'Lock in to this event and hide unrelated navigation'
      }
    >
      <Focus className="w-4 h-4" />
      {isPending ? '...' : isLockedToThis ? 'Exit Lock-In' : 'Lock In'}
      {error && <span className="text-xs text-red-400 ml-1">{error}</span>}
    </button>
  )
}
