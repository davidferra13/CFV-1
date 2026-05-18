'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChefActivityDomain, ChefActivityEntry, ResumeItem } from '@/lib/activity/chef-types'
import type { ActivityActorFilter, ActivityEvent } from '@/lib/activity/types'
import type { BreadcrumbSession } from '@/lib/activity/breadcrumb-types'
import { mergeActivityByCreatedAt, parseTimeRangeDays } from '@/lib/activity/merge'
import { ResumeSection } from '@/components/activity/resume-section'
import { ChefActivityFeed } from '@/components/activity/chef-activity-feed'
import { ActivityFilters } from '@/components/activity/activity-filters'
import { ClientActivityFeed } from '@/components/activity/client-activity-feed'
import { RetraceTimeline } from '@/components/activity/retrace-timeline'
import { ActivityHeatMap, ActivityLogToggle, AllActivityTimeline } from './activity-components'

type ActivityTab = 'my' | 'client' | 'all'
type TimeRange = '1' | '7' | '30' | '90' | '180' | '365' | 'all'
type ViewMode = 'summary' | 'retrace'

interface ActivityPageClientProps {
  resumeItems: ResumeItem[]
  initialChefActivity: ChefActivityEntry[]
  initialClientActivity: ActivityEvent[]
  initialChefCursor: string | null
  initialClientCursor: string | null
  domainCounts: Partial<Record<ChefActivityDomain, number>>
  activityLogEnabled: boolean
  initialBreadcrumbSessions?: BreadcrumbSession[]
  initialBreadcrumbCursor?: string | null
}

type FeedResponse = {
  chefItems: ChefActivityEntry[]
  clientItems: ActivityEvent[]
  chefNextCursor: string | null
  clientNextCursor: string | null
}

export function ActivityPageClient({
  resumeItems,
  initialChefActivity,
  initialClientActivity,
  initialChefCursor,
  initialClientCursor,
  domainCounts,
  activityLogEnabled,
  initialBreadcrumbSessions = [],
  initialBreadcrumbCursor = null,
}: ActivityPageClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('summary')
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

  // Retrace state
  const [breadcrumbSessions, setBreadcrumbSessions] =
    useState<BreadcrumbSession[]>(initialBreadcrumbSessions)
  const [breadcrumbCursor, setBreadcrumbCursor] = useState<string | null>(initialBreadcrumbCursor)
  const [retraceLoading, setRetraceLoading] = useState(false)
  const [retraceLoadingMore, setRetraceLoadingMore] = useState(false)
  const [retraceLoadError, setRetraceLoadError] = useState(false)

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

  const loadRetraceSessions = useCallback(
    async (opts?: { append?: boolean }) => {
      const append = opts?.append ?? false
      if (append) setRetraceLoadingMore(true)
      else setRetraceLoading(true)

      try {
        const { getBreadcrumbSessions } = await import('@/lib/activity/breadcrumb-actions')
        const daysBack = timeRange === 'all' ? 0 : parseInt(timeRange, 10) || 7
        const result = await getBreadcrumbSessions({
          limit: 200,
          daysBack,
          cursor: append ? breadcrumbCursor : null,
        })

        if (append) {
          setBreadcrumbSessions((prev) => [...prev, ...result.sessions])
        } else {
          setBreadcrumbSessions(result.sessions)
        }
        setBreadcrumbCursor(result.nextCursor)
      } catch {
        setRetraceLoadError(true)
      } finally {
        setRetraceLoading(false)
        setRetraceLoadingMore(false)
      }
    },
    [timeRange, breadcrumbCursor]
  )

  useEffect(() => {
    if (viewMode === 'summary') {
      const defaultsMatchInitial =
        activeTab === 'my' && timeRange === '7' && activeDomain === null && actorFilter === 'all'
      if (defaultsMatchInitial) return
      void loadFeed({ append: false })
    }
  }, [activeTab, timeRange, activeDomain, actorFilter, loadFeed, viewMode])

  // When switching to retrace or changing time range in retrace mode, reload sessions
  useEffect(() => {
    if (viewMode !== 'retrace') return
    // Only reload if timeRange changed (initial load handled by SSR)
    const isDefault = timeRange === '7'
    if (isDefault && initialBreadcrumbSessions.length > 0) return
    void loadRetraceSessions({ append: false })
  }, [viewMode, timeRange, loadRetraceSessions, initialBreadcrumbSessions.length])

  // Poll for new activity every 30 seconds while in summary mode.
  useEffect(() => {
    if (viewMode !== 'summary') return
    const interval = setInterval(() => {
      void loadFeed({ append: false })
    }, 30_000)
    return () => clearInterval(interval)
  }, [loadFeed, viewMode])

  const hasMore = useMemo(() => {
    if (activeTab === 'my') return Boolean(chefCursor)
    if (activeTab === 'client') return Boolean(clientCursor)
    return Boolean(chefCursor) || Boolean(clientCursor)
  }, [activeTab, chefCursor, clientCursor])

  const mergedAllItems = useMemo(() => {
    if (activeTab !== 'all') return []
    return mergeActivityByCreatedAt(chefActivity, clientActivity)
  }, [activeTab, chefActivity, clientActivity])

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

      {/* View Mode Toggle - Summary vs Retrace */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 bg-stone-800 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setViewMode('summary')}
            className={`text-xs font-medium py-1.5 px-4 rounded-md transition-colors ${
              viewMode === 'summary'
                ? 'bg-stone-900 text-stone-200 shadow-sm'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            Summary
          </button>
          <button
            type="button"
            onClick={() => setViewMode('retrace')}
            className={`text-xs font-medium py-1.5 px-4 rounded-md transition-colors ${
              viewMode === 'retrace'
                ? 'bg-stone-900 text-stone-200 shadow-sm'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            Retrace My Steps
          </button>
        </div>
        <p className="text-xxs text-stone-400">
          {viewMode === 'summary'
            ? 'Key actions and decisions'
            : 'Every page and click, step by step'}
        </p>
      </div>

      {/* Summary mode: existing activity feed */}
      {viewMode === 'summary' && (
        <>
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
          {activeTab === 'my' && <ActivityHeatMap chefActivity={chefActivity} />}

          <div className="border border-stone-700 rounded-lg overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto p-3">
              {error && (
                <div className="mb-3 text-xs text-red-600 bg-red-950 border border-red-200 rounded px-2 py-1.5">
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
                className="text-xs font-medium border border-stone-700 rounded-md px-3 py-1.5 text-stone-400 bg-stone-900 hover:bg-stone-800 disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Retrace mode: step-by-step navigation history */}
      {viewMode === 'retrace' && (
        <>
          {/* Time range selector for retrace */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">Show:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              aria-label="Time range for retrace view"
              className="text-xs border border-stone-700 rounded-md px-2 py-1 text-stone-400 bg-stone-900"
            >
              <option value="1">Today</option>
              <option value="7">This Week</option>
              <option value="30">This Month</option>
            </select>
          </div>

          {retraceLoadError ? (
            <p className="text-sm text-stone-500 py-4 text-center">
              Could not load navigation history. Refresh to try again.
            </p>
          ) : (
            <RetraceTimeline
              sessions={breadcrumbSessions}
              loading={retraceLoading}
              hasMore={Boolean(breadcrumbCursor)}
              onLoadMore={() => void loadRetraceSessions({ append: true })}
              loadingMore={retraceLoadingMore}
            />
          )}
        </>
      )}
    </div>
  )
}
