'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { createCircleForEvent } from '@/lib/hub/chef-circle-actions'
import { getCircleDietarySummaryByToken } from '@/lib/hub/household-actions'
import type { HouseholdDietarySummary } from '@/lib/hub/household-actions'
import { toast } from 'sonner'

interface EventHubLinkPanelProps {
  groupToken: string | null
  eventId: string
}

/**
 * Panel on the chef's event detail page linking to the hub group.
 * Shows "Create Circle" button if no circle exists.
 */
export function EventHubLinkPanel({ groupToken, eventId }: EventHubLinkPanelProps) {
  const [token, setToken] = useState(groupToken)
  const [isPending, startTransition] = useTransition()
  const [dietary, setDietary] = useState<HouseholdDietarySummary | null>(null)

  useEffect(() => {
    if (!token) return
    getCircleDietarySummaryByToken(token)
      .then(setDietary)
      .catch(() => {})
  }, [token])

  const handleCreate = () => {
    startTransition(async () => {
      try {
        const result = await createCircleForEvent(eventId)
        setToken(result.groupToken)
      } catch {
        toast.error('Failed to create dinner circle')
      }
    })
  }

  if (!token) {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">💬</span>
            <div>
              <h3 className="text-sm font-semibold text-stone-300">Dinner Circle</h3>
              <p className="text-xs text-stone-500">
                Create a circle to chat with the client about this event
              </p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={isPending}
            className="rounded-lg bg-[#e88f47] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Creating...' : 'Create Circle'}
          </button>
        </div>
      </div>
    )
  }

  const hasAlerts = dietary && dietary.allAllergies.length > 0
  const hasUnknowns = dietary && dietary.profilesNotAnswered > 0

  return (
    <div className="rounded-xl border border-[#e88f47]/20 bg-[#e88f47]/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">💬</span>
          <div>
            <h3 className="text-sm font-semibold text-stone-200">Dinner Circle</h3>
            <p className="text-xs text-stone-400">Chat with guests about this event</p>
          </div>
        </div>
        <Link
          href={`/hub/g/${token}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-[#e88f47] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
        >
          View Circle
        </Link>
      </div>

      {/* Dietary alerts from circle guests */}
      {dietary && (hasAlerts || hasUnknowns || dietary.allDietary.length > 0) && (
        <div className="border-t border-[#e88f47]/20 pt-3 space-y-2">
          {hasAlerts && (
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-[10px] font-medium uppercase tracking-wide text-red-400 mr-1">
                Allergies:
              </span>
              {dietary.allAllergies.map((a) => (
                <span
                  key={a}
                  className="rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-xs text-red-300"
                >
                  {a}
                </span>
              ))}
            </div>
          )}
          {dietary.allDietary.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-400 mr-1">
                Dietary:
              </span>
              {dietary.allDietary.map((d) => (
                <span
                  key={d}
                  className="rounded-full bg-emerald-900/30 px-2 py-0.5 text-xs text-emerald-300"
                >
                  {d}
                </span>
              ))}
            </div>
          )}
          {hasUnknowns && (
            <p className="text-[10px] text-amber-400">
              {dietary.profilesNotAnswered} guest{dietary.profilesNotAnswered !== 1 ? 's' : ''} have
              not answered the allergy question.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
