'use client'

import { useCallback, useState } from 'react'
import { HomepageSearch } from './homepage-search'
import {
  CuisineMarquee,
  type FeaturedChefRailData,
  type HomepageLocationContext,
  type DiscoveryRailItem,
} from './cuisine-marquee'

/**
 * HomepageDiscovery owns the shared location context between the search form
 * and the discovery scroll. When a user enters a location in the search form,
 * clicking any cuisine/service pill carries that context into the destination route.
 *
 * This wrapper replaces direct usage of <HomepageSearch> + <CuisineMarquee> in
 * the homepage server component, without touching either child's internal logic.
 */
interface HomepageDiscoveryProps {
  /** Featured chefs from the server component, threaded through to CuisineMarquee. */
  featuredChefs?: FeaturedChefRailData[] | null
  /** Culinary signal items from the server component. Seasonal ingredient discovery inserts. */
  culinarySignals?: DiscoveryRailItem[] | null
}

export function HomepageDiscovery({
  featuredChefs = null,
  culinarySignals = null,
}: HomepageDiscoveryProps) {
  const [locationContext, setLocationContext] = useState<HomepageLocationContext | null>(null)

  const handleContextChange = useCallback((ctx: HomepageLocationContext) => {
    setLocationContext(ctx)
  }, [])

  return (
    <>
      <div className="mx-auto mt-10 max-w-2xl sm:mt-12">
        <HomepageSearch onContextChange={handleContextChange} />
      </div>
      <div className="mx-auto max-w-2xl">
        <CuisineMarquee
          locationContext={locationContext}
          featuredChefs={featuredChefs}
          culinarySignals={culinarySignals}
        />
      </div>
    </>
  )
}
