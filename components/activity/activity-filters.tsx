'use client'

import { useState } from 'react'
import type { ChefActivityDomain } from '@/lib/activity/chef-types'
import { DOMAIN_CONFIG } from '@/lib/activity/chef-types'

type ActivityTab = 'my' | 'client' | 'all'
type TimeRange = '1' | '7' | '30' | '90'

interface ActivityFiltersProps {
  activeTab: ActivityTab
  onTabChange: (tab: ActivityTab) => void
  activeDomain: ChefActivityDomain | null
  onDomainChange: (domain: ChefActivityDomain | null) => void
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
  domainCounts?: Partial<Record<ChefActivityDomain, number>>
}

const TAB_OPTIONS: { value: ActivityTab; label: string }[] = [
  { value: 'my', label: 'My Activity' },
  { value: 'client', label: 'Client Activity' },
  { value: 'all', label: 'All' },
]

const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '1', label: 'Today' },
  { value: '7', label: 'This Week' },
  { value: '30', label: 'This Month' },
  { value: '90', label: '3 Months' },
]

const DOMAIN_ORDER: ChefActivityDomain[] = [
  'event', 'inquiry', 'quote', 'menu', 'recipe', 'client', 'financial', 'communication', 'operational',
]

export function ActivityFilters({
  activeTab,
  onTabChange,
  activeDomain,
  onDomainChange,
  timeRange,
  onTimeRangeChange,
  domainCounts = {},
}: ActivityFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
        {TAB_OPTIONS.map(tab => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-colors ${
              activeTab === tab.value
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Domain pills + time range */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => onDomainChange(null)}
            className={`text-[11px] font-medium px-2 py-1 rounded-full whitespace-nowrap transition-colors ${
              activeDomain === null
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >
            All
          </button>
          {DOMAIN_ORDER.map(domain => {
            const config = DOMAIN_CONFIG[domain]
            const count = domainCounts[domain] || 0
            return (
              <button
                key={domain}
                onClick={() => onDomainChange(activeDomain === domain ? null : domain)}
                className={`text-[11px] font-medium px-2 py-1 rounded-full whitespace-nowrap transition-colors ${
                  activeDomain === domain
                    ? `${config.bgColor} ${config.color}`
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {config.label}
                {count > 0 && <span className="ml-1 opacity-60">{count}</span>}
              </button>
            )
          })}
        </div>

        <select
          value={timeRange}
          onChange={e => onTimeRangeChange(e.target.value as TimeRange)}
          className="text-xs border border-stone-200 rounded-md px-2 py-1 text-stone-600 bg-white shrink-0"
        >
          {TIME_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
