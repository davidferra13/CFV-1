'use client'

import { useEffect, useRef } from 'react'
import { ANALYTICS_EVENTS, trackEvent, trackPageView } from '@/lib/analytics/posthog'

type SortMode = 'featured' | 'alpha' | 'partners'

type DirectoryResultsTrackerProps = {
  query: string
  stateFilter: string
  partnerTypeFilter: string
  sortMode: SortMode
  resultCount: number
  totalCount: number
}

export function DirectoryResultsTracker({
  query,
  stateFilter,
  partnerTypeFilter,
  sortMode,
  resultCount,
  totalCount,
}: DirectoryResultsTrackerProps) {
  const lastTrackedKeyRef = useRef<string>('')

  useEffect(() => {
    const hasActiveFilters = Boolean(
      query || stateFilter || partnerTypeFilter || sortMode !== 'featured'
    )
    const trackingKey = [
      query,
      stateFilter,
      partnerTypeFilter,
      sortMode,
      resultCount,
      totalCount,
      hasActiveFilters,
    ].join('|')

    if (lastTrackedKeyRef.current === trackingKey) return
    lastTrackedKeyRef.current = trackingKey

    trackPageView('chef_directory', {
      has_active_filters: hasActiveFilters,
      query_length: query.length,
      state_filter: stateFilter || 'none',
      partner_type_filter: partnerTypeFilter || 'none',
      sort_mode: sortMode,
      result_count: resultCount,
      total_count: totalCount,
      zero_results: resultCount === 0,
    })

    if (hasActiveFilters) {
      trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
        feature: 'chef_directory_filtered_results_viewed',
        query_length: query.length,
        state_filter: stateFilter || 'none',
        partner_type_filter: partnerTypeFilter || 'none',
        sort_mode: sortMode,
        result_count: resultCount,
      })
    }

    if (hasActiveFilters && resultCount === 0) {
      trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
        feature: 'chef_directory_zero_results',
        query_length: query.length,
        state_filter: stateFilter || 'none',
        partner_type_filter: partnerTypeFilter || 'none',
        sort_mode: sortMode,
      })
    }
  }, [query, resultCount, sortMode, stateFilter, partnerTypeFilter, totalCount])

  return null
}
