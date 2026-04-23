'use client'

import { useEffect, useRef } from 'react'
import { ANALYTICS_EVENTS, trackEvent, trackPageView } from '@/lib/analytics/posthog'
import type { DirectorySortMode } from '@/lib/directory/utils'

type DirectoryResultsTrackerProps = {
  query: string
  locationFilter: string
  locationSource: 'manual' | 'current' | 'approximate'
  cuisineFilter: string
  serviceTypeFilter: string
  priceRangeFilter: string
  partnerTypeFilter: string
  locationExperienceFilter: string
  locationBestForFilter: string
  acceptingOnly: boolean
  sortMode: DirectorySortMode
  resultCount: number
  totalCount: number
}

export function DirectoryResultsTracker({
  query,
  locationFilter,
  locationSource,
  cuisineFilter,
  serviceTypeFilter,
  priceRangeFilter,
  partnerTypeFilter,
  locationExperienceFilter,
  locationBestForFilter,
  acceptingOnly,
  sortMode,
  resultCount,
  totalCount,
}: DirectoryResultsTrackerProps) {
  const lastTrackedKeyRef = useRef<string>('')

  useEffect(() => {
    const hasActiveFilters = Boolean(
      query ||
      locationFilter ||
      cuisineFilter ||
      serviceTypeFilter ||
      priceRangeFilter ||
      partnerTypeFilter ||
      locationExperienceFilter ||
      locationBestForFilter ||
      acceptingOnly ||
      sortMode !== 'featured'
    )
    const trackingKey = [
      query,
      locationFilter,
      locationSource,
      cuisineFilter,
      serviceTypeFilter,
      priceRangeFilter,
      partnerTypeFilter,
      locationExperienceFilter,
      locationBestForFilter,
      acceptingOnly,
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
      location_filter: locationFilter || 'none',
      location_source: locationFilter ? locationSource : 'none',
      cuisine_filter: cuisineFilter || 'none',
      service_type_filter: serviceTypeFilter || 'none',
      price_range_filter: priceRangeFilter || 'none',
      partner_type_filter: partnerTypeFilter || 'none',
      location_experience_filter: locationExperienceFilter || 'none',
      location_best_for_filter: locationBestForFilter || 'none',
      accepting_only: acceptingOnly,
      sort_mode: sortMode,
      result_count: resultCount,
      total_count: totalCount,
      zero_results: resultCount === 0,
    })

    if (hasActiveFilters) {
      trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
        feature: 'chef_directory_filtered_results_viewed',
        query_length: query.length,
        location_filter: locationFilter || 'none',
        location_source: locationFilter ? locationSource : 'none',
        cuisine_filter: cuisineFilter || 'none',
        service_type_filter: serviceTypeFilter || 'none',
        price_range_filter: priceRangeFilter || 'none',
        partner_type_filter: partnerTypeFilter || 'none',
        location_experience_filter: locationExperienceFilter || 'none',
        location_best_for_filter: locationBestForFilter || 'none',
        accepting_only: acceptingOnly,
        sort_mode: sortMode,
        result_count: resultCount,
      })
    }

    if (hasActiveFilters && resultCount === 0) {
      trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
        feature: 'chef_directory_zero_results',
        query_length: query.length,
        location_filter: locationFilter || 'none',
        location_source: locationFilter ? locationSource : 'none',
        cuisine_filter: cuisineFilter || 'none',
        service_type_filter: serviceTypeFilter || 'none',
        price_range_filter: priceRangeFilter || 'none',
        partner_type_filter: partnerTypeFilter || 'none',
        location_experience_filter: locationExperienceFilter || 'none',
        location_best_for_filter: locationBestForFilter || 'none',
        accepting_only: acceptingOnly,
        sort_mode: sortMode,
      })
    }
  }, [
    acceptingOnly,
    cuisineFilter,
    partnerTypeFilter,
    priceRangeFilter,
    query,
    resultCount,
    serviceTypeFilter,
    sortMode,
    locationBestForFilter,
    locationExperienceFilter,
    locationFilter,
    locationSource,
    totalCount,
  ])

  return null
}
