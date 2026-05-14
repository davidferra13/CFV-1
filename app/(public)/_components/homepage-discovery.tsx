'use client'

import { useCallback, useEffect, useState } from 'react'
import { HomepageSearch } from './homepage-search'
import { CuisineMarquee } from './cuisine-marquee'
import type {
  DiscoveryRailItem,
  FeaturedChefRailData,
  HomepageLocationContext,
} from '@/lib/discovery/homepage-discovery-rail'
import type { UserScrollSignals } from '@/lib/discovery/user-scroll-signals'
import { useUserLocation } from '@/lib/location/use-user-location'

/**
 * HomepageDiscovery owns the shared location context between the search form
 * and the moving discovery rail. When a user enters a location in the search
 * form, clicking a relevant rail item carries that context into the destination
 * route.
 *
 * This wrapper replaces direct usage of <HomepageSearch> + <CuisineMarquee> in
 * the homepage server component, without touching either child's internal logic.
 */
interface HomepageDiscoveryProps {
  /** Featured chefs from the server component, threaded through to CuisineMarquee. */
  featuredChefs?: FeaturedChefRailData[] | null
  /** Culinary signal items from the server component. Seasonal ingredient discovery inserts. */
  culinarySignals?: DiscoveryRailItem[] | null
  /** Authenticated user preference signals. Null for anonymous users. */
  userSignals?: UserScrollSignals | null
  /** Server-read saved location so discovery links include location in the initial HTML. */
  initialLocationContext?: HomepageLocationContext | null
}

export function HomepageDiscovery({
  featuredChefs = null,
  culinarySignals = null,
  userSignals = null,
  initialLocationContext = null,
}: HomepageDiscoveryProps) {
  const [locationContext, setLocationContext] = useState<HomepageLocationContext | null>(
    initialLocationContext
  )

  const { savedLocation, hydrated } = useUserLocation()

  useEffect(() => {
    if (!hydrated || !savedLocation) return
    setLocationContext({
      location: savedLocation.displayLabel,
      lat: savedLocation.lat,
      lng: savedLocation.lng,
    })
  }, [hydrated, savedLocation])

  const handleContextChange = useCallback((ctx: HomepageLocationContext) => {
    setLocationContext(ctx)
  }, [])

  return (
    <div className="homepage-discovery-shell">
      <div className="mx-auto mt-10 max-w-2xl sm:mt-12">
        <HomepageSearch onContextChange={handleContextChange} />
      </div>
      <div className="mx-auto mt-4 w-full max-w-6xl px-2">
        <div className="discovery-container">
          <CuisineMarquee
            locationContext={locationContext}
            featuredChefs={featuredChefs}
            culinarySignals={culinarySignals}
            userSignals={userSignals}
          />
        </div>
      </div>
    </div>
  )
}
