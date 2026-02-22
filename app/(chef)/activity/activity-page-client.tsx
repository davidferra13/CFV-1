'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import type { ChefActivityDomain, ChefActivityEntry, ResumeItem } from '@/lib/activity/chef-types'
import { DOMAIN_CONFIG } from '@/lib/activity/chef-types'
import type { ActivityActorFilter, ActivityEvent } from '@/lib/activity/types'
import { createClient } from '@/lib/supabase/client'
import { mergeActivityByCreatedAt, parseTimeRangeDays } from '@/lib/activity/merge'
import { ResumeSection } from '@/components/activity/resume-section'
import { ChefActivityFeed } from '@/components/activity/chef-activity-feed'
import { ActivityFilters } from '@/components/activity/activity-filters'
import { ClientActivityFeed } from '@/components/activity/client-activity-feed'
import Link from 'next/link'

type ActivityTab = 'my' | 'client' | 'all'
type TimeRange = '1' | '7' | '30' | '90' | '180' | '365' | 'all'

interface ActivityPageClientProps {
  resumeItems: ResumeItem[]
  initialChefActivity: ChefActivityEntry[]
  initialClientActivity: ActivityEvent[]
  initialChefCursor: string | null
  initialClientCursor: string | null
  domainCounts: Partial<Record<ChefActivityDomain, number>>
  activityLogEnabled: boolean
}

type FeedResponse = {
  chefItems: ChefActivityEntry[]
  clientItems: ActivityEvent[]
  chefNextCursor: string | null
  clientNextCursor: string | null
}

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

