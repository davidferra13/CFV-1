'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import type { ChefActivityEntry } from '@/lib/activity/chef-types'
import { DOMAIN_CONFIG } from '@/lib/activity/chef-types'
import type { ActivityEvent } from '@/lib/activity/types'

const CLIENT_EVENT_LABELS: Record<string, string> = {
  portal_login: 'Logged into the portal',
  event_viewed: 'Viewed an event',
  quote_viewed: 'Viewed a quote',
  invoice_viewed: 'Viewed an invoice',
  proposal_viewed: 'Viewed a proposal',
  chat_message_sent: 'Sent a chat message',
  rsvp_submitted: 'Submitted an RSVP',
  form_submitted: 'Submitted a form',
  page_viewed: 'Visited a page',
  payment_page_visited: 'On the payment page',
  document_downloaded: 'Downloaded a document',
  events_list_viewed: 'Browsed event list',
  quotes_list_viewed: 'Browsed quotes',
  chat_opened: 'Opened messages',
  rewards_viewed: 'Browsed rewards',
  session_heartbeat: 'Active on portal',
}

const HOUR_LABELS = [
  '12a',
  '1a',
  '2a',
  '3a',
  '4a',
  '5a',
  '6a',
  '7a',
  '8a',
  '9a',
  '10a',
  '11a',
  '12p',
  '1p',
  '2p',
  '3p',
  '4p',
  '5p',
  '6p',
  '7p',
  '8p',
  '9p',
  '10p',
  '11p',
]
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function ActivityHeatMap({ chefActivity }: { chefActivity: ChefActivityEntry[] }) {
  const heatMapData = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0) as number[])
    for (const entry of chefActivity) {
      const d = new Date(entry.created_at)
      grid[d.getDay()][d.getHours()]++
    }
    return grid
  }, [chefActivity])

  const heatMapMax = useMemo(() => {
    let max = 0
    for (const row of heatMapData) {
      for (const v of row) {
        if (v > max) max = v
      }
    }
    return max
  }, [heatMapData])

  if (chefActivity.length === 0) return null

  return (
    <div className="border border-stone-700 rounded-lg p-4 bg-stone-900">
      <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
        When you&apos;re most active
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-10">
                <span className="sr-only">Day</span>
              </th>
              {HOUR_LABELS.map((h) => (
                <th key={h} className="text-2xs text-stone-400 font-normal px-0 py-0.5 text-center">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAY_LABELS.map((day, dayIdx) => (
              <tr key={day}>
                <td className="text-xxs text-stone-500 font-medium pr-2 text-right">{day}</td>
                {heatMapData[dayIdx].map((count, hourIdx) => (
                  <td key={hourIdx} className="p-[1px]">
                    <div
                      className="w-full aspect-square rounded-sm"
                      style={{
                        backgroundColor:
                          count === 0
                            ? '#f5f5f4'
                            : `rgba(232, 143, 71, ${0.2 + (count / Math.max(heatMapMax, 1)) * 0.8})`,
                      }}
                      title={`${day} ${HOUR_LABELS[hourIdx]}: ${count} action${count === 1 ? '' : 's'}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-1 mt-2">
        <span className="text-2xs text-stone-400">Less</span>
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((level) => (
          <div
            key={level}
            className="w-2.5 h-2.5 rounded-sm"
            style={{
              backgroundColor: level === 0 ? '#f5f5f4' : `rgba(232, 143, 71, ${0.2 + level * 0.8})`,
            }}
          />
        ))}
        <span className="text-2xs text-stone-400">More</span>
      </div>
    </div>
  )
}

export function ActivityLogToggle({ enabled }: { enabled: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [localEnabled, setLocalEnabled] = useState(enabled)
  const [toggleError, setToggleError] = useState<string | null>(null)

  function handleToggle() {
    const next = !localEnabled
    setLocalEnabled(next)
    setToggleError(null)

    startTransition(async () => {
      try {
        const { setActivityLogEnabled } = await import('@/lib/activity/preference-actions')
        await setActivityLogEnabled(next)
      } catch {
        setLocalEnabled(!next)
        setToggleError('Failed to update activity tracking preference.')
      }
    })
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-stone-700 bg-stone-900 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-stone-200">Activity Tracking</p>
        <p className="text-xs text-stone-500 mt-0.5">
          {localEnabled
            ? 'Enabled - your actions are being recorded to this timeline.'
            : 'Disabled - actions are not being recorded. Existing history is preserved.'}
        </p>
        {toggleError && <p className="text-xs text-red-600 mt-1">{toggleError}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={localEnabled ? 'true' : 'false'}
        aria-label="Toggle activity tracking"
        onClick={handleToggle}
        disabled={isPending}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 ${
          localEnabled ? 'bg-brand-600' : 'bg-stone-300'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-stone-900 shadow ring-0 transition duration-200 ease-in-out ${
            localEnabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export function AllActivityTimeline({
  items,
}: {
  items: Array<{
    id: string
    created_at: string
    source: 'chef' | 'client'
    chef: ChefActivityEntry | null
    client: ActivityEvent | null
  }>
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-stone-400 text-sm">
        No activity recorded yet. Actions will appear here.
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <AllTimelineRow key={item.id} item={item} />
      ))}
    </div>
  )
}

function AllTimelineRow({
  item,
}: {
  item: {
    id: string
    created_at: string
    source: 'chef' | 'client'
    chef: ChefActivityEntry | null
    client: ActivityEvent | null
  }
}) {
  if (item.source === 'chef' && item.chef) {
    const entry = item.chef
    const config = DOMAIN_CONFIG[entry.domain] || DOMAIN_CONFIG.operational
    const href = getChefEntityHref(entry)
    const content = (
      <div className="flex items-start gap-2.5 py-2 px-2 rounded-md hover:bg-stone-800 transition-colors">
        <span
          className={`text-xxs font-medium px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${config.bgColor} ${config.color}`}
        >
          {config.label}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-stone-300 leading-snug">{entry.summary}</p>
        </div>
        <span className="text-xs text-stone-400 shrink-0 mt-0.5">
          {formatTimeAgo(entry.created_at)}
        </span>
      </div>
    )
    if (href)
      return (
        <Link href={href} className="block">
          {content}
        </Link>
      )
    return content
  }

  if (item.client) {
    const event = item.client
    // session_heartbeat is written to DB for engagement scoring but never shown in feeds
    if (event.event_type === 'session_heartbeat') return null
    return (
      <div className="flex items-start gap-2.5 py-2 px-2 rounded-md hover:bg-stone-800 transition-colors">
        <span className="text-xxs font-medium px-1.5 py-0.5 rounded shrink-0 mt-0.5 bg-brand-900 text-brand-700">
          Client
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-stone-300 leading-snug">
            {CLIENT_EVENT_LABELS[event.event_type] || event.event_type}
          </p>
          {event.entity_type && (
            <p className="text-xs text-stone-400 mt-0.5 truncate">{event.entity_type}</p>
          )}
        </div>
        <span className="text-xs text-stone-400 shrink-0 mt-0.5">
          {formatTimeAgo(event.created_at)}
        </span>
      </div>
    )
  }

  return null
}

function getChefEntityHref(entry: ChefActivityEntry): string | null {
  const id = entry.entity_id
  if (!id) return null

  switch (entry.entity_type) {
    case 'event':
      return `/pipeline/events/${id}`
    case 'inquiry':
      return `/pipeline/inquiries/${id}`
    case 'quote':
      return `/pipeline/quotes/${id}`
    case 'menu':
      return `/culinary/menus/${id}`
    case 'recipe':
      return `/culinary/recipes/${id}`
    case 'client':
      return `/clients/${id}`
    default:
      return null
  }
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString()
}
