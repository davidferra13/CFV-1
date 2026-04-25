'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createCircleForEvent } from '@/lib/hub/chef-circle-actions'
import {
  getCircleDietarySummaryByToken,
  type HouseholdDietarySummary,
} from '@/lib/hub/household-actions'
import { CircleInviteCard } from '@/components/hub/circle-invite-card'

interface EventHubLinkPanelProps {
  groupToken: string | null
  eventId: string
  profileToken?: string | null
}

/**
 * Panel on the chef's event detail page linking to the hub group.
 * Falls back to a create action if the event still has no Dinner Circle.
 */
export function EventHubLinkPanel({ groupToken, eventId, profileToken }: EventHubLinkPanelProps) {
  const [token, setToken] = useState(groupToken)
  const [isPending, startTransition] = useTransition()
  const [dietary, setDietary] = useState<HouseholdDietarySummary | null>(null)

  useEffect(() => {
    if (!token) return
    getCircleDietarySummaryByToken(token)
      .then(setDietary)
      .catch(() => {})
  }, [token])

  function handleCreate() {
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
      <div className="relative overflow-hidden rounded-[28px] border border-stone-700 bg-gradient-to-br from-stone-900 via-stone-900 to-stone-800 p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#e88f47]/10 to-transparent" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f3c29a]">
              Dinner Circle
            </span>
            <div>
              <h3 className="text-lg font-semibold text-stone-100">Spin up the circle</h3>
              <p className="max-w-xl text-sm leading-6 text-stone-400">
                Chef work, client chatter, guest details, and invite links should live in one
                thread. Create the circle once and keep the whole dinner coordinated there.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending}
            className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-[#e88f47] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Starting...' : 'Start Dinner Circle'}
          </button>
        </div>
      </div>
    )
  }

  const hasAlerts = dietary && dietary.allAllergies.length > 0
  const hasUnknowns = dietary && dietary.profilesNotAnswered > 0

  return (
    <div className="space-y-3">
      <CircleInviteCard
        groupToken={token}
        profileToken={profileToken}
        inviteRole="chef"
        title="Dinner Circle is live"
        description="Send the client one clean link, text guests without extra setup, and keep every allergy, message, and update tied to the same event thread."
        openHref={`/hub/g/${token}`}
      />

      {dietary && (hasAlerts || hasUnknowns || dietary.allDietary.length > 0) && (
        <div className="rounded-2xl border border-[#e88f47]/20 bg-[#e88f47]/5 p-4 space-y-2">
          {hasAlerts && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-[10px] font-medium uppercase tracking-wide text-red-400">
                Allergies:
              </span>
              {dietary.allAllergies.map((allergy) => (
                <span
                  key={allergy}
                  className="rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-xs text-red-300"
                >
                  {allergy}
                </span>
              ))}
            </div>
          )}

          {dietary.allDietary.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-[10px] font-medium uppercase tracking-wide text-emerald-400">
                Dietary:
              </span>
              {dietary.allDietary.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-emerald-900/30 px-2 py-0.5 text-xs text-emerald-300"
                >
                  {item}
                </span>
              ))}
            </div>
          )}

          {hasUnknowns && (
            <p className="text-[10px] text-amber-400">
              {dietary.profilesNotAnswered} guest
              {dietary.profilesNotAnswered !== 1 ? 's' : ''} have not answered the allergy question.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
