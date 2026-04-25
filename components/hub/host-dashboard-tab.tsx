'use client'

import { useState, useEffect } from 'react'
import { GuestCompletionTracker } from '@/components/hub/guest-completion-tracker'
import { DietaryDashboard } from '@/components/hub/dietary-dashboard'
import {
  getDinnerCircleMenuPollingState,
  type DinnerCircleMenuPollingState,
} from '@/lib/hub/menu-poll-actions'

interface HostDashboardTabProps {
  groupId: string
  groupToken: string
  linkedEventId: string | null
  memberCount: number
  mediaCount: number
  onSwitchTab: (tab: string) => void
}

type MenuCourse = DinnerCircleMenuPollingState['courses'][number]

function getLockedOption(course: MenuCourse) {
  if (!course.lockedOptionId) {
    return null
  }

  return course.options.find((option) => option.id === course.lockedOptionId) ?? null
}

function getLeadingOption(course: MenuCourse) {
  return (
    course.options.find((option) => option.optionType === 'standard' && option.isLeading) ??
    course.options.find((option) => option.optionType === 'standard') ??
    null
  )
}

export function HostDashboardTab({
  groupId,
  groupToken,
  linkedEventId,
  memberCount,
  mediaCount,
  onSwitchTab,
}: HostDashboardTabProps) {
  const [menuState, setMenuState] = useState<DinnerCircleMenuPollingState | null>(null)
  const [menuLoading, setMenuLoading] = useState(false)
  const [menuError, setMenuError] = useState<string | null>(null)

  useEffect(() => {
    if (!linkedEventId) {
      setMenuState(null)
      setMenuLoading(false)
      setMenuError(null)
      return
    }

    let cancelled = false

    setMenuLoading(true)
    getDinnerCircleMenuPollingState({ groupId, groupToken, eventId: linkedEventId })
      .then((state) => {
        if (!cancelled) {
          setMenuState(state)
          setMenuError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setMenuError(err instanceof Error ? err.message : 'Failed to load menu status')
          setMenuState(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMenuLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [groupId, groupToken, linkedEventId])

  return (
    <div className="p-4 space-y-6">
      <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
        <div className="flex flex-col gap-2 text-sm text-stone-400 sm:flex-row sm:items-center sm:justify-between">
          <span>{memberCount} members in circle</span>
          {linkedEventId ? (
            <span className="text-emerald-400">Event linked</span>
          ) : (
            <span className="text-amber-400">No event linked yet</span>
          )}
        </div>
      </div>

      <GuestCompletionTracker groupId={groupId} groupToken={groupToken} eventId={linkedEventId} />

      <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
        <h3 className="text-sm font-semibold text-stone-100">Menu Status</h3>
        <div className="mt-3 space-y-2">
          {!linkedEventId ? (
            <p className="text-sm text-stone-500">No event linked - menu polling unavailable</p>
          ) : menuLoading ? (
            <p className="text-sm text-stone-500">Loading menu status...</p>
          ) : menuError ? (
            <p className="text-sm text-red-300">{menuError}</p>
          ) : !menuState || menuState.courses.length === 0 ? (
            <p className="text-sm text-stone-500">Menu not published yet</p>
          ) : (
            menuState.courses.map((course) => {
              const lockedOption = getLockedOption(course)
              const leadingOption = getLeadingOption(course)
              const courseName =
                course.courseName ??
                (course.courseNumber ? `Course ${course.courseNumber}` : 'Course')

              return (
                <div
                  key={course.pollId}
                  className="rounded-lg border border-stone-800 bg-stone-950/40 px-3 py-2"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-medium text-stone-100">{courseName}</span>
                    {lockedOption ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-emerald-300">{lockedOption.label}</span>
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                          LOCKED
                        </span>
                      </div>
                    ) : course.totalResponses > 0 && leadingOption ? (
                      <span className="text-sm text-amber-300">
                        Voting - {leadingOption.label} leads
                      </span>
                    ) : (
                      <span className="text-sm text-amber-300">Voting - no votes yet</span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <DietaryDashboard groupId={groupId} groupToken={groupToken} isChefOrAdmin={true} />

      <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-stone-300">{mediaCount} photos shared</span>
          <button
            type="button"
            onClick={() => onSwitchTab('photos')}
            className="rounded-lg bg-stone-800 px-4 py-2 text-sm text-stone-300 hover:bg-stone-700"
          >
            View Photos
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSwitchTab('chat')}
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm text-stone-300 hover:bg-stone-700"
        >
          Chat
        </button>
        <button
          type="button"
          onClick={() => onSwitchTab('events')}
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm text-stone-300 hover:bg-stone-700"
        >
          Events
        </button>
        <button
          type="button"
          onClick={() => onSwitchTab('members')}
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm text-stone-300 hover:bg-stone-700"
        >
          Invite Guests
        </button>
      </div>
    </div>
  )
}