export function ActivityPageClient({
  resumeItems,
  initialChefActivity,
  initialClientActivity,
  initialChefCursor,
  initialClientCursor,
  domainCounts,
  activityLogEnabled,
}: ActivityPageClientProps) {
  const [activeTab, setActiveTab] = useState<ActivityTab>('my')
  const [activeDomain, setActiveDomain] = useState<ChefActivityDomain | null>(null)
  const [actorFilter, setActorFilter] = useState<ActivityActorFilter>('all')
  const [timeRange, setTimeRange] = useState<TimeRange>('7')
  const [chefActivity, setChefActivity] = useState<ChefActivityEntry[]>(initialChefActivity)
  const [clientActivity, setClientActivity] = useState<ActivityEvent[]>(initialClientActivity)
  const [chefCursor, setChefCursor] = useState<string | null>(initialChefCursor)
  const [clientCursor, setClientCursor] = useState<string | null>(initialClientCursor)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFeed = useCallback(
    async (opts?: { append?: boolean }) => {
      const append = opts?.append ?? false
      setError(null)
      if (append) setLoadingMore(true)
      else setLoading(true)

      try {
        const params = new URLSearchParams({
          tab: activeTab,
          timeRange,
          actor: actorFilter,
          limit: '25',
        })

        if (activeDomain) params.set('domain', activeDomain)
        if (append && chefCursor) params.set('chefCursor', chefCursor)
        if (append && clientCursor) params.set('clientCursor', clientCursor)

        const response = await fetch(`/api/activity/feed?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store',
        })

        if (!response.ok) {
          setError('Unable to load activity feed.')
          return
        }

        const data = (await response.json()) as FeedResponse

        if (append) {
          if (data.chefItems.length > 0) setChefActivity((prev) => [...prev, ...data.chefItems])
          if (data.clientItems.length > 0)
            setClientActivity((prev) => [...prev, ...data.clientItems])
        } else {
          setChefActivity(data.chefItems)
          setClientActivity(data.clientItems)
        }

        setChefCursor(data.chefNextCursor)
        setClientCursor(data.clientNextCursor)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [activeTab, timeRange, actorFilter, activeDomain, chefCursor, clientCursor]
  )

  useEffect(() => {
    const defaultsMatchInitial =
      activeTab === 'my' && timeRange === '7' && activeDomain === null && actorFilter === 'all'
    if (defaultsMatchInitial) return
    void loadFeed({ append: false })
  }, [activeTab, timeRange, activeDomain, actorFilter, loadFeed])

  // Realtime refresh: prepend latest events by refreshing current filters.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('activity-page-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_events' },
        () => {
          void loadFeed({ append: false })
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chef_activity_log' },
        () => {
          void loadFeed({ append: false })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadFeed])

  const hasMore = useMemo(() => {
    if (activeTab === 'my') return Boolean(chefCursor)
    if (activeTab === 'client') return Boolean(clientCursor)
    return Boolean(chefCursor) || Boolean(clientCursor)
  }, [activeTab, chefCursor, clientCursor])

  const mergedAllItems = useMemo(() => {
    if (activeTab !== 'all') return []
    return mergeActivityByCreatedAt(chefActivity, clientActivity)
  }, [activeTab, chefActivity, clientActivity])

  // Build heat map data from chef activity
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

  const clientCountLabel = `${clientActivity.length} client action${clientActivity.length === 1 ? '' : 's'} in this period`
  const daysBack = parseTimeRangeDays(timeRange)
  const loadingText =
    timeRange === 'all'
      ? 'Loading all activity...'
      : `Loading activity from the last ${daysBack} day(s)...`

  return (
    <div className="space-y-6">
      <ActivityLogToggle enabled={activityLogEnabled} />

      <ResumeSection items={resumeItems} />

      <ActivityFilters
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeDomain={activeDomain}
        onDomainChange={setActiveDomain}
        actorFilter={actorFilter}
        onActorFilterChange={setActorFilter}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        domainCounts={domainCounts}
      />

      {/* Activity Heat Map */}
      {activeTab === 'my' && chefActivity.length > 0 && (
        <div className="border border-stone-200 rounded-lg p-4 bg-white">
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
                    <th
                      key={h}
                      className="text-[9px] text-stone-400 font-normal px-0 py-0.5 text-center"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAY_LABELS.map((day, dayIdx) => (
                  <tr key={day}>
                    <td className="text-[10px] text-stone-500 font-medium pr-2 text-right">
                      {day}
                    </td>
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
            <span className="text-[9px] text-stone-400">Less</span>
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((level) => (
              <div
                key={level}
                className="w-2.5 h-2.5 rounded-sm"
                style={{
                  backgroundColor:
                    level === 0 ? '#f5f5f4' : `rgba(232, 143, 71, ${0.2 + level * 0.8})`,
                }}
              />
            ))}
            <span className="text-[9px] text-stone-400">More</span>
          </div>
        </div>
      )}

      <div className="border border-stone-200 rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto p-3">
          {error && (
            <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
              {error}
            </div>
          )}
          {loading && <div className="text-xs text-stone-400 px-1 py-4">{loadingText}</div>}
          {!loading && activeTab === 'my' && <ChefActivityFeed entries={chefActivity} />}
          {!loading && activeTab === 'client' && <ClientActivityFeed events={clientActivity} />}
          {!loading && activeTab === 'all' && (
            <div className="space-y-4">
              <div className="text-xs text-stone-400 px-1">{clientCountLabel}</div>
              <AllActivityTimeline items={mergedAllItems} />
            </div>
          )}
        </div>
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void loadFeed({ append: true })}
            disabled={loadingMore}
            className="text-xs font-medium border border-stone-200 rounded-md px-3 py-1.5 text-stone-600 bg-white hover:bg-stone-50 disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}

function ActivityLogToggle({ enabled }: { enabled: boolean }) {
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
    <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3">
      <div>
        <p className="text-sm font-medium text-stone-800">Activity Tracking</p>
        <p className="text-xs text-stone-500 mt-0.5">
          {localEnabled
            ? 'Enabled — your actions are being recorded to this timeline.'
            : 'Disabled — actions are not being recorded. Existing history is preserved.'}
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
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            localEnabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

function AllActivityTimeline({
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
      <div className="flex items-start gap-2.5 py-2 px-2 rounded-md hover:bg-stone-50 transition-colors">
        <span
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${config.bgColor} ${config.color}`}
        >
          {config.label}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-stone-700 leading-snug">{entry.summary}</p>
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
      <div className="flex items-start gap-2.5 py-2 px-2 rounded-md hover:bg-stone-50 transition-colors">
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 mt-0.5 bg-blue-100 text-blue-700">
          Client
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-stone-700 leading-snug">
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
