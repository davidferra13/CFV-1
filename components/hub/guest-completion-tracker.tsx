'use client'

import { useState, useEffect } from 'react'
import {
  getGuestCompletionStatus,
  type CompletionSummary,
  type GuestCompletionRow,
} from '@/lib/hub/completion-tracker-actions'

interface GuestCompletionTrackerProps {
  groupId: string
  groupToken: string
  eventId?: string | null
}

type DotTone = 'green' | 'amber' | 'red'

const EMPTY_SUMMARY: CompletionSummary = {
  total: 0,
  dietaryComplete: 0,
  rsvpConfirmed: 0,
  menuVoted: 0,
  guests: [],
}

const dotClass: Record<DotTone, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-400',
  red: 'bg-red-500',
}

function StatusDot({ tone }: { tone: DotTone }) {
  return <span className={`h-2 w-2 rounded-full ${dotClass[tone]}`} aria-hidden="true" />
}

function dietaryTone(status: GuestCompletionRow['dietary']): DotTone {
  if (status === 'complete') return 'green'
  if (status === 'partial') return 'amber'
  return 'red'
}

function rsvpTone(status: GuestCompletionRow['rsvp']): DotTone {
  if (status === 'confirmed') return 'green'
  if (status === 'maybe') return 'amber'
  return 'red'
}

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatLastActive(value: string | null): string {
  if (!value) return 'Never'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Never'

  const diffMs = Date.now() - date.getTime()
  const minutes = Math.max(0, Math.floor(diffMs / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function GuestName({ guest }: { guest: GuestCompletionRow }) {
  const initial = guest.displayName.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="flex min-w-0 items-center gap-2">
      {guest.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={guest.avatarUrl}
          alt=""
          className="h-7 w-7 flex-none rounded-full border border-stone-700 object-cover"
        />
      ) : (
        <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-stone-700 bg-stone-800 text-xs font-medium text-stone-300">
          {initial}
        </div>
      )}
      <span className="truncate font-medium text-stone-100">{guest.displayName}</span>
    </div>
  )
}

function StatusCell({ tone, label }: { tone: DotTone; label: string }) {
  return (
    <div className="flex items-center gap-2 text-stone-300">
      <StatusDot tone={tone} />
      <span>{label}</span>
    </div>
  )
}

export function GuestCompletionTracker({
  groupId,
  groupToken,
  eventId,
}: GuestCompletionTrackerProps) {
  const [summary, setSummary] = useState<CompletionSummary>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    getGuestCompletionStatus(groupId, groupToken, eventId)
      .then((result) => {
        if (!cancelled) setSummary(result)
      })
      .catch(() => {
        if (!cancelled) setSummary(EMPTY_SUMMARY)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [groupId, groupToken, eventId])

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-4 text-sm text-stone-500">
        Loading guest status...
      </div>
    )
  }

  const completedActions = summary.dietaryComplete + summary.rsvpConfirmed + summary.menuVoted
  const totalActions = summary.total * 3
  const percentage = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-100">Guest Readiness</h3>
          <p className="mt-1 text-xs text-stone-500">
            {completedActions} / {totalActions} actions complete
          </p>
        </div>
        <div className="text-xs font-medium text-stone-300">{percentage}%</div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-stone-800">
        <table className="min-w-full divide-y divide-stone-800 text-left text-xs">
          <thead className="bg-stone-900 text-stone-500">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Name
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Dietary
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                RSVP
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Menu Vote
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Last Active
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800 bg-stone-950/30">
            {summary.guests.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-stone-500" colSpan={5}>
                  No guests found.
                </td>
              </tr>
            ) : (
              summary.guests.map((guest) => (
                <tr key={guest.profileId} className="hover:bg-stone-800/30">
                  <td className="max-w-[220px] px-3 py-2">
                    <GuestName guest={guest} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <StatusCell
                      tone={dietaryTone(guest.dietary)}
                      label={formatLabel(guest.dietary)}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <StatusCell tone={rsvpTone(guest.rsvp)} label={formatLabel(guest.rsvp)} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <StatusCell
                      tone={guest.menuVoted ? 'green' : 'red'}
                      label={guest.menuVoted ? 'Voted' : 'Missing'}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-stone-400">
                    {formatLastActive(guest.lastActive)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
