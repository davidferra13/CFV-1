'use client'

import { useState, useMemo } from 'react'
import type { ChefActivityEntry, ChefActivityDomain, ResumeItem } from '@/lib/activity/chef-types'
import type { ActivityEvent } from '@/lib/activity/types'
import { ResumeSection } from '@/components/activity/resume-section'
import { ChefActivityFeed } from '@/components/activity/chef-activity-feed'
import { ActivityFilters } from '@/components/activity/activity-filters'
import { ActivityFeed } from '@/components/dashboard/activity-feed'

type ActivityTab = 'my' | 'client' | 'all'
type TimeRange = '1' | '7' | '30' | '90'

interface ActivityPageClientProps {
  resumeItems: ResumeItem[]
  chefActivity: ChefActivityEntry[]
  clientActivity: ActivityEvent[]
  domainCounts: Partial<Record<ChefActivityDomain, number>>
}

export function ActivityPageClient({
  resumeItems,
  chefActivity,
  clientActivity,
  domainCounts,
}: ActivityPageClientProps) {
  const [activeTab, setActiveTab] = useState<ActivityTab>('my')
  const [activeDomain, setActiveDomain] = useState<ChefActivityDomain | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('7')

  // Filter chef activity by domain and time range
  const filteredChefActivity = useMemo(() => {
    const now = Date.now()
    const daysBack = parseInt(timeRange)
    const since = now - daysBack * 24 * 60 * 60 * 1000

    return chefActivity.filter(entry => {
      const entryTime = new Date(entry.created_at).getTime()
      if (entryTime < since) return false
      if (activeDomain && entry.domain !== activeDomain) return false
      return true
    })
  }, [chefActivity, activeDomain, timeRange])

  // Filter client activity by time range
  const filteredClientActivity = useMemo(() => {
    const now = Date.now()
    const daysBack = parseInt(timeRange)
    const since = now - daysBack * 24 * 60 * 60 * 1000

    return clientActivity.filter(entry => {
      const entryTime = new Date(entry.created_at).getTime()
      return entryTime >= since
    })
  }, [clientActivity, timeRange])

  return (
    <div className="space-y-6">
      {/* Pick Up Where You Left Off */}
      <ResumeSection items={resumeItems} />

      {/* Filters */}
      <ActivityFilters
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeDomain={activeDomain}
        onDomainChange={setActiveDomain}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        domainCounts={domainCounts}
      />

      {/* Feed */}
      <div className="border border-stone-200 rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto p-3">
          {activeTab === 'my' && (
            <ChefActivityFeed entries={filteredChefActivity} />
          )}
          {activeTab === 'client' && (
            <ActivityFeed events={filteredClientActivity} />
          )}
          {activeTab === 'all' && (
            <AllActivityView
              chefActivity={filteredChefActivity}
              clientActivity={filteredClientActivity}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Combined view that merges both feeds chronologically
function AllActivityView({
  chefActivity,
  clientActivity,
}: {
  chefActivity: ChefActivityEntry[]
  clientActivity: ActivityEvent[]
}) {
  // For the "All" tab, show chef activity with a note about client activity count
  return (
    <div className="space-y-4">
      {clientActivity.length > 0 && (
        <div className="text-xs text-stone-400 px-1">
          {clientActivity.length} client action{clientActivity.length !== 1 ? 's' : ''} in this period
        </div>
      )}
      <ChefActivityFeed entries={chefActivity} />
    </div>
  )
}
