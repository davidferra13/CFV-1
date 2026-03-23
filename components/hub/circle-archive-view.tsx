'use client'

import { useState, useEffect } from 'react'
import type { HubMessage, HubNotificationType } from '@/lib/hub/types'

// ---------------------------------------------------------------------------
// Circle Archive View
// After event completion, shows a timeline of lifecycle milestones at the top
// of the circle feed. The circle remains live for follow-up messages.
// ---------------------------------------------------------------------------

interface ArchiveViewProps {
  groupId: string
  eventId: string
  eventStatus: string
  eventDate?: string | null
  occasion?: string | null
  location?: string | null
  guestCount?: number | null
  chefName?: string | null
  profileToken?: string | null
}

// Milestone order for timeline display
const MILESTONE_ORDER: HubNotificationType[] = [
  'menu_shared',
  'quote_sent',
  'quote_accepted',
  'payment_received',
  'event_confirmed',
  'event_completed',
  'photos_ready',
]

const MILESTONE_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  menu_shared: { icon: '🍽️', label: 'Menu Shared', color: 'text-orange-300' },
  quote_sent: { icon: '💰', label: 'Quote Sent', color: 'text-amber-300' },
  quote_accepted: { icon: '🎉', label: 'Quote Accepted', color: 'text-green-300' },
  payment_received: { icon: '✅', label: 'Payment', color: 'text-green-300' },
  event_confirmed: { icon: '📅', label: 'Confirmed', color: 'text-brand-300' },
  event_completed: { icon: '🏁', label: 'Complete', color: 'text-purple-300' },
  photos_ready: { icon: '📸', label: 'Photos', color: 'text-pink-300' },
}

export function CircleArchiveView({
  groupId,
  eventId,
  eventStatus,
  eventDate,
  occasion,
  location,
  guestCount,
  chefName,
  profileToken,
}: ArchiveViewProps) {
  const [milestones, setMilestones] = useState<
    { type: HubNotificationType; date: string; body: string | null }[]
  >([])
  const [expanded, setExpanded] = useState(false)

  // Only show archive view for completed events
  const showArchive = eventStatus === 'completed'

  useEffect(() => {
    if (!showArchive) return

    let cancelled = false

    async function loadMilestones() {
      try {
        const { getCircleMilestones } = await import('@/lib/hub/message-actions')
        const data = await getCircleMilestones(groupId)

        if (cancelled) return

        const parsed = data.map((m) => ({
          type: m.notification_type as HubNotificationType,
          date: m.created_at,
          body: m.body,
        }))

        // Sort by milestone order
        parsed.sort((a, b) => {
          const aIdx = MILESTONE_ORDER.indexOf(a.type)
          const bIdx = MILESTONE_ORDER.indexOf(b.type)
          return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx)
        })

        setMilestones(parsed)
      } catch {
        // Ignore
      }
    }

    loadMilestones()
    return () => {
      cancelled = true
    }
  }, [groupId, showArchive])

  if (!showArchive) return null

  return (
    <div className="border-b border-stone-800">
      {/* Event summary card */}
      <div className="bg-gradient-to-br from-stone-900 to-stone-800 p-4">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-lg">🏁</span>
          <span className="text-sm font-semibold text-stone-200">Event Complete</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-stone-400">
          {occasion && (
            <div>
              <span className="text-stone-500">Occasion</span>
              <div className="text-stone-300">{occasion}</div>
            </div>
          )}
          {eventDate && (
            <div>
              <span className="text-stone-500">Date</span>
              <div className="text-stone-300">
                {new Date(eventDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
          )}
          {guestCount && (
            <div>
              <span className="text-stone-500">Guests</span>
              <div className="text-stone-300">{guestCount}</div>
            </div>
          )}
          {chefName && (
            <div>
              <span className="text-stone-500">Chef</span>
              <div className="text-stone-300">{chefName}</div>
            </div>
          )}
          {location && (
            <div className="col-span-2">
              <span className="text-stone-500">Location</span>
              <div className="text-stone-300">{location}</div>
            </div>
          )}
        </div>

        {/* Timeline toggle */}
        {milestones.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300"
          >
            <svg
              className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {expanded ? 'Hide' : 'Show'} timeline ({milestones.length} milestones)
          </button>
        )}
      </div>

      {/* Timeline milestones */}
      {expanded && milestones.length > 0 && (
        <div className="bg-stone-900/50 px-4 py-3">
          <div className="relative border-l-2 border-stone-700 pl-4">
            {milestones.map((milestone, i) => {
              const config = MILESTONE_LABELS[milestone.type]
              if (!config) return null

              return (
                <div key={i} className="relative mb-3 last:mb-0">
                  {/* Dot on the timeline */}
                  <div className="absolute -left-[21px] top-0.5 h-3 w-3 rounded-full border-2 border-stone-700 bg-stone-900" />

                  <div className="flex items-center gap-2">
                    <span className="text-sm">{config.icon}</span>
                    <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                    <span className="text-xxs text-stone-600">
                      {new Date(milestone.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
